package com.edumatch.scholarship.exception;

import com.edumatch.scholarship.dto.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression cover for the client-error classifications.
 *
 * Both cases below previously fell through to the catch-all
 * {@code @ExceptionHandler(Exception.class)} and were reported as
 * 500 INTERNAL_ERROR, which turned ordinary caller mistakes into apparent
 * server faults.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private HttpServletRequest request(String method, String uri) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn(method);
        when(request.getRequestURI()).thenReturn(uri);
        return request;
    }

    @Test
    void wrongMethodIsReportedAs405NotAs500() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("POST");

        ResponseEntity<ApiError> response =
                handler.handleMethodNotSupported(ex, request("POST", "/api/v1/provider/scholarships"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(405);
        assertThat(response.getBody().getCode()).isEqualTo("METHOD_NOT_ALLOWED");
        assertThat(response.getBody().getPath()).isEqualTo("/api/v1/provider/scholarships");
    }

    @Test
    void methodNotAllowedMessageNamesTheRejectedMethod() {
        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("DELETE");

        ResponseEntity<ApiError> response =
                handler.handleMethodNotSupported(ex, request("DELETE", "/api/v1/scholarships"));

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("DELETE");
    }

    @Test
    void unmappedPathIsReportedAs404JsonNotEmptyAsHtml() {
        NoResourceFoundException ex =
                new NoResourceFoundException(org.springframework.http.HttpMethod.GET, "/api/v1/nope");

        ResponseEntity<ApiError> response =
                handler.handleNoResource(ex, request("GET", "/api/v1/nope"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void unexpectedFailureStillReports500() {
        ResponseEntity<ApiError> response =
                handler.handleUnexpected(new RuntimeException("boom"), request("GET", "/api/v1/x"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("INTERNAL_ERROR");
    }
}
