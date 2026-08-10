package com.example.jwt.example.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String username;

    private String action;     // "CREATE", "UPDATE", "DELETE", "LOGIN" ...
    private String target;     // ví dụ: "Scholarship", "Profile", "User"
    private String details;    // mô tả hành động chi tiết
    private LocalDateTime timestamp;
}