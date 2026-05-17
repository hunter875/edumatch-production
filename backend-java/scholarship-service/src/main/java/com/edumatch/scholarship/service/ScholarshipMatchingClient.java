package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.client.ScoreRequest;
import com.edumatch.scholarship.dto.client.ScoreResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScholarshipMatchingClient {

    private final RestTemplate restTemplate;

    @Value("${app.services.matching-service.url}")
    private String matchingServiceUrl;

    public Float getMatchingScore(Long applicantId, Long opportunityId) {
        ScoreRequest request = new ScoreRequest(
                applicantId.toString(),
                opportunityId.toString()
        );

        String url = matchingServiceUrl + "/api/v1/match/score";

        try {
            ScoreResponse response = restTemplate.postForObject(url, request, ScoreResponse.class);
            return response == null ? null : response.getOverallScore();
        } catch (Exception e) {
            log.error("Failed to call MatchingService match/score: {}", e.getMessage());
            return null;
        }
    }
}
