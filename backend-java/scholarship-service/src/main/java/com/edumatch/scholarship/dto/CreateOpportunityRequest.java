package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
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

    // --- TRƯỜNG MỚI CHO TIMELINE ---
    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;
    // --- ------------------------- ---

    @NotNull(message = "Scholarship amount is required")
    private BigDecimal scholarshipAmount; // MỚI: Tiền học bổng

    private BigDecimal minGpa;

    // --- TRƯỜNG MỚI CHO CẤU TRÚC ---
    @NotBlank(message = "Study mode is required")
    private String studyMode;

    @NotBlank(message = "Level is required")
    private String level;

    @NotNull(message = "Public status is required")
    private Boolean isPublic;
    // --- ------------------------- ---

    // --- TRƯỜNG MỚI CHO CONTACT ---
    private String contactEmail;

    private String website;
    // --- ------------------------- ---

    private List<String> tags;

    private List<String> requiredSkills;

}