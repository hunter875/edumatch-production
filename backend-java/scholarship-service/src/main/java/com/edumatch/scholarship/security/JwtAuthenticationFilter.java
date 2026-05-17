package com.edumatch.scholarship.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component // Đánh dấu là 1 Bean
@RequiredArgsConstructor // Tự động tiêm (inject) các biến final
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    @Value("${app.jwt.header}")
    private String headerName;

    @Value("${app.jwt.prefix}")
    private String headerPrefix;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. Lấy JWT từ request
            String jwt = getJwtFromRequest(request);
            log.debug("JWT Filter - URI: {}, JWT present: {}", request.getRequestURI(), jwt != null);

            // 2. Xác thực token
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // 3. Lấy thông tin user (username, roles)
                Authentication authentication = tokenProvider.getAuthentication(jwt);
                log.debug("JWT Filter - Authentication successful for user: {}", authentication.getName());

                // 4. Lưu vào SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } else {
                log.debug("JWT Filter - Token validation failed or token missing");
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        // Chuyển request đi tiếp
        filterChain.doFilter(request, response);
    }

    // Hàm helper để trích xuất token từ "Bearer <token>"
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader(headerName);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(headerPrefix + " ")) {
            return bearerToken.substring(headerPrefix.length() + 1);
        }
        return null;
    }
}
