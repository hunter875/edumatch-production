package com.example.jwt.example.service;

import com.example.jwt.example.model.User;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class UserProfileEventPayloadFactory {

    /** Field the consumer reads to claim an event for exactly-once processing. */
    public static final String EVENT_ID_FIELD = "event_id";

    private UserProfileEventPayloadFactory() {
    }

    /**
     * Build the user.profile.updated payload.
     *
     * <p>The consumer claims each delivery in a {@code processed_events} ledger
     * keyed on {@code event_id}; without that field it skips the claim entirely
     * and duplicate deliveries are processed again. Every event therefore carries
     * a fresh identifier. A retry of the same logical event must reuse the id, so
     * callers that retry should serialise and re-send this same payload rather
     * than rebuilding it.
     */
    public static Map<String, Object> fromUser(User user) {
        Map<String, Object> payload = new HashMap<>();
        payload.put(EVENT_ID_FIELD, UUID.randomUUID().toString());
        payload.put("userId", user.getId().toString());
        payload.put("email", user.getEmail());
        payload.put("gpa", user.getGpa());
        payload.put("major", user.getMajor());
        payload.put("university", user.getUniversity());
        payload.put("yearOfStudy", user.getYearOfStudy());
        payload.put("level", user.getLevel());
        payload.put("studyMode", user.getStudyMode());
        payload.put("location", user.getLocation());
        payload.put("nationality", user.getNationality());
        payload.put("preferredLocations", splitCsv(user.getPreferredLocations()));
        payload.put("preferredFundingTypes", splitCsv(user.getPreferredFundingTypes()));
        payload.put("skills", splitCsv(user.getSkills()));
        payload.put("researchInterests", splitCsv(user.getResearchInterests()));
        payload.put("profileVersion", profileVersion(user));
        return payload;
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static String profileVersion(User user) {
        LocalDateTime marker = user.getUpdatedAt() != null ? user.getUpdatedAt() : user.getCreatedAt();
        if (marker != null) {
            return marker.toString();
        }
        return "user-" + user.getId();
    }
}
