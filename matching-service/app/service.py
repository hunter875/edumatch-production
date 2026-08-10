"""
Service layer - business logic for matching operations.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

from . import models, schemas
from .config import settings
from .matching import matching_engine
from .metrics import MATCHING_CACHE_EVENTS_TOTAL, MATCHING_RECOMMENDATION_FALLBACK_TOTAL

logger = logging.getLogger(__name__)


class MatchingService:
    """Service layer for matching operations."""

    def __init__(self, db: Session):
        self.db = db

    # ========== Score Calculation ==========

    def calculate_score(self, applicant_id: str, opportunity_id: str) -> schemas.ScoreResponse:
        """
        Calculate one matching score.

        This keeps the single-score API behavior, but now reuses valid cache rows
        and writes cache with an expiry.
        """
        cached = self._get_cached_score(applicant_id, opportunity_id)
        if cached is not None and cached.score_breakdown:
            MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="hit").inc()
            return self._build_score_response(
                cached.overall_score,
                cached.score_breakdown,
            )
        MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="miss").inc()

        applicant = self._get_applicant(applicant_id)
        opportunity = self._get_opportunity(opportunity_id)
        if not applicant:
            return self._missing_feature_score("applicant_feature_missing")
        if not opportunity:
            return self._missing_feature_score("opportunity_feature_missing")

        overall_score, breakdown = self._calculate_score_from_features(applicant, opportunity)
        self._upsert_score_cache(
            applicant_id,
            opportunity_id,
            overall_score,
            breakdown,
            profile_version=self._feature_version(applicant, "profile_version"),
            opportunity_version=self._feature_version(opportunity, "opportunity_version"),
        )
        return self._build_score_response(overall_score, breakdown)

    def calculate_scores_batch(self, applicant_id: str, opportunity_ids: List[str]) -> Dict[str, float]:
        """
        Calculate many scores with constant applicant query, one opportunity query,
        one cache query, and one cache commit.
        """
        unique_ids = list(dict.fromkeys(str(opp_id) for opp_id in opportunity_ids if opp_id is not None))
        if not unique_ids:
            return {}

        scores: Dict[str, float] = {}
        cache_by_opportunity = self._get_cached_scores(applicant_id, unique_ids)

        missing_ids: List[str] = []
        for opportunity_id in unique_ids:
            cached = cache_by_opportunity.get(opportunity_id)
            if cached is not None and cached.score_breakdown:
                MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="hit").inc()
                scores[opportunity_id] = round(float(cached.overall_score), 2)
            else:
                MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="miss").inc()
                missing_ids.append(opportunity_id)

        if not missing_ids:
            return scores

        applicant = self._get_applicant(applicant_id)
        if not applicant:
            logger.warning("Applicant %s not found in features DB", applicant_id)
            for opportunity_id in missing_ids:
                scores[opportunity_id] = 0.0
            return scores

        opportunities = self.db.query(models.OpportunityFeature).filter(
            models.OpportunityFeature.opportunity_id.in_(missing_ids)
        ).all()
        opportunities_by_id = {str(opp.opportunity_id): opp for opp in opportunities}

        changed_cache = False
        for opportunity_id in missing_ids:
            opportunity = opportunities_by_id.get(opportunity_id)
            if not opportunity:
                logger.warning("Opportunity %s not found in features DB", opportunity_id)
                scores[opportunity_id] = 0.0
                continue

            overall_score, breakdown = self._calculate_score_from_features(applicant, opportunity)
            scores[opportunity_id] = overall_score
            self._upsert_score_cache(
                applicant_id,
                opportunity_id,
                overall_score,
                breakdown,
                commit=False,
                profile_version=self._feature_version(applicant, "profile_version"),
                opportunity_version=self._feature_version(opportunity, "opportunity_version"),
            )
            changed_cache = True

        if changed_cache:
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                logger.error("Error committing batch score cache: %s", e, exc_info=True)

        return scores

    def calculate_score_details_batch(
        self,
        applicant_id: str,
        opportunity_ids: List[str],
    ) -> Dict[str, schemas.ScoreResponse]:
        """Detailed batch scoring for diagnostics and explainable UI paths."""
        unique_ids = list(dict.fromkeys(str(opp_id) for opp_id in opportunity_ids if opp_id is not None))
        if not unique_ids:
            return {}

        details: Dict[str, schemas.ScoreResponse] = {}
        cache_by_opportunity = self._get_cached_scores(applicant_id, unique_ids)
        missing_ids: List[str] = []

        for opportunity_id in unique_ids:
            cached = cache_by_opportunity.get(opportunity_id)
            if cached is not None and cached.score_breakdown:
                MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="hit").inc()
                details[opportunity_id] = self._build_score_response(
                    cached.overall_score,
                    cached.score_breakdown,
                )
            else:
                MATCHING_CACHE_EVENTS_TOTAL.labels(cache="score", outcome="miss").inc()
                missing_ids.append(opportunity_id)

        if not missing_ids:
            return details

        applicant = self._get_applicant(applicant_id)
        if not applicant:
            missing = self._missing_feature_score("applicant_feature_missing")
            for opportunity_id in missing_ids:
                details[opportunity_id] = missing
            return details

        opportunities = self.db.query(models.OpportunityFeature).filter(
            models.OpportunityFeature.opportunity_id.in_(missing_ids)
        ).all()
        opportunities_by_id = {str(opp.opportunity_id): opp for opp in opportunities}

        changed_cache = False
        for opportunity_id in missing_ids:
            opportunity = opportunities_by_id.get(opportunity_id)
            if not opportunity:
                details[opportunity_id] = self._missing_feature_score("opportunity_feature_missing")
                continue

            overall_score, breakdown = self._calculate_score_from_features(applicant, opportunity)
            details[opportunity_id] = self._build_score_response(overall_score, breakdown)
            self._upsert_score_cache(
                applicant_id,
                opportunity_id,
                overall_score,
                breakdown,
                commit=False,
                profile_version=self._feature_version(applicant, "profile_version"),
                opportunity_version=self._feature_version(opportunity, "opportunity_version"),
            )
            changed_cache = True

        if changed_cache:
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                logger.error("Error committing detailed batch score cache: %s", e, exc_info=True)

        return details

    def _get_applicant(self, applicant_id: str) -> Optional[models.ApplicantFeature]:
        return self.db.query(models.ApplicantFeature).filter(
            models.ApplicantFeature.applicant_id == applicant_id
        ).first()

    def _get_opportunity(self, opportunity_id: str) -> Optional[models.OpportunityFeature]:
        return self.db.query(models.OpportunityFeature).filter(
            models.OpportunityFeature.opportunity_id == opportunity_id
        ).first()

    def _calculate_score_from_features(
        self,
        applicant: models.ApplicantFeature,
        opportunity: models.OpportunityFeature,
    ) -> Tuple[float, Dict[str, Any]]:
        applicant_data = {
            "gpa": applicant.gpa,
            "major": applicant.major,
            "level": getattr(applicant, "level", None),
            "study_mode": getattr(applicant, "study_mode", None),
            "location": getattr(applicant, "location", None),
            "skills": applicant.skills or [],
            "research_interests": applicant.research_interests or [],
        }

        deadline_days = None
        if opportunity.application_deadline is not None:
            deadline_days = (opportunity.application_deadline - datetime.utcnow().date()).days

        opportunity_data = {
            "min_gpa": opportunity.min_gpa,
            "scholarship_amount": opportunity.scholarship_amount,
            "deadline_days": deadline_days,
            "level": opportunity.level,
            "study_mode": opportunity.study_mode,
            "location": opportunity.location,
            "is_public": opportunity.is_public,
            "moderation_status": opportunity.moderation_status,
            "preferred_majors": opportunity.preferred_majors or [],
            "required_skills": opportunity.required_skills or [],
            "research_areas": opportunity.research_areas or [],
        }

        return matching_engine.calculate_rule_based_score(applicant_data, opportunity_data)

    def _missing_feature_score(self, reason: str) -> schemas.ScoreResponse:
        return self._build_score_response(
            0.0,
            {
                "gpaMatch": 0.0,
                "skillsMatch": 0.0,
                "majorMatch": 0.0,
                "researchMatch": 0.0,
                "levelMatch": 0.0,
                "locationStudyModeMatch": 0.0,
                "opportunityBoost": 0.0,
                "_hardFiltersPassed": False,
                "_constraintViolations": [reason],
                "_explanations": [f"Cannot score because {reason}"],
            },
        )

    def _build_score_response(self, overall_score: float, breakdown: Dict[str, Any]) -> schemas.ScoreResponse:
        return schemas.ScoreResponse(
            overallScore=round(float(overall_score), 2),
            breakdown=schemas.ScoreBreakdown(
                gpaMatch=round(float(breakdown.get("gpaMatch", 50.0)), 2),
                skillsMatch=round(float(breakdown.get("skillsMatch", 50.0)), 2),
                majorMatch=round(float(breakdown["majorMatch"]), 2) if breakdown.get("majorMatch") is not None else None,
                researchMatch=round(float(breakdown.get("researchMatch", 50.0)), 2),
                levelMatch=round(float(breakdown["levelMatch"]), 2) if breakdown.get("levelMatch") is not None else None,
                locationStudyModeMatch=round(float(breakdown["locationStudyModeMatch"]), 2) if breakdown.get("locationStudyModeMatch") is not None else None,
                opportunityBoost=round(float(breakdown["opportunityBoost"]), 2) if breakdown.get("opportunityBoost") is not None else None,
            ),
            hardFiltersPassed=bool(breakdown.get("_hardFiltersPassed", overall_score > 0)),
            constraintViolations=list(breakdown.get("_constraintViolations", [])),
            explanations=list(breakdown.get("_explanations", [])),
            algorithmVersion=breakdown.get("_algorithmVersion"),
        )

    def _score_cache_expiry(self) -> datetime:
        return datetime.utcnow() + timedelta(seconds=settings.SCORE_CACHE_TTL)

    def _feature_version(self, feature: object, version_attr: str) -> Optional[str]:
        explicit_version = getattr(feature, version_attr, None)
        if explicit_version:
            return str(explicit_version)

        marker = getattr(feature, "updated_at", None) or getattr(feature, "last_processed_at", None)
        if marker and hasattr(marker, "isoformat"):
            return marker.isoformat()
        return None

    def _is_cache_valid(self, score: models.MatchingScore, now: Optional[datetime] = None) -> bool:
        if not score.score_breakdown:
            return False
        if score.score_breakdown.get("_algorithmVersion") != matching_engine.rule_version:
            return False
        if score.expires_at is None:
            return True
        return score.expires_at > (now or datetime.utcnow())

    def _get_cached_score(self, applicant_id: str, opportunity_id: str) -> Optional[models.MatchingScore]:
        score = self.db.query(models.MatchingScore).filter(
            models.MatchingScore.applicant_id == applicant_id,
            models.MatchingScore.opportunity_id == opportunity_id,
        ).order_by(models.MatchingScore.calculated_at.desc()).first()

        if score and score.score_breakdown and self._is_cache_valid(score):
            return score
        return None

    def _get_cached_scores(self, applicant_id: str, opportunity_ids: List[str]) -> Dict[str, models.MatchingScore]:
        now = datetime.utcnow()
        rows = self.db.query(models.MatchingScore).filter(
            models.MatchingScore.applicant_id == applicant_id,
            models.MatchingScore.opportunity_id.in_(opportunity_ids),
        ).order_by(models.MatchingScore.calculated_at.desc()).all()

        cache: Dict[str, models.MatchingScore] = {}
        for row in rows:
            opportunity_id = str(row.opportunity_id)
            if opportunity_id not in cache and self._is_cache_valid(row, now):
                cache[opportunity_id] = row
        return cache

    def _upsert_score_cache(
        self,
        applicant_id: str,
        opportunity_id: str,
        overall_score: float,
        breakdown: Dict[str, Any],
        commit: bool = True,
        profile_version: Optional[str] = None,
        opportunity_version: Optional[str] = None,
    ) -> None:
        try:
            existing = self.db.query(models.MatchingScore).filter(
                models.MatchingScore.applicant_id == applicant_id,
                models.MatchingScore.opportunity_id == opportunity_id,
            ).order_by(models.MatchingScore.calculated_at.desc()).first()

            if existing:
                score = existing
            else:
                score = models.MatchingScore(
                    applicant_id=applicant_id,
                    opportunity_id=opportunity_id,
                )
                self.db.add(score)

            score.overall_score = overall_score
            score.gpa_score = breakdown.get("gpaMatch")
            score.skills_score = breakdown.get("skillsMatch")
            score.research_score = breakdown.get("researchMatch")
            score.score_breakdown = breakdown
            score.profile_version = profile_version
            score.opportunity_version = opportunity_version
            score.calculated_at = datetime.utcnow()
            score.expires_at = self._score_cache_expiry()

            if commit:
                self.db.commit()
        except Exception as e:
            if commit:
                self.db.rollback()
            logger.error("Error caching score: %s", e, exc_info=True)

    # ========== Recommendations ==========

    def get_recommendations_for_applicant(
        self,
        applicant_id: str,
        limit: int = 10,
        page: int = 1,
    ) -> schemas.RecommendationResponse:
        cached = self._get_cached_recommendations("applicant", applicant_id, limit, page)
        if cached is not None:
            MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="hit").inc()
            return cached

        score_cache = self._get_recommendations_from_score_cache("applicant", applicant_id, limit, page)
        if score_cache is not None:
            MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="score_cache_hit").inc()
            return score_cache

        MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="miss").inc()
        MATCHING_RECOMMENDATION_FALLBACK_TOTAL.labels(target_type="applicant").inc()
        logger.info("Recommendation cache miss for applicant=%s; returning fast empty fallback", applicant_id)
        return self._empty_recommendations(page, limit)

    def get_recommendations_for_opportunity(
        self,
        opportunity_id: str,
        limit: int = 10,
        page: int = 1,
    ) -> schemas.RecommendationResponse:
        cached = self._get_cached_recommendations("opportunity", opportunity_id, limit, page)
        if cached is not None:
            MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="hit").inc()
            return cached

        score_cache = self._get_recommendations_from_score_cache("opportunity", opportunity_id, limit, page)
        if score_cache is not None:
            MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="score_cache_hit").inc()
            return score_cache

        MATCHING_CACHE_EVENTS_TOTAL.labels(cache="recommendation", outcome="miss").inc()
        MATCHING_RECOMMENDATION_FALLBACK_TOTAL.labels(target_type="opportunity").inc()
        logger.info("Recommendation cache miss for opportunity=%s; returning fast empty fallback", opportunity_id)
        return self._empty_recommendations(page, limit)

    def precompute_recommendations_for_applicant(
        self,
        applicant_id: str,
        limit: int = 10,
        page: int = 1,
    ) -> schemas.RecommendationResponse:
        applicant = self._get_applicant(applicant_id)
        if not applicant:
            logger.warning("Applicant %s not found", applicant_id)
            return self._empty_recommendations(page, limit)

        query = self.db.query(models.OpportunityFeature)
        today = datetime.utcnow().date()
        query = query.filter(
            (
                (models.OpportunityFeature.is_public == None)  # noqa: E711
                | (models.OpportunityFeature.is_public == True)  # noqa: E712
            ),
            (
                (models.OpportunityFeature.moderation_status == None)  # noqa: E711
                | (models.OpportunityFeature.moderation_status.in_(["APPROVED", "approved", "ACTIVE", "active", "PUBLISHED", "published"]))
            ),
            (
                (models.OpportunityFeature.application_deadline == None)  # noqa: E711
                | (models.OpportunityFeature.application_deadline >= today)
            ),
        )
        if applicant.gpa is not None:
            query = query.filter(
                (models.OpportunityFeature.min_gpa == None)  # noqa: E711
                | (models.OpportunityFeature.min_gpa <= applicant.gpa)
            )

        opportunities = query.all()
        scored_results = self._score_opportunities_for_applicant(applicant, opportunities)

        self._replace_recommendation_cache("applicant", applicant_id, "opportunity", scored_results)
        return self._build_recommendation_response("applicant", scored_results, limit, page)

    def precompute_recommendations_for_opportunity(
        self,
        opportunity_id: str,
        limit: int = 10,
        page: int = 1,
    ) -> schemas.RecommendationResponse:
        opportunity = self._get_opportunity(opportunity_id)
        if not opportunity:
            logger.warning("Opportunity %s not found", opportunity_id)
            return self._empty_recommendations(page, limit)

        today = datetime.utcnow().date()
        if (
            opportunity.is_public is False
            or (
                opportunity.moderation_status
                and opportunity.moderation_status.lower() not in {"approved", "active", "published"}
            )
            or (opportunity.application_deadline is not None and opportunity.application_deadline < today)
        ):
            return self._empty_recommendations(page, limit)

        query = self.db.query(models.ApplicantFeature)
        if opportunity.min_gpa is not None:
            query = query.filter(
                (models.ApplicantFeature.gpa == None)  # noqa: E711
                | (models.ApplicantFeature.gpa >= opportunity.min_gpa)
            )

        applicants = query.all()
        scored_results = self._score_applicants_for_opportunity(opportunity, applicants)

        self._replace_recommendation_cache("opportunity", opportunity_id, "applicant", scored_results)
        return self._build_recommendation_response("opportunity", scored_results, limit, page)

    def invalidate_recommendations_for_applicant(self, applicant_id: str) -> None:
        self.db.query(models.RecommendationCache).filter(
            (
                (models.RecommendationCache.target_type == "applicant")
                & (models.RecommendationCache.target_id == applicant_id)
            )
            | (
                (models.RecommendationCache.candidate_type == "applicant")
                & (models.RecommendationCache.candidate_id == applicant_id)
            )
        ).delete(synchronize_session=False)
        self.db.commit()

    def invalidate_recommendations_for_opportunity(self, opportunity_id: str) -> None:
        self.db.query(models.RecommendationCache).filter(
            (
                (models.RecommendationCache.target_type == "opportunity")
                & (models.RecommendationCache.target_id == opportunity_id)
            )
            | (
                (models.RecommendationCache.candidate_type == "opportunity")
                & (models.RecommendationCache.candidate_id == opportunity_id)
            )
        ).delete(synchronize_session=False)
        self.db.commit()

    def _calculate_recommendations(self, target: Dict, candidates: List[Dict]) -> List[Tuple[str, float]]:
        if not candidates:
            return []

        logger.info("Calculating ML scores for %s candidates", len(candidates))
        return matching_engine.calculate_ml_based_scores(target, candidates)

    def _score_opportunities_for_applicant(
        self,
        applicant: models.ApplicantFeature,
        opportunities: List[models.OpportunityFeature],
    ) -> List[Tuple[str, float]]:
        scored_results: List[Tuple[str, float]] = []
        for opportunity in opportunities:
            score, breakdown = self._calculate_score_from_features(applicant, opportunity)
            if score <= 0:
                continue
            scored_results.append((str(opportunity.opportunity_id), round(float(score), 2)))
            self._upsert_score_cache(
                str(applicant.applicant_id),
                str(opportunity.opportunity_id),
                score,
                breakdown,
                commit=False,
                profile_version=self._feature_version(applicant, "profile_version"),
                opportunity_version=self._feature_version(opportunity, "opportunity_version"),
            )

        scored_results.sort(key=lambda item: item[1], reverse=True)
        return scored_results

    def _score_applicants_for_opportunity(
        self,
        opportunity: models.OpportunityFeature,
        applicants: List[models.ApplicantFeature],
    ) -> List[Tuple[str, float]]:
        scored_results: List[Tuple[str, float]] = []
        for applicant in applicants:
            score, breakdown = self._calculate_score_from_features(applicant, opportunity)
            if score <= 0:
                continue
            scored_results.append((str(applicant.applicant_id), round(float(score), 2)))
            self._upsert_score_cache(
                str(applicant.applicant_id),
                str(opportunity.opportunity_id),
                score,
                breakdown,
                commit=False,
                profile_version=self._feature_version(applicant, "profile_version"),
                opportunity_version=self._feature_version(opportunity, "opportunity_version"),
            )

        scored_results.sort(key=lambda item: item[1], reverse=True)
        return scored_results

    def _replace_recommendation_cache(
        self,
        target_type: str,
        target_id: str,
        candidate_type: str,
        scored_results: List[Tuple[str, float]],
    ) -> None:
        try:
            self.db.query(models.RecommendationCache).filter(
                models.RecommendationCache.target_type == target_type,
                models.RecommendationCache.target_id == target_id,
            ).delete(synchronize_session=False)

            expires_at = datetime.utcnow() + timedelta(seconds=settings.RECOMMENDATION_CACHE_TTL)
            cache_version = f"{target_type}:{target_id}:{datetime.utcnow().isoformat()}"
            for candidate_id, score in scored_results:
                self.db.add(models.RecommendationCache(
                    target_type=target_type,
                    target_id=str(target_id),
                    candidate_type=candidate_type,
                    candidate_id=str(candidate_id),
                    matching_score=float(score),
                    calculated_at=datetime.utcnow(),
                    expires_at=expires_at,
                    cache_version=cache_version,
                ))

            self.db.commit()
            logger.info(
                "Cached %s recommendations for %s=%s",
                len(scored_results),
                target_type,
                target_id,
            )
        except Exception as e:
            self.db.rollback()
            logger.error("Error replacing recommendation cache: %s", e, exc_info=True)

    def _get_cached_recommendations(
        self,
        target_type: str,
        target_id: str,
        limit: int,
        page: int,
    ) -> Optional[schemas.RecommendationResponse]:
        now = datetime.utcnow()
        filters = (
            models.RecommendationCache.target_type == target_type,
            models.RecommendationCache.target_id == target_id,
            (
                (models.RecommendationCache.expires_at == None)  # noqa: E711
                | (models.RecommendationCache.expires_at > now)
            ),
        )

        total = self.db.query(func.count(models.RecommendationCache.id)).filter(*filters).scalar() or 0
        if total == 0:
            return None

        rows = self.db.query(models.RecommendationCache).filter(*filters).order_by(
            models.RecommendationCache.matching_score.desc()
        ).offset((page - 1) * limit).limit(limit).all()

        scored_results = [(row.candidate_id, row.matching_score) for row in rows]
        return self._build_recommendation_page_response(target_type, scored_results, total, limit, page)

    def _get_recommendations_from_score_cache(
        self,
        target_type: str,
        target_id: str,
        limit: int,
        page: int,
    ) -> Optional[schemas.RecommendationResponse]:
        now = datetime.utcnow()

        if target_type == "applicant":
            filters = (
                models.MatchingScore.applicant_id == target_id,
                models.MatchingScore.overall_score > 0,
                models.MatchingScore.score_breakdown != None,  # noqa: E711
                (
                    (models.MatchingScore.expires_at == None)  # noqa: E711
                    | (models.MatchingScore.expires_at > now)
                ),
            )
            total = self.db.query(func.count(models.MatchingScore.id)).filter(*filters).scalar() or 0
            if total == 0:
                return None

            rows = self.db.query(models.MatchingScore).filter(*filters).order_by(
                models.MatchingScore.overall_score.desc()
            ).offset((page - 1) * limit).limit(limit).all()
            scored_results = [(row.opportunity_id, row.overall_score) for row in rows]
            return self._build_recommendation_page_response("applicant", scored_results, total, limit, page)

        filters = (
            models.MatchingScore.opportunity_id == target_id,
            models.MatchingScore.overall_score > 0,
            models.MatchingScore.score_breakdown != None,  # noqa: E711
            (
                (models.MatchingScore.expires_at == None)  # noqa: E711
                | (models.MatchingScore.expires_at > now)
            ),
        )
        total = self.db.query(func.count(models.MatchingScore.id)).filter(*filters).scalar() or 0
        if total == 0:
            return None

        rows = self.db.query(models.MatchingScore).filter(*filters).order_by(
            models.MatchingScore.overall_score.desc()
        ).offset((page - 1) * limit).limit(limit).all()
        scored_results = [(row.applicant_id, row.overall_score) for row in rows]
        return self._build_recommendation_page_response("opportunity", scored_results, total, limit, page)

    def _build_recommendation_response(
        self,
        target_type: str,
        scored_results: List[Tuple[str, float]],
        limit: int,
        page: int,
    ) -> schemas.RecommendationResponse:
        total = len(scored_results)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_results = scored_results[start_idx:end_idx]

        return self._build_recommendation_page_response(target_type, paginated_results, total, limit, page)

    def _build_recommendation_page_response(
        self,
        target_type: str,
        paginated_results: List[Tuple[str, float]],
        total: int,
        limit: int,
        page: int,
    ) -> schemas.RecommendationResponse:
        total_pages = (total + limit - 1) // limit if limit else 0

        if target_type == "applicant":
            data = [
                schemas.RecommendationItem(opportunityId=candidate_id, matchingScore=score)
                for candidate_id, score in paginated_results
            ]
        else:
            data = [
                schemas.RecommendationItem(applicantId=candidate_id, matchingScore=score)
                for candidate_id, score in paginated_results
            ]

        return schemas.RecommendationResponse(
            metadata=schemas.RecommendationMetadata(
                total=total,
                page=page,
                limit=limit,
                totalPages=total_pages,
            ),
            data=data,
        )

    def _empty_recommendations(self, page: int, limit: int) -> schemas.RecommendationResponse:
        return schemas.RecommendationResponse(
            metadata=schemas.RecommendationMetadata(total=0, page=page, limit=limit, totalPages=0),
            data=[],
        )
