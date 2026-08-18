package com.edumatch.scholarship.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyFactory;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.rsa.public-key-path:#{null}}")
    private Resource rsaPublicKeyPath;

    @Value("${app.jwt.expected-issuer:edumatch-auth}")
    private String expectedIssuer;

    @Value("${app.jwt.expected-audience:edumatch-api}")
    private String expectedAudience;

    @Value("${app.jwt.require-rsa:false}")
    private boolean requireRsa;

    private Key verificationKey;

    @PostConstruct
    public void init() {
        if (rsaPublicKeyPath != null) {
            try {
                String pubPem = StreamUtils.copyToString(rsaPublicKeyPath.getInputStream(), StandardCharsets.UTF_8)
                        .replace("-----BEGIN PUBLIC KEY-----", "")
                        .replace("-----END PUBLIC KEY-----", "")
                        .replaceAll("\\s", "");
                byte[] pubBytes = Base64.getDecoder().decode(pubPem);
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                verificationKey = keyFactory.generatePublic(new X509EncodedKeySpec(pubBytes));
                log.info("JWT verification initialized with RSA public key");
                return;
            } catch (Exception e) {
                if (requireRsa) {
                    throw new IllegalStateException("RSA JWT public key is required but could not be loaded", e);
                }
                log.error("Failed to load RSA public key; falling back to HS256 because app.jwt.require-rsa=false: {}", e.getMessage());
            }
        }
        if (requireRsa) {
            throw new IllegalStateException("RSA JWT public key is required but no key path was configured");
        }
        verificationKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        log.warn("JWT verification initialized with HS256 shared secret — NOT for production");
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        String username = claims.getSubject();
        Object rolesObj = claims.get("roles");
        String rolesStr = rolesObj != null ? rolesObj.toString() : "";

        Collection<? extends GrantedAuthority> authorities =
                Arrays.stream(rolesStr.split(","))
                        .filter(auth -> !auth.trim().isEmpty())
                        .map(String::trim)
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());

        UserDetails principal = new User(username, "", authorities);
        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

    public boolean validateToken(String authToken) {
        try {
            Claims claims = parseClaims(authToken);

            // Validate issuer — MUST be present and correct
            String iss = claims.getIssuer();
            if (iss == null || !iss.equals(expectedIssuer)) {
                log.warn("JWT issuer missing or mismatch: expected={}, got={}", expectedIssuer, iss);
                return false;
            }

            // Validate audience
            String aud = claims.get("aud", String.class);
            if (aud == null || !aud.equals(expectedAudience)) {
                log.warn("JWT audience missing or mismatch: expected={}, got={}", expectedAudience, aud);
                return false;
            }

            // Validate token type
            String typ = claims.get("typ", String.class);
            if (!"access".equals(typ)) {
                log.warn("JWT token type is not 'access': got={}", typ);
                return false;
            }

            // Validate subject is present
            String sub = claims.getSubject();
            if (sub == null || sub.isBlank()) {
                log.warn("JWT subject is missing or empty");
                return false;
            }

            // Validate userId claim is present
            String userId = claims.get("userId", String.class);
            if (userId == null || userId.isBlank()) {
                log.warn("JWT userId claim is missing or empty");
                return false;
            }

            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Invalid JWT signature or format");
        } catch (ExpiredJwtException e) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty");
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(verificationKey)
                .clockSkewSeconds(30)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
