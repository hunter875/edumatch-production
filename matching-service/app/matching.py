"""
Matching algorithms - Rule-based and ML-based scoring
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Any, List, Dict, Optional, Tuple
from datetime import datetime, date
import json
import logging

logger = logging.getLogger(__name__)

RULE_SCORER_VERSION = "hybrid-v2.0"
HYBRID_V2_WEIGHTS = {
    "skill": 0.30,
    "textSimilarity": 0.25,
    "major": 0.15,
    "interest": 0.10,
    "funding": 0.08,
    "location": 0.05,
    "gpa": 0.04,
    "freshness": 0.03,
}

class MatchingEngine:
    """Core matching algorithms"""
    
    def __init__(self):
        self.rule_version = RULE_SCORER_VERSION
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            min_df=1,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    # ========== Rule-based Scoring (Fast, for real-time API) ==========
    
    def calculate_rule_based_score(
        self,
        applicant_data: Dict,
        opportunity_data: Dict
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Tính điểm tương thích dựa trên quy tắc đơn giản (rule-based)
        Đảm bảo tốc độ nhanh < 300ms
        
        Returns:
            (overall_score, breakdown)
        """
        violations, missing_information = self._hard_filter_state(applicant_data, opportunity_data)

        if violations:
            return 0.0, self._zero_breakdown(violations)

        components = {
            "skill": self._weighted_jaccard(
                applicant_data.get('skills', []),
                opportunity_data.get('required_skills', []),
            ),
            "textSimilarity": self._clamp01(opportunity_data.get("tfidf_score", 0.0)),
            "major": self._calculate_major_component(
                applicant_data.get('major'),
                opportunity_data.get('preferred_majors', []),
            ),
            "interest": self._weighted_jaccard(
                applicant_data.get('research_interests', []),
                opportunity_data.get('research_areas', []),
            ),
            "funding": self._calculate_funding_component(
                applicant_data.get('preferred_funding_types', []),
                opportunity_data.get('funding_type'),
                opportunity_data.get('scholarship_amount'),
            ),
            "location": self._calculate_location_component(
                applicant_data.get('preferred_locations', []),
                applicant_data.get('location'),
                opportunity_data.get('location'),
                applicant_data.get('study_mode'),
                opportunity_data.get('study_mode'),
            ),
            "gpa": self._calculate_gpa_component(
                applicant_data.get('gpa'),
                opportunity_data.get('min_gpa'),
            ),
            "freshness": self._calculate_freshness_component(opportunity_data),
        }

        overall = round(sum(components[name] * weight for name, weight in HYBRID_V2_WEIGHTS.items()) * 100, 2)
        eligibility_status = "UNKNOWN" if missing_information else "ELIGIBLE"

        scores: Dict[str, Any] = {
            'gpaMatch': round(components["gpa"] * 100, 2),
            'skillsMatch': round(components["skill"] * 100, 2),
            'majorMatch': round(components["major"] * 100, 2),
            'researchMatch': round(components["interest"] * 100, 2),
            'levelMatch': 100.0 if not missing_information else 50.0,
            'locationStudyModeMatch': round(components["location"] * 100, 2),
            'opportunityBoost': round(components["freshness"] * 100, 2),
        }
        scores['_hardFiltersPassed'] = True
        scores['_constraintViolations'] = []
        scores['_eligibilityStatus'] = eligibility_status
        scores['_missingInformation'] = missing_information
        scores['_components'] = {key: round(value, 4) for key, value in components.items()}
        scores['_weights'] = HYBRID_V2_WEIGHTS
        scores['_explanations'] = self._build_explanations(scores, applicant_data, opportunity_data)
        scores['_algorithmVersion'] = self.rule_version
        scores['_modelVersion'] = self.rule_version

        return round(overall, 2), scores

    def _zero_breakdown(self, violations: Optional[List[str]] = None) -> Dict[str, Any]:
        violation_list = violations or ['failed_hard_filter']
        return {
            'gpaMatch': 0.0,
            'skillsMatch': 0.0,
            'majorMatch': 0.0,
            'researchMatch': 0.0,
            'levelMatch': 0.0,
            'locationStudyModeMatch': 0.0,
            'opportunityBoost': 0.0,
            '_hardFiltersPassed': False,
            '_constraintViolations': violation_list,
            '_eligibilityStatus': 'INELIGIBLE',
            '_missingInformation': [],
            '_components': {key: 0.0 for key in HYBRID_V2_WEIGHTS},
            '_weights': HYBRID_V2_WEIGHTS,
            '_algorithmVersion': self.rule_version,
            '_modelVersion': self.rule_version,
            '_explanations': [
                f"Rejected by hard filter: {violation}"
                for violation in violation_list
            ],
        }

    def _fails_hard_filters(self, applicant_data: Dict, opportunity_data: Dict) -> bool:
        return bool(self._hard_filter_violations(applicant_data, opportunity_data))

    def _hard_filter_violations(self, applicant_data: Dict, opportunity_data: Dict) -> List[str]:
        return self._hard_filter_state(applicant_data, opportunity_data)[0]

    def _hard_filter_state(self, applicant_data: Dict, opportunity_data: Dict) -> Tuple[List[str], List[str]]:
        violations: List[str] = []
        missing_information: List[str] = []

        if opportunity_data.get('is_public') is False:
            violations.append('opportunity_not_public')

        moderation_status = opportunity_data.get('moderation_status')
        if moderation_status and str(moderation_status).lower() not in {'approved', 'active', 'published'}:
            violations.append('opportunity_not_approved')

        deadline_days = opportunity_data.get('deadline_days')
        if deadline_days is not None and float(deadline_days) < 0:
            violations.append('opportunity_expired')

        applicant_gpa = applicant_data.get('gpa')
        required_gpa = opportunity_data.get('min_gpa')
        if required_gpa is not None:
            if applicant_gpa is None:
                missing_information.append('gpa')
            elif float(applicant_gpa) < float(required_gpa):
                violations.append('gpa_below_requirement')

        if opportunity_data.get('level'):
            if not applicant_data.get('level'):
                missing_information.append('degree_level')
            elif not self._optional_constraint_compatible(applicant_data.get('level'), opportunity_data.get('level')):
                violations.append('degree_mismatch')

        eligible_nationalities = opportunity_data.get('eligible_nationalities') or []
        if eligible_nationalities:
            if not applicant_data.get('nationality'):
                missing_information.append('nationality')
            elif self._normalize(applicant_data.get('nationality')) not in {
                self._normalize(value) for value in eligible_nationalities if value
            }:
                violations.append('nationality_not_eligible')

        if opportunity_data.get('already_applied') is True:
            violations.append('already_applied')

        if opportunity_data.get('deleted') is True or opportunity_data.get('blocked') is True:
            violations.append('opportunity_deleted_or_blocked')

        if opportunity_data.get('major_required') is True:
            majors = opportunity_data.get('preferred_majors') or opportunity_data.get('eligible_majors') or []
            if not applicant_data.get('major'):
                missing_information.append('major')
            elif self._calculate_major_component(applicant_data.get('major'), majors) < 1.0:
                violations.append('major_not_eligible')

        if (
            opportunity_data.get('location_required') is True
            and not self._location_compatible(applicant_data.get('location'), opportunity_data.get('location'))
        ):
            violations.append('location_mismatch')

        if not self._study_mode_compatible(applicant_data.get('study_mode'), opportunity_data.get('study_mode')):
            violations.append('study_mode_mismatch')

        return violations, list(dict.fromkeys(missing_information))

    def _optional_constraint_compatible(self, applicant_value: Optional[str], required_value: Optional[str]) -> bool:
        if not applicant_value or not required_value:
            return True

        applicant = str(applicant_value).strip().lower()
        required = str(required_value).strip().lower()
        if required in {'any', 'all', 'flexible'}:
            return True

        return applicant == required

    def _location_compatible(self, applicant_value: Optional[str], required_value: Optional[str]) -> bool:
        if not applicant_value or not required_value:
            return True

        applicant = str(applicant_value).strip().lower()
        required = str(required_value).strip().lower()
        if required in {'remote', 'online', 'anywhere', 'any', 'flexible'}:
            return True
        return applicant == required or applicant in required or required in applicant

    def _study_mode_compatible(self, applicant_value: Optional[str], required_value: Optional[str]) -> bool:
        if not applicant_value or not required_value:
            return True

        applicant = self._normalize_mode(applicant_value)
        required = self._normalize_mode(required_value)
        if required in {'any', 'flexible'}:
            return True
        if applicant == required:
            return True
        if applicant in {'remote', 'online'} and required in {'remote', 'online', 'hybrid'}:
            return True
        if applicant == 'hybrid' and required in {'hybrid', 'online', 'remote'}:
            return True
        return False

    def _normalize_mode(self, value: str) -> str:
        return str(value).strip().lower().replace('-', '_').replace(' ', '_')

    def _normalize(self, value: Any) -> str:
        return str(value).strip().lower().replace("-", " ").replace("_", " ")

    def _normalize_list(self, values: Any) -> List[str]:
        if values is None:
            return []
        if isinstance(values, str):
            values = [values]
        normalized = []
        for value in values:
            if value is None:
                continue
            text = self._normalize(value)
            if text:
                normalized.append(text)
        return list(dict.fromkeys(normalized))

    def _clamp01(self, value: Any) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    def _weighted_jaccard(self, applicant_items: Any, required_items: Any) -> float:
        required = set(self._normalize_list(required_items))
        applicant = set(self._normalize_list(applicant_items))
        if not required:
            return 0.75
        if not applicant:
            return 0.0

        intersection = len(applicant & required)
        union = len(applicant | required)
        coverage = intersection / len(required)
        jaccard = intersection / union if union else 0.0
        return self._clamp01((coverage * 0.7) + (jaccard * 0.3))

    def _calculate_major_component(self, applicant_major: Optional[str], preferred_majors: Any) -> float:
        preferred = self._normalize_list(preferred_majors)
        if not preferred:
            return 0.75
        if not applicant_major:
            return 0.5

        applicant = self._normalize(applicant_major)
        if applicant in preferred:
            return 1.0

        applicant_tokens = set(applicant.split())
        best_overlap = 0.0
        for major in preferred:
            preferred_tokens = set(major.split())
            if not preferred_tokens:
                continue
            best_overlap = max(best_overlap, len(applicant_tokens & preferred_tokens) / len(preferred_tokens))
        return self._clamp01(best_overlap)

    def _calculate_funding_component(
        self,
        preferred_funding_types: Any,
        funding_type: Optional[str],
        scholarship_amount: Optional[float],
    ) -> float:
        preferred = set(self._normalize_list(preferred_funding_types))
        observed = self._normalize(funding_type) if funding_type else ""
        if not observed and scholarship_amount is not None:
            try:
                observed = "funded" if float(scholarship_amount) > 0 else "unfunded"
            except (TypeError, ValueError):
                observed = ""

        if not preferred:
            return 0.75 if observed or scholarship_amount is not None else 0.5
        if not observed:
            return 0.5
        if observed in preferred:
            return 1.0
        if observed == "funded" and preferred & {"scholarship", "grant", "full funding", "partial funding"}:
            return 0.9
        return 0.25

    def _calculate_location_component(
        self,
        preferred_locations: Any,
        applicant_location: Optional[str],
        opportunity_location: Optional[str],
        applicant_study_mode: Optional[str],
        opportunity_study_mode: Optional[str],
    ) -> float:
        if opportunity_study_mode and self._normalize_mode(str(opportunity_study_mode)) in {"remote", "online"}:
            return 1.0
        if applicant_study_mode and opportunity_study_mode and self._study_mode_compatible(
            applicant_study_mode,
            opportunity_study_mode,
        ):
            return 0.85
        preferred = set(self._normalize_list(preferred_locations))
        opportunity = self._normalize(opportunity_location) if opportunity_location else ""
        applicant = self._normalize(applicant_location) if applicant_location else ""
        if not opportunity:
            return 0.5
        if preferred and opportunity in preferred:
            return 1.0
        if applicant and self._location_compatible(applicant, opportunity):
            return 0.9
        if preferred:
            return 0.25
        return 0.6

    def _calculate_gpa_component(self, applicant_gpa: Optional[float], required_gpa: Optional[float]) -> float:
        if required_gpa is None:
            return 0.75
        if applicant_gpa is None:
            return 0.5
        try:
            applicant = float(applicant_gpa)
            required = float(required_gpa)
        except (TypeError, ValueError):
            return 0.5
        if applicant < required:
            return 0.0
        return self._clamp01(0.75 + min(applicant - required, 1.0) * 0.25)

    def _calculate_freshness_component(self, opportunity_data: Dict) -> float:
        deadline_days = opportunity_data.get("deadline_days")
        if deadline_days is not None:
            try:
                days = float(deadline_days)
                if days < 0:
                    return 0.0
                if days <= 14:
                    return 1.0
                if days <= 90:
                    return 0.8
                return 0.6
            except (TypeError, ValueError):
                pass

        marker = opportunity_data.get("last_verified_at") or opportunity_data.get("updated_at")
        if marker:
            try:
                if isinstance(marker, str):
                    marker = datetime.fromisoformat(marker.replace("Z", "+00:00"))
                if isinstance(marker, date) and not isinstance(marker, datetime):
                    marker = datetime.combine(marker, datetime.min.time())
                age_days = max((datetime.utcnow().replace(tzinfo=None) - marker.replace(tzinfo=None)).days, 0)
                if age_days <= 14:
                    return 1.0
                if age_days <= 60:
                    return 0.75
                return 0.5
            except (AttributeError, TypeError, ValueError):
                pass
        return 0.5

    def _opportunity_text(self, opportunity_data: Dict) -> str:
        parts = [
            opportunity_data.get("title"),
            opportunity_data.get("description"),
            opportunity_data.get("funding_type"),
            opportunity_data.get("location"),
            " ".join(opportunity_data.get("required_skills") or []),
            " ".join(opportunity_data.get("research_areas") or []),
            " ".join(opportunity_data.get("preferred_majors") or []),
        ]
        return " ".join(str(part) for part in parts if part).strip()

    def _applicant_text(self, applicant_data: Dict) -> str:
        parts = [
            applicant_data.get("major"),
            applicant_data.get("degree_level") or applicant_data.get("level"),
            " ".join(applicant_data.get("skills") or []),
            " ".join(applicant_data.get("research_interests") or []),
            " ".join(applicant_data.get("preferred_funding_types") or []),
            " ".join(applicant_data.get("preferred_locations") or []),
        ]
        return " ".join(str(part) for part in parts if part).strip()

    def _tfidf_similarities(self, applicant_data: Dict, opportunities_data: List[Dict]) -> Dict[str, float]:
        applicant_text = self._applicant_text(applicant_data)
        opportunity_texts = [self._opportunity_text(opportunity) for opportunity in opportunities_data]
        candidate_ids = [
            str(opportunity.get("id") or opportunity.get("opportunity_id") or "")
            for opportunity in opportunities_data
        ]

        if not applicant_text or not any(opportunity_texts):
            return {candidate_id: 0.0 for candidate_id in candidate_ids}

        try:
            opportunity_matrix = self.tfidf_vectorizer.fit_transform(opportunity_texts)
            applicant_vector = self.tfidf_vectorizer.transform([applicant_text])
            similarities = cosine_similarity(applicant_vector, opportunity_matrix)[0]
            return {
                candidate_id: round(self._clamp01(similarity), 4)
                for candidate_id, similarity in zip(candidate_ids, similarities)
            }
        except ValueError as exc:
            logger.warning("TF-IDF vectorizer fallback to rule-only ranking: %s", exc)
            return {candidate_id: 0.0 for candidate_id in candidate_ids}

    def calculate_hybrid_recommendations(
        self,
        applicant_data: Dict,
        opportunities_data: List[Dict],
        retrieval_limit: int = 200,
    ) -> List[Dict[str, Any]]:
        """Rank opportunities with hard filters, TF-IDF retrieval, structured score, and diversity."""
        if not opportunities_data:
            return []

        text_scores = self._tfidf_similarities(applicant_data, opportunities_data)
        ranked_pool = sorted(
            opportunities_data,
            key=lambda item: text_scores.get(str(item.get("id") or item.get("opportunity_id") or ""), 0.0),
            reverse=True,
        )[:retrieval_limit]

        results: List[Dict[str, Any]] = []
        seen: set[str] = set()
        for opportunity_data in ranked_pool:
            candidate_id = str(opportunity_data.get("id") or opportunity_data.get("opportunity_id") or "")
            if not candidate_id or candidate_id in seen:
                continue
            seen.add(candidate_id)

            payload = dict(opportunity_data)
            payload["tfidf_score"] = text_scores.get(candidate_id, 0.0)
            score, breakdown = self.calculate_rule_based_score(applicant_data, payload)
            if score <= 0:
                continue

            results.append({
                "candidate_id": candidate_id,
                "score": round(float(score), 2),
                "provider_id": payload.get("provider_id"),
                "source_url": payload.get("source_url"),
                "last_verified_at": payload.get("last_verified_at"),
                "eligibility_status": breakdown.get("_eligibilityStatus"),
                "missing_information": list(breakdown.get("_missingInformation", [])),
                "components": dict(breakdown.get("_components", {})),
                "reasons": list(breakdown.get("_explanations", [])),
                "model_version": breakdown.get("_modelVersion", self.rule_version),
                "profile_version": applicant_data.get("profile_version"),
                "opportunity_version": payload.get("opportunity_version"),
                "breakdown": breakdown,
            })

        diversified = self._diversify_results(sorted(results, key=lambda item: item["score"], reverse=True))
        for index, result in enumerate(diversified, start=1):
            result["rank"] = index
        return diversified

    def _diversify_results(self, results: List[Dict[str, Any]], limit: Optional[int] = None) -> List[Dict[str, Any]]:
        unique: List[Dict[str, Any]] = []
        seen_ids: set[str] = set()
        provider_counts: Dict[str, int] = {}

        for result in results:
            candidate_id = str(result.get("candidate_id") or "")
            if not candidate_id or candidate_id in seen_ids:
                continue
            provider_id = str(result.get("provider_id") or "")
            if len(unique) < 10 and provider_id and provider_counts.get(provider_id, 0) >= 3:
                continue

            unique.append(result)
            seen_ids.add(candidate_id)
            if provider_id:
                provider_counts[provider_id] = provider_counts.get(provider_id, 0) + 1
            if limit and len(unique) >= limit:
                return unique

        if len(unique) < len(results):
            for result in results:
                candidate_id = str(result.get("candidate_id") or "")
                if not candidate_id or candidate_id in seen_ids:
                    continue
                provider_id = str(result.get("provider_id") or "")
                if len(unique) < 10 and provider_id and provider_counts.get(provider_id, 0) >= 3:
                    continue
                unique.append(result)
                seen_ids.add(candidate_id)
                if provider_id:
                    provider_counts[provider_id] = provider_counts.get(provider_id, 0) + 1
                if limit and len(unique) >= limit:
                    break

        return unique
    
    def _calculate_gpa_score(
        self,
        applicant_gpa: Optional[float],
        required_gpa: Optional[float]
    ) -> float:
        """Calculate GPA matching score"""
        if applicant_gpa is None:
            return 50.0  # Neutral score if no GPA data
        
        if required_gpa is None:
            return 75.0  # Good score if no requirement
        
        if applicant_gpa >= required_gpa:
            # Bonus for exceeding requirement
            bonus = min((applicant_gpa - required_gpa) * 20, 25)
            return min(75.0 + bonus, 100.0)
        else:
            # Penalty for not meeting requirement
            gap = required_gpa - applicant_gpa
            penalty = gap * 30
            return max(0, 50 - penalty)
    
    def _calculate_skills_overlap(
        self,
        applicant_skills: List[str],
        required_skills: List[str]
    ) -> float:
        """Calculate skill overlap score using Jaccard similarity"""
        if not required_skills:
            return 75.0  # Good score if no requirements
        
        if not applicant_skills:
            return 0.0  # No skills = 0 score
        
        # Normalize to lowercase for comparison
        applicant_set = set(skill.lower().strip() for skill in applicant_skills)
        required_set = set(skill.lower().strip() for skill in required_skills)
        
        # Jaccard similarity
        intersection = len(applicant_set & required_set)
        union = len(applicant_set | required_set)
        
        if union == 0:
            return 0.0
        
        jaccard = intersection / union
        
        # Also check coverage of required skills
        coverage = intersection / len(required_set) if len(required_set) > 0 else 0
        
        # Weighted combination: 60% coverage + 40% jaccard
        score = (coverage * 0.6 + jaccard * 0.4) * 100
        
        return round(score, 2)

    def _calculate_major_score(
        self,
        applicant_major: Optional[str],
        preferred_majors: List[str]
    ) -> float:
        """Calculate major/field fit."""
        if not preferred_majors:
            return 75.0
        if not applicant_major:
            return 50.0

        applicant = applicant_major.lower().strip()
        preferred = [major.lower().strip() for major in preferred_majors if major]

        if applicant in preferred:
            return 100.0

        applicant_tokens = set(applicant.replace('-', ' ').split())
        best_overlap = 0.0
        for major in preferred:
            preferred_tokens = set(major.replace('-', ' ').split())
            if not preferred_tokens:
                continue
            overlap = len(applicant_tokens & preferred_tokens) / len(preferred_tokens)
            best_overlap = max(best_overlap, overlap)

        return round(best_overlap * 100, 2) if best_overlap > 0 else 25.0

    def _calculate_optional_exact_match(
        self,
        applicant_value: Optional[str],
        opportunity_value: Optional[str]
    ) -> float:
        """Neutral when data is missing, exact/fuzzy when both sides exist."""
        if not opportunity_value:
            return 75.0
        if not applicant_value:
            return 50.0

        applicant = applicant_value.lower().strip()
        opportunity = opportunity_value.lower().strip()
        if applicant == opportunity:
            return 100.0
        if applicant in opportunity or opportunity in applicant:
            return 80.0
        return 25.0

    def _build_explanations(
        self,
        scores: Dict[str, float],
        applicant_data: Dict,
        opportunity_data: Dict,
    ) -> List[str]:
        components = scores.get("_components") or {}
        explanations = [
            f"Skill component {components.get('skill', scores.get('skillsMatch', 0) / 100):.2f}",
            f"Text similarity component {components.get('textSimilarity', 0):.2f}",
            f"Major component {components.get('major', scores.get('majorMatch', 0) / 100):.2f}",
        ]

        matched_skills = set(self._normalize_list(applicant_data.get("skills"))) & set(
            self._normalize_list(opportunity_data.get("required_skills"))
        )
        if matched_skills:
            explanations.append("Matched skills: " + ", ".join(sorted(matched_skills)[:5]))

        if opportunity_data.get('min_gpa') is not None and applicant_data.get('gpa') is not None:
            explanations.append(
                f"GPA {float(applicant_data['gpa']):.2f} meets minimum {float(opportunity_data['min_gpa']):.2f}"
            )

        if opportunity_data.get('deadline_days') is not None:
            explanations.append(f"Deadline is {int(float(opportunity_data['deadline_days']))} days away")

        return explanations

    def _calculate_opportunity_boost(self, opportunity_data: Dict) -> float:
        """Small optional boost for high-signal opportunities."""
        amount = opportunity_data.get('scholarship_amount')
        deadline_days = opportunity_data.get('deadline_days')

        score = 50.0
        if amount is not None:
            try:
                if float(amount) >= 30000:
                    score += 25.0
                elif float(amount) >= 10000:
                    score += 10.0
            except (TypeError, ValueError):
                pass

        if deadline_days is not None:
            try:
                days = float(deadline_days)
                if 7 <= days <= 90:
                    score += 15.0
            except (TypeError, ValueError):
                pass

        return min(score, 100.0)
    
    # ========== ML-based Scoring (Slower, for recommendations) ==========
    
    def calculate_ml_based_scores(
        self,
        target_features: Dict,
        candidates_features: List[Dict]
    ) -> List[Tuple[str, float]]:
        """
        Tính điểm ML-based sử dụng TF-IDF + Cosine Similarity
        Dùng cho API recommendations (chấp nhận chậm)
        
        Args:
            target_features: Features của applicant HOẶC opportunity (target)
            candidates_features: List features của các candidates
        
        Returns:
            List of (candidate_id, matching_score) sorted by score descending
        """
        try:
            # Extract vectors from features
            target_vector = self._get_combined_vector(target_features)
            
            results = []
            for candidate in candidates_features:
                candidate_id = candidate.get('id')
                candidate_vector = self._get_combined_vector(candidate)
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(target_vector, candidate_vector)
                score = round(similarity * 100, 2)
                
                results.append((candidate_id, score))
            
            # Sort by score descending
            results.sort(key=lambda x: x[1], reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in ML-based scoring: {e}")
            return []
    
    def _get_combined_vector(self, features: Dict) -> Optional[np.ndarray]:
        """Get or create combined feature vector"""
        # Try to use precomputed vectors
        skills_vector = features.get('skills_vector')
        research_vector = features.get('research_vector')
        
        if skills_vector and research_vector:
            # Combine precomputed vectors
            try:
                skills_arr = np.array(skills_vector) if isinstance(skills_vector, list) else np.array(json.loads(skills_vector))
                research_arr = np.array(research_vector) if isinstance(research_vector, list) else np.array(json.loads(research_vector))
                
                # Concatenate and normalize
                combined = np.concatenate([skills_arr, research_arr])
                return combined / (np.linalg.norm(combined) + 1e-10)
            except Exception as e:
                logger.warning(f"Error loading precomputed vectors: {e}")
        
        # Fallback: use combined text
        combined_text = features.get('combined_text', '')
        if combined_text:
            # Simple TF-IDF on-the-fly (not ideal, but works)
            try:
                vector = self.tfidf_vectorizer.fit_transform([combined_text])
                return vector.toarray()[0]
            except Exception as e:
                logger.error(f"Error creating TF-IDF vector: {e}")
        
        return None
    
    def _cosine_similarity(self, vec1: Optional[np.ndarray], vec2: Optional[np.ndarray]) -> float:
        """Calculate cosine similarity between two vectors"""
        if vec1 is None or vec2 is None:
            return 0.5  # Neutral score if vectors missing
        
        try:
            # Ensure same length (pad with zeros if needed)
            max_len = max(len(vec1), len(vec2))
            vec1_padded = np.pad(vec1, (0, max_len - len(vec1)))
            vec2_padded = np.pad(vec2, (0, max_len - len(vec2)))
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1_padded, vec2_padded)
            norm1 = np.linalg.norm(vec1_padded)
            norm2 = np.linalg.norm(vec2_padded)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Ensure result is between 0 and 1
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.5
    
    # ========== Feature Preprocessing (for RabbitMQ event handlers) ==========
    
    def preprocess_text_features(
        self,
        skills: List[str],
        research_interests: List[str],
        additional_text: str = ""
    ) -> Dict:
        """
        Tiền xử lý text thành vectors (chạy trong RabbitMQ consumer)
        
        Returns:
            Dict with 'combined_text', 'skills_vector', 'research_vector'
        """
        try:
            # Combine all text
            skills_text = " ".join(skills) if skills else ""
            research_text = " ".join(research_interests) if research_interests else ""
            combined = f"{skills_text} {research_text} {additional_text}".strip()
            
            # Create TF-IDF vectors (simplified - in production use trained vectorizer)
            result = {
                'combined_text': combined,
                'skills_vector': [],
                'research_vector': []
            }
            
            # For now, store simple word frequency vectors
            # In production, use fitted TfidfVectorizer and save vectors
            if skills_text:
                result['skills_vector'] = self._simple_vectorize(skills_text)
            
            if research_text:
                result['research_vector'] = self._simple_vectorize(research_text)
            
            return result
            
        except Exception as e:
            logger.error(f"Error preprocessing features: {e}")
            return {
                'combined_text': "",
                'skills_vector': [],
                'research_vector': []
            }
    
    def _simple_vectorize(self, text: str, max_features: int = 100) -> List[float]:
        """Simple word frequency vectorization"""
        words = text.lower().split()
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return as list (JSON serializable)
        return list(word_freq.values())[:max_features]


# Global instance
matching_engine = MatchingEngine()
