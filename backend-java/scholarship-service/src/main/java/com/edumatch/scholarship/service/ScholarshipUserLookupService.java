package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Looks up the CURRENT authenticated user via Auth-Service self endpoint.
 *
 * Prior implementation forwarded the user token to /api/internal/user/{username}
 * which required ROLE_ADMIN / ROLE_SERVICE — roles ordinary users do not hold.
 * The fix uses GET /api/user/me which reads the authenticated principal directly
 * from the SecurityContext inside Auth-Service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScholarshipUserLookupService {

    private final RestTemplate restTemplate;

    @Value("${app.services.auth-service.url}")
    private String authServiceUrl;

    /**
     * Get details of the CURRENTLY authenticated user via self endpoint.
     * The caller must pass the user's own access token.
     */
    public UserDetailDto getCurrentUserDetails(String token) {
        String url = authServiceUrl + "/api/user/me";

        log.debug("Calling Auth-Service self endpoint: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<UserDetailDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    UserDetailDto.class
            );
            UserDetailDto user = response.getBody();

            if (user == null || user.getId() == null) {
                throw new ResourceNotFoundException("Cannot load current user identity from Auth-Service.");
            }

            log.debug("Resolved current user: id={}, username={}", user.getId(), user.getUsername());
            return user;
        } catch (HttpClientErrorException.Unauthorized ex) {
            log.error("Token rejected by Auth-Service self endpoint: {}", ex.getMessage());
            throw new IllegalStateException("Invalid token when calling Auth-Service.");
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("Current user not found in Auth-Service.");
        } catch (Exception ex) {
            log.error("Failed to call Auth-Service self endpoint: {}", ex.getMessage());
            throw new IllegalStateException("Cannot connect to Auth-Service.");
        }
    }

    /**
     * Same as getCurrentUserDetails but additionally validates that the user
     * belongs to an organization (required for provider operations).
     */
    public UserDetailDto getCurrentProviderDetails(String token) {
        UserDetailDto user = getCurrentUserDetails(token);
        if (user.getOrganizationId() == null) {
            log.error("Provider {} has no organizationId.", user.getUsername());
            throw new AccessDeniedException("Provider account must belong to an organization.");
        }
        return user;
    }

    // ---- retained for backward compatibility with callers that pass username+token ----

    /**
     * @deprecated Use {@link #getCurrentUserDetails(String)} instead.
     * The username parameter is ignored; identity is resolved from the token.
     */
    @Deprecated
    public UserDetailDto getUserDetails(String username, String token) {
        return getCurrentUserDetails(token);
    }

    /**
     * @deprecated Use {@link #getCurrentProviderDetails(String)} instead.
     * The username parameter is ignored; identity is resolved from the token.
     */
    @Deprecated
    public UserDetailDto getProviderDetails(String username, String token) {
        return getCurrentProviderDetails(token);
    }
}
