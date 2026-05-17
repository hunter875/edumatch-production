package com.example.jwt.example.service;

import com.example.jwt.example.config.CacheConfig;
import com.example.jwt.example.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserCacheEvictionService {

    private final CacheManager cacheManager;

    public void evictUser(User user) {
        if (user == null) {
            return;
        }
        evictByUsername(user.getUsername());
        evictById(user.getId());
    }

    public void evictByUsername(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        Cache cache = cacheManager.getCache(CacheConfig.USER_BY_USERNAME_CACHE);
        if (cache != null) {
            cache.evict(username);
            log.debug("Evicted auth user cache by username={}", username);
        }
    }

    public void evictById(Long userId) {
        if (userId == null) {
            return;
        }
        Cache cache = cacheManager.getCache(CacheConfig.USER_BY_ID_CACHE);
        if (cache != null) {
            cache.evict(userId);
            log.debug("Evicted auth user cache by id={}", userId);
        }
    }
}
