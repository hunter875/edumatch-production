/**
 * Utility functions for checking profile completion status
 */

import { AuthUser, UserProfile } from '@/types';

/**
 * Required fields for a complete profile
 */
const REQUIRED_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'bio',
  'gpa',
] as const;

/**
 * Check if user profile is complete
 * @param user - The authenticated user object
 * @returns true if profile is complete, false otherwise
 */
export function isProfileComplete(user: AuthUser | null): boolean {
  if (!user || !user.profile) {
    return false;
  }

  const profile = user.profile as Partial<UserProfile>;

  // Check if all required fields are filled
  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = profile[field];
    
    // Check if field exists and is not empty
    if (value === undefined || value === null || value === '') {
      return false;
    }

    // For GPA, check if it's a valid number
    if (field === 'gpa' && (isNaN(Number(value)) || Number(value) <= 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Get missing profile fields
 * @param user - The authenticated user object
 * @returns Array of missing field names
 */
export function getMissingProfileFields(user: AuthUser | null): string[] {
  if (!user || !user.profile) {
    return [...REQUIRED_PROFILE_FIELDS];
  }

  const profile = user.profile as Partial<UserProfile>;
  const missingFields: string[] = [];

  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = profile[field];
    
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    } else if (field === 'gpa' && (isNaN(Number(value)) || Number(value) <= 0)) {
      missingFields.push(field);
    }
  }

  return missingFields;
}

/**
 * Calculate profile completion percentage
 * @param user - The authenticated user object
 * @returns Completion percentage (0-100)
 */
export function getProfileCompletionPercentage(user: AuthUser | null): number {
  if (!user || !user.profile) {
    return 0;
  }

  const totalFields = REQUIRED_PROFILE_FIELDS.length;
  const missingFields = getMissingProfileFields(user).length;
  const completedFields = totalFields - missingFields;

  return Math.round((completedFields / totalFields) * 100);
}

/**
 * Check if user has skipped profile completion after registration
 * @returns true if user has skipped, false otherwise
 */
export function hasSkippedProfileCompletion(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('profile_completion_skipped') === 'true';
}

/**
 * Mark that user has skipped profile completion
 */
export function markProfileCompletionSkipped(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('profile_completion_skipped', 'true');
  localStorage.setItem('profile_completion_skipped_at', new Date().toISOString());
}

/**
 * Clear profile completion skip flag
 * (Call this when user completes their profile)
 */
export function clearProfileCompletionSkipped(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('profile_completion_skipped');
  localStorage.removeItem('profile_completion_skipped_at');
}

/**
 * Check if we should show profile completion prompt
 * Logic: Show if profile is incomplete AND (
 *   - User just registered OR
 *   - User skipped and logging in again
 * )
 * @param user - The authenticated user object
 * @param isPostRegistration - true if just after registration
 * @returns true if should show prompt
 */
export function shouldShowProfileCompletionPrompt(
  user: AuthUser | null,
  isPostRegistration: boolean = false
): boolean {
  // Don't show if profile is complete
  if (isProfileComplete(user)) {
    return false;
  }

  // Always show for post-registration
  if (isPostRegistration) {
    return true;
  }

  // For login: show if user has skipped before
  return hasSkippedProfileCompletion();
}
