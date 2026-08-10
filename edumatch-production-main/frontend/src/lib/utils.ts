import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// LocalStorage utilities
export function getFromLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

export function setToLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Silent fail for storage operations
  }
}

export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Silent fail for storage operations
  }
}

// Date formatting utility
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Currency formatting utility
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Calculate days until deadline
export function getDaysUntilDeadline(deadline: string | Date): number {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Text truncation utility
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Match score color utility
export function getMatchScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}
