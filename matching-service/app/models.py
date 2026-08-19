"""
Database models for Matching Service
"""
from sqlalchemy import Boolean, Column, Date, String, Float, JSON, DateTime, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid
from .database import Base

class ApplicantFeature(Base):
    """
    Lưu trữ các features đã được tiền xử lý của Applicant
    """
    __tablename__ = "applicant_features"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    applicant_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Profile data
    gpa = Column(Float, nullable=True)
    major = Column(String(255), nullable=True)
    university = Column(String(255), nullable=True)
    year_of_study = Column(Integer, nullable=True)
    level = Column(String(100), nullable=True)
    study_mode = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    
    # Skills (original list)
    skills = Column(ARRAY(String), nullable=True)
    
    # Research interests (original list)
    research_interests = Column(ARRAY(String), nullable=True)
    
    # Preprocessed features (for ML)
    skills_vector = Column(JSON, nullable=True)  # TF-IDF vector as JSON
    research_vector = Column(JSON, nullable=True)  # TF-IDF vector as JSON
    combined_text = Column(Text, nullable=True)  # Combined text for vectorization
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_processed_at = Column(DateTime, nullable=True)
    profile_version = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<ApplicantFeature(applicant_id='{self.applicant_id}', gpa={self.gpa})>"


class OpportunityFeature(Base):
    """
    Lưu trữ các features đã được tiền xử lý của Opportunity (Scholarship/Lab)
    """
    __tablename__ = "opportunity_features"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Opportunity data
    opportunity_type = Column(String(50), nullable=False)  # 'scholarship' or 'lab'
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    # Requirements
    application_deadline = Column(Date, nullable=True)
    min_gpa = Column(Float, nullable=True)
    scholarship_amount = Column(Float, nullable=True)
    level = Column(String(100), nullable=True)
    study_mode = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    is_public = Column(Boolean, nullable=True)
    moderation_status = Column(String(50), nullable=True)
    required_skills = Column(ARRAY(String), nullable=True)
    preferred_majors = Column(ARRAY(String), nullable=True)
    research_areas = Column(ARRAY(String), nullable=True)
    
    # Preprocessed features (for ML)
    skills_vector = Column(JSON, nullable=True)
    research_vector = Column(JSON, nullable=True)
    combined_text = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_processed_at = Column(DateTime, nullable=True)
    opportunity_version = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<OpportunityFeature(opportunity_id='{self.opportunity_id}', type='{self.opportunity_type}')>"


class MatchingScore(Base):
    """
    Cache tính toán điểm matching (optional, để optimize performance)
    """
    __tablename__ = "matching_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    applicant_id = Column(String(255), nullable=False, index=True)
    opportunity_id = Column(String(255), nullable=False, index=True)
    
    # Scores
    overall_score = Column(Float, nullable=False)
    gpa_score = Column(Float, nullable=True)
    skills_score = Column(Float, nullable=True)
    research_score = Column(Float, nullable=True)
    score_breakdown = Column(JSON, nullable=True)
    profile_version = Column(String(100), nullable=True)
    opportunity_version = Column(String(100), nullable=True)
    
    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("ix_matching_score_applicant_opportunity", "applicant_id", "opportunity_id"),
        Index("ix_matching_score_applicant_score", "applicant_id", "overall_score"),
        Index("ix_matching_score_expires", "expires_at"),
    )
    
    def __repr__(self):
        return f"<MatchingScore(applicant='{self.applicant_id}', opportunity='{self.opportunity_id}', score={self.overall_score})>"


class RecommendationCache(Base):
    """
    Precomputed recommendation rows.

    target_type/target_id identify the recommendation owner:
    - target_type='applicant' means candidate_id is an opportunity_id
    - target_type='opportunity' means candidate_id is an applicant_id
    """
    __tablename__ = "recommendation_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(255), nullable=False)
    candidate_type = Column(String(50), nullable=False)
    candidate_id = Column(String(255), nullable=False)
    matching_score = Column(Float, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    cache_version = Column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_recommendation_target", "target_type", "target_id"),
        Index("ix_recommendation_target_score", "target_type", "target_id", "matching_score"),
        Index("ix_recommendation_candidate", "candidate_type", "candidate_id"),
        Index("ix_recommendation_expires", "expires_at"),
    )

    def __repr__(self):
        return (
            f"<RecommendationCache(target='{self.target_type}:{self.target_id}', "
            f"candidate='{self.candidate_type}:{self.candidate_id}', score={self.matching_score})>"
        )


class ProcessedEvent(Base):
    """Ledger for at-least-once broker delivery de-duplication."""
    __tablename__ = "processed_events"

    event_id = Column(String(36), primary_key=True)
    routing_key = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="PROCESSING")
    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_processed_events_routing_key", "routing_key"),
        Index("ix_processed_events_status", "status"),
    )
