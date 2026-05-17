package com.example.jwt.example.dto;

import lombok.Data;

@Data
public class TokenRefreshRequest {
    private String refreshToken;
}