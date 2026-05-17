package com.edumatch.scholarship.controller;

import com.edumatch.scholarship.dto.BookmarkDto;
import com.edumatch.scholarship.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')") // Tất cả API trong này đều yêu cầu ROLE_USER
public class BookmarkController {

    private final BookmarkService bookmarkService;

    /**
     * API để Applicant (Sinh viên) bookmark/un-bookmark một cơ hội
     * Endpoint: POST /api/bookmarks/{opportunityId}
     */
    @PostMapping("/{opportunityId}")
    public ResponseEntity<?> toggleBookmark(
            @PathVariable Long opportunityId,
            @AuthenticationPrincipal UserDetails userDetails) {

        boolean isBookmarked = bookmarkService.toggleBookmark(opportunityId, userDetails);

        // Trả về { "bookmarked": true } hoặc { "bookmarked": false }
        return ResponseEntity.ok(Map.of("bookmarked", isBookmarked));
    }

    /**
     * API để Applicant (Sinh viên) lấy danh sách đã bookmark
     * Endpoint: GET /api/bookmarks/my
     */
    @GetMapping("/my")
    public ResponseEntity<List<BookmarkDto>> getMyBookmarks(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<BookmarkDto> bookmarks = bookmarkService.getMyBookmarks(userDetails);
        return ResponseEntity.ok(bookmarks);
    }

    /**
     * Endpoint: GET /api/bookmarks/my/statuses?opportunityIds=1,2,3
     */
    @GetMapping("/my/statuses")
    public ResponseEntity<Map<Long, Boolean>> getMyBookmarkStatuses(
            @RequestParam List<Long> opportunityIds,
            @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(bookmarkService.getMyBookmarkStatuses(opportunityIds, userDetails));
    }
}
