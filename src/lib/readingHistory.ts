/**
 * Reading History — The Oracle Remembers
 *
 * Stores all past readings in localStorage.
 * Each reading captures the question, verdict, oracle text,
 * category, and a timestamp.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';

export interface ReadingRecord {
  id: string;
  question: string;
  verdict: Verdict;
  oracleText: string;
  category: QuestionCategory;
  timestamp: number; // ms since epoch
  moonPhase?: string;
  overallScore?: number;
  profileId?: string; // which profile made this reading
}

const HISTORY_KEY = 'seer_reading_history';
const MAX_READINGS = 100; // Keep last 100

/**
 * Save a new reading to history
 */
export function saveReading(reading: Omit<ReadingRecord, 'id' | 'timestamp'>): ReadingRecord {
  const record: ReadingRecord = {
    ...reading,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Always load ALL readings (unfiltered) for storage
  const history = getReadings();
  history.unshift(record); // newest first

  // Trim to max
  if (history.length > MAX_READINGS) {
    history.length = MAX_READINGS;
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* storage full — silently fail */ }

  return record;
}

/**
 * Get all readings, newest first.
 * Optionally filter by profileId.
 */
export function getReadings(profileId?: string): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as ReadingRecord[];
    if (profileId) {
      return all.filter(r => r.profileId === profileId);
    }
    return all;
  } catch {
    return [];
  }
}

/**
 * Get readings grouped by date.
 * Optionally filter by profileId.
 */
export function getReadingsGroupedByDate(profileId?: string): { date: string; readings: ReadingRecord[] }[] {
  const readings = getReadings(profileId);
  const groups: Map<string, ReadingRecord[]> = new Map();

  for (const reading of readings) {
    const dateKey = new Date(reading.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(reading);
  }

  return Array.from(groups.entries()).map(([date, readings]) => ({ date, readings }));
}

/**
 * Get count of readings today (for paywall gating)
 */
export function getTodayReadingCount(profileId?: string): number {
  const today = new Date().toDateString();
  return getReadings(profileId).filter(r => new Date(r.timestamp).toDateString() === today).length;
}

/**
 * Reading patterns for session memory
 */
export interface ReadingPatterns {
  /** How many times each category was asked in the last 7 days */
  categoryFrequency: Partial<Record<QuestionCategory, number>>;
  /** Most asked category (null if no readings) */
  mostAskedCategory: QuestionCategory | null;
  /** Total readings in the last 7 days */
  totalReadingsThisWeek: number;
  /** The most recent verdict for each category */
  previousVerdictForCategory: Partial<Record<QuestionCategory, Verdict>>;
}

/**
 * Analyze reading patterns for session memory.
 * Looks at readings from the last 7 days.
 * Optionally filter by profileId.
 */
export function analyzePatterns(profileId?: string): ReadingPatterns {
  const readings = getReadings(profileId);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentReadings = readings.filter(r => r.timestamp >= sevenDaysAgo);

  // Count category frequency
  const categoryFrequency: Partial<Record<QuestionCategory, number>> = {};
  for (const r of recentReadings) {
    categoryFrequency[r.category] = (categoryFrequency[r.category] || 0) + 1;
  }

  // Find most asked category
  let mostAskedCategory: QuestionCategory | null = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(categoryFrequency)) {
    if (count! > maxCount) {
      maxCount = count!;
      mostAskedCategory = cat as QuestionCategory;
    }
  }

  // Get last verdict per category (most recent reading first)
  const previousVerdictForCategory: Partial<Record<QuestionCategory, Verdict>> = {};
  for (const r of recentReadings) {
    if (!(r.category in previousVerdictForCategory)) {
      previousVerdictForCategory[r.category] = r.verdict;
    }
  }

  return {
    categoryFrequency,
    mostAskedCategory,
    totalReadingsThisWeek: recentReadings.length,
    previousVerdictForCategory,
  };
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
