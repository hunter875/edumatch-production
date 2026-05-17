"""
Celery workers for processing RabbitMQ events
"""
import logging
import json
import pika
from datetime import datetime
from sqlalchemy.orm import Session
from .celery_app import celery_app
from .database import SessionLocal
from . import models, schemas
from .matching import matching_engine
from .service import MatchingService
from .config import settings

logger = logging.getLogger(__name__)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Don't close here, close in task

# ============= Event Processors =============

@celery_app.task(name='app.workers.process_user_profile_updated', bind=True, max_retries=3)
def process_user_profile_updated(self, event_data: dict):
    """
    Process user.profile.updated event
    
    Worker sẽ:
    1. Nhận event data từ RabbitMQ
    2. Tiền xử lý features (vectorization)
    3. Lưu/Update vào PostgreSQL
    """
    logger.info(f"[Worker] Processing user.profile.updated: {event_data.get('userId')}")
    
    db = SessionLocal()
    try:
        # Validate event data
        event = schemas.UserProfileUpdatedEvent(**event_data)
        
        # Check if applicant features already exist
        applicant_feature = db.query(models.ApplicantFeature).filter(
            models.ApplicantFeature.applicant_id == event.userId
        ).first()
        
        # Preprocess features
        preprocessed = matching_engine.preprocess_text_features(
            skills=event.skills or [],
            research_interests=event.researchInterests or [],
            additional_text=f"{event.major or ''} {event.university or ''}"
        )
        profile_version = event.profileVersion or datetime.utcnow().isoformat()
        
        if applicant_feature:
            # Update existing
            logger.info(f"[Worker] Updating existing applicant features: {event.userId}")
            applicant_feature.gpa = event.gpa
            applicant_feature.major = event.major
            applicant_feature.university = event.university
            applicant_feature.year_of_study = event.yearOfStudy
            applicant_feature.level = event.level
            applicant_feature.study_mode = event.studyMode
            applicant_feature.location = event.location
            applicant_feature.skills = event.skills
            applicant_feature.research_interests = event.researchInterests
            applicant_feature.skills_vector = preprocessed['skills_vector']
            applicant_feature.research_vector = preprocessed['research_vector']
            applicant_feature.combined_text = preprocessed['combined_text']
            applicant_feature.last_processed_at = datetime.utcnow()
            applicant_feature.updated_at = datetime.utcnow()
            applicant_feature.profile_version = profile_version
        else:
            # Create new
            logger.info(f"[Worker] Creating new applicant features: {event.userId}")
            applicant_feature = models.ApplicantFeature(
                applicant_id=event.userId,
                gpa=event.gpa,
                major=event.major,
                university=event.university,
                year_of_study=event.yearOfStudy,
                level=event.level,
                study_mode=event.studyMode,
                location=event.location,
                skills=event.skills,
                research_interests=event.researchInterests,
                skills_vector=preprocessed['skills_vector'],
                research_vector=preprocessed['research_vector'],
                combined_text=preprocessed['combined_text'],
                last_processed_at=datetime.utcnow(),
                profile_version=profile_version
            )
            db.add(applicant_feature)
        
        db.commit()
        logger.info(f"[Worker] ✅ Successfully processed user.profile.updated: {event.userId}")
        
        # Invalidate cached scores for this applicant
        invalidate_scores_for_applicant(db, event.userId)

        try:
            service = MatchingService(db)
            service.invalidate_recommendations_for_applicant(event.userId)
            service.precompute_recommendations_for_applicant(event.userId, limit=50, page=1)
            logger.info(f"[Worker] Precomputed recommendations for applicant {event.userId}")
        except Exception as recommendation_error:
            logger.error(
                f"[Worker] Failed to precompute recommendations for applicant {event.userId}: {recommendation_error}",
                exc_info=True
            )
        
        return {"status": "success", "applicant_id": event.userId}
        
    except Exception as e:
        db.rollback()
        logger.error(f"[Worker] ❌ Error processing user.profile.updated: {e}", exc_info=True)
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        
    finally:
        db.close()


