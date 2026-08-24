from types import SimpleNamespace

from app.matching import HYBRID_RANKING_SCORE_TYPE, RULE_COMPATIBILITY_SCORE_TYPE, matching_engine
from app.service import MatchingService


def test_score_response_contract_is_rule_compatibility_without_corpus():
    service = MatchingService(db=None)

    response = service._build_score_response(
        81.25,
        {
            "gpaMatch": 90.0,
            "skillsMatch": 80.0,
            "majorMatch": 100.0,
            "researchMatch": 75.0,
            "levelMatch": 100.0,
            "locationStudyModeMatch": 75.0,
            "opportunityBoost": 50.0,
            "_hardFiltersPassed": True,
            "_constraintViolations": [],
            "_explanations": ["Pair is compatible"],
            "_algorithmVersion": matching_engine.rule_version,
            "_modelVersion": matching_engine.rule_version,
            "_scoreType": RULE_COMPATIBILITY_SCORE_TYPE,
            "_corpusVersion": None,
        },
    )

    assert response.scoreType == RULE_COMPATIBILITY_SCORE_TYPE
    assert response.modelVersion == matching_engine.rule_version
    assert response.corpusVersion is None


def test_score_api_cache_rejects_hybrid_ranking_rows():
    service = MatchingService(db=None)
    hybrid_score_row = SimpleNamespace(
        score_breakdown={
            "_algorithmVersion": matching_engine.rule_version,
            "_scoreType": HYBRID_RANKING_SCORE_TYPE,
            "_corpusVersion": "opportunity-corpus:hybrid-v2.0:abc123",
        },
        expires_at=None,
    )

    assert service._is_cache_valid(hybrid_score_row) is False


def test_recommendation_response_preserves_hybrid_ranking_contract():
    service = MatchingService(db=None)

    response = service._build_recommendation_response(
        "applicant",
        [
            {
                "candidate_id": "opp-1",
                "score": 92.0,
                "rank": 1,
                "score_type": HYBRID_RANKING_SCORE_TYPE,
                "model_version": matching_engine.rule_version,
                "corpus_version": "opportunity-corpus:hybrid-v2.0:abc123",
            }
        ],
        limit=10,
        page=1,
    )

    assert response.data[0].scoreType == HYBRID_RANKING_SCORE_TYPE
    assert response.data[0].modelVersion == matching_engine.rule_version
    assert response.data[0].corpusVersion == "opportunity-corpus:hybrid-v2.0:abc123"
