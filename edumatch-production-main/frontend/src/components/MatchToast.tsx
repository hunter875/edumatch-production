'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMatchStore } from '@/stores/realtimeStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchToastProps {
  duration?: number; // Auto hide duration in ms
}

export function MatchToast({ duration = 8000 }: MatchToastProps) {
  const { matches, dismissMatch } = useMatchStore();
  const [visibleMatches, setVisibleMatches] = useState<string[]>([]);

  // Show new matches
  useEffect(() => {
    const newMatches = matches
      .filter(match => !visibleMatches.includes(match.id))
      .slice(0, 3); // Show max 3 at a time

    if (newMatches.length > 0) {
      const newIds = newMatches.map(m => m.id);
      setVisibleMatches(prev => [...prev, ...newIds]);

      // Auto dismiss after duration
      newIds.forEach(id => {
        setTimeout(() => {
          handleDismiss(id);
        }, duration);
      });
    }
  }, [matches, visibleMatches, duration]);

  const handleDismiss = (matchId: string) => {
    setVisibleMatches(prev => prev.filter(id => id !== matchId));
    setTimeout(() => {
      dismissMatch(matchId);
    }, 300); // Wait for animation to complete
  };

  const handleViewScholarship = (matchId: string, scholarshipId: string) => {
    // Navigate to scholarship details
    window.open(`/scholarships/${scholarshipId}`, '_blank');
    handleDismiss(matchId);
  };

  const visibleMatchData = matches.filter(match => visibleMatches.includes(match.id));

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {visibleMatchData.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 15,
              delay: index * 0.1 
            }}
            className="bg-white rounded-lg shadow-lg border border-purple-200 p-4 min-w-80"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-purple-900 text-sm">
                    🎯 New Perfect Match!
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDismiss(match.id)}
                    className="h-6 w-6 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-sm text-gray-700 mt-1 mb-2">
                  Found a scholarship with <span className="font-bold text-purple-600">{match.score}% match</span> to your profile!
                </p>

                {/* Match reasons */}
                <div className="space-y-1 mb-3">
                  {match.reasons.slice(0, 2).map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{reason}</span>
                    </div>
                  ))}
                  {match.reasons.length > 2 && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">
                        +{match.reasons.length - 2} more reasons
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleViewScholarship(match.id, match.scholarshipId)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 h-7"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Scholarship
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(match.id)}
                    className="text-gray-600 text-xs px-3 py-1 h-7"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Match Confidence</span>
                <span>{match.score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${match.score}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                ></motion.div>
              </div>
            </div>

            {/* Auto-dismiss countdown */}
            <div className="mt-2">
              <motion.div
                className="h-0.5 bg-gray-200 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <motion.div
                  className="h-full bg-purple-400"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ 
                    duration: duration / 1000, 
                    ease: "linear",
                    delay: 1 
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}