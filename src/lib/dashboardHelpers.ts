/**
 * Dashboard display helpers
 *
 * Category metadata (icons, display names) and score-to-color/label
 * utilities for the Cosmic Dashboard. Pure data — no side effects.
 */

import type { PersonalDailyReport } from './personalDailyReport';

export interface CategoryMeta {
  key: keyof PersonalDailyReport['categories'];
  displayName: string;
  icon: string;
  planetName: string;
}

/**
 * Display metadata for each scoring category.
 * Icons use astrological planet symbols (Unicode).
 */
export const CATEGORY_META: CategoryMeta[] = [
  { key: 'love',       displayName: 'Love',       icon: '♀', planetName: 'Venus' },
  { key: 'career',     displayName: 'Career',     icon: '♄', planetName: 'Saturn' },
  { key: 'money',      displayName: 'Money',      icon: '♃', planetName: 'Jupiter' },
  { key: 'health',     displayName: 'Health',     icon: '♂', planetName: 'Mars' },
  { key: 'social',     displayName: 'Social',     icon: '☿', planetName: 'Mercury' },
  { key: 'decisions',  displayName: 'Decisions',  icon: '☉', planetName: 'Sun' },
  { key: 'creativity', displayName: 'Creativity', icon: '♆', planetName: 'Neptune' },
  { key: 'spiritual',  displayName: 'Spiritual',  icon: '☽', planetName: 'Moon' },
];

/**
 * Score → color (CSS variable reference)
 */
export function getScoreColor(score: number): string {
  if (score >= 7) return 'var(--accent)';
  if (score >= 4) return 'var(--text-secondary)';
  return 'var(--no)';
}

/**
 * Score → human-readable energy label
 */
export function getEnergyLabel(score: number): string {
  if (score >= 9) return 'Strong';
  if (score >= 7) return 'Favorable';
  if (score >= 5) return 'Balanced';
  if (score >= 3) return 'Restrained';
  return 'Difficult';
}

/**
 * Overall energy level → short poetic descriptor
 */
export function getOverallDescriptor(energy: PersonalDailyReport['overallEnergy']): string {
  switch (energy) {
    case 'excellent':   return 'The cosmos align in your favor';
    case 'good':        return 'Celestial currents support you';
    case 'mixed':       return 'Stars offer guidance through complexity';
    case 'challenging': return 'Navigate with awareness today';
    case 'difficult':   return 'Rest and reflect — patience is power';
  }
}
