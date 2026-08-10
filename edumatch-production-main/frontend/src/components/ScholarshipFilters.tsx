'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  SlidersHorizontal, 
  X,
  DollarSign,
  Calendar,
  MapPin,
  GraduationCap,
  Grid3x3,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { fadeInUpVariants } from '@/lib/animations';

export interface ScholarshipFilterState {
  searchTerm: string;
  categories: string[];
  amountRange: [number, number];
  deadlineRange: 'all' | 'week' | 'month' | 'quarter' | 'year';
  locations: string[];
  educationLevels: string[];
}

interface ScholarshipFiltersProps {
  filters: ScholarshipFilterState;
  onFilterChange: (filters: ScholarshipFilterState) => void;
  availableCategories: string[];
  availableLocations: string[];
  availableEducationLevels: string[];
  totalResults: number;
}

export function ScholarshipFilters({
  filters,
  onFilterChange,
  availableCategories,
  availableLocations,
  availableEducationLevels,
  totalResults,
}: ScholarshipFiltersProps) {
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localAmountMin, setLocalAmountMin] = useState(filters.amountRange[0].toString());
  const [localAmountMax, setLocalAmountMax] = useState(filters.amountRange[1].toString());

  // Check if any filters are active
  const hasActiveFilters = 
    filters.searchTerm !== '' ||
    filters.categories.length > 0 ||
    filters.amountRange[0] > 0 ||
    filters.amountRange[1] < 100000 ||
    filters.deadlineRange !== 'all' ||
    filters.locations.length > 0 ||
    filters.educationLevels.length > 0;

  const activeFilterCount = 
    (filters.searchTerm ? 1 : 0) +
    filters.categories.length +
    (filters.amountRange[0] > 0 || filters.amountRange[1] < 100000 ? 1 : 0) +
    (filters.deadlineRange !== 'all' ? 1 : 0) +
    filters.locations.length +
    filters.educationLevels.length;

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchTerm: value });
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter(l => l !== location)
      : [...filters.locations, location];
    onFilterChange({ ...filters, locations: newLocations });
  };

  const handleEducationLevelToggle = (level: string) => {
    const newLevels = filters.educationLevels.includes(level)
      ? filters.educationLevels.filter(l => l !== level)
      : [...filters.educationLevels, level];
    onFilterChange({ ...filters, educationLevels: newLevels });
  };

  const handleAmountRangeApply = () => {
    const min = parseInt(localAmountMin) || 0;
    const max = parseInt(localAmountMax) || 100000;
    onFilterChange({ 
      ...filters, 
      amountRange: [Math.min(min, max), Math.max(min, max)] 
    });
  };

  const handleClearAll = () => {
    setLocalAmountMin('0');
    setLocalAmountMax('100000');
    onFilterChange({
      searchTerm: '',
      categories: [],
      amountRange: [0, 100000],
      deadlineRange: 'all',
      locations: [],
      educationLevels: [],
    });
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'search':
        onFilterChange({ ...filters, searchTerm: '' });
        break;
      case 'category':
        onFilterChange({ 
          ...filters, 
          categories: filters.categories.filter(c => c !== value) 
        });
        break;
      case 'location':
        onFilterChange({ 
          ...filters, 
          locations: filters.locations.filter(l => l !== value) 
        });
        break;
      case 'educationLevel':
        onFilterChange({ 
          ...filters, 
          educationLevels: filters.educationLevels.filter(l => l !== value) 
        });
        break;
      case 'amount':
        setLocalAmountMin('0');
        setLocalAmountMax('100000');
        onFilterChange({ ...filters, amountRange: [0, 100000] });
        break;
      case 'deadline':
        onFilterChange({ ...filters, deadlineRange: 'all' });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('filters.searchPlaceholder')}
                value={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showAdvanced ? 'default' : 'outline'}
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('filters.advanced')}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Chips */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('filters.activeFilters')} ({activeFilterCount})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 text-xs"
                  >
                    {t('filters.clearAll')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      <Search className="h-3 w-3" />
                      "{filters.searchTerm}"
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('search')}
                      />
                    </Badge>
                  )}
                  {filters.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="gap-1">
                      <Grid3x3 className="h-3 w-3" />
                      {category}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('category', category)}
                      />
                    </Badge>
                  ))}
                  {filters.locations.map((location) => (
                    <Badge key={location} variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {location}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('location', location)}
                      />
                    </Badge>
                  ))}
                  {filters.educationLevels.map((level) => (
                    <Badge key={level} variant="secondary" className="gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {level}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('educationLevel', level)}
                      />
                    </Badge>
                  ))}
                  {(filters.amountRange[0] > 0 || filters.amountRange[1] < 100000) && (
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${filters.amountRange[0].toLocaleString()} - ${filters.amountRange[1].toLocaleString()}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('amount')}
                      />
                    </Badge>
                  )}
                  {filters.deadlineRange !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {t(`filters.deadline.${filters.deadlineRange}`)}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFilter('deadline')}
                      />
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            variants={fadeInUpVariants}
            initial="initial"
            animate="animate"
            exit="initial"
          >
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    {t('filters.categories')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.slice(0, 8).map((category) => (
                      <Button
                        key={category}
                        variant={filters.categories.includes(category) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCategoryToggle(category)}
                        className="rounded-full"
                      >
                        {category}
                        {filters.categories.includes(category) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Amount Range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('filters.amountRange')}
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={localAmountMin}
                      onChange={(e) => setLocalAmountMin(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={localAmountMax}
                      onChange={(e) => setLocalAmountMax(e.target.value)}
                      className="w-32"
                    />
                    <Button size="sm" onClick={handleAmountRangeApply}>
                      {t('filters.apply')}
                    </Button>
                  </div>
                </div>

                {/* Deadline Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('filters.deadline.label')}
                  </Label>
                  <Select
                    value={filters.deadlineRange}
                    onValueChange={(value: any) => 
                      onFilterChange({ ...filters, deadlineRange: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filters.deadline.all')}</SelectItem>
                      <SelectItem value="week">{t('filters.deadline.week')}</SelectItem>
                      <SelectItem value="month">{t('filters.deadline.month')}</SelectItem>
                      <SelectItem value="quarter">{t('filters.deadline.quarter')}</SelectItem>
                      <SelectItem value="year">{t('filters.deadline.year')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t('filters.locations')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableLocations.slice(0, 6).map((location) => (
                      <Button
                        key={location}
                        variant={filters.locations.includes(location) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleLocationToggle(location)}
                        className="rounded-full"
                      >
                        {location}
                        {filters.locations.includes(location) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Education Level Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {t('filters.educationLevels')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableEducationLevels.map((level) => (
                      <Button
                        key={level}
                        variant={filters.educationLevels.includes(level) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleEducationLevelToggle(level)}
                        className="rounded-full"
                      >
                        {level}
                        {filters.educationLevels.includes(level) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Results Count */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('filters.showingResults').replace('{count}', totalResults.toString())}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ScholarshipFilters;
