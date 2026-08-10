package com.example.jwt.example.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScholarshipResponse {
    private Long id;
    private String title;
    private String provider;
    private String status; // PENDING, APPROVED, REJECTED
    private String description;
}
