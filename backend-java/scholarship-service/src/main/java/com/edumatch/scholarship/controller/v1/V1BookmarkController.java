package com.edumatch.scholarship.controller.v1;

import com.edumatch.scholarship.dto.BookmarkDto;
import com.edumatch.scholarship.dto.api.ApiResponse;
import com.edumatch.scholarship.dto.api.PageResponse;
import com.edumatch.scholarship.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_USER')")
public class V1BookmarkController {

    private final BookmarkService bookmarkService;

    @PutMapping("/bookmarks/{scholarshipId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> saveBookmark(
            @PathVariable Long scholarshipId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        boolean bookmarked = bookmarkService.setBookmark(scholarshipId, userDetails, true);
        return ResponseEntity.ok(ApiResponse.of(Map.of("bookmarked", bookmarked)));
    }

    @DeleteMapping("/bookmarks/{scholarshipId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> removeBookmark(
            @PathVariable Long scholarshipId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        boolean bookmarked = bookmarkService.setBookmark(scholarshipId, userDetails, false);
        return ResponseEntity.ok(ApiResponse.of(Map.of("bookmarked", bookmarked)));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<PageResponse<BookmarkDto>> getMyBookmarks(
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromList(
                bookmarkService.getMyBookmarks(userDetails),
                pageable
        ));
    }

    @GetMapping("/bookmark-statuses")
    public ResponseEntity<ApiResponse<Map<Long, Boolean>>> getMyBookmarkStatuses(
            @RequestParam List<Long> opportunityIds,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(
                bookmarkService.getMyBookmarkStatuses(opportunityIds, userDetails)
        ));
    }
}
