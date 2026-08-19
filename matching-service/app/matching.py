"""
Matching algorithms - Rule-based and ML-based scoring
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Any, List, Dict, Optional, Tuple
import json
import logging

logger = logging.getLogger(__name__)

RULE_SCORER_VERSION = "rule-v2-location-soft"

class MatchingEngine:
    """Core matching algorithms"""
    
    def __init__(self):
        self.rule_version = RULE_SCORER_VERSION
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            min_df=2,
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
        scores: Dict[str, Any] = {}
        applicant_gpa = applicant_data.get('gpa')
        required_gpa = opportunity_data.get('min_gpa')
        violations = self._hard_filter_violations(applicant_data, opportunity_data)

        if violations:
            return 0.0, self._zero_breakdown(violations)
        
        # 1. GPA Score (hard filter already passed)
        scores['gpaMatch'] = self._calculate_gpa_score(
            applicant_gpa,
            required_gpa
        )
        
        # 2. Skills Score
        scores['skillsMatch'] = self._calculate_skills_overlap(
            applicant_data.get('skills', []),
            opportunity_data.get('required_skills', [])
        )

        # 3. Major/field Score
        scores['majorMatch'] = self._calculate_major_score(
            applicant_data.get('major'),
            opportunity_data.get('preferred_majors', [])
        )
        
        # 4. Research Score - optional
        scores['researchMatch'] = self._calculate_skills_overlap(
            applicant_data.get('research_interests', []),
            opportunity_data.get('research_areas', [])
        )

        # Missing optional profile dimensions stay neutral; present mismatches
        # are already rejected by the hard-filter gate above.
        scores['levelMatch'] = self._calculate_optional_exact_match(
            applicant_data.get('level'),
            opportunity_data.get('level')
        )
        scores['locationStudyModeMatch'] = (
            self._calculate_optional_exact_match(applicant_data.get('location'), opportunity_data.get('location')) * 0.5
            + self._calculate_optional_exact_match(applicant_data.get('study_mode'), opportunity_data.get('study_mode')) * 0.5
        )
        scores['opportunityBoost'] = self._calculate_opportunity_boost(opportunity_data)
        
        # Rule-based formula. Hard constraints gate eligibility; weights rank
        # only the opportunities that survive those constraints.
        overall = (
            scores['skillsMatch'] * 0.35 +
            scores['majorMatch'] * 0.25 +
            scores['gpaMatch'] * 0.15 +
            scores['levelMatch'] * 0.10 +
            scores['locationStudyModeMatch'] * 0.10 +
            scores['opportunityBoost'] * 0.05
        )
        
        scores['_hardFiltersPassed'] = True
        scores['_constraintViolations'] = []
        scores['_explanations'] = self._build_explanations(scores, applicant_data, opportunity_data)
        scores['_algorithmVersion'] = self.rule_version

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
            '_algorithmVersion': self.rule_version,
            '_explanations': [
                f"Rejected by hard filter: {violation}"
                for violation in violation_list
            ],
        }

    def _fails_hard_filters(self, applicant_data: Dict, opportunity_data: Dict) -> bool:
        return bool(self._hard_filter_violations(applicant_data, opportunity_data))

    def _hard_filter_violations(self, applicant_data: Dict, opportunity_data: Dict) -> List[str]:
        violations: List[str] = []

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
        if (
            applicant_gpa is not None
            and required_gpa is not None
            and float(applicant_gpa) < float(required_gpa)
        ):
            violations.append('gpa_below_requirement')

        if not self._optional_constraint_compatible(applicant_data.get('level'), opportunity_data.get('level')):
            violations.append('level_mismatch')

        if (
            opportunity_data.get('location_required') is True
            and not self._location_compatible(applicant_data.get('location'), opportunity_data.get('location'))
        ):
            violations.append('location_mismatch')

        if not self._study_mode_compatible(applicant_data.get('study_mode'), opportunity_data.get('study_mode')):
            violations.append('study_mode_mismatch')

        return violations

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
        explanations = [
            f"Skills overlap score {scores['skillsMatch']:.1f}/100",
            f"Major or field score {scores['majorMatch']:.1f}/100",
            f"GPA fit score {scores['gpaMatch']:.1f}/100",
        ]

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
