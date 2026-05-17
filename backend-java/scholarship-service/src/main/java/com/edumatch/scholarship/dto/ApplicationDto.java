package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.ApplicationDocument;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
public class ApplicationDto {
    private Long id;
    private Long applicantUserId;
    private Long opportunityId;
    private String opportunityTitle; // Thêm title của opportunity
    private String status;
    private LocalDateTime submittedAt;
    private List<ApplicationDocumentDto> documents;

    // --- CÁC TRƯỜNG BỔ SUNG TỪ FRONTEND ---
    private String applicantUserName;
    private String applicantEmail;
    private String phone;
    private java.math.BigDecimal gpa;
    private String coverLetter;
    private String motivation;
    private String additionalInfo;
    private String portfolioUrl;
    private String linkedinUrl;
    private String githubUrl;
    // --- ------------------------------ ---

    // Hàm helper để chuyển từ Entity -> DTO
    public static ApplicationDto fromEntity(Application app, List<ApplicationDocument> docs) {

        List<ApplicationDocumentDto> docDtos = docs.stream()
                .map(doc -> {
                    ApplicationDocumentDto dto = new ApplicationDocumentDto();
                    dto.setDocumentName(doc.getDocumentName());
                    dto.setDocumentUrl(doc.getDocumentUrl());
                    return dto;
                })
                .collect(Collectors.toList());

        return ApplicationDto.builder()
                .id(app.getId())
                .applicantUserId(app.getApplicantUserId())
                .opportunityId(app.getOpportunityId())
                .status(app.getStatus())
                .submittedAt(app.getSubmittedAt())
                .documents(docDtos)
                .applicantUserName(app.getApplicantUserName())
                .applicantEmail(app.getApplicantEmail())
                .phone(app.getPhone())
                .gpa(app.getGpa())
                .coverLetter(app.getCoverLetter())
                .motivation(app.getMotivation())
                .additionalInfo(app.getAdditionalInfo())
                .portfolioUrl(app.getPortfolioUrl())
                .linkedinUrl(app.getLinkedinUrl())
                .githubUrl(app.getGithubUrl())
                .build();
    }

    // Hàm helper thứ 2 (khi không có document)
    public static ApplicationDto fromEntity(Application app) {
        return fromEntity(app, List.of()); // Gọi lại hàm trên với list rỗng
    }
}