package com.example.jwt.example.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateEmployerRequestRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(max = 255, message = "Organization name must not exceed 255 characters")
    private String organizationName;
    
    @Size(max = 100, message = "Organization type must not exceed 100 characters")
    private String organizationType;
    
    @Size(max = 500, message = "Website must not exceed 500 characters")
    private String website;
    
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @Size(max = 1500, message = "Description must not exceed 1500 characters")
    private String description;
    
    @Size(max = 50, message = "Phone must not exceed 50 characters")
    private String phone;
    
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;
    
    @Size(max = 100, message = "Country must not exceed 100 characters")
    private String country;
    
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;
}

