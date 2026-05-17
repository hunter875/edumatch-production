package com.edumatch.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * DTO phản hồi chung
 */
@Data
@AllArgsConstructor
public class ApiResponse {
    private Boolean success;
    private String message;
}