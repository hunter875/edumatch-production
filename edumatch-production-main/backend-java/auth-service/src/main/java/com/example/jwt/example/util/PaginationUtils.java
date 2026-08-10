package com.example.jwt.example.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PaginationUtils {

    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 100;

    private PaginationUtils() {
    }

    public static Pageable pageRequest(int page, int size, Sort sort) {
        return PageRequest.of(normalizePage(page), normalizeSize(size), sort);
    }

    public static int normalizePage(int page) {
        return Math.max(page, 0);
    }

    public static int normalizeSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
