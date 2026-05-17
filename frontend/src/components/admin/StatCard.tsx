'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
}

export default function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  sparklineData = []
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-600';
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
    }
  };

  const renderSparkline = () => {
    if (sparklineData.length === 0) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg
        viewBox="0 0 100 30"
        className="w-full h-8 mt-2"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500'}
        />
      </svg>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            
            {(change !== undefined || changeLabel) && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
                {getTrendIcon()}
                {change !== undefined && (
                  <span className="font-medium">
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                )}
                {changeLabel && (
                  <span className="text-gray-500 ml-1">{changeLabel}</span>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div className="p-3 bg-blue-50 rounded-lg">
              {icon}
            </div>
          )}
        </div>

        {renderSparkline()}
      </CardContent>
    </Card>
  );
}
