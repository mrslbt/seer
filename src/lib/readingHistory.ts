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
 * Get all readings, newest first
 */
export function getReadings(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReadingRecord[];
  } catch {
    return [];
  }
}

/**
 * Get readings grouped by date
 */
export function getReadingsGroupedByDate(): { date: string; readings: ReadingRecord[] }[] {
  const readings = getReadings();
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
export function getTodayReadingCount(): number {
  const today = new Date().toDateString();
  return getReadings().filter(r => new Date(r.timestamp).toDateString() === today).length;
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
