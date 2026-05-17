package com.edumatch.scholarship.service;

import com.edumatch.scholarship.config.CacheConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ScholarshipCacheEvictionService {

    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConfig.PUBLIC_DETAIL_CACHE, key = "#opportunityId", condition = "#opportunityId != null"),
            @CacheEvict(cacheNames = CacheConfig.PUBLIC_LIST_CACHE, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.PROVIDER_ANALYTICS_CACHE, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.ADMIN_STATS_CACHE, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.ADMIN_ANALYTICS_CACHE, allEntries = true)
    })
    public void evictOpportunityCaches(Long opportunityId, Long creatorUserId) {
        log.debug("Evicted scholarship caches for opportunityId={} creatorUserId={}", opportunityId, creatorUserId);
    }

    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConfig.PROVIDER_ANALYTICS_CACHE, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.ADMIN_STATS_CACHE, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.ADMIN_ANALYTICS_CACHE, allEntries = true)
    })
    public void evictAnalyticsCaches(Long creatorUserId) {
        log.debug("Evicted scholarship analytics caches for creatorUserId={}", creatorUserId);
    }
}
