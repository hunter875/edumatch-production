'use client';

import React, { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'date-range' | 'text';
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
}

export default function FilterPanel({ filters, values, onChange, onClear }: FilterPanelProps) {
  const [showPanel, setShowPanel] = useState(false);

  const activeFiltersCount = Object.keys(values).filter(key => {
    const value = values[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return value.from || value.to;
    }
    return value !== '' && value !== null && value !== undefined;
  }).length;

  const handleMultiSelect = (key: string, option: string) => {
    const current = values[key] || [];
    const newValue = current.includes(option)
      ? current.filter((v: string) => v !== option)
      : [...current, option];
    onChange(key, newValue);
  };

  const removeFilter = (key: string, option?: string) => {
    if (option) {
      const current = values[key] || [];
      onChange(key, current.filter((v: string) => v !== option));
    } else {
      onChange(key, null);
    }
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'select':
        return (
          <select
            value={values[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{filter.placeholder || 'All'}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        return (
          <div className="space-y-2">
            {filter.options?.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(values[filter.key] || []).includes(option.value)}
                  onChange={() => handleMultiSelect(filter.key, option.value)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date-range':
        return (
          <div className="space-y-2">
            <Input
              type="date"
              value={values[filter.key]?.from || ''}
              onChange={(e) => onChange(filter.key, { ...values[filter.key], from: e.target.value })}
              placeholder="From"
            />
            <Input
              type="date"
              value={values[filter.key]?.to || ''}
              onChange={(e) => onChange(filter.key, { ...values[filter.key], to: e.target.value })}
              placeholder="To"
            />
          </div>
        );

      case 'text':
        return (
          <Input
            type="text"
            value={values[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Button & Active Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setShowPanel(!showPanel)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Active Filter Chips */}
        {Object.entries(values).map(([key, value]) => {
          const filter = filters.find(f => f.key === key);
          if (!filter) return null;

          if (Array.isArray(value) && value.length > 0) {
            return value.map(v => {
              const option = filter.options?.find(o => o.value === v);
              return (
                <Badge key={`${key}-${v}`} variant="secondary" className="gap-2">
                  {filter.label}: {option?.label || v}
                  <button
                    onClick={() => removeFilter(key, v)}
                    className="hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            });
          }

          if (typeof value === 'object' && value !== null && (value.from || value.to)) {
            return (
              <Badge key={key} variant="secondary" className="gap-2">
                {filter.label}: {value.from || '...'} - {value.to || '...'}
                <button
                  onClick={() => removeFilter(key)}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          }

          if (value && value !== '') {
            const option = filter.options?.find(o => o.value === value);
            return (
              <Badge key={key} variant="secondary" className="gap-2">
                {filter.label}: {option?.label || value}
                <button
                  onClick={() => removeFilter(key)}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          }

          return null;
        })}

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showPanel && (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {filter.label}
                </label>
                {renderFilter(filter)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
