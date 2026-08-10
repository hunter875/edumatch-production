package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateOpportunityRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255)
    private String title;

    @NotBlank(message = "Description is required")
    private String fullDescription;

    @NotNull(message = "Application deadline is required")
    @Future(message = "Application deadline must be in the future")
    private LocalDate applicationDeadline;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Scholarship amount is required")
    @PositiveOrZero(message = "Scholarship amount must be zero or positive")
    private BigDecimal scholarshipAmount;

    @DecimalMin(value = "0.0", message = "GPA must be at least 0.0")
    @DecimalMax(value = "4.0", message = "GPA must not exceed 4.0")
    private BigDecimal minGpa;

    @NotBlank(message = "Study mode is required")
    private String studyMode;

    @NotBlank(message = "Level is required")
    private String level;

    @NotNull(message = "Public status is required")
    private Boolean isPublic;

    @Email(message = "Contact email must be valid")
    private String contactEmail;

    @Pattern(
        regexp = "^(https?://.*)?$",
        message = "Website must use https:// scheme (or be empty)"
    )
    private String website;

    private List<String> tags;

    private List<String> requiredSkills;

    /** Validate date relationships after bean validation */
    @AssertTrue(message = "Application deadline must be on or before start date")
    public boolean isDeadlineBeforeStart() {
        if (applicationDeadline == null || startDate == null) return true; // let @NotNull handle
        return !applicationDeadline.isAfter(startDate);
    }

    @AssertTrue(message = "Start date must be before end date")
    public boolean isStartBeforeEnd() {
        if (startDate == null || endDate == null) return true;
        return startDate.isBefore(endDate);
    }
}