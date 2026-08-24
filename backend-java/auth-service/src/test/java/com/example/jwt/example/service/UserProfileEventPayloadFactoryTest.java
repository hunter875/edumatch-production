package com.example.jwt.example.service;

import com.example.jwt.example.model.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UserProfileEventPayloadFactoryTest {

    @Test
    void preservesNullableGpaAndEmitsMatchingProfileFields() {
        User user = User.builder()
                .id(42L)
                .email("student@example.com")
                .major("Computer Science")
                .university("Example University")
                .yearOfStudy(3)
                .level("MASTER")
                .studyMode("FULL_TIME")
                .location("Vietnam")
                .nationality("VN")
                .preferredLocations("Canada, Singapore")
                .preferredFundingTypes("grant, full funding")
                .skills("Python, Machine Learning")
                .researchInterests("NLP, Retrieval")
                .updatedAt(LocalDateTime.parse("2026-08-24T12:30:00"))
                .build();

        Map<String, Object> payload = UserProfileEventPayloadFactory.fromUser(user);

        assertThat(payload).containsEntry("userId", "42");
        assertThat(payload).containsEntry("gpa", null);
        assertThat(payload).containsEntry("level", "MASTER");
        assertThat(payload).containsEntry("studyMode", "FULL_TIME");
        assertThat(payload).containsEntry("location", "Vietnam");
        assertThat(payload).containsEntry("nationality", "VN");
        assertThat(payload.get("preferredLocations")).asList().containsExactly("Canada", "Singapore");
        assertThat(payload.get("preferredFundingTypes")).asList().containsExactly("grant", "full funding");
        assertThat(payload.get("skills")).asList().containsExactly("Python", "Machine Learning");
        assertThat(payload.get("researchInterests")).asList().containsExactly("NLP", "Retrieval");
        assertThat(payload).containsEntry("profileVersion", "2026-08-24T12:30");
    }
}
