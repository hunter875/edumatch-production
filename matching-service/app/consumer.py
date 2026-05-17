"""
RabbitMQ Event Consumer
Listens to RabbitMQ queues and dispatches to Celery workers
"""
import pika
import json
import logging
import time
from tenacity import retry, wait_fixed, stop_after_attempt, retry_if_exception_type

from .config import settings
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
        
        logger.info("✅ Connected to RabbitMQ successfully")
    
    def setup_queues(self):
        """Setup exchanges, queues, and bindings"""
        logger.info("Setting up RabbitMQ queues and exchanges...")
        
        # Declare exchanges (Topic exchange for routing)
        self.channel.exchange_declare(
            exchange='events_exchange',
            exchange_type='topic',
            durable=True
        )
        
        # Declare queues
        queues = {
            'user_events_queue': ['user.profile.updated'],
            'scholarship_events_queue': ['scholarship.created', 'scholarship.updated', 'scholarship.deleted']
        }
        
        for queue_name, routing_keys in queues.items():
            # Declare queue
            self.channel.queue_declare(
                queue=queue_name,
                durable=True,
                arguments={
                    'x-message-ttl': 86400000,  # 24 hours TTL
                    'x-max-length': 10000  # Max 10k messages
                }
            )
            
            # Bind queue to exchange with routing keys
            for routing_key in routing_keys:
                self.channel.queue_bind(
                    exchange='events_exchange',
                    queue=queue_name,
                    routing_key=routing_key
                )
            
            logger.info(f"✅ Setup queue: {queue_name} with routing keys: {routing_keys}")
        
        # Also keep the old test_queue for PoC 3 compatibility
        self.channel.queue_declare(queue='test_queue', durable=True)
        logger.info("✅ Setup legacy test_queue for PoC compatibility")
    
    def callback(self, ch, method, properties, body):
        """Handle incoming messages"""
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
            
            logger.info(f"📨 Received message with routing_key: {routing_key}")
            logger.debug(f"Message content: {message}")
            
            # Dispatch to appropriate Celery task
            handler = self.event_handlers.get(routing_key)
            
            if handler:
                # Execute task directly WITHOUT Celery routing (avoid queue declaration conflicts)
                # We just call the task function directly since we're already in the consumer
                try:
                    result = handler(message)
                    logger.info(f"✅ Executed task for routing_key: {routing_key}")
                except Exception as task_error:
                    logger.error(f"❌ Task execution failed: {task_error}", exc_info=True)
                    raise  # Re-raise to trigger nack and requeue
            else:
                logger.warning(f"⚠️ No handler found for routing_key: {routing_key}")
            
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in message: {e}")
            # Reject and don't requeue (bad message)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            
        except Exception as e:
            logger.error(f"❌ Error processing message: {e}", exc_info=True)
            # Reject and requeue for retry
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def legacy_callback(self, ch, method, properties, body):
        """Handle legacy test_queue messages (PoC 3 compatibility)"""
        try:
            data = json.loads(body.decode('utf-8'))
            logger.info(f"[PoC 3] MATCHING-SERVICE: Received ASYNC message! Data: {data}")
            
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            logger.error(f"[PoC 3] Error processing legacy message: {e}")
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
        
        # Legacy consumer for PoC 3
        self.channel.basic_consume(
            queue='test_queue',
            on_message_callback=self.legacy_callback
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
