'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageSlideVariants } from '@/lib/animations';

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'fade' | 'slide';
}

/**
 * AnimatedPage - Wrapper component for page-level animations
 * 
 * Adds smooth enter/exit transitions to pages.
 * Use this at the top level of your page components.
 * 
 * @param variant - Animation type: 'fade' (default) or 'slide'
 */
export function AnimatedPage({ children, className = '', variant = 'fade' }: AnimatedPageProps) {
  const variants = variant === 'slide' ? pageSlideVariants : pageVariants;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;
