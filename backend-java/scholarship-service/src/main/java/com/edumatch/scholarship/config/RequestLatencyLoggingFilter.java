package com.edumatch.scholarship.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class RequestLatencyLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final long SLOW_REQUEST_MS = 500;

    @Value("${info.app.environment:local}")
    private String environment;

    @Value("${info.app.version:local}")
    private String version;

    @Value("${info.app.commit:local}")
    private String commit;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long start = System.nanoTime();
        String requestId = getOrCreateRequestId(request);
        MDC.put("requestId", requestId);
        MDC.put("environment", environment);
        MDC.put("version", version);
        MDC.put("commit", commit);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        response.setHeader("X-App-Version", version);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
            response.setHeader(REQUEST_ID_HEADER, requestId);
            response.setHeader("X-Response-Time-Ms", Long.toString(durationMs));
            response.setHeader("X-App-Version", version);

            String message = "http_request requestId={} method={} path={} status={} durationMs={} env={} version={} commit={}";
            if (durationMs >= SLOW_REQUEST_MS) {
                log.info(message, requestId, request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs, environment, version, commit);
            } else {
                log.debug(message, requestId, request.getMethod(), request.getRequestURI(), response.getStatus(), durationMs, environment, version, commit);
            }
            MDC.remove("requestId");
            MDC.remove("environment");
            MDC.remove("version");
            MDC.remove("commit");
        }
    }

    private String getOrCreateRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            return UUID.randomUUID().toString();
        }
        return requestId;
    }
}
