package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.client.ScoreRequest;
import com.edumatch.scholarship.dto.client.ScoreResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScholarshipMatchingClient {

    private final RestTemplate restTemplate;

    @Value("${app.services.matching-service.url}")
    private String matchingServiceUrl;

    public enum ScoreStatus {
        AVAILABLE,
        PROFILE_INCOMPLETE,
        NOT_APPLICABLE,
        UNAVAILABLE
    }

    public record ScoreResult(Float overallScore, ScoreStatus status) {}

    /**
     * Get matching score for a USER applicant against an opportunity.
     * Requires the user's access token to be forwarded to matching-service.
     * EMPLOYER/ADMIN callers should use the getMatchingScoreForProvider pathway instead.
     */
    public ScoreResult getMatchingScore(Long applicantId, Long opportunityId, String accessToken) {
        ScoreRequest request = new ScoreRequest(
                applicantId.toString(),
                opportunityId.toString()
        );

        String url = matchingServiceUrl + "/api/v1/match/score";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<ScoreRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<ScoreResponse> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, ScoreResponse.class);
            ScoreResponse body = response.getBody();
            return body == null
                    ? new ScoreResult(null, ScoreStatus.UNAVAILABLE)
                    : new ScoreResult(body.getOverallScore(), ScoreStatus.AVAILABLE);
        } catch (HttpClientErrorException.Unauthorized e) {
            log.error("Matching service auth failure (401) — JWT propagation issue: {}", e.getMessage());
            return new ScoreResult(null, ScoreStatus.UNAVAILABLE);
        } catch (HttpClientErrorException.Forbidden e) {
            log.warn("Matching service returned 403 for applicant={}: {}", applicantId, e.getMessage());
            return new ScoreResult(null, ScoreStatus.NOT_APPLICABLE);
        } catch (ResourceAccessException e) {
            log.warn("Matching service timeout/unreachable for applicant={}: {}", applicantId, e.getMessage());
            return new ScoreResult(null, ScoreStatus.UNAVAILABLE);
        } catch (Exception e) {
            log.error("Unexpected matching service error for applicant={}: {}", applicantId, e.getMessage());
            return new ScoreResult(null, ScoreStatus.UNAVAILABLE);
        }
    }
}
