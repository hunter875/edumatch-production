package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ModerateRequestDto {
    @NotBlank(message = "Trạng thái là bắt buộc")
    // Trạng thái mới, ví dụ: "APPROVED" hoặc "REJECTED"
    private String status;
}