@celery_app.task(name='app.workers.process_scholarship_created', bind=True, max_retries=3)
def process_scholarship_created(self, event_data: dict):
    """
    Process scholarship.created event
    
    Worker sẽ:
    1. Nhận event data từ RabbitMQ
    2. Tiền xử lý features (vectorization)
    3. Lưu vào PostgreSQL
    """
    logger.info(f"[Worker] Processing scholarship.created: {event_data.get('opportunityId') or event_data.get('id')}")
    
    db = SessionLocal()
    try:
        # Validate event data
        event = schemas.ScholarshipCreatedEvent(**event_data)
        
        # Get opportunity ID (Java sends 'id', not 'opportunityId')
        opp_id = str(event.id or event.opportunityId or "")
        if not opp_id:
            raise ValueError("No opportunity ID found in event")
        
        # Preprocess features
        preprocessed = matching_engine.preprocess_text_features(
            skills=event.requiredSkills or [],
            research_interests=event.researchAreas or [],
            additional_text=f"{event.title or ''} {event.description or ''}"
        )
        opportunity_version = event.opportunityVersion or datetime.utcnow().isoformat()
        
        # Create new opportunity feature
        logger.info(f"[Worker] Creating new opportunity features: {opp_id}")
        opportunity_feature = models.OpportunityFeature(
            opportunity_id=opp_id,
            opportunity_type=event.opportunityType,
            title=event.title,
            description=event.description,
            application_deadline=event.get_application_deadline(),
            min_gpa=event.minGpa,
            scholarship_amount=event.scholarshipAmount,
            level=event.level,
            study_mode=event.studyMode,
            location=event.location,
            is_public=event.isPublic,
            moderation_status=event.moderationStatus,
            required_skills=event.requiredSkills,
            preferred_majors=event.preferredMajors,
            research_areas=event.researchAreas,
            skills_vector=preprocessed['skills_vector'],
            research_vector=preprocessed['research_vector'],
            combined_text=preprocessed['combined_text'],
            last_processed_at=datetime.utcnow(),
            opportunity_version=opportunity_version
        )
        db.add(opportunity_feature)
        db.commit()
        
        logger.info(f"[Worker] ✅ Successfully processed scholarship.created: {event.opportunityId}")
        
        # ========== Auto-matching and Notification ==========
        # Find matching candidates and send notifications
        try:
            logger.info(f"[Worker] 🚀 Starting auto-match process for Opportunity {opp_id}...")
            service = MatchingService(db)
            
            # Get top matching candidates (limit 50 to avoid overload)
            logger.info(f"[Worker] 🔍 Searching for matching candidates...")
            recommendations = service.precompute_recommendations_for_opportunity(
                opportunity_id=opp_id,
                limit=50,
                page=1
            )
            
            candidate_count = len(recommendations.data)
            logger.info(f"[Worker] 📊 Found {candidate_count} potential candidates.")
            
            # Send notifications to highly matched candidates (score > 70%)
            notification_count = 0
            high_match_count = 0
            
            for rec in recommendations.data:
                if rec.matchingScore > 70.0:
                    high_match_count += 1
                    logger.info(f"[Worker] 🎯 High match found: User {rec.applicantId} - Score: {rec.matchingScore:.1f}%")
                    try:
                        publish_match_notification(
                            applicant_id=int(rec.applicantId),
                            opportunity_id=opp_id,
                            score=rec.matchingScore,
                            title=event.title or "Học bổng mới"
                        )
                        notification_count += 1
                    except Exception as notify_error:
                        logger.error(f"[Worker] ⚠️ Failed to notify user {rec.applicantId}: {notify_error}")
                else:
                    logger.debug(f"[Worker] ⏭️ Skipping User {rec.applicantId} - Score too low: {rec.matchingScore:.1f}%")
            
            logger.info(f"[Worker] 📧 Notification Summary: {notification_count}/{high_match_count} notifications sent successfully")
            logger.info(f"[Worker] ✅ Auto-match process completed for Opportunity {opp_id}")
            
        except Exception as matching_error:
            logger.error(f"[Worker] ❌ Failed to auto-match candidates for Opportunity {opp_id}: {matching_error}", exc_info=True)
            # Don't fail the entire task if matching fails
        # ====================================================
        
        return {"status": "success", "opportunity_id": event.opportunityId}
        
    except Exception as e:
        db.rollback()
        logger.error(f"[Worker] ❌ Error processing scholarship.created: {e}", exc_info=True)
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        
    finally:
        db.close()


