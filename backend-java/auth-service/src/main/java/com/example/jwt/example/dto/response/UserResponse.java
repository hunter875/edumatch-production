package com.example.jwt.example.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String sex;
    private Long organizationId;
    private Boolean enabled;
    private String status; // ACTIVE, SUSPENDED, PENDING
    private String subscriptionType; // FREE, PREMIUM, ENTERPRISE
    private Set<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}