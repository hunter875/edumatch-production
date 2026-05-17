package com.edumatch.scholarship.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OpportunityDetailDto {
    private OpportunityDto opportunity;
    private Float matchScore;

    public OpportunityDetailDto(OpportunityDto opportunity) {
        this.opportunity = opportunity;
        this.matchScore = null;
    }
}
