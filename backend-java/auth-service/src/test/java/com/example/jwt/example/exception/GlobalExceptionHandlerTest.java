package com.example.jwt.example.exception;

import com.example.jwt.example.dto.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression cover for wrong-method classification.
 *
 * Previously HttpRequestMethodNotSupportedException had no dedicated handler, so
 * it fell through to the catch-all and every unsupported verb answered
 * 500 INTERNAL_ERROR instead of 405 METHOD_NOT_ALLOWED.
 *
 * The defect was only observable on public routes. On secured routes the
 * security filter chain answers 401 before the dispatcher maps the request,
 * which is why this survived earlier end-to-end passes.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void wrongMethodIsReportedAs405NotAs500() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("DELETE");

        ResponseEntity<?> response = handler.httpRequestMethodNotSupportedException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getBody()).isInstanceOf(ApiResponse.class);

        ApiResponse body = (ApiResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getSuccess()).isFalse();
    }

    @Test
    void wrongMethodDoesNotLeakMethodNameOrInternalDetail() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("PATCH");

        ResponseEntity<?> response = handler.httpRequestMethodNotSupportedException(ex);

        ApiResponse body = (ApiResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getMessage()).isEqualTo("Method not allowed");
        assertThat(body.getMessage()).doesNotContain("PATCH");
    }

    @Test
    void unexpectedFailureStillReports500() {
        ResponseEntity<?> response =
                handler.globalExceptionHandler(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isInstanceOf(ApiResponse.class);
    }
}