@celery_app.task(name='app.workers.process_scholarship_updated', bind=True, max_retries=3)
def process_scholarship_updated(self, event_data: dict):
    """
    Process scholarship.updated event
    Similar to created but updates existing record
    """
    logger.info(f"[Worker] Processing scholarship.updated: {event_data.get('opportunityId') or event_data.get('id')}")
    
    db = SessionLocal()
    try:
        # Validate event data
        event = schemas.ScholarshipUpdatedEvent(**event_data)
        opportunity_id = event.get_opportunity_id()

        if not event.has_feature_payload():
            logger.info(
                "[Worker] Received partial scholarship.updated for %s; invalidating existing caches only",
                opportunity_id,
            )
            invalidate_scores_for_opportunity(db, opportunity_id)
            try:
                service = MatchingService(db)
                service.invalidate_recommendations_for_opportunity(opportunity_id)
                service.precompute_recommendations_for_opportunity(opportunity_id, limit=50, page=1)
            except Exception as recommendation_error:
                logger.error(
                    f"[Worker] Failed to refresh recommendations for partial update {opportunity_id}: {recommendation_error}",
                    exc_info=True
                )
            return {"status": "success", "opportunity_id": opportunity_id}
        
        # Check if opportunity features already exist
        opportunity_feature = db.query(models.OpportunityFeature).filter(
            models.OpportunityFeature.opportunity_id == opportunity_id
        ).first()
        
        # Preprocess features
        preprocessed = matching_engine.preprocess_text_features(
            skills=event.requiredSkills or [],
            research_interests=event.researchAreas or [],
            additional_text=f"{event.title or ''} {event.description or ''}"
        )
        opportunity_version = event.opportunityVersion or datetime.utcnow().isoformat()
        
        if opportunity_feature:
            # Update existing
            logger.info(f"[Worker] Updating existing opportunity features: {opportunity_id}")
            opportunity_feature.opportunity_type = event.opportunityType
            opportunity_feature.title = event.title
            opportunity_feature.description = event.description
            opportunity_feature.application_deadline = event.get_application_deadline()
            opportunity_feature.min_gpa = event.minGpa
            opportunity_feature.scholarship_amount = event.scholarshipAmount
            opportunity_feature.level = event.level
            opportunity_feature.study_mode = event.studyMode
            opportunity_feature.location = event.location
            opportunity_feature.is_public = event.isPublic
            opportunity_feature.moderation_status = event.moderationStatus
            opportunity_feature.required_skills = event.requiredSkills
            opportunity_feature.preferred_majors = event.preferredMajors
            opportunity_feature.research_areas = event.researchAreas
            opportunity_feature.skills_vector = preprocessed['skills_vector']
            opportunity_feature.research_vector = preprocessed['research_vector']
            opportunity_feature.combined_text = preprocessed['combined_text']
            opportunity_feature.last_processed_at = datetime.utcnow()
            opportunity_feature.updated_at = datetime.utcnow()
            opportunity_feature.opportunity_version = opportunity_version
        else:
            # Create new if not exists
            logger.info(f"[Worker] Creating new opportunity features (from update): {opportunity_id}")
            opportunity_feature = models.OpportunityFeature(
                opportunity_id=opportunity_id,
                opportunity_type=event.opportunityType,
                title=event.title,
                description=event.description,
                application_deadline=event.get_application_deadline(),
                min_gpa=event.minGpa,
                scholarship_amount=event.scholarshipAmount,
                level=event.level,
                study_mode=event.studyMode,
                location=event.location,
                is_public=event.isPublic,
                moderation_status=event.moderationStatus,
                required_skills=event.requiredSkills,
                preferred_majors=event.preferredMajors,
                research_areas=event.researchAreas,
                skills_vector=preprocessed['skills_vector'],
                research_vector=preprocessed['research_vector'],
                combined_text=preprocessed['combined_text'],
                last_processed_at=datetime.utcnow(),
                opportunity_version=opportunity_version
            )
            db.add(opportunity_feature)
        
        db.commit()
        logger.info(f"[Worker] ✅ Successfully processed scholarship.updated: {opportunity_id}")
        
        # Invalidate cached scores for this opportunity
        invalidate_scores_for_opportunity(db, opportunity_id)

        try:
            service = MatchingService(db)
            service.invalidate_recommendations_for_opportunity(opportunity_id)
            service.precompute_recommendations_for_opportunity(opportunity_id, limit=50, page=1)
            logger.info(f"[Worker] Precomputed recommendations for opportunity {opportunity_id}")
        except Exception as recommendation_error:
            logger.error(
                f"[Worker] Failed to precompute recommendations for opportunity {opportunity_id}: {recommendation_error}",
                exc_info=True
            )
        
        return {"status": "success", "opportunity_id": opportunity_id}
        
    except Exception as e:
        db.rollback()
        logger.error(f"[Worker] ❌ Error processing scholarship.updated: {e}", exc_info=True)
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        
    finally:
        db.close()


