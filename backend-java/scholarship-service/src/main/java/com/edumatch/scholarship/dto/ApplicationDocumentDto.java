package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApplicationDocumentDto {
    @NotBlank(message = "Tên tài liệu là bắt buộc")
    private String documentName;

    @NotBlank(message = "Đường dẫn tài liệu là bắt buộc")
    private String documentUrl;
}