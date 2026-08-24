from app.schemas import ScholarshipCreatedEvent, UserProfileUpdatedEvent


def test_user_profile_event_preserves_nullable_gpa_and_version():
    event = UserProfileUpdatedEvent(
        userId="42",
        gpa=None,
        level="MASTER",
        nationality="VN",
        preferredFundingTypes=["grant"],
        profileVersion="2026-08-24T12:30:00",
    )

    assert event.gpa is None
    assert event.level == "MASTER"
    assert event.nationality == "VN"
    assert event.preferredFundingTypes == ["grant"]
    assert event.profileVersion == "2026-08-24T12:30:00"


def test_scholarship_event_accepts_provider_alias_and_matching_contract_fields():
    event = ScholarshipCreatedEvent(
        id=101,
        creatorUserId=77,
        fundingType="full funding",
        sourceUrl="https://example.edu/scholarship",
        eligibleMajors=["Computer Science"],
        eligibleNationalities=["VN"],
        opportunityVersion="2026-08-24T13:45:00",
    )

    assert event.get_opportunity_id() == "101"
    assert event.get_provider_id() == "77"
    assert event.fundingType == "full funding"
    assert event.sourceUrl == "https://example.edu/scholarship"
    assert event.eligibleMajors == ["Computer Science"]
    assert event.eligibleNationalities == ["VN"]
    assert event.opportunityVersion == "2026-08-24T13:45:00"
