package com.edumatch.chat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * CORS Configuration for Chat Service.
 *
 * <p>This filter runs before the WebSocket upgrade and before the security
 * chain, so an origin it does not recognise is rejected with 403 even when the
 * endpoint itself allows every origin. A deployment whose public origin is not
 * listed here therefore cannot open a WebSocket at all.
 */
@Configuration
public class CorsConfig {

    /** Comma-separated extra browser origins supplied by the deployment. */
    @Value("${app.cors.allowed-origin-patterns:}")
    private String extraAllowedOriginPatterns;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // Allow credentials (cookies, authorization headers)
        config.setAllowCredentials(true);

        List<String> patterns = new ArrayList<>(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://*.azurecontainerapps.io"
        ));
        if (extraAllowedOriginPatterns != null && !extraAllowedOriginPatterns.isBlank()) {
            for (String pattern : extraAllowedOriginPatterns.split(",")) {
                String trimmed = pattern.trim();
                if (!trimmed.isEmpty()) {
                    patterns.add(trimmed);
                }
            }
        }
        config.setAllowedOriginPatterns(patterns);

        // Allow all headers
        config.addAllowedHeader("*");

        // Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
        config.addAllowedMethod("*");

        // Apply CORS configuration to all paths
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
