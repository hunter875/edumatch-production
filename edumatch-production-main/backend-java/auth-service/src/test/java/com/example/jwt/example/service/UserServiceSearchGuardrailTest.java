package com.example.jwt.example.service;

import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceSearchGuardrailTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private UserCacheEvictionService userCacheEvictionService;

    @InjectMocks
    private UserService userService;

    @Test
    void getAllUsersTrimsKeywordAndCapsUnsafePagination() {
        when(userRepository.searchUsers(any(), any(), any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        userService.getAllUsers(null, null, "  admin' OR 1=1 --  ", -2, 9999);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).searchUsers(
                eq(null),
                eq(null),
                eq("admin' OR 1=1 --"),
                pageableCaptor.capture()
        );

        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void getAllUsersUsesDefaultSizeWhenClientRequestsInvalidSize() {
        when(userRepository.searchUsers(any(), any(), any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        userService.getAllUsers(null, null, null, 0, 0);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).searchUsers(eq(null), eq(null), eq(null), pageableCaptor.capture());

        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(10);
    }
}
