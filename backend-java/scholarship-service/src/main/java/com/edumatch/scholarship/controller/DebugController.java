package com.edumatch.scholarship.controller;

import com.edumatch.scholarship.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/debug")
@RequiredArgsConstructor
public class DebugController {

    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/jwt")
    public ResponseEntity<?> debugJwt(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        
        if (authHeader == null || authHeader.isEmpty()) {
            response.put("error", "No Authorization header");
            return ResponseEntity.badRequest().body(response);
        }
        
        response.put("authHeader", authHeader);
        
        if (!authHeader.startsWith("Bearer ")) {
            response.put("error", "Invalid Authorization format. Must start with 'Bearer '");
            return ResponseEntity.badRequest().body(response);
        }
        
        String token = authHeader.substring(7);
        response.put("tokenLength", token.length());
        response.put("tokenPreview", token.substring(0, Math.min(50, token.length())) + "...");
        
        try {
            boolean isValid = jwtTokenProvider.validateToken(token);
            response.put("isValid", isValid);
            
            if (isValid) {
                var authentication = jwtTokenProvider.getAuthentication(token);
                response.put("username", authentication.getName());
                response.put("authorities", authentication.getAuthorities());
                response.put("success", true);
            } else {
                response.put("error", "Token validation failed");
            }
        } catch (Exception e) {
            response.put("error", "Exception: " + e.getMessage());
            response.put("exceptionType", e.getClass().getSimpleName());
        }
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "scholarship-service"));
    }
}
