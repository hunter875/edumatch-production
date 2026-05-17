'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, GraduationCap, DollarSign, Building2, Eye } from 'lucide-react';
import { Scholarship } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApplyButton } from '@/components/ApplyButton';
import { formatDate, getDaysUntilDeadline, truncateText, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { scholarshipCardVariants } from '@/lib/animations';
import { MatchingScore } from '@/components/MatchingScore';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  showMatchScore?: boolean;
  className?: string;
  hasApplied?: boolean;
  loading?: boolean;
}

export function ScholarshipCard({ scholarship, showMatchScore = false, className, hasApplied = false, loading = false }: ScholarshipCardProps) {
  const { t } = useLanguage();
  
  const daysUntilDeadline = getDaysUntilDeadline(scholarship.applicationDeadline);
  const isDeadlineSoon = daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
  const isExpired = daysUntilDeadline < 0;

  const getDeadlineStatus = () => {
    if (isExpired) return { text: t('scholarshipCard.expired'), variant: 'destructive' as const, color: 'text-red-500' };
    if (isDeadlineSoon) return { text: t('scholarshipCard.daysLeft').replace('{days}', daysUntilDeadline.toString()), variant: 'warning' as const, color: 'text-yellow-600' };
    return { text: formatDate(scholarship.applicationDeadline), variant: 'outline' as const, color: 'text-muted-foreground' };
  };

  const deadlineStatus = getDeadlineStatus();

  // Logic hiển thị tên Organization: Ưu tiên providerName (đã map), sau đó đến university
  const organizationDisplay = scholarship.providerName || scholarship.university || t('scholarshipCard.unknownProvider');

  return (
    <motion.div
      variants={scholarshipCardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      className="h-full min-w-0"
    >
      <Card className={`flex flex-col h-full min-w-0 overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300 ${className}`}>
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-3">
            <CardTitle className="min-w-0 break-words text-lg font-semibold line-clamp-2 text-balance bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
              {scholarship.title}
            </CardTitle>
            {showMatchScore && scholarship.matchScore !== undefined && (
              <MatchingScore score={scholarship.matchScore} size="sm" showLabel={false} />
            )}
          </div>
        
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
            {/* Organization Name */}
            <div className="flex items-center gap-1 min-w-0">
               <Building2 className="h-3 w-3 flex-shrink-0" />
               <span className="font-medium truncate" title={organizationDisplay}>
                 {organizationDisplay}
               </span>
            </div>
            
            <span>•</span>
            
            {/* Location */}
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {scholarship.location || (scholarship.isRemote ? "Remote" : "Location TBD")}
              </span>
            </div>
          </div>
          
          {isDeadlineSoon && (
            <Badge variant={deadlineStatus.variant} className="text-xs">
              {t('scholarshipCard.urgent')}
            </Badge>
          )}
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
            {truncateText(scholarship.description, 120)}
          </p>

          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {scholarship.tags && scholarship.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="max-w-full whitespace-normal break-words text-xs">
                {tag}
              </Badge>
            ))}
            {scholarship.tags && scholarship.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{scholarship.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 break-words">{scholarship.level || 'N/A'}</span>
            </div>
            
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 break-words">{scholarship.studyMode?.replace('_', ' ') || 'N/A'}</span>
            </div>
            
            {(scholarship.scholarshipAmount ?? scholarship.amount ?? 0) > 0 && (
              <div className="flex items-center gap-2 col-span-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 text-white" />
                </div>
                <span className="font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatCurrency((scholarship.scholarshipAmount ?? scholarship.amount ?? 0))}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={`text-sm font-medium ${deadlineStatus.color}`}>
                {deadlineStatus.text}
              </span>
            </div>
            
            {isDeadlineSoon && (
              <Badge variant={deadlineStatus.variant} className="text-xs">
                {t('scholarshipCard.urgent')}
              </Badge>
            )}
          </div>

          {/* View Count */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Eye className="h-3 w-3" />
            <span>{scholarship.viewCount || 0} views</span>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="grid grid-cols-1 gap-2 pt-0 sm:grid-cols-2">
          <Button asChild variant="outline" className="w-full min-w-0 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
            <Link href={`/user/scholarships/${scholarship.id}`}>
              {t('scholarshipCard.viewDetails')}
            </Link>
          </Button>
          <ApplyButton
            scholarship={scholarship}
            hasApplied={hasApplied}
            disabled={loading || isExpired}
            className="w-full min-w-0 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
            showDialog={true}
          />
        </CardFooter>
      </Card>
    </motion.div>
  );
}
