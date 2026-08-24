from app.matching import HYBRID_V2_WEIGHTS, MatchingEngine


def test_hybrid_v2_weights_sum_to_one():
    assert sum(HYBRID_V2_WEIGHTS.values()) == 1.0


def test_gpa_hard_filter_zeroes_ineligible_candidate():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {"gpa": 3.1, "major": "Computer Science", "skills": ["Python"]},
        {"min_gpa": 3.5, "preferred_majors": ["Computer Science"], "required_skills": ["Python"]},
    )

    assert score == 0.0
    assert breakdown["gpaMatch"] == 0.0
    assert breakdown["skillsMatch"] == 0.0
    assert breakdown["_hardFiltersPassed"] is False
    assert "gpa_below_requirement" in breakdown["_constraintViolations"]


def test_non_public_opportunity_is_hard_filtered():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {"gpa": 3.9, "major": "Computer Science", "skills": ["Python"]},
        {
            "min_gpa": 3.0,
            "is_public": False,
            "moderation_status": "APPROVED",
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python"],
        },
    )

    assert score == 0.0
    assert breakdown["majorMatch"] == 0.0


def test_expired_opportunity_is_hard_filtered():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {"gpa": 3.9, "major": "Computer Science", "skills": ["Python"]},
        {
            "min_gpa": 3.0,
            "deadline_days": -1,
            "moderation_status": "APPROVED",
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python"],
        },
    )

    assert score == 0.0
    assert breakdown["opportunityBoost"] == 0.0


def test_rule_score_includes_explainable_breakdown():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {
            "gpa": 3.8,
            "major": "Computer Science",
            "skills": ["Python", "Machine Learning", "SQL"],
            "research_interests": ["Artificial Intelligence"],
        },
        {
            "min_gpa": 3.4,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python", "Machine Learning"],
            "research_areas": ["Artificial Intelligence"],
            "tfidf_score": 0.8,
        },
    )

    assert score > 75
    assert breakdown["gpaMatch"] > 75
    assert breakdown["skillsMatch"] > 75
    assert breakdown["majorMatch"] == 100.0
    assert breakdown["_hardFiltersPassed"] is True
    assert breakdown["_eligibilityStatus"] == "ELIGIBLE"
    assert breakdown["_components"]["textSimilarity"] == 0.8
    assert breakdown["_explanations"]


def test_study_mode_mismatch_is_hard_filtered_when_both_sides_are_explicit():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {
            "gpa": 3.8,
            "major": "Computer Science",
            "study_mode": "FULL_TIME",
            "skills": ["Python"],
        },
        {
            "min_gpa": 3.0,
            "study_mode": "ONLINE",
            "moderation_status": "APPROVED",
            "required_skills": ["Python"],
        },
    )

    assert score == 0.0
    assert "study_mode_mismatch" in breakdown["_constraintViolations"]


def test_missing_required_profile_data_marks_eligibility_unknown_not_ineligible():
    engine = MatchingEngine()

    score, breakdown = engine.calculate_rule_based_score(
        {
            "major": "Computer Science",
            "skills": ["Python", "Machine Learning"],
            "research_interests": ["AI"],
        },
        {
            "min_gpa": 3.4,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python"],
            "research_areas": ["AI"],
            "tfidf_score": 0.7,
        },
    )

    assert score > 0
    assert breakdown["_hardFiltersPassed"] is True
    assert breakdown["_constraintViolations"] == []
    assert breakdown["_eligibilityStatus"] == "UNKNOWN"
    assert "gpa" in breakdown["_missingInformation"]


def test_hybrid_recommendations_fit_tfidf_on_opportunity_corpus_once():
    engine = MatchingEngine()
    applicant = {
        "gpa": 3.9,
        "major": "Computer Science",
        "skills": ["Python", "Machine Learning"],
        "research_interests": ["Natural Language Processing"],
    }
    opportunities = [
        {
            "id": "ai",
            "title": "Applied AI Scholarship",
            "description": "Machine learning and natural language processing research with Python.",
            "min_gpa": 3.2,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python", "Machine Learning"],
            "research_areas": ["Natural Language Processing"],
            "moderation_status": "APPROVED",
        },
        {
            "id": "security",
            "title": "Security Policy Scholarship",
            "description": "Governance, compliance, and public policy research.",
            "min_gpa": 3.2,
            "preferred_majors": ["Public Policy"],
            "required_skills": ["Writing"],
            "research_areas": ["Compliance"],
            "moderation_status": "APPROVED",
        },
    ]

    results = engine.calculate_hybrid_recommendations(applicant, opportunities)

    assert [item["candidate_id"] for item in results] == ["ai", "security"]
    assert results[0]["components"]["textSimilarity"] > results[1]["components"]["textSimilarity"]
    assert results[0]["model_version"] == "hybrid-v2.0"


