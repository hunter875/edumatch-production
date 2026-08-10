package com.edumatch.scholarship.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "application_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Tham chiếu logic ---
    // ID của Đơn ứng tuyển (Application) mà tài liệu này thuộc về
    @Column(name = "application_id", nullable = false)
    private Long applicationId; // BẮT BUỘC là Long (theo Application.id)
    // --- ----------------- ---

    @Column(name = "document_name", length = 255)
    private String documentName; // Ví dụ: "CV_NguyenVanA.pdf"

    // Link S3/MinIO hoặc link file vật lý
    @Column(name = "document_url", columnDefinition = "TEXT")
    private String documentUrl;
}