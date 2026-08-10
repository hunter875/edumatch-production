package com.example.jwt.example.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class JwtAuthenticationResponse {
    private String accessToken;
    private String tokenType = "Bearer";

    // refreshToken is NO LONGER included in the JSON body.
    // It is sent as an HttpOnly cookie (Set-Cookie header).

    public JwtAuthenticationResponse(String accessToken) {
        this.accessToken = accessToken;
    }
}
