package com.edumatch.scholarship.model;

/**
 * Canonical moderation status enum for opportunities/scholarships.
 * Replaces free-form String on the Opportunity entity.
 */
public enum ModerationStatus {

    PENDING,
    APPROVED,
    REJECTED;
}
