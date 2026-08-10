from app.matching import MatchingEngine


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
        },
    )

    assert score > 75
    assert breakdown["gpaMatch"] > 75
    assert breakdown["skillsMatch"] > 75
    assert breakdown["majorMatch"] == 100.0
    assert breakdown["_hardFiltersPassed"] is True
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
