'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useRealTime } from '@/providers/RealTimeProvider';
import { cn } from '@/lib/utils';

export function RealTimeIndicator() {
  const { isConnected } = useRealTime();

  return (
    <div className={cn(
      "fixed top-20 right-4 z-40 flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-300",
      isConnected 
        ? "bg-green-100 text-green-800 border border-green-200" 
        : "bg-red-100 text-red-800 border border-red-200"
    )}>
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Connected</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Disconnected</span>
        </>
      )}
    </div>
  );
}