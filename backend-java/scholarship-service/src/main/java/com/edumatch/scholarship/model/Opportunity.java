package com.edumatch.scholarship.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "opportunities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Opportunity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "full_description", columnDefinition = "TEXT")
    private String fullDescription;

    // --- Tham chiếu logic tới Auth-Service (Giữ nguyên) ---
    @Column(name = "creator_user_id", nullable = false)
    private Long creatorUserId;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;
    // ------------------------------------------------------

    // --- TIMELINE ---
    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;
    // ----------------

    // --- TÀI CHÍNH & YÊU CẦU ---
    @Column(name = "scholarship_amount", precision = 10, scale = 2)
    private BigDecimal scholarshipAmount;

    @Column(name = "min_gpa", precision = 3, scale = 2)
    private BigDecimal minGpa;

    // --- THÔNG TIN LIÊN HỆ ---
    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "website", length = 500)
    private String website;
    // --------------------------

    // --- THÔNG TIN ĐỊA ĐIỂM & TRƯỜNG HỌC ---
    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "university", length = 255)
    private String university;

    @Column(name = "department", length = 255)
    private String department;

    @Column(name = "duration_months")
    private Integer durationMonths;
    // ----------------------------------------

    // --- CẤU TRÚC MỚI ---
    @Column(name = "study_mode", length = 50)
    private String studyMode;

    @Column(name = "level", length = 50)
    private String level;

    @Column(name = "is_public")
    private Boolean isPublic = false;
    // ---------------------

    @Column(name = "moderation_status", length = 50)
    private String moderationStatus = "PENDING";

    @Column(name = "views_cnt")
    private Integer viewsCnt = 0;

    // --- Many-to-Many ---
    @ManyToMany(fetch = FetchType.LAZY, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(
            name = "opportunity_to_tags",
            joinColumns = @JoinColumn(name = "opportunity_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags;

    @ManyToMany(fetch = FetchType.LAZY, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(
            name = "opportunity_required_skills",
            joinColumns = @JoinColumn(name = "opportunity_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> requiredSkills;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
