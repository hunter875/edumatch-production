# Redis Public Cache And Request Coalescing

## Current Problem

Redis exists in the system, but it is not used strongly enough to protect hot
public reads.

The most important public read is:

```txt
GET /api/scholarships?isPublic=true&page=0&size=12
```

If 3,000 users request the same public list at the same time and there is no
cache, the DB may run the same query thousands of times.

## Mental Model

Popular public reads should become:

```txt
request -> cache key -> Redis hit -> response
```

Only cache misses should reach MySQL.

During cache miss bursts, request coalescing ensures only one request rebuilds
the cache.

```txt
3,000 same requests
  -> 1 request gets rebuild lock
  -> 2,999 requests wait briefly or receive stale cache
```

## What To Cache

Good:

- public scholarship list page
- public scholarship detail
- filter metadata
- tag/category lists
- provider public profile if stable

Avoid:

- application statuses
- bookmarks
- user dashboard
- admin analytics unless private and carefully keyed
- chat/messages

## Cache Key Design

Cache key must include every input that changes response.

Example:

```txt
scholarships:public:v1:q=ai:level=MASTER:gpa=3.5:studyMode=ONLINE:page=0:size=12:sort=deadline
```

Normalize:

- lowercase keyword
- sorted filter values
- default values explicit
- page/size included
- version prefix included

Bad key:

```txt
scholarships
```

Why bad: every query overwrites every other query.

## TTL Strategy

Use short TTL for public list:

```txt
fresh TTL: 30-60 seconds
stale TTL: 2-5 minutes
```

Why short TTL works:

- scholarship list can tolerate slight staleness
- moderation/update events can evict cache
- burst protection matters more than perfect freshness

## Stale-While-Revalidate

Store two values:

```txt
fresh cache key -> short TTL
stale cache key -> longer TTL
```

Flow:

```txt
fresh hit -> return
fresh miss + stale hit -> return stale and trigger async refresh
fresh miss + stale miss -> one request rebuilds, others wait or receive fallback
```

## Request Coalescing With Redis Lock

Use `SET NX EX`:

```txt
SET lock:scholarships:<key> <request-id> NX EX 10
```

If lock acquired:

- query DB
- write fresh and stale cache
- release lock

If lock not acquired:

- wait 50-150ms and retry fresh cache
- if stale exists, return stale
- if no stale, wait briefly or return controlled fallback

## Spring Boot Pseudocode

```java
public PageResponse<OpportunityDto> searchPublicCached(SearchParams params) {
    String key = buildCacheKey(params);

    PageResponse<OpportunityDto> fresh = redis.get("fresh:" + key);
    if (fresh != null) return fresh;

    PageResponse<OpportunityDto> stale = redis.get("stale:" + key);
    boolean lock = redis.setIfAbsent("lock:" + key, requestId, Duration.ofSeconds(10));

    if (lock) {
        try {
            PageResponse<OpportunityDto> result = queryDatabase(params);
            redis.set("fresh:" + key, result, Duration.ofSeconds(60));
            redis.set("stale:" + key, result, Duration.ofMinutes(5));
            return result;
        } finally {
            redis.delete("lock:" + key);
        }
    }

    if (stale != null) {
        return stale;
    }

    sleepBriefly();
    PageResponse<OpportunityDto> retry = redis.get("fresh:" + key);
    if (retry != null) return retry;

    return queryDatabase(params);
}
```

## Cache Invalidation

Evict public scholarship cache when:

- opportunity created
- opportunity updated
- opportunity deleted
- moderation status changes
- public visibility changes

Simple MVP invalidation:

```txt
delete keys matching scholarships:public:v1:*
```

Better later:

- tag cache keys by opportunity category/level
- evict narrower groups
- increment global cache version

Global version trick:

```txt
scholarships:public:v42:<query>
```

On update:

```txt
INCR scholarships:public:version
```

Old keys expire naturally.

## Metrics

Track:

- cache hits
- cache misses
- stale hits
- lock acquired
- lock wait time
- DB query duration after cache miss
- cache evictions

Target after warmup:

```txt
public scholarship list cache hit rate >= 80%
```

## Failure Behavior

If Redis is down:

- do not break public scholarship list
- log degraded mode
- query DB with rate limits
- alert if sustained

Cache is an optimization, not the source of truth.

## AI Handoff Prompt

```txt
You are adding Redis cache and request coalescing for EduMatch public scholarship list.
Read docs/learning/production-hardening/redis-public-cache-coalescing.md,
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/OpportunityQueryService.java,
and backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/config/CacheConfig.java if present.
Implement cache keys for public search params, short fresh TTL, longer stale TTL, Redis lock coalescing, and safe fallback when Redis fails.
Add metrics/logs for hit, miss, stale hit, and rebuild.
```
