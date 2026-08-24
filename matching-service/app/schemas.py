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
    scoreType: str = "RULE_COMPATIBILITY"
    hardFiltersPassed: bool = True
    constraintViolations: List[str] = Field(default_factory=list)
    explanations: List[str] = Field(default_factory=list)
    algorithmVersion: Optional[str] = None
    modelVersion: Optional[str] = None
    corpusVersion: Optional[str] = None

class BatchScoreDetail(BaseModel):
    """Detailed batch score item for debugging/evaluation UIs"""
    opportunityId: str
    overallScore: float = Field(..., ge=0, le=100)
    breakdown: ScoreBreakdown
    scoreType: str = "RULE_COMPATIBILITY"
    hardFiltersPassed: bool = True
    constraintViolations: List[str] = Field(default_factory=list)
    explanations: List[str] = Field(default_factory=list)
    algorithmVersion: Optional[str] = None
    modelVersion: Optional[str] = None
    corpusVersion: Optional[str] = None

class RecommendationItem(BaseModel):
    """Single recommendation item"""
    opportunityId: Optional[str] = None
    applicantId: Optional[str] = None
    rank: Optional[int] = Field(None, ge=1)
    matchingScore: float = Field(..., ge=0, le=100)
    eligibilityStatus: Optional[str] = None
    components: Optional[Dict[str, float]] = None
    reasons: List[str] = Field(default_factory=list)
    missingInformation: List[str] = Field(default_factory=list)
    sourceUrl: Optional[str] = None
    lastVerifiedAt: Optional[datetime] = None
    scoreType: Optional[str] = None
    modelVersion: Optional[str] = None
    corpusVersion: Optional[str] = None
    generatedAt: Optional[datetime] = None
    profileVersion: Optional[str] = None
    opportunityVersion: Optional[str] = None

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

# ============= Event Schemas (for matching event handlers) =============

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
    nationality: Optional[str] = None
    preferredLocations: Optional[List[str]] = None
    preferredFundingTypes: Optional[List[str]] = None
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
    fundingType: Optional[str] = None
    providerId: Optional[str] = None
    creatorUserId: Optional[int] = None
    sourceUrl: Optional[str] = None
    lastVerifiedAt: Optional[datetime] = None
    isPublic: Optional[bool] = None
    moderationStatus: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    preferredMajors: Optional[List[str]] = None
    eligibleMajors: Optional[List[str]] = None
    eligibleNationalities: Optional[List[str]] = None
    researchAreas: Optional[List[str]] = None
    opportunityVersion: Optional[str] = None
    
    def get_opportunity_id(self) -> str:
        """Get opportunity ID from either field"""
        return str(self.opportunityId or self.id or "")

    def get_provider_id(self) -> Optional[str]:
        """Accept canonical providerId and older creatorUserId producer payloads."""
        if self.providerId is not None:
            return str(self.providerId)
        if self.creatorUserId is not None:
            return str(self.creatorUserId)
        return None

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
            self.fundingType is not None,
            self.providerId is not None,
            self.sourceUrl is not None,
            self.lastVerifiedAt is not None,
            self.isPublic is not None,
            self.moderationStatus is not None,
            self.requiredSkills is not None,
            self.preferredMajors is not None,
            self.eligibleMajors is not None,
            self.eligibleNationalities is not None,
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
    fundingType: Optional[str] = None
    providerId: Optional[str] = None
    creatorUserId: Optional[int] = None
    sourceUrl: Optional[str] = None
    lastVerifiedAt: Optional[datetime] = None
    isPublic: Optional[bool] = None
    moderationStatus: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    preferredMajors: Optional[List[str]] = None
    eligibleMajors: Optional[List[str]] = None
    eligibleNationalities: Optional[List[str]] = None
    researchAreas: Optional[List[str]] = None
    opportunityVersion: Optional[str] = None
    
    def get_opportunity_id(self) -> str:
        """Get opportunity ID from either field"""
        return str(self.opportunityId or self.id or "")

    def get_provider_id(self) -> Optional[str]:
        """Accept canonical providerId and older creatorUserId producer payloads."""
        if self.providerId is not None:
            return str(self.providerId)
        if self.creatorUserId is not None:
            return str(self.creatorUserId)
        return None

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
            self.fundingType is not None,
            self.providerId is not None,
            self.sourceUrl is not None,
            self.lastVerifiedAt is not None,
            self.isPublic is not None,
            self.moderationStatus is not None,
            self.requiredSkills is not None,
            self.preferredMajors is not None,
            self.eligibleMajors is not None,
            self.eligibleNationalities is not None,
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
