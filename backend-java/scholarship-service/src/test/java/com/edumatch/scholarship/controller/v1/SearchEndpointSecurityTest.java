package com.edumatch.scholarship.controller.v1;

import com.edumatch.scholarship.config.SecurityConfig;
import com.edumatch.scholarship.dto.ApplicationDto;
import com.edumatch.scholarship.dto.CreateApplicationRequest;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.api.PageResponse;
import com.edumatch.scholarship.security.JwtAccessDeniedHandler;
import com.edumatch.scholarship.security.JwtAuthenticationEntryPoint;
import com.edumatch.scholarship.security.JwtAuthenticationFilter;
import com.edumatch.scholarship.security.JwtTokenProvider;
import com.edumatch.scholarship.service.ApplicationService;
import com.edumatch.scholarship.service.IdempotencyService;
import com.edumatch.scholarship.service.ScholarshipPublicReadCacheService;
import com.edumatch.scholarship.service.ScholarshipService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {V1ScholarshipController.class, V1ApplicationController.class})
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        JwtAccessDeniedHandler.class
})
@TestPropertySource(properties = {
        "app.jwt.header=Authorization",
        "app.jwt.prefix=Bearer",
        "spring.data.web.pageable.max-page-size=100",
        "spring.data.web.pageable.default-page-size=12"
})
class SearchEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ScholarshipService scholarshipService;

    @MockBean
    private ScholarshipPublicReadCacheService publicReadCacheService;

    @MockBean
    private ApplicationService applicationService;

    @MockBean
    private IdempotencyService idempotencyService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void publicScholarshipSearchAllowsAnonymousAndCapsPageSize() throws Exception {
        when(publicReadCacheService.searchPublicScholarships(
                any(), any(), any(), any(), any(), any(Pageable.class)
        )).thenReturn(PageResponse.fromPage(new PageImpl<>(List.<OpportunityDto>of(), PageRequest.of(0, 100), 0)));

        mockMvc.perform(get("/api/v1/scholarships")
                        .param("q", "ai' OR 1=1 --")
                        .param("size", "100000"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=30")))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.page.size").value(100));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(publicReadCacheService).searchPublicScholarships(
                eq("ai' OR 1=1 --"), any(), any(), any(), any(), pageableCaptor.capture()
        );
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void adminScholarshipSearchRejectsAnonymous() throws Exception {
        mockMvc.perform(get("/api/v1/admin/scholarships")
                        .param("keyword", "stanford' OR 1=1 --"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "ROLE_USER")
    void adminScholarshipSearchRejectsRegularUser() throws Exception {
        mockMvc.perform(get("/api/v1/admin/scholarships")
                        .param("keyword", "stanford"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void adminScholarshipSearchAllowsAdmin() throws Exception {
        when(scholarshipService.getAllOpportunitiesForAdmin(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<OpportunityDto>of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/v1/admin/scholarships")
                        .param("keyword", "stanford"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(authorities = "ROLE_EMPLOYER")
    void adminApplicationSearchRejectsEmployer() throws Exception {
        mockMvc.perform(get("/api/v1/admin/applications")
                        .param("keyword", "student' OR 1=1 --"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void adminApplicationSearchAllowsAdmin() throws Exception {
        when(applicationService.getAllApplicationsForAdmin(any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<ApplicationDto>of(), PageRequest.of(0, 20), 0));

        mockMvc.perform(get("/api/v1/admin/applications")
                        .param("keyword", "student"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(authorities = "ROLE_EMPLOYER")
    void createApplicationRejectsEmployerBeforeIdempotency() throws Exception {
        mockMvc.perform(post("/api/v1/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"opportunityId\":7}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(idempotencyService);
        verifyNoInteractions(applicationService);
    }

    @Test
    @WithMockUser(username = "student@example.com", authorities = "ROLE_USER")
    void createApplicationPassesUserAndIdempotencyKeyToWrapper() throws Exception {
        ApplicationDto created = ApplicationDto.builder()
                .id(42L)
                .opportunityId(7L)
                .status("SUBMITTED")
                .build();

        when(idempotencyService.execute(
                eq("apply-7"),
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                any(CreateApplicationRequest.class),
                eq(ApplicationDto.class),
                any()
        )).thenReturn(created);

        mockMvc.perform(post("/api/v1/applications")
                        .header("Idempotency-Key", "apply-7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"opportunityId\":7,\"coverLetter\":\"hello\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(42))
                .andExpect(jsonPath("$.data.opportunityId").value(7));

        ArgumentCaptor<CreateApplicationRequest> requestCaptor =
                ArgumentCaptor.forClass(CreateApplicationRequest.class);
        verify(idempotencyService).execute(
                eq("apply-7"),
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                requestCaptor.capture(),
                eq(ApplicationDto.class),
                any()
        );
        assertThat(requestCaptor.getValue().getOpportunityId()).isEqualTo(7L);
    }
}
