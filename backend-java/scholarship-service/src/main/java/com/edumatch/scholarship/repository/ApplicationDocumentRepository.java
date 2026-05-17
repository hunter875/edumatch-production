package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.ApplicationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, Long> {

    // Lấy tất cả tài liệu của một đơn ứng tuyển
    List<ApplicationDocument> findByApplicationId(Long applicationId);

    List<ApplicationDocument> findByApplicationIdIn(List<Long> applicationIds);

    @Transactional
    void deleteAllByApplicationIdIn(List<Long> applicationIds);
}
