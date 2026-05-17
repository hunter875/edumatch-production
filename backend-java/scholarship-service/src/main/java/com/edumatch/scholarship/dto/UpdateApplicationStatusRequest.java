package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateApplicationStatusRequest {
    @NotBlank(message = "Trạng thái là bắt buộc")
    private String status;
}