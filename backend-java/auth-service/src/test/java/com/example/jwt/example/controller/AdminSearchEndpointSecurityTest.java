package com.example.jwt.example.controller;

import com.example.jwt.example.model.User;
import com.example.jwt.example.security.JwtAuthenticationEntryPoint;
import com.example.jwt.example.security.JwtTokenProvider;
import com.example.jwt.example.security.SecurityConfig;
import com.example.jwt.example.service.AuditLogService;
import com.example.jwt.example.service.CustomUserDetailsService;
import com.example.jwt.example.service.OrganizationRequestService;
import com.example.jwt.example.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class})
@TestPropertySource(properties = {
        "app.jwt.header=Authorization",
        "app.jwt.prefix=Bearer"
})
class AdminSearchEndpointSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private OrganizationRequestService organizationRequestService;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void adminUserSearchRejectsAnonymous() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .param("keyword", "admin' OR 1=1 --"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void adminUserSearchRejectsRegularUser() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .param("keyword", "admin"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminUserSearchAllowsAdmin() throws Exception {
        when(userService.getAllUsers(any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.<User>of(), PageRequest.of(0, 20), 0));
        when(userService.toUserResponseList(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users")
                        .param("keyword", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").isArray());
    }
}
