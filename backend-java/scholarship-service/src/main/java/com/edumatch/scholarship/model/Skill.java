package com.edumatch.scholarship.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.Set;

@Entity
@Table(name = "skills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    // Quan hệ ngược lại: Một Skill có thể được yêu cầu bởi nhiều Opportunities
    @ManyToMany(mappedBy = "requiredSkills")
    private Set<Opportunity> opportunities;
}