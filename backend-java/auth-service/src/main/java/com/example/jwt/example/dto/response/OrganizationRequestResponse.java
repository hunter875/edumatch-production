package com.example.jwt.example.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrganizationRequestResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private String userName;
    private String organizationName;
    private String description;
    private String organizationType;
    private String website;
    private String email;
    private String phone;
    private String address;
    private String country;
    private String city;
    private String status; // PENDING, APPROVED, REJECTED
    private String rejectionReason;
    private Long reviewedBy;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

