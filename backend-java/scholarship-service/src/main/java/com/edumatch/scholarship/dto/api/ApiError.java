package com.edumatch.scholarship.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiError {
    private String timestamp;
    private int status;
    private String code;
    private String message;
    private String path;

    public static ApiError of(int status, String code, String message, String path) {
        return ApiError.builder()
                .timestamp(Instant.now().toString())
                .status(status)
                .code(code)
                .message(message)
                .path(path)
                .build();
    }
}
