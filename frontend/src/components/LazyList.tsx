'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gridContainerVariants, gridItemVariants } from '@/lib/animations';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemsPerPage?: number;
  loadMoreThreshold?: number;
  className?: string;
  loadingElement?: React.ReactNode;
}

/**
 * LazyList Component - Implements infinite scroll with lazy loading
 * 
 * This component progressively loads items as the user scrolls down,
 * improving initial page load time and reducing memory usage.
 * 
 * @param items - Array of items to render
 * @param renderItem - Function to render each item
 * @param itemsPerPage - Number of items to load per batch (default: 12)
 * @param loadMoreThreshold - Distance from bottom to trigger load (default: 300px)
 * @param className - CSS class for the container
 * @param loadingElement - Custom loading indicator
 */
export function LazyList<T>({
  items,
  renderItem,
  itemsPerPage = 12,
  loadMoreThreshold = 300,
  className = '',
  loadingElement,
}: LazyListProps<T>) {
  const [displayCount, setDisplayCount] = useState(itemsPerPage);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset display count when items change
  useEffect(() => {
    setDisplayCount(itemsPerPage);
  }, [items, itemsPerPage]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < items.length && !isLoading) {
          setIsLoading(true);
          // Simulate loading delay for smooth UX
          setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + itemsPerPage, items.length));
            setIsLoading(false);
          }, 300);
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${loadMoreThreshold}px`,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [displayCount, items.length, itemsPerPage, loadMoreThreshold, isLoading]);

  const visibleItems = items.slice(0, displayCount);
  const hasMore = displayCount < items.length;

  return (
    <>
      <motion.div
        className={className}
        variants={gridContainerVariants}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <motion.div
              key={index}
              variants={gridItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
              {renderItem(item, index)}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Loading indicator and observer target */}
      {hasMore && (
        <motion.div
          ref={observerTarget}
          className="flex justify-center items-center py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {isLoading ? (
            loadingElement || (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-sm text-muted-foreground">Loading more...</p>
              </motion.div>
            )
          ) : (
            <div className="h-8" /> // Spacer for observer
          )}
        </motion.div>
      )}

      {/* Show total count */}
      {!hasMore && items.length > itemsPerPage && (
        <motion.div
          className="text-center py-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-sm text-muted-foreground">
            Showing all {items.length} items
          </p>
        </motion.div>
      )}
    </>
  );
}

export default LazyList;
