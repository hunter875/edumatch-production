package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateApplicationStatusRequest {
    @NotNull(message = "Trạng thái là bắt buộc")
    private ApplicationStatus status;
}