def test_hybrid_recommendations_are_deterministic_for_same_input():
    engine = MatchingEngine()
    applicant = {
        "gpa": 3.8,
        "major": "Computer Science",
        "skills": ["Python", "Data Science"],
        "research_interests": ["AI"],
    }
    opportunities = [
        {
            "id": "one",
            "title": "AI Fellowship",
            "description": "AI and data science",
            "min_gpa": 3.0,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python"],
            "research_areas": ["AI"],
            "moderation_status": "APPROVED",
        },
        {
            "id": "two",
            "title": "Data Fellowship",
            "description": "Data science analytics",
            "min_gpa": 3.0,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Data Science"],
            "research_areas": ["AI"],
            "moderation_status": "APPROVED",
        },
    ]

    first = engine.calculate_hybrid_recommendations(applicant, opportunities)
    second = engine.calculate_hybrid_recommendations(applicant, opportunities)

    assert first == second


def test_hybrid_recommendations_cap_provider_concentration_in_top_ten():
    engine = MatchingEngine()
    results = [
        {"candidate_id": f"a-{index}", "score": 100 - index, "provider_id": "provider-a"}
        for index in range(6)
    ] + [
        {"candidate_id": f"b-{index}", "score": 80 - index, "provider_id": f"provider-b-{index}"}
        for index in range(8)
    ]

    diversified = engine._diversify_results(results)

    top_ten_provider_a = [
        item for item in diversified[:10]
        if item["provider_id"] == "provider-a"
    ]
    assert len(top_ten_provider_a) == 3
    assert len({item["candidate_id"] for item in diversified}) == len(diversified)


def test_ineligible_text_matches_cannot_crowd_out_eligible_candidate():
    engine = MatchingEngine()
    applicant = {
        "gpa": 3.8,
        "major": "Computer Science",
        "skills": ["Python", "Machine Learning"],
        "research_interests": ["AI"],
    }
    opportunities = [
        {
            "id": f"ineligible-{index}",
            "title": "Perfect AI Python Machine Learning Scholarship",
            "description": "Python machine learning AI research scholarship",
            "min_gpa": 4.0,
            "preferred_majors": ["Computer Science"],
            "required_skills": ["Python", "Machine Learning"],
            "research_areas": ["AI"],
            "moderation_status": "APPROVED",
        }
        for index in range(200)
    ]
    opportunities.append({
        "id": "eligible-low-text",
        "title": "General STEM award",
        "description": "Broad academic funding",
        "min_gpa": 3.0,
        "preferred_majors": ["Computer Science"],
        "required_skills": ["Python"],
        "research_areas": ["Education"],
        "moderation_status": "APPROVED",
    })

    results = engine.calculate_hybrid_recommendations(applicant, opportunities, retrieval_limit=200)

    assert [item["candidate_id"] for item in results] == ["eligible-low-text"]
    assert results[0]["eligibility_status"] == "ELIGIBLE"


def test_unknown_recommendations_sort_after_eligible_and_explain_missing_data():
    engine = MatchingEngine()
    applicant = {
        "major": "Computer Science",
        "skills": ["Python"],
    }
    opportunities = [
        {
            "id": "unknown",
            "title": "Python scholarship",
            "description": "Python",
            "min_gpa": 3.0,
            "required_skills": ["Python"],
            "moderation_status": "APPROVED",
        },
        {
            "id": "eligible",
            "title": "General award",
            "description": "General",
            "required_skills": [],
            "moderation_status": "APPROVED",
        },
    ]

    results = engine.calculate_hybrid_recommendations(applicant, opportunities)

    assert [item["candidate_id"] for item in results] == ["eligible", "unknown"]
    assert results[1]["eligibility_status"] == "UNKNOWN"
    assert "gpa" in results[1]["missing_information"]
    assert any("missing applicant field: gpa" in reason for reason in results[1]["reasons"])
