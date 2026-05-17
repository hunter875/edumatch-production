package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.Bookmark;
import com.edumatch.scholarship.model.Opportunity;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookmarkDto {

    private Long id; // ID của chính bookmark
    private Long applicantUserId;

    private OpportunityDto opportunity;

    // Hàm helper để chuyển từ Entity -> DTO
    public static BookmarkDto fromEntity(Bookmark bookmark, Opportunity opp) {

        OpportunityDto oppDto = OpportunityDto.fromEntity(opp);

        return BookmarkDto.builder()
                .id(bookmark.getId())
                .applicantUserId(bookmark.getApplicantUserId())
                .opportunity(oppDto)
                .build();
    }
}