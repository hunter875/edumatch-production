package com.example.jwt.example.controller;

import com.example.jwt.example.dto.request.RejectEmployerRequestRequest;
import com.example.jwt.example.dto.request.SignUpRequest;
import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.response.OrganizationRequestResponse;
import com.example.jwt.example.dto.response.UserResponse;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.AuditLog;
import com.example.jwt.example.model.OrganizationRequest;
import com.example.jwt.example.model.User;
import com.example.jwt.example.service.OrganizationRequestService;
import com.example.jwt.example.service.UserService;
import com.example.jwt.example.service.AuditLogService;
import com.example.jwt.example.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.beans.factory.annotation.Value;
import jakarta.validation.Valid;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final OrganizationRequestService organizationRequestService;
    private final RestTemplate restTemplate;
    
    @Value("${app.services.scholarship-service.url:http://localhost:8082}")
    private String scholarshipServiceUrl;

    @PostMapping("/create-employer")
    public ResponseEntity<?> createRecruiter(@RequestBody SignUpRequest request) {
        try {
            userService.createEmployer(request);
            return ResponseEntity.ok(new ApiResponse(true, "Recruiter created successfully"));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    @PostMapping("/create-user")
    public ResponseEntity<?> createUser(@RequestBody SignUpRequest request) {
        try {
            userService.createUser(request);
            return ResponseEntity.ok(new ApiResponse(true, "User created successfully"));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    // lấy tất cả user với pagination
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) String keyword
    ) {
        Page<User> pageUsers = userService.getAllUsers(role, enabled, keyword, page, size);
        List<UserResponse> responseList = userService.toUserResponseList(pageUsers.getContent());
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", responseList);
        response.put("currentPage", pageUsers.getNumber());
        response.put("totalItems", pageUsers.getTotalElements());
        response.put("totalPages", pageUsers.getTotalPages());
        response.put("pageSize", pageUsers.getSize());
        
        return ResponseEntity.ok(response);
    }
    // lấy 1 user cụ thể
    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        try {
            User user = userService.getUserById(id);
            UserResponse response = userService.toUserResponse(user);
            return ResponseEntity.ok(response);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
    // xóa 1 user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(new ApiResponse(true, "User deleted successfully"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    // thay đổi trạng thái user khóa hoạc mở
    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<ApiResponse> toggleUserStatus(@PathVariable Long id) {
        try {
            User user = userService.toggleUserStatus(id);
            String status = user.getEnabled() ? "unlocked" : "locked";
            return ResponseEntity.ok(new ApiResponse(true, "User account " + status + " successfully"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }
    // NOTE: Scholarship APIs đã được chuyển sang scholarship-service
    // Frontend sẽ gọi trực tiếp /api/opportunities/* từ scholarship-service
    // Các API sau đây đã được loại bỏ để tránh nhầm lẫn:
    // - GET /api/admin/scholarships -> Sử dụng GET /api/opportunities/all
    // - GET /api/admin/scholarships/{id} -> Sử dụng GET /api/opportunities/{id}
    // - PATCH /api/admin/scholarships/{id}/approve -> Sử dụng PUT /api/opportunities/{id}/moderate
    // - PATCH /api/admin/scholarships/{id}/reject -> Sử dụng PUT /api/opportunities/{id}/moderate
    @GetMapping("/audit/logs")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PaginationUtils.pageRequest(page, size, Sort.by("timestamp").descending());
        Page<AuditLog> logs = auditLogService.getAuditLogs(username, action, startDate, endDate, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("logs", logs.getContent());
        response.put("currentPage", logs.getNumber());
        response.put("totalItems", logs.getTotalElements());
        response.put("totalPages", logs.getTotalPages());

        return ResponseEntity.ok(response);
    }
    @GetMapping("/audit/users/{id}")
    public ResponseEntity<?> getLogsByUser(
            @PathVariable("id") Long userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<AuditLog> logs = auditLogService.getLogsByUser(userId, action, from, to, page, size);

        Map<String, Object> response = new HashMap<>();
        response.put("totalItems", logs.getTotalElements());
        response.put("totalPages", logs.getTotalPages());
        response.put("currentPage", logs.getNumber());
        response.put("logs", logs.getContent());

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy thống kê tổng quan cho admin dashboard
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats(HttpServletRequest request) {
        Map<String, Object> stats = new HashMap<>((Map<String, Object>) userService.getAdminAnalytics().get("stats"));
        
        // Thống kê users
        // Lấy thống kê scholarships và applications từ scholarship-service
        try {
            // Lấy JWT token từ request header
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                // Nếu không có token, set giá trị mặc định
                stats.put("totalScholarships", 0);
                stats.put("activeScholarships", 0);
                stats.put("pendingScholarships", 0);
                stats.put("totalApplications", 0);
                stats.put("pendingApplications", 0);
                stats.put("acceptedApplications", 0);
                stats.put("rejectedApplications", 0);
                return ResponseEntity.ok(stats);
            }
            
            // Gọi scholarship-service
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            String url = scholarshipServiceUrl + "/api/opportunities/stats";
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> scholarshipStats = response.getBody();
                stats.putAll(scholarshipStats);
            } else {
                // Nếu gọi không thành công, set giá trị mặc định
                stats.put("totalScholarships", 0);
                stats.put("activeScholarships", 0);
                stats.put("pendingScholarships", 0);
                stats.put("totalApplications", 0);
                stats.put("pendingApplications", 0);
                stats.put("acceptedApplications", 0);
                stats.put("rejectedApplications", 0);
            }
        } catch (RestClientException e) {
            // Nếu có lỗi khi gọi scholarship-service, log và set giá trị mặc định
            System.err.println("Error calling scholarship-service: " + e.getMessage());
            stats.put("totalScholarships", 0);
            stats.put("activeScholarships", 0);
            stats.put("pendingScholarships", 0);
            stats.put("totalApplications", 0);
            stats.put("pendingApplications", 0);
            stats.put("acceptedApplications", 0);
            stats.put("rejectedApplications", 0);
        }
        
        return ResponseEntity.ok(stats);
    }

    /**
     * Lấy danh sách employer requests
     */
    /**
     * Aggregated analytics for the admin dashboard.
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics(HttpServletRequest request) {
        Map<String, Object> userAnalytics = userService.getAdminAnalytics();
        Map<String, Object> stats = new HashMap<>((Map<String, Object>) userAnalytics.get("stats"));
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("userGrowth", userAnalytics.get("userGrowth"));
        analytics.put("subscriptionBreakdown", userAnalytics.get("subscriptionBreakdown"));

        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                putDefaultScholarshipAnalytics(analytics, stats);
                analytics.put("stats", stats);
                return ResponseEntity.ok(analytics);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = scholarshipServiceUrl + "/api/opportunities/analytics";
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> scholarshipAnalytics = response.getBody();
                Object scholarshipStats = scholarshipAnalytics.get("stats");
                if (scholarshipStats instanceof Map<?, ?> scholarshipStatsMap) {
                    scholarshipStatsMap.forEach((key, value) -> stats.put(String.valueOf(key), value));
                }
                analytics.put("topScholarships", scholarshipAnalytics.getOrDefault("topScholarships", List.of()));
                analytics.put("scholarshipBreakdown", scholarshipAnalytics.getOrDefault("scholarshipBreakdown", Map.of()));
                analytics.put("applicationStats", scholarshipAnalytics.getOrDefault("applicationStats", Map.of()));
            } else {
                putDefaultScholarshipAnalytics(analytics, stats);
            }
        } catch (RestClientException e) {
            System.err.println("Error calling scholarship analytics: " + e.getMessage());
            putDefaultScholarshipAnalytics(analytics, stats);
        }

        analytics.put("stats", stats);
        return ResponseEntity.ok(analytics);
    }

    private void putDefaultScholarshipAnalytics(Map<String, Object> analytics, Map<String, Object> stats) {
        stats.putIfAbsent("totalScholarships", 0);
        stats.putIfAbsent("activeScholarships", 0);
        stats.putIfAbsent("pendingScholarships", 0);
        stats.putIfAbsent("totalApplications", 0);
        stats.putIfAbsent("pendingApplications", 0);
        stats.putIfAbsent("acceptedApplications", 0);
        stats.putIfAbsent("rejectedApplications", 0);

        analytics.put("topScholarships", List.of());
        analytics.put("scholarshipBreakdown", Map.of("active", 0, "pending", 0, "expired", 0));
        analytics.put("applicationStats", Map.of(
                "pending", 0,
                "accepted", 0,
                "rejected", 0,
                "averageApplicationsPerScholarship", 0.0,
                "acceptanceRate", 0.0
        ));
    }

    @GetMapping("/employer/requests")
    public ResponseEntity<Map<String, Object>> getEmployerRequests(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<OrganizationRequest> pageRequests = organizationRequestService.getAllRequests(status, page, size);
        List<OrganizationRequestResponse> responseList = organizationRequestService.toResponseList(pageRequests.getContent());
        
        Map<String, Object> response = new HashMap<>();
        response.put("requests", responseList);
        response.put("currentPage", pageRequests.getNumber());
        response.put("totalItems", pageRequests.getTotalElements());
        response.put("totalPages", pageRequests.getTotalPages());
        response.put("pageSize", pageRequests.getSize());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy một employer request cụ thể
     */
    @GetMapping("/employer/requests/{id}")
    public ResponseEntity<OrganizationRequestResponse> getEmployerRequest(@PathVariable Long id) {
        try {
            OrganizationRequest request = organizationRequestService.getRequestById(id);
            OrganizationRequestResponse response = organizationRequestService.toResponse(request);
            return ResponseEntity.ok(response);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Admin approve employer request
     */
    @PutMapping("/employer/requests/{id}/approve")
    public ResponseEntity<?> approveEmployerRequest(@PathVariable Long id) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            
            User admin = userService.getUserByUsername(username);
            
            OrganizationRequest request = organizationRequestService.approveRequest(id, admin.getId());
            OrganizationRequestResponse response = organizationRequestService.toResponse(request);
            
            return ResponseEntity.ok(response);
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound()
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Error approving request: " + e.getMessage()));
        }
    }

    /**
     * Admin reject employer request
     */
    @PutMapping("/employer/requests/{id}/reject")
    public ResponseEntity<?> rejectEmployerRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectEmployerRequestRequest rejectRequest
    ) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            
            User admin = userService.getUserByUsername(username);
            
            OrganizationRequest request = organizationRequestService.rejectRequest(id, admin.getId(), rejectRequest);
            OrganizationRequestResponse response = organizationRequestService.toResponse(request);
            
            return ResponseEntity.ok(response);
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound()
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Error rejecting request: " + e.getMessage()));
        }
    }

}
