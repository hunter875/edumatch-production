package com.example.jwt.example.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    @Size(max = 50)
    private String firstName;

    @Size(max = 50)
    private String lastName;

    @Size(max = 10)
    private String sex; // MALE, FEMALE, OTHER

    @Size(max = 20)
    private String phone;

    private LocalDate dateOfBirth;

    @Size(max = 2000)
    private String bio;

    @Size(max = 500)
    private String avatarUrl;

    // ========== Matching System Fields ==========
    private Double gpa;

    @Size(max = 100)
    private String major;

    @Size(max = 200)
    private String university;

    private Integer yearOfStudy;

    @Size(max = 1000)
    private String skills; // Comma-separated: "Python,Java,Machine Learning"

    @Size(max = 1000)
    private String researchInterests; // Comma-separated: "AI,NLP,Computer Vision"
    // ============================================
}

