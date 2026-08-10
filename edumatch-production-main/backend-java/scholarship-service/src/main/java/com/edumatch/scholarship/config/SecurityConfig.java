package com.edumatch.scholarship.config;

import com.edumatch.scholarship.security.JwtAccessDeniedHandler;
import com.edumatch.scholarship.security.JwtAuthenticationEntryPoint;
import com.edumatch.scholarship.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        // ==== 1) CORS + CSRF ====
        http.csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.addAllowedOrigin("http://localhost:3000");  // FE
                    config.addAllowedOrigin("http://localhost:8080");  // Gateway
                    config.addAllowedMethod("*");
                    config.addAllowedHeader("*");
                    config.setAllowCredentials(true);
                    return config;
                }));

        // ==== 2) Exception Handling ====
        http.exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedHandler)
                .accessDeniedHandler(accessDeniedHandler)
        );

        // ==== 3) JWT = Stateless ====
        http.sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

        // ==== 4) AUTHORIZE REQUESTS ====
        http.authorizeHttpRequests(auth -> auth

                // ---- PUBLIC ----
                // Only actuator health is public; everything else requires auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/debug/**", "/actuator/**").authenticated()
                .requestMatchers("/api/v1/openapi.json", "/api/v1/docs/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/scholarships/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/scholarships/**").permitAll()

                // ---- ADMIN ONLY ----
                .requestMatchers("/api/v1/admin/scholarships/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/v1/admin/applications/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/opportunities/all").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/opportunities/stats").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/opportunities/analytics").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/opportunities/{id:[0-9]+}").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/opportunities/{id:[0-9]+}/moderate").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/opportunities/{id:[0-9]+}/admin").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/applications/all").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/applications/{id:[0-9]+}").hasAuthority("ROLE_ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/applications/{id:[0-9]+}/admin/status").hasAuthority("ROLE_ADMIN")

                // ---- EMPLOYER ONLY ----
                .requestMatchers("/api/v1/provider/scholarships/**").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers("/api/v1/provider/applications/**").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers("/api/v1/provider/analytics").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.POST,   "/api/v1/scholarships").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.PATCH,  "/api/v1/scholarships/{id:[0-9]+}").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/scholarships/{id:[0-9]+}").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.GET,    "/api/opportunities/my").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.GET,    "/api/opportunities/provider/analytics").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.GET,    "/api/applications/provider").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.GET,    "/api/applications/opportunity/**").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.POST,   "/api/opportunities").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.PUT,    "/api/opportunities/{id:[0-9]+}").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.DELETE, "/api/opportunities/{id:[0-9]+}").hasAuthority("ROLE_EMPLOYER")
                .requestMatchers(HttpMethod.PUT,    "/api/applications/{id:[0-9]+}/status").hasAuthority("ROLE_EMPLOYER")

                // ---- USER ONLY ----
                .requestMatchers(HttpMethod.POST, "/api/v1/applications").hasAuthority("ROLE_USER")
                .requestMatchers("/api/v1/me/applications/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/v1/me/application-statuses").hasAuthority("ROLE_USER")
                .requestMatchers("/api/v1/me/bookmarks/**").hasAuthority("ROLE_USER")
                .requestMatchers("/api/v1/me/bookmark-statuses").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.POST, "/api/bookmarks/**").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.GET,  "/api/bookmarks/my").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.GET,  "/api/bookmarks/my/statuses").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.POST, "/api/applications").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.GET,  "/api/applications/my").hasAuthority("ROLE_USER")
                .requestMatchers(HttpMethod.GET,  "/api/applications/my/statuses").hasAuthority("ROLE_USER")

                // ---- EVERYTHING ELSE = REQUIRE LOGIN ----
                .anyRequest().authenticated()
        );

        // ==== 5) JWT FILTER ====
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
