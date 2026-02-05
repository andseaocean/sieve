/**
 * Outreach Scheduling Utility
 *
 * Calculates optimal send times for outreach messages to appear human-like.
 * All calculations based on Kyiv timezone (Europe/Kyiv).
 *
 * Timing Rules:
 * - 07:00-15:00 submission → send 3-4 hours later (randomized)
 * - 00:00-06:59 submission → send today 10:00-11:00 (randomized)
 * - 15:01-23:59 submission → send tomorrow 10:00-11:00 (randomized)
 */

import { ContactMethod } from '@/lib/supabase/types';

const KYIV_TZ = 'Europe/Kyiv';

/**
 * Get current time in Kyiv timezone
 */
function getKyivDate(date: Date = new Date()): Date {
  // Get the time string in Kyiv timezone
  const kyivString = date.toLocaleString('en-US', { timeZone: KYIV_TZ });
  return new Date(kyivString);
}

/**
 * Get hour in Kyiv timezone
 */
function getKyivHour(date: Date = new Date()): number {
  return getKyivDate(date).getHours();
}

/**
 * Generate random minutes within a range
 */
function randomMinutes(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random delay in milliseconds (for 3-4 hour range)
 */
function randomDelayMs(): number {
  // 3 to 4 hours in milliseconds
  const minDelay = 3 * 60 * 60 * 1000; // 3 hours
  const maxDelay = 4 * 60 * 60 * 1000; // 4 hours
  return minDelay + Math.random() * (maxDelay - minDelay);
}

/**
 * Create a date at a specific hour/minute in Kyiv timezone
 */
function createKyivDate(baseDate: Date, hour: number, minute: number): Date {
  // Get the date components in Kyiv timezone
  const kyivDate = getKyivDate(baseDate);

  // Create a new date with the target hour/minute
  kyivDate.setHours(hour, minute, 0, 0);

  // Calculate the offset between UTC and Kyiv
  const utcDate = new Date(baseDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = utcDate.getTime() - getKyivDate(baseDate).getTime();

  // Return the UTC equivalent
  return new Date(kyivDate.getTime() + offsetMs);
}

/**
 * Calculate when to send outreach message based on submission time
 *
 * @param submissionTime - When the candidate submitted their application
 * @returns Scheduled send time (UTC)
 */
export function calculateScheduledTime(submissionTime: Date = new Date()): Date {
  const kyivHour = getKyivHour(submissionTime);

  // Case 1: 07:00-15:00 → send 3-4 hours later
  if (kyivHour >= 7 && kyivHour < 15) {
    const delayMs = randomDelayMs();
    return new Date(submissionTime.getTime() + delayMs);
  }

  // Case 2: 00:00-06:59 → send today 10:00-11:00
  if (kyivHour >= 0 && kyivHour < 7) {
    const targetMinute = randomMinutes(0, 59);
    return createKyivDate(submissionTime, 10, targetMinute);
  }

  // Case 3: 15:01-23:59 → send tomorrow 10:00-11:00
  const tomorrow = new Date(submissionTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetMinute = randomMinutes(0, 59);
  return createKyivDate(tomorrow, 10, targetMinute);
}

/**
 * Format scheduled time for display in Kyiv timezone
 */
export function formatScheduledTime(date: Date): string {
  return date.toLocaleString('uk-UA', {
    timeZone: KYIV_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format scheduled time with relative indicator
 */
export function formatScheduledTimeRelative(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const formatted = formatScheduledTime(date);

  if (diffHours < 0) {
    return `${formatted} (прострочено)`;
  } else if (diffHours < 1) {
    return `${formatted} (менше години)`;
  } else if (diffHours < 24) {
    return `${formatted} (через ${diffHours} год.)`;
  } else {
    const diffDays = Math.round(diffHours / 24);
    return `${formatted} (через ${diffDays} дн.)`;
  }
}

/**
 * Determine which delivery method to use based on preferences
 *
 * Priority: Telegram > Email (as per spec)
 * Falls back to email if telegram is selected but no username provided
 */
export function determineDeliveryMethod(
  preferredMethods: ContactMethod[] | string | null,
  telegramUsername: string | null
): ContactMethod {
  // Handle various formats: array, JSON string, or null
  let methods: ContactMethod[];

  if (!preferredMethods) {
    methods = ['email'];
  } else if (typeof preferredMethods === 'string') {
    try {
      methods = JSON.parse(preferredMethods) as ContactMethod[];
    } catch {
      methods = ['email'];
    }
  } else if (Array.isArray(preferredMethods)) {
    methods = preferredMethods;
  } else {
    methods = ['email'];
  }

  // Prefer telegram if selected AND username is provided
  if (methods.includes('telegram') && telegramUsername && telegramUsername.trim().length > 0) {
    return 'telegram';
  }

  // Default to email
  return 'email';
}

/**
 * Check if a scheduled time is in the past
 */
export function isScheduledTimeInPast(scheduledFor: Date | string): boolean {
  const scheduled = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor;
  return scheduled.getTime() <= Date.now();
}

/**
 * Check if outreach should be sent now (scheduled time has passed)
 */
export function shouldSendNow(scheduledFor: Date | string): boolean {
  return isScheduledTimeInPast(scheduledFor);
}
