package com.edumatch.scholarship.dto.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> data;
    private PageMetadata page;

    public static <T> PageResponse<T> fromPage(Page<T> source) {
        return PageResponse.<T>builder()
                .data(source.getContent())
                .page(PageMetadata.builder()
                        .number(source.getNumber())
                        .size(source.getSize())
                        .totalElements(source.getTotalElements())
                        .totalPages(source.getTotalPages())
                        .build())
                .build();
    }

    public static <T> PageResponse<T> fromList(List<T> source, Pageable pageable) {
        List<T> safeSource = source == null ? Collections.emptyList() : source;

        if (pageable == null || pageable.isUnpaged()) {
            return PageResponse.<T>builder()
                    .data(safeSource)
                    .page(PageMetadata.builder()
                            .number(0)
                            .size(safeSource.size())
                            .totalElements(safeSource.size())
                            .totalPages(safeSource.isEmpty() ? 0 : 1)
                            .build())
                    .build();
        }

        int pageNumber = pageable.getPageNumber();
        int pageSize = pageable.getPageSize();
        int start = Math.min((int) pageable.getOffset(), safeSource.size());
        int end = Math.min(start + pageSize, safeSource.size());
        int totalPages = pageSize == 0 ? 0 : (int) Math.ceil((double) safeSource.size() / pageSize);

        return PageResponse.<T>builder()
                .data(safeSource.subList(start, end))
                .page(PageMetadata.builder()
                        .number(pageNumber)
                        .size(pageSize)
                        .totalElements(safeSource.size())
                        .totalPages(totalPages)
                        .build())
                .build();
    }
}
