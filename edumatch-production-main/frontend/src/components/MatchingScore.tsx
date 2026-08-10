/**
 * Matching Score Component
 * Hiển thị điểm matching giữa user và scholarship
 */
'use client';

import React from 'react';

interface MatchingScoreProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const MatchingScore: React.FC<MatchingScoreProps> = ({
  score,
  size = 'md',
  showLabel = true
}) => {
  // Determine color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 75) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBgColor = (score: number): string => {
    if (score >= 75) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getBorderColor = (score: number): string => {
    if (score >= 75) return 'border-green-300 dark:border-green-700';
    if (score >= 50) return 'border-yellow-300 dark:border-yellow-700';
    return 'border-red-300 dark:border-red-700';
  };

  const getMatchLevel = (score: number): string => {
    if (score >= 75) return 'Rất phù hợp';
    if (score >= 50) return 'Phù hợp';
    return 'Ít phù hợp';
  };

  // Size variants
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3'
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-lg border-2
        ${getBgColor(score)}
        ${getBorderColor(score)}
        ${sizeClasses[size]}
      `}
    >
      <div className={`font-bold ${getScoreColor(score)}`}>
        {Math.round(score)}%
      </div>
      {showLabel && (
        <div className={`text-xs ${getScoreColor(score)}`}>
          {getMatchLevel(score)}
        </div>
      )}
    </div>
  );
};

export { MatchingScore };
export default MatchingScore;
