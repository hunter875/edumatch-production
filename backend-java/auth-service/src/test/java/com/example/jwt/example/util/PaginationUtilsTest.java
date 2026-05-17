package com.example.jwt.example.util;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

class PaginationUtilsTest {

    @Test
    void pageRequestClampsNegativePageAndOversizedSize() {
        Pageable pageable = PaginationUtils.pageRequest(-5, 10_000, Sort.by("id").descending());

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(PaginationUtils.MAX_PAGE_SIZE);
    }

    @Test
    void pageRequestUsesDefaultSizeWhenRequestedSizeIsInvalid() {
        Pageable pageable = PaginationUtils.pageRequest(2, 0, Sort.by("id").descending());

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(PaginationUtils.DEFAULT_PAGE_SIZE);
    }
}
