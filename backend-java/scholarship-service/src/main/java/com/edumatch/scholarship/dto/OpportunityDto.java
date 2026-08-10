package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.model.Skill;
import com.edumatch.scholarship.model.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OpportunityDto {
    private Long id; 
    private String title; 
    private String description; 
    private Long organizationId; 
    private Long creatorUserId; 

    private LocalDate applicationDeadline; 

    // --- TRƯỜNG MỚI CHO TIMELINE ---
    private LocalDate startDate;
    private LocalDate endDate;
    // --- ------------------------ ---

    private BigDecimal minGpa; 
    private BigDecimal scholarshipAmount; // MỚI: Tiền học bổng

    // --- TRƯỜNG MỚI CHO CẤU TRÚC ---
    private String studyMode;
    private String level;
    private Boolean isPublic;
    // --- ------------------------ ---

    // --- TRƯỜNG MỚI CHO CONTACT ---
    private String contactEmail;
    private String website;
    // --- ------------------------ ---

    // --- TRƯỜNG MỚI CHO ĐỊA ĐIỂM & TRƯỜNG HỌC ---
    private String location;
    private String university;
    private String department;
    private Integer durationMonths;
    // --- ---------------------------------------- ---

    private List<String> tags; // 
    private List<String> requiredSkills; // 

    // private String minExperienceLevel; // ĐÃ XÓA
    // private String position; // ĐÃ XÓA 

    private String moderationStatus; // 
    private Integer viewsCnt; // 
    private Long applicationCount;

    // Hàm helper để chuyển từ Entity (Database) -> DTO (API)
    public static OpportunityDto fromEntity(Opportunity opp) {
        return OpportunityDto.builder()
                .id(opp.getId()) 
                .title(opp.getTitle())
                .description(opp.getFullDescription())
                .organizationId(opp.getOrganizationId())
                .creatorUserId(opp.getCreatorUserId())
                .applicationDeadline(opp.getApplicationDeadline()) 

                // ÁNH XẠ CÁC TRƯỜNG MỚI
                .startDate(opp.getStartDate())
                .endDate(opp.getEndDate())
                .scholarshipAmount(opp.getScholarshipAmount())
                .studyMode(opp.getStudyMode())
                .level(opp.getLevel())
                .isPublic(opp.getIsPublic())
                .contactEmail(opp.getContactEmail())
                .website(opp.getWebsite())

                // ÁNH XẠ ĐỊA ĐIỂM & TRƯỜNG HỌC
                .location(opp.getLocation())
                .university(opp.getUniversity())
                .department(opp.getDepartment())
                .durationMonths(opp.getDurationMonths())

                .minGpa(opp.getMinGpa())

                // ÁNH XẠ CÁC TRƯỜNG M2M VÀ STATUS CŨ
                .tags((opp.getTags() == null ? Set.<Tag>of() : opp.getTags()).stream()
                        .map(Tag::getName)
                        .collect(Collectors.toList())) // 
                .requiredSkills((opp.getRequiredSkills() == null ? Set.<Skill>of() : opp.getRequiredSkills()).stream()
                        .map(Skill::getName)
                        .collect(Collectors.toList()))

                .moderationStatus(opp.getModerationStatus() != null ? opp.getModerationStatus().name() : null)
                .viewsCnt(opp.getViewsCnt())
                .applicationCount(0L)
                .build();
    }
}
