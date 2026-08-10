"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# ============= Request Schemas =============

class ScoreRequest(BaseModel):
    """Request body for POST /api/v1/match/score"""
    applicantId: str = Field(..., description="UUID of the applicant")
    opportunityId: str = Field(..., description="UUID of the opportunity")

class BatchScoreRequest(BaseModel):
    """Request body for POST /api/v1/matching/batch-scores"""
    applicantId: str = Field(..., description="UUID of the applicant")
    opportunityIds: List[str] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of opportunity IDs (1-100 items)"
    )
    includeBreakdown: bool = Field(default=False, description="Return score explanations when supported by endpoint")

class RecommendationQueryParams(BaseModel):
    """Query parameters for recommendation endpoints"""
    limit: int = Field(default=10, ge=1, le=100, description="Number of results")
    page: int = Field(default=1, ge=1, description="Page number")

# ============= Response Schemas =============

class ScoreBreakdown(BaseModel):
    """Breakdown of matching score"""
    gpaMatch: float = Field(..., ge=0, le=100)
    skillsMatch: float = Field(..., ge=0, le=100)
    majorMatch: Optional[float] = Field(None, ge=0, le=100)
    researchMatch: Optional[float] = Field(None, ge=0, le=100)
    levelMatch: Optional[float] = Field(None, ge=0, le=100)
    locationStudyModeMatch: Optional[float] = Field(None, ge=0, le=100)
    opportunityBoost: Optional[float] = Field(None, ge=0, le=100)

class ScoreResponse(BaseModel):
    """Response for POST /api/v1/match/score"""
    overallScore: float = Field(..., ge=0, le=100)
    breakdown: ScoreBreakdown
    hardFiltersPassed: bool = True
    constraintViolations: List[str] = Field(default_factory=list)
    explanations: List[str] = Field(default_factory=list)
    algorithmVersion: Optional[str] = None

class BatchScoreDetail(BaseModel):
    """Detailed batch score item for debugging/evaluation UIs"""
    opportunityId: str
    overallScore: float = Field(..., ge=0, le=100)
    breakdown: ScoreBreakdown
    hardFiltersPassed: bool = True
    constraintViolations: List[str] = Field(default_factory=list)
    explanations: List[str] = Field(default_factory=list)
    algorithmVersion: Optional[str] = None

class RecommendationItem(BaseModel):
    """Single recommendation item"""
    opportunityId: Optional[str] = None
    applicantId: Optional[str] = None
    matchingScore: float = Field(..., ge=0, le=100)

class RecommendationMetadata(BaseModel):
    """Metadata for recommendations"""
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1)
    totalPages: int = Field(..., ge=0)

class RecommendationResponse(BaseModel):
    """Response for recommendation endpoints"""
    metadata: RecommendationMetadata
    data: List[RecommendationItem]

# ============= Event Schemas (for Celery workers) =============

class UserProfileUpdatedEvent(BaseModel):
    """Event schema for user.profile.updated"""
    userId: str
    gpa: Optional[float] = None
    major: Optional[str] = None
    university: Optional[str] = None
    yearOfStudy: Optional[int] = None
    level: Optional[str] = None
    studyMode: Optional[str] = None
    location: Optional[str] = None
    profileVersion: Optional[str] = None
    skills: Optional[List[str]] = []
    researchInterests: Optional[List[str]] = []
    
class ScholarshipCreatedEvent(BaseModel):
    """Event schema for scholarship.created"""
    # Accept both 'opportunityId' (old) and 'id' (from Java service)
    opportunityId: Optional[str] = None
    id: Optional[int] = None  # Java sends 'id' instead of 'opportunityId'
    opportunityType: str = "scholarship"
    title: Optional[str] = None
    description: Optional[str] = None
    applicationDeadline: Optional[date] = None
    deadline: Optional[date] = None
    minGpa: Optional[float] = None
    scholarshipAmount: Optional[float] = None
    level: Optional[str] = None
    studyMode: Optional[str] = None
    location: Optional[str] = None
    isPublic: Optional[bool] = None
    moderationStatus: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    preferredMajors: Optional[List[str]] = None
    researchAreas: Optional[List[str]] = None
    opportunityVersion: Optional[str] = None
    
    def get_opportunity_id(self) -> str:
        """Get opportunity ID from either field"""
        return str(self.opportunityId or self.id or "")

    def get_application_deadline(self) -> Optional[date]:
        """Accept both Java DTO applicationDeadline and legacy deadline."""
        return self.applicationDeadline or self.deadline

    def has_feature_payload(self) -> bool:
        """Return true when this event carries enough data to update feature rows."""
        return any([
            self.title is not None,
            self.description is not None,
            self.get_application_deadline() is not None,
            self.minGpa is not None,
            self.scholarshipAmount is not None,
            self.level is not None,
            self.studyMode is not None,
            self.location is not None,
            self.isPublic is not None,
            self.moderationStatus is not None,
            self.requiredSkills is not None,
            self.preferredMajors is not None,
            self.researchAreas is not None,
        ])

class ScholarshipUpdatedEvent(BaseModel):
    """Event schema for scholarship.updated (same as created)"""
    # Accept both 'opportunityId' (old) and 'id' (from Java service)
    opportunityId: Optional[str] = None
    id: Optional[int] = None  # Java sends 'id' instead of 'opportunityId'
    opportunityType: str = "scholarship"
    title: Optional[str] = None
    description: Optional[str] = None
    applicationDeadline: Optional[date] = None
    deadline: Optional[date] = None
    minGpa: Optional[float] = None
    scholarshipAmount: Optional[float] = None
    level: Optional[str] = None
    studyMode: Optional[str] = None
    location: Optional[str] = None
    isPublic: Optional[bool] = None
    moderationStatus: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    preferredMajors: Optional[List[str]] = None
    researchAreas: Optional[List[str]] = None
    opportunityVersion: Optional[str] = None
    
    def get_opportunity_id(self) -> str:
        """Get opportunity ID from either field"""
        return str(self.opportunityId or self.id or "")

    def get_application_deadline(self) -> Optional[date]:
        """Accept both Java DTO applicationDeadline and legacy deadline."""
        return self.applicationDeadline or self.deadline

    def has_feature_payload(self) -> bool:
        """Return true when this event carries enough data to update feature rows."""
        return any([
            self.title is not None,
            self.description is not None,
            self.get_application_deadline() is not None,
            self.minGpa is not None,
            self.scholarshipAmount is not None,
            self.level is not None,
            self.studyMode is not None,
            self.location is not None,
            self.isPublic is not None,
            self.moderationStatus is not None,
            self.requiredSkills is not None,
            self.preferredMajors is not None,
            self.researchAreas is not None,
        ])

# ============= Health Check =============

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    timestamp: datetime
    database: str
    rabbitmq: str
