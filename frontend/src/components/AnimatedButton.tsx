'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { buttonVariants, iconButtonVariants } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends Omit<ButtonProps, 'asChild'> {
  children: React.ReactNode;
  isIconButton?: boolean;
  disableAnimation?: boolean;
}

/**
 * AnimatedButton - Button component with framer-motion animations
 * 
 * Automatically adds hover and tap animations to buttons for better UX.
 * Can be used as a drop-in replacement for the regular Button component.
 * 
 * @param isIconButton - Use icon button animation (includes rotation)
 * @param disableAnimation - Disable all animations
 */
export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, className, isIconButton = false, disableAnimation = false, ...props }, ref) => {
    if (disableAnimation) {
      return (
        <Button ref={ref} className={className} {...props}>
          {children}
        </Button>
      );
    }

    const variants = isIconButton ? iconButtonVariants : buttonVariants;

    return (
      <motion.div
        variants={variants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        style={{ display: 'inline-block' }}
      >
        <Button ref={ref} className={cn('cursor-pointer', className)} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
