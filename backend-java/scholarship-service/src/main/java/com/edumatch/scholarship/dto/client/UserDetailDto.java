package com.edumatch.scholarship.dto.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * DTO for user details received from Auth-Service.
 * Expanded to include all fields returned by /api/user/me.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDetailDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private Double gpa;
    private Long organizationId;
}
