package com.example.jwt.example.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    private String name;
    
    private String description;
    
    private String organizationType;
    
    private String website;
    
    private String email;
    
    private String phone;
    
    private String address;
    
    private String country;
    
    private String city;
    
    private String logoUrl;
}

