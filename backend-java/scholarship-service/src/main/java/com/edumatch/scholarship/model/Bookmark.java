package com.edumatch.scholarship.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bookmarks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Tham chiếu logic ---
    // ID của User (sinh viên) thực hiện bookmark
    @Column(name = "applicant_user_id", nullable = false)
    private Long applicantUserId; // BẮT BUỘC là Long (theo User.id)

    // ID của Opportunity được bookmark
    @Column(name = "opportunity_id", nullable = false)
    private Long opportunityId; // BẮT BUỘC là Long (theo Opportunity.id)
}