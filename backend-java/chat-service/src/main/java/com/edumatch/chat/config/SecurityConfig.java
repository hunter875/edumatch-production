package com.edumatch.chat.config;

import com.edumatch.chat.security.JwtAccessDeniedHandler;
import com.edumatch.chat.security.JwtAuthenticationEntryPoint;
import com.edumatch.chat.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // Bật @PreAuthorize
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Tắt CSRF
                .csrf(AbstractHttpConfigurer::disable)

                // Báo lỗi 401 khi chưa xác thực, 403 khi không đủ quyền
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(unauthorizedHandler)
                        .accessDeniedHandler(accessDeniedHandler))

                // Không lưu session (vì dùng JWT)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Định nghĩa các luật truy cập
                .authorizeHttpRequests(auth -> auth
                        // --- API Public (Không cần đăng nhập) ---
                        // (Hiện tại ChatService không có API public)
                        // .requestMatchers("/api/public/**").permitAll()

                        // --- API WebSocket ---
                        // Cho phép kết nối ban đầu đến /api/ws
                        // (Việc xác thực token sẽ do WebSocket Interceptor xử lý sau)
                        .requestMatchers("/api/health", "/api/chat/health", "/api/v1/chat/health", "/actuator/**").permitAll()
                        .requestMatchers("/api/ws", "/api/ws/**").permitAll()

                        // Yêu cầu xác thực cho tất cả các API HTTP còn lại
                        .anyRequest().authenticated()
                );

        // Thêm bộ lọc JWT vào trước bộ lọc mặc định
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
