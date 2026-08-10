package com.example.jwt.example.service;

import com.example.jwt.example.config.CacheConfig;
import com.example.jwt.example.dto.UserDetailDto;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CachedUserLookupService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.USER_BY_USERNAME_CACHE, key = "#username", unless = "#result == null")
    public UserDetailDto getUserDetailsByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        return toUserDetail(user);
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.USER_BY_ID_CACHE, key = "#userId", unless = "#result == null")
    public UserDetailDto getUserDetailsById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));
        return toUserDetail(user);
    }

    private UserDetailDto toUserDetail(User user) {
        return UserDetailDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .organizationId(user.getOrganizationId())
                .build();
    }
}
