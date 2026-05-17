package com.edumatch.scholarship.service;

import com.edumatch.scholarship.exception.ResourceNotFoundException;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.model.Skill;
import com.edumatch.scholarship.model.Tag;
import com.edumatch.scholarship.repository.OpportunityRepository;
import com.edumatch.scholarship.repository.SkillRepository;
import com.edumatch.scholarship.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OpportunityCollectionService {

    private final OpportunityRepository opportunityRepository;
    private final TagRepository tagRepository;
    private final SkillRepository skillRepository;

    public Set<Tag> resolveTags(List<String> tagNames) {
        List<String> names = normalizeNames(tagNames);
        if (names.isEmpty()) {
            return new HashSet<>();
        }

        Map<String, Tag> tagsByName = tagRepository.findByNameIn(names).stream()
                .collect(Collectors.toMap(Tag::getName, tag -> tag, (first, ignored) -> first));

        List<Tag> missingTags = names.stream()
                .filter(name -> !tagsByName.containsKey(name))
                .map(name -> new Tag(null, name, null))
                .collect(Collectors.toList());

        if (!missingTags.isEmpty()) {
            for (Tag savedTag : tagRepository.saveAll(missingTags)) {
                tagsByName.put(savedTag.getName(), savedTag);
            }
        }

        return names.stream()
                .map(tagsByName::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public Set<Skill> resolveSkills(List<String> skillNames) {
        List<String> names = normalizeNames(skillNames);
        if (names.isEmpty()) {
            return new HashSet<>();
        }

        Map<String, Skill> skillsByName = skillRepository.findByNameIn(names).stream()
                .collect(Collectors.toMap(Skill::getName, skill -> skill, (first, ignored) -> first));

        List<Skill> missingSkills = names.stream()
                .filter(name -> !skillsByName.containsKey(name))
                .map(name -> new Skill(null, name, null))
                .collect(Collectors.toList());

        if (!missingSkills.isEmpty()) {
            for (Skill savedSkill : skillRepository.saveAll(missingSkills)) {
                skillsByName.put(savedSkill.getName(), savedSkill);
            }
        }

        return names.stream()
                .map(skillsByName::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public void loadCollections(List<Opportunity> opportunities) {
        if (opportunities == null || opportunities.isEmpty()) {
            return;
        }

        List<Long> opportunityIds = opportunities.stream()
                .map(Opportunity::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (opportunityIds.isEmpty()) {
            return;
        }

        opportunityRepository.findAllWithTagsByIdIn(opportunityIds);
        opportunityRepository.findAllWithRequiredSkillsByIdIn(opportunityIds);
    }

    public Opportunity getWithCollections(Long opportunityId) {
        return opportunityRepository.findByIdWithTagsAndSkills(opportunityId)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found with id: " + opportunityId));
    }

    public String normalizeSearchKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<String> normalizeNames(List<String> names) {
        if (names == null || names.isEmpty()) {
            return List.of();
        }

        return names.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(name -> !name.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }
}
