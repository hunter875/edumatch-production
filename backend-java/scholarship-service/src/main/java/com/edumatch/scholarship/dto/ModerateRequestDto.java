package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.ModerationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ModerateRequestDto {
    @NotNull(message = "Trạng thái là bắt buộc")
    private ModerationStatus status;
}
