package com.example.jwt.example.security;

import com.example.jwt.example.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtTokenProvider tokenProvider;

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(tokenProvider);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Extra browser origins allowed to call this service directly.
     *
     * The gateway normally strips Origin, but any request that still carries one
     * is validated here, so an origin missing from this list is rejected with
     * "Invalid CORS request" even though the request is otherwise valid. The
     * deployment supplies its own public origin through this property instead of
     * adding an environment-specific hostname to the code.
     */
    @Value("${app.cors.allowed-origin-patterns:}")
    private String extraAllowedOriginPatterns;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(request -> {
                    var corsConfig = new org.springframework.web.cors.CorsConfiguration();
                    corsConfig.addAllowedOriginPattern("http://localhost:*"); // Local frontend/gateway
                    corsConfig.addAllowedOriginPattern("http://127.0.0.1:*"); // Local frontend/gateway
                    corsConfig.addAllowedOriginPattern("https://*.azurecontainerapps.io"); // Azure Container Apps gateway/frontend
                    if (extraAllowedOriginPatterns != null && !extraAllowedOriginPatterns.isBlank()) {
                        for (String pattern : extraAllowedOriginPatterns.split(",")) {
                            String trimmed = pattern.trim();
                            if (!trimmed.isEmpty()) {
                                corsConfig.addAllowedOriginPattern(trimmed);
                            }
                        }
                    }
                    corsConfig.addAllowedMethod("*"); // Allow all methods (GET, POST, PUT, DELETE, etc.)
                    corsConfig.addAllowedHeader("*"); // Allow all headers
                    corsConfig.setAllowCredentials(true); // Allow cookies
                    corsConfig.setMaxAge(3600L); // Cache preflight for 1 hour
                    return corsConfig;
                }))
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session-> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth ->
                        // ---- PUBLIC (no authentication required) ----
                        auth.requestMatchers("/api/auth/signin").permitAll()
                                .requestMatchers("/api/auth/login").permitAll()
                                .requestMatchers("/api/auth/signup").permitAll()
                                .requestMatchers("/api/auth/register").permitAll()
                                .requestMatchers("/api/auth/refresh").permitAll()
                                .requestMatchers("/api/auth/logout").permitAll()
                                .requestMatchers("/api/auth/health").permitAll()
                                // Client-credentials exchange: reachable without a user
                                // session by design. The service validates the client id
                                // and secret itself and is disabled unless explicitly
                                // enabled with a sufficiently long secret.
                                .requestMatchers("/api/service/token").permitAll()
                                .requestMatchers("/api/public/**").permitAll()
                                .requestMatchers("/actuator/health").permitAll()
                                .requestMatchers("/uploads/**").permitAll()
                                // ---- PROTECTED (authentication required) ----
                                .requestMatchers("/api/auth/me").authenticated()
                                .requestMatchers("/api/auth/verify").authenticated()
                                .requestMatchers("/actuator/**").authenticated()
                                // ---- EVERYTHING ELSE ----
                                .anyRequest().authenticated());

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
