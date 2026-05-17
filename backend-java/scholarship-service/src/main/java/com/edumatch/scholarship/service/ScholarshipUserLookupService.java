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

@Service
@RequiredArgsConstructor
@Slf4j
public class ScholarshipUserLookupService {

    private final RestTemplate restTemplate;

    @Value("${app.services.auth-service.url}")
    private String authServiceUrl;

    public UserDetailDto getUserDetails(String username, String token) {
        String url = authServiceUrl + "/api/internal/user/" + username;

        log.info("Calling Auth-Service to get user details for: {}", username);
        log.debug("Auth-Service URL: {}", url);

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
                throw new ResourceNotFoundException("Cannot load user id from Auth-Service.");
            }

            log.info("Received user details from Auth-Service, userId={}", user.getId());
            return user;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResourceNotFoundException("User not found in Auth-Service: " + username);
        } catch (HttpClientErrorException.Unauthorized ex) {
            log.error("Token rejected by Auth-Service: {}", ex.getMessage());
            throw new IllegalStateException("Invalid token when calling Auth-Service.");
        } catch (Exception ex) {
            log.error("Failed to call Auth-Service: {}", ex.getMessage());
            throw new IllegalStateException("Cannot connect to Auth-Service.");
        }
    }

    public UserDetailDto getProviderDetails(String username, String token) {
        UserDetailDto user = getUserDetails(username, token);
        if (user.getOrganizationId() == null) {
            log.error("Provider {} has no organizationId.", username);
            throw new AccessDeniedException("Provider account must belong to an organization.");
        }
        return user;
    }
}
