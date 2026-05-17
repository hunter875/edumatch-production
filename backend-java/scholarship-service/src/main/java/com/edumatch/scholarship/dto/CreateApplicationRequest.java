package com.edumatch.scholarship.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.math.BigDecimal;

@Data
public class CreateApplicationRequest {
    @NotNull(message = "ID cơ hội là bắt buộc")
    private Long opportunityId;

    // Danh sách các tài liệu đính kèm (CV, v.v.)
    private List<ApplicationDocumentDto> documents;

    // --- CÁC TRƯỜNG BỔ SUNG TỪ FRONTEND ---
    // Thông tin ứng viên (tùy chọn, có thể lấy từ Auth-Service)
    private String applicantUserName;
    private String applicantEmail;
    private String phone;
    private BigDecimal gpa;

    // Nội dung đơn ứng tuyển
    private String coverLetter;
    private String motivation;
    private String additionalInfo;

    // Links
    private String portfolioUrl;
    private String linkedinUrl;
    private String githubUrl;
    // --- ------------------------------ ---
}