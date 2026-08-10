'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SkillsInputProps {
  value: string; // comma-separated string
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Common skills for autocomplete suggestions
const COMMON_SKILLS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust',
  'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js',
  'Machine Learning', 'Deep Learning', 'Data Science', 'AI',
  'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'GitHub', 'CI/CD', 'Agile', 'Scrum',
  'HTML', 'CSS', 'Tailwind', 'Bootstrap',
  'REST API', 'GraphQL', 'Microservices',
  'Testing', 'Jest', 'Cypress', 'Selenium',
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork'
];

export function SkillsInput({ value, onChange, disabled, placeholder }: SkillsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Parse skills from comma-separated string
  const skills = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Handle input change with autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length > 0) {
      const filtered = COMMON_SKILLS.filter(skill =>
        skill.toLowerCase().includes(val.toLowerCase()) &&
        !skills.includes(skill)
      );
      setSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Add skill
  const addSkill = (skill: string) => {
    if (skill.trim() && !skills.includes(skill.trim())) {
      const newSkills = [...skills, skill.trim()];
      onChange(newSkills.join(','));
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  // Remove skill
  const removeSkill = (skillToRemove: string) => {
    const newSkills = skills.filter(s => s !== skillToRemove);
    onChange(newSkills.join(','));
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addSkill(suggestions[0]); // Add first suggestion
      } else {
        addSkill(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      // Remove last skill when backspace on empty input
      removeSkill(skills[skills.length - 1]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {/* Skills Display */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {skill}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input with Autocomplete */}
      {!disabled && (
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a skill and press Enter...'}
            disabled={disabled}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addSkill(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {disabled 
          ? 'Edit mode to add skills'
          : 'Type and press Enter to add skills. Common skills will be suggested.'}
      </p>
    </div>
  );
}
