package com.example.jwt.example.controller;

import com.example.jwt.example.dto.request.CreateEmployerRequestRequest;
import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.response.OrganizationRequestResponse;
import com.example.jwt.example.model.OrganizationRequest;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.service.OrganizationRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/employer")
@RequiredArgsConstructor
@Slf4j
public class EmployerRequestController {

    private final OrganizationRequestService organizationRequestService;
    private final UserRepository userRepository;

    /**
     * USER tạo request trở thành employer
     */
    @PostMapping("/request")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createEmployerRequest(@Valid @RequestBody CreateEmployerRequestRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

            OrganizationRequest orgRequest = organizationRequestService.createRequest(user.getId(), request);
            OrganizationRequestResponse response = organizationRequestService.toResponse(orgRequest);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating employer request", e);
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * USER xem request của chính mình
     */
    @GetMapping("/request/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getMyRequest() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

            java.util.Optional<OrganizationRequest> latestRequest = organizationRequestService
                    .getLatestRequestByUserId(user.getId());

            if (latestRequest.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("hasRequest", false);
                response.put("status", "NONE");
                response.put("message", "No employer request found");
                return ResponseEntity.ok(response);
            }

            OrganizationRequest request = latestRequest.get();
            OrganizationRequestResponse response = organizationRequestService.toResponse(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting my request", e);
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
}
