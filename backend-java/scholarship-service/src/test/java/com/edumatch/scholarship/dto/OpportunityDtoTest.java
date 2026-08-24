package com.edumatch.scholarship.dto;

import com.edumatch.scholarship.model.Opportunity;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class OpportunityDtoTest {

    @Test
    void emitsMatchingOpportunityContractFields() {
        Opportunity opportunity = Opportunity.builder()
                .id(101L)
                .creatorUserId(77L)
                .organizationId(7L)
                .title("AI Scholarship")
                .fullDescription("Research funding")
                .fundingType("full funding")
                .sourceUrl("https://example.edu/scholarship")
                .level("MASTER")
                .eligibleMajors("Computer Science, Data Science")
                .eligibleNationalities("VN,SG")
                .updatedAt(LocalDateTime.parse("2026-08-24T13:45:00"))
                .build();

        OpportunityDto dto = OpportunityDto.fromEntity(opportunity);

        assertThat(dto.getProviderId()).isEqualTo("77");
        assertThat(dto.getFundingType()).isEqualTo("full funding");
        assertThat(dto.getSourceUrl()).isEqualTo("https://example.edu/scholarship");
        assertThat(dto.getLevel()).isEqualTo("MASTER");
        assertThat(dto.getEligibleMajors()).containsExactly("Computer Science", "Data Science");
        assertThat(dto.getEligibleNationalities()).containsExactly("VN", "SG");
        assertThat(dto.getOpportunityVersion()).isEqualTo("2026-08-24T13:45");
        assertThat(dto.getMinGpa()).isNull();
    }
}