@celery_app.task(name='app.workers.process_scholarship_deleted', bind=True, max_retries=3)
def process_scholarship_deleted(self, event_data: dict):
    """Remove opportunity features and matching read models after scholarship deletion."""
    opportunity_id = str(
        event_data.get("opportunityId")
        or event_data.get("opportunity_id")
        or event_data.get("id")
        or ""
    )
    if not opportunity_id:
        logger.warning("[Worker] scholarship.deleted missing opportunityId: %s", event_data)
        return {"status": "ignored", "reason": "missing_opportunity_id"}

    db = SessionLocal()
    try:
        deleted_features = db.query(models.OpportunityFeature).filter(
            models.OpportunityFeature.opportunity_id == opportunity_id
        ).delete(synchronize_session=False)

        invalidate_scores_for_opportunity(db, opportunity_id)
        service = MatchingService(db)
        service.invalidate_recommendations_for_opportunity(opportunity_id)
        db.commit()

        logger.info(
            "[Worker] Successfully processed scholarship.deleted: %s features=%s",
            opportunity_id,
            deleted_features,
        )
        return {"status": "success", "opportunity_id": opportunity_id}
    except Exception as e:
        db.rollback()
        logger.error("[Worker] Error processing scholarship.deleted: %s", e, exc_info=True)
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
    finally:
        db.close()


# ============= Helper Functions =============

def publish_match_notification(applicant_id: int, opportunity_id: str, score: float, title: str):
    """
    Publish match notification to RabbitMQ
    
    Args:
        applicant_id: User ID of the applicant
        opportunity_id: Scholarship/opportunity ID
        score: Matching score percentage
        title: Scholarship title
    """
    connection = None
    try:
        logger.info(f"[Worker] 📤 Attempting to send match notification to User {applicant_id}...")
        
        # Create connection to RabbitMQ
        logger.info(f"[Worker] 🔌 Connecting to RabbitMQ at {settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}")
        credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD)
        parameters = pika.ConnectionParameters(
            host=settings.RABBITMQ_HOST,
            port=settings.RABBITMQ_PORT,
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300
        )
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()
        logger.info("[Worker] ✅ RabbitMQ connection established")
        
        # Declare exchange (events_exchange, topic, durable)
        channel.exchange_declare(
            exchange='events_exchange',
            exchange_type='topic',
            durable=True
        )
        logger.info("[Worker] 📡 Exchange 'events_exchange' declared")
        
        # Create notification payload
        payload = {
            "userId": int(applicant_id),
            "opportunityId": str(opportunity_id),
            "title": "🎯 Cơ hội mới phù hợp với bạn!",
            "body": f"Học bổng {title} phù hợp {score:.1f}% với hồ sơ của bạn.",
            "type": "NEW_MATCH"
        }
        logger.info(f"[Worker] 📝 Payload created: {json.dumps(payload, ensure_ascii=False)}")
        
        # Publish message
        channel.basic_publish(
            exchange='events_exchange',
            routing_key='scholarship.new.match',
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
                content_type='application/json'
            )
        )
        
        logger.info(f"[Worker] --> ✅ Sent match notification for User {applicant_id} (Score: {score:.1f}%) success.")
        
    except Exception as e:
        logger.error(f"[Worker] ❌ Failed to publish notification to User {applicant_id}: {e}", exc_info=True)
    finally:
        if connection and not connection.is_closed:
            connection.close()
            logger.info("[Worker] 🔌 RabbitMQ connection closed")


def invalidate_scores_for_applicant(db: Session, applicant_id: str):
    """Invalidate cached scores when applicant profile changes"""
    try:
        deleted_count = db.query(models.MatchingScore).filter(
            models.MatchingScore.applicant_id == applicant_id
        ).delete()
        db.commit()
        logger.info(f"[Worker] Invalidated {deleted_count} cached scores for applicant {applicant_id}")
    except Exception as e:
        logger.error(f"[Worker] Error invalidating scores: {e}")
        db.rollback()


def invalidate_scores_for_opportunity(db: Session, opportunity_id: str):
    """Invalidate cached scores when opportunity changes"""
    try:
        deleted_count = db.query(models.MatchingScore).filter(
            models.MatchingScore.opportunity_id == opportunity_id
        ).delete()
        db.commit()
        logger.info(f"[Worker] Invalidated {deleted_count} cached scores for opportunity {opportunity_id}")
    except Exception as e:
        logger.error(f"[Worker] Error invalidating scores: {e}")
        db.rollback()
