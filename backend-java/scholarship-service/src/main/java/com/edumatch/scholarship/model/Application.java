package com.edumatch.scholarship.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Khóa chính kiểu Long

    // --- Tham chiếu logic ---
    // ID của User (vai trò USER) nộp đơn
    @Column(name = "applicant_user_id", nullable = false)
    private Long applicantUserId; // BẮT BUỘC là Long

    // ID của Opportunity mà họ nộp đơn
    @Column(name = "opportunity_id", nullable = false)
    private Long opportunityId; // BẮT BUỘC là Long
    // --- ----------------- ---

    // Trạng thái đơn: PENDING, APPROVED, REJECTED
    @Column(length = 50, nullable = false)
    private String status;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
   private LocalDateTime submittedAt;

    // Ghi chú của nhà tuyển dụng (ví dụ: lý do từ chối)
    @Column(columnDefinition = "TEXT")
    private String notes;

    // --- CÁC TRƯỜNG BỔ SUNG TỪ FRONTEND ---
    // Thông tin ứng viên
    @Column(name = "applicant_user_name", length = 255)
    private String applicantUserName;

    @Column(name = "applicant_email", length = 255)
    private String applicantEmail;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "gpa", precision = 3, scale = 2)
    private java.math.BigDecimal gpa;

    // Nội dung đơn ứng tuyển
    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    @Column(name = "motivation", columnDefinition = "TEXT")
    private String motivation;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo;

    // Links
    @Column(name = "portfolio_url", length = 500)
    private String portfolioUrl;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    @Column(name = "github_url", length = 500)
    private String githubUrl;
    // --- ------------------------------ ---
}