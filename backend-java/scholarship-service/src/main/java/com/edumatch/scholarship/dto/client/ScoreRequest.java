package com.edumatch.scholarship.dto.client;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScoreRequest {
    private String applicantId;
    private String opportunityId;
}