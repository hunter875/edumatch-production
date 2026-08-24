"""
RabbitMQ Event Consumer
Listens to RabbitMQ queues and dispatches to matching event handlers.
"""
import json
import logging
import time
from typing import Dict, List

import pika
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type

from .config import settings
from .event_dedup import BUSY, CLAIMED, PROCESSED_DUPLICATE, claim_event, mark_event_processed, record_event_failure
from .workers import (
    process_user_profile_updated,
    process_scholarship_created,
    process_scholarship_updated,
    process_scholarship_deleted
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RabbitMQConsumer:
    """RabbitMQ consumer for event-driven processing"""
    
    def __init__(self):
        self.connection = None
        self.channel = None
        self.event_handlers = {
            'user.profile.updated': process_user_profile_updated,
            'scholarship.created': process_scholarship_created,
            'scholarship.updated': process_scholarship_updated,
            'scholarship.deleted': process_scholarship_deleted,
        }
    
    @retry(
        wait=wait_fixed(5),
        stop=stop_after_attempt(10),
        retry=retry_if_exception_type(pika.exceptions.AMQPConnectionError),
        reraise=True
    )
    def connect(self):
        """Connect to RabbitMQ with retry"""
        logger.info(f"Connecting to RabbitMQ at {settings.RABBITMQ_HOST}...")
        
        credentials = pika.PlainCredentials(
            settings.RABBITMQ_USER,
            settings.RABBITMQ_PASSWORD
        )
        
        parameters = pika.ConnectionParameters(
            host=settings.RABBITMQ_HOST,
            port=settings.RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        
        self.connection = pika.BlockingConnection(parameters)
        self.channel = self.connection.channel()
        self.channel.confirm_delivery()
        
        logger.info("✅ Connected to RabbitMQ successfully")
    
    def setup_queues(self):
        """Setup exchanges, queues, DLX, and bindings"""
        logger.info("Setting up RabbitMQ queues, DLX, and exchanges...")

        # Declare exchanges
        self.channel.exchange_declare(
            exchange='events_exchange',
            exchange_type='topic',
            durable=True
        )
        # Dead Letter Exchange for failed messages
        self.channel.exchange_declare(
            exchange='events_dlx',
            exchange_type='topic',
            durable=True
        )
        self.channel.exchange_declare(
            exchange='events_retry_exchange',
            exchange_type='topic',
            durable=True
        )

        # Dead Letter Queues
        dlq_args = {
            'x-message-ttl': 86400000,
            'x-max-length': 5000,
        }
        for dlq_name in ['user_events_dlq', 'scholarship_events_dlq']:
            self.channel.queue_declare(queue=dlq_name, durable=True, arguments=dlq_args)
            self.channel.queue_bind(
                exchange='events_dlx',
                queue=dlq_name,
                routing_key='#',
            )

        # Main queues with DLX policy (max 3 retries, then → DLQ via DLX)
        queues = {
            'user_events_queue': {
                'routing_keys': ['user.profile.updated'],
                'dlq': 'user_events_dlq',
            },
            'scholarship_events_queue': {
                'routing_keys': ['scholarship.created', 'scholarship.updated', 'scholarship.deleted'],
                'dlq': 'scholarship_events_dlq',
            },
        }

        for queue_name, config in queues.items():
            self.channel.queue_declare(
                queue=queue_name,
                durable=True,
                arguments={
                    'x-message-ttl': 86400000,   # 24 hours
                    'x-max-length': 10000,        # Max 10k messages
                    'x-dead-letter-exchange': 'events_dlx',
                }
            )

            for routing_key in config['routing_keys']:
                self.channel.queue_bind(
                    exchange='events_exchange',
                    queue=queue_name,
                    routing_key=routing_key,
                )
                for attempt, delay in enumerate(self._retry_delays(), start=1):
                    retry_queue = f"{queue_name}.retry.{attempt}.{routing_key.replace('.', '_')}"
                    retry_routing_key = self._retry_routing_key(routing_key, attempt)
                    self.channel.queue_declare(
                        queue=retry_queue,
                        durable=True,
                        arguments={
                            'x-message-ttl': delay * 1000,
                            'x-dead-letter-exchange': 'events_exchange',
                            'x-dead-letter-routing-key': routing_key,
                        },
                    )
                    self.channel.queue_bind(
                        exchange='events_retry_exchange',
                        queue=retry_queue,
                        routing_key=retry_routing_key,
                    )

            logger.info(
                "Queue %s bound to %s (DLX → events_dlx)",
                queue_name, config['routing_keys'],
            )

    @staticmethod
    def _get_retry_count(properties: pika.BasicProperties) -> int:
        """Extract explicit retry count, or 0 for first delivery."""
        if properties.headers and 'x-edumatch-retry-attempt' in properties.headers:
            return int(properties.headers.get('x-edumatch-retry-attempt') or 0)
        return 0

    @staticmethod
    def _retry_delays() -> List[int]:
        return [
            int(value.strip())
            for value in settings.EVENT_RETRY_DELAYS_SECONDS.split(",")
            if value.strip()
        ]

    @staticmethod
    def _retry_routing_key(routing_key: str, attempt: int) -> str:
        return f"retry.{attempt}.{routing_key}"

    def _copy_properties_for_retry(self, properties: pika.BasicProperties, attempt: int) -> pika.BasicProperties:
        headers: Dict = dict(properties.headers or {})
        headers["x-edumatch-retry-attempt"] = attempt
        return pika.BasicProperties(
            content_type=properties.content_type or "application/json",
            delivery_mode=2,
            correlation_id=getattr(properties, "correlation_id", None),
            message_id=getattr(properties, "message_id", None),
            headers=headers,
        )

    def _publish_retry_or_dlq(self, ch, method, properties, body) -> None:
        current_attempt = self._get_retry_count(properties)
        next_attempt = current_attempt + 1
        delays = self._retry_delays()
        if next_attempt <= len(delays):
            retry_routing_key = self._retry_routing_key(method.routing_key, next_attempt)
            ch.basic_publish(
                exchange="events_retry_exchange",
                routing_key=retry_routing_key,
                body=body,
                properties=self._copy_properties_for_retry(properties, next_attempt),
                mandatory=True,
            )
            logger.error(
                "Scheduled retry attempt %s/%s for routing_key=%s delay=%ss",
                next_attempt,
                len(delays),
                method.routing_key,
                delays[next_attempt - 1],
            )
            return

        dlq_properties = self._copy_properties_for_retry(properties, current_attempt)
        ch.basic_publish(
            exchange="events_dlx",
            routing_key=method.routing_key,
            body=body,
            properties=dlq_properties,
            mandatory=True,
        )
        logger.error("Published message to DLQ routing_key=%s after %s retries", method.routing_key, current_attempt)
    
    def callback(self, ch, method, properties, body):
        """Handle incoming messages"""
        event_id = None
        try:
            # Try to parse as JSON first (Spring Boot with Jackson2JsonMessageConverter)
            if properties.content_type == 'application/json':
                message = json.loads(body.decode('utf-8'))
            else:
                # Fallback: try UTF-8 decode then JSON parse
                try:
                    message = json.loads(body.decode('utf-8'))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    logger.error(f"❌ Cannot decode message - content_type: {properties.content_type}, body[:20]: {body[:20]}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                    return
            
            routing_key = method.routing_key
            event_id = message.get("event_id") or getattr(properties, "message_id", None)
            
            logger.info(f"📨 Received message with routing_key: {routing_key}")
            logger.debug(f"Message content: {message}")
            
            # Dispatch to the appropriate RabbitMQ handler.
            handler = self.event_handlers.get(routing_key)
            
            if handler:
                if event_id:
                    claim_status = claim_event(str(event_id), routing_key)
                else:
                    claim_status = CLAIMED

                if claim_status == PROCESSED_DUPLICATE:
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                if claim_status == BUSY:
                    self._publish_retry_or_dlq(ch, method, properties, body)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                try:
                    handler(message)
                    logger.info(f"✅ Executed handler for routing_key: {routing_key}")
                except Exception as task_error:
                    logger.error(f"❌ Task execution failed: {task_error}", exc_info=True)
                    if event_id:
                        record_event_failure(str(event_id), task_error)
                    raise  # Re-raise to trigger nack and requeue
                if event_id:
                    mark_event_processed(str(event_id))
            else:
                logger.warning(f"⚠️ No handler found for routing_key: {routing_key}")
            
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in message: {e}")
            # Reject and don't requeue (bad message)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
        except Exception as e:
            retry_count = self._get_retry_count(properties)
            logger.error(
                "Error processing message (retry %s/%s): %s", retry_count, len(self._retry_delays()), e, exc_info=True,
            )
            try:
                self._publish_retry_or_dlq(ch, method, properties, body)
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as publish_error:
                logger.error("Could not schedule retry/DLQ, nacking original: %s", publish_error, exc_info=True)
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    def start_consuming(self):
        """Start consuming messages"""
        logger.info("🚀 Starting RabbitMQ consumer...")
        
        # Setup consumers for event queues
        self.channel.basic_qos(prefetch_count=1)  # Process one message at a time
        
        self.channel.basic_consume(
            queue='user_events_queue',
            on_message_callback=self.callback
        )
        
        self.channel.basic_consume(
            queue='scholarship_events_queue',
            on_message_callback=self.callback
        )
        
        logger.info("👂 Listening for messages...")
        
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("⚠️ Consumer interrupted by user")
            self.channel.stop_consuming()
        except Exception as e:
            logger.error(f"❌ Consumer error: {e}", exc_info=True)
            self.channel.stop_consuming()
    
    def run(self):
        """Main run loop with auto-reconnect"""
        while True:
            try:
                self.connect()
                self.setup_queues()
                self.start_consuming()
            except Exception as e:
                logger.error(f"❌ Fatal error: {e}", exc_info=True)
                logger.info("⏳ Reconnecting in 10 seconds...")
                time.sleep(10)
            finally:
                if self.connection and not self.connection.is_closed:
                    self.connection.close()


def main():
    """Entry point for consumer script"""
    consumer = RabbitMQConsumer()
    consumer.run()


if __name__ == '__main__':
    main()
