package com.example.jwt.example.dto.request;

import lombok.Data;

@Data
public class RejectScholarshipRequest {
    private String reason; // Lý do từ chối
}
