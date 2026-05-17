package com.example.jwt.example.service;

import com.example.jwt.example.model.AuditLog;
import com.example.jwt.example.repository.AuditLogRepository;
import com.example.jwt.example.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void logAction(Long userId, String username, String action, String target, String details) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .username(username)
                .action(action)
                .target(target)
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
        auditLogRepository.save(log);
    }

    public Page<AuditLog> getAuditLogs(String username, String action, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return auditLogRepository.filterLogs(username, action, startDate, endDate, pageable);
    }

    public Page<AuditLog> getAuditLogs(String username, String action, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PaginationUtils.pageRequest(page, size, Sort.by("timestamp").descending());
        return getAuditLogs(username, action, startDate, endDate, pageable);
    }

    public Page<AuditLog> getLogsByUser(
            Long userId,
            String action,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int size
    ) {
        Pageable pageable = PaginationUtils.pageRequest(page, size, Sort.by("timestamp").descending());
        return auditLogRepository.findByUserFilters(userId, action, from, to, pageable);
    }
}
