package com.example.jwt.example.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StreamUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpirationInMs;

    @Value("${app.jwt.issuer:edumatch-auth}")
    private String issuer;

    @Value("${app.jwt.audience:edumatch-api}")
    private String audience;

    // RSA key paths (optional — if set, RS256 is used instead of HS256)
    @Value("${app.jwt.rsa.private-key-path:#{null}}")
    private Resource rsaPrivateKeyPath;

    @Value("${app.jwt.rsa.public-key-path:#{null}}")
    private Resource rsaPublicKeyPath;

    @Value("${app.jwt.rsa.private-key:}")
    private String rsaPrivateKeyPem;

    @Value("${app.jwt.rsa.public-key:}")
    private String rsaPublicKeyPem;

    @Value("${app.jwt.require-rsa:false}")
    private boolean requireRsa;

    @Value("${DEPLOY_ENVIRONMENT:local}")
    private String deployEnvironment;

    private Key signingKey;
    private Key verificationKey;
    private SignatureAlgorithm signatureAlgorithm;

    @PostConstruct
    public void init() {
        if (hasRsaKeyPair()) {
            try {
                // Load RSA key pair
                String privPem = stripPem(readPrivateKeyPem(), "PRIVATE KEY");
                String pubPem = stripPem(readPublicKeyPem(), "PUBLIC KEY");

                byte[] privBytes = Base64.getDecoder().decode(privPem);
                byte[] pubBytes = Base64.getDecoder().decode(pubPem);

                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                signingKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
                verificationKey = keyFactory.generatePublic(new X509EncodedKeySpec(pubBytes));
                signatureAlgorithm = SignatureAlgorithm.RS256;

                log.info("JWT initialized with RS256 (RSA key pair)");
            } catch (Exception e) {
                if (rsaRequired()) {
                    throw new IllegalStateException("RSA JWT keys are required but could not be loaded", e);
                }
                log.error("Failed to load RSA keys; falling back to HS256 because app.jwt.require-rsa=false: {}", e.getMessage());
                initHS256();
            }
        } else {
            if (rsaRequired()) {
                throw new IllegalStateException("RSA JWT keys are required but no key paths were configured");
            }
            initHS256();
        }
    }

    private boolean hasRsaKeyPair() {
        return hasText(rsaPrivateKeyPem) && hasText(rsaPublicKeyPem)
                || rsaPrivateKeyPath != null && rsaPublicKeyPath != null;
    }

    private String readPrivateKeyPem() throws Exception {
        if (hasText(rsaPrivateKeyPem)) {
            return rsaPrivateKeyPem;
        }
        return StreamUtils.copyToString(rsaPrivateKeyPath.getInputStream(), StandardCharsets.UTF_8);
    }

    private String readPublicKeyPem() throws Exception {
        if (hasText(rsaPublicKeyPem)) {
            return rsaPublicKeyPem;
        }
        return StreamUtils.copyToString(rsaPublicKeyPath.getInputStream(), StandardCharsets.UTF_8);
    }

    private String stripPem(String pem, String label) {
        return pem
                .replace("-----BEGIN " + label + "-----", "")
                .replace("-----END " + label + "-----", "")
                .replaceAll("\\s", "");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean rsaRequired() {
        return requireRsa || "staging".equalsIgnoreCase(deployEnvironment) || "production".equalsIgnoreCase(deployEnvironment);
    }

    private void initHS256() {
        signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        verificationKey = signingKey;
        signatureAlgorithm = SignatureAlgorithm.HS256;
        log.warn("JWT initialized with HS256 (shared secret) — NOT recommended for production");
    }

    /** Build standard claims shared by all token types. */
    private JwtBuilder baseClaims(String username) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(username)
                .issuedAt(new Date())
                .id(UUID.randomUUID().toString());
    }

    public String generateToken(Authentication authentication) {
        String username = authentication.getName();
        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpirationInMs);

        final String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        // Extract userId from the principal.
        // The actual runtime type is CustomUserDetails (set by CustomUserDetailsService),
        // but we also handle the case where a User entity is the principal for backward compat.
        String userId = "";
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails customUser) {
            userId = String.valueOf(customUser.getId());
        } else if (principal instanceof com.example.jwt.example.model.User user) {
            userId = String.valueOf(user.getId());
        }

        if (userId.isEmpty()) {
            log.error("Cannot extract userId from principal of type {}", principal.getClass().getName());
            throw new IllegalStateException("Cannot generate token: unable to resolve userId from principal");
        }

        return baseClaims(username)
                .claim("aud", audience)
                .claim("roles", authorities)
                .claim("userId", userId)
                .claim("typ", "access")
                .expiration(expiryDate)
                .signWith(signingKey, signatureAlgorithm)
                .compact();
    }

    public String getUserNameFromJWT(String token) {
        return parseClaims(token).getSubject();
    }

    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        String username = claims.getSubject();
        Object rolesObj = claims.get("roles");
        String rolesStr = rolesObj != null ? rolesObj.toString() : "";

        Collection<? extends GrantedAuthority> authorities =
                Arrays.stream(rolesStr.split(","))
                        .filter(auth -> !auth.trim().isEmpty())
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
            if (iss == null || !iss.equals(issuer)) {
                log.warn("JWT issuer missing or mismatch: expected={}, got={}", issuer, iss);
                return false;
            }

            // Validate audience
            if (!audienceMatches(claims, audience)) {
                log.warn("JWT audience missing or mismatch: expected={}", audience);
                return false;
            }

            // Validate token type
            String typ = claims.get("typ", String.class);
            if (!"access".equals(typ)) {
                log.warn("JWT token type is not 'access': got={}", typ);
                return false;
            }

            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Invalid JWT signature or format");
        } catch (ExpiredJwtException e) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token");
        } catch (JwtException e) {
            log.error("Invalid JWT claims");
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty");
        }
        return false;
    }

    private boolean audienceMatches(Claims claims, String expected) {
        Object aud = claims.get("aud");
        if (aud instanceof String value) {
            return expected.equals(value);
        }
        if (aud instanceof Collection<?> values) {
            return values.stream().anyMatch(expected::equals);
        }
        return false;
    }

    public String generateTokenFromUser(com.example.jwt.example.model.User user) {
        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpirationInMs);

        final String authorities = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        return baseClaims(user.getUsername())
                .claim("aud", audience)
                .claim("roles", authorities)
                .claim("userId", String.valueOf(user.getId()))
                .claim("typ", "access")
                .expiration(expiryDate)
                .signWith(signingKey, signatureAlgorithm)
                .compact();
    }

    @Deprecated
    public String generateTokenFromUsername(String username) {
        log.warn("generateTokenFromUsername called — token lacks roles/userId claims. Use generateTokenFromUser instead.");
        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpirationInMs);
        return baseClaims(username)
                .expiration(expiryDate)
                .signWith(signingKey, signatureAlgorithm)
                .compact();
    }

    /** Expose public key for JWKS endpoint (RS256 only). */
    public Optional<RSAPublicKey> getPublicKey() {
        if (verificationKey instanceof RSAPublicKey) {
            return Optional.of((RSAPublicKey) verificationKey);
        }
        return Optional.empty();
    }

    public String getKeyId() {
        return "edumatch-signing-key";
    }

    public String getAlgorithm() {
        return signatureAlgorithm.getValue();
    }

    private Claims parseClaims(String token) {
        JwtParserBuilder parserBuilder = Jwts.parser()
                .clockSkewSeconds(30)
                .requireIssuer(issuer);

        if (verificationKey instanceof SecretKey secretKey) {
            parserBuilder.verifyWith(secretKey);
        } else if (verificationKey instanceof PublicKey publicKey) {
            parserBuilder.verifyWith(publicKey);
        } else {
            throw new IllegalStateException("Unsupported JWT verification key type");
        }

        Jws<Claims> jwt = parserBuilder.build().parseSignedClaims(token);
        return claimsFromExpectedAlgorithm(jwt);
    }

    private Claims claimsFromExpectedAlgorithm(Jws<Claims> jwt) {
        String actualAlgorithm = jwt.getHeader().getAlgorithm();
        String expectedAlgorithm = signatureAlgorithm.getValue();
        if (!expectedAlgorithm.equals(actualAlgorithm)) {
            throw new UnsupportedJwtException("Unexpected JWT algorithm: " + actualAlgorithm);
        }
        return jwt.getPayload();
    }
}
