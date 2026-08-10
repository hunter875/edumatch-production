package com.edumatch.scholarship.model;

/**
 * Canonical application status enum.
 * Replaces free-form String status on the Application entity.
 */
public enum ApplicationStatus {

    PENDING,
    UNDER_REVIEW,
    WAITLISTED,
    ACCEPTED,
    REJECTED;

    /**
     * Returns true if {@code from -> to} is a valid provider transition.
     * Admin may have an extended policy (see service layer).
     */
    public boolean canTransitionTo(ApplicationStatus to) {
        if (to == null) return false;
        switch (this) {
            case PENDING:
                return to == UNDER_REVIEW || to == WAITLISTED || to == ACCEPTED || to == REJECTED;
            case UNDER_REVIEW:
                return to == WAITLISTED || to == ACCEPTED || to == REJECTED;
            case WAITLISTED:
                return to == UNDER_REVIEW || to == ACCEPTED || to == REJECTED;
            case ACCEPTED:
            case REJECTED:
                return false; // terminal
            default:
                return false;
        }
    }

    public boolean isTerminal() {
        return this == ACCEPTED || this == REJECTED;
    }
}
