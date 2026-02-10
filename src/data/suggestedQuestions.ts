/**
 * Pre-made question suggestions for The Seer.
 *
 * Each question is crafted to contain keywords from CATEGORY_KEYWORDS
 * in scoreDecision.ts, ensuring strong classification confidence.
 *
 * These set the tone for the entire product. Every question should feel
 * like something you'd bring to an oracle, not a search engine.
 * 60% weighty (screenshot material), 40% relatable-everyday (daily use).
 */

import type { QuestionCategory } from '../types/astrology';
import type { TranslationKey } from '../i18n/en';

export interface SuggestedQuestion {
  key: TranslationKey;
  category: QuestionCategory;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  // Love & relationships — the #1 reason people open the app
  { key: 'sq.thinkAboutMe', category: 'love' },
  { key: 'sq.textBack', category: 'love' },
  { key: 'sq.soulmate', category: 'love' },
  { key: 'sq.overMe', category: 'love' },
  { key: 'sq.loveReal', category: 'love' },
  { key: 'sq.comeBack', category: 'love' },
  { key: 'sq.tellFeel', category: 'communication' },
  { key: 'sq.settlingDown', category: 'love' },
  { key: 'sq.loveBlocking', category: 'love' },
  { key: 'sq.whoDrawn', category: 'social' },

  // Career & money — high stakes, screenshotable
  { key: 'sq.quitJob', category: 'career' },
  { key: 'sq.wrongField', category: 'career' },
  { key: 'sq.whatJob', category: 'career' },
  { key: 'sq.payOff', category: 'money' },
  { key: 'sq.rightMove', category: 'decisions' },

  // Self-discovery — what makes users come back
  { key: 'sq.mainCharacter', category: 'spiritual' },
  { key: 'sq.superpower', category: 'spiritual' },
  { key: 'sq.hiddenStrength', category: 'decisions' },
  { key: 'sq.myCharm', category: 'love' },
  { key: 'sq.naturallyGifted', category: 'career' },

  // Gut checks & crossroads
  { key: 'sq.beOkay', category: 'decisions' },
  { key: 'sq.trustGut', category: 'spiritual' },
  { key: 'sq.mistake', category: 'decisions' },
  { key: 'sq.rightPath', category: 'decisions' },
  { key: 'sq.notSeeing', category: 'spiritual' },
  { key: 'sq.letGo', category: 'decisions' },

  // Timing & spiritual
  { key: 'sq.isItTime', category: 'timing' },
  { key: 'sq.willPass', category: 'timing' },
  { key: 'sq.focusNow', category: 'decisions' },
  { key: 'sq.readyFor', category: 'spiritual' },
];

/**
 * Select a diverse random subset of suggestions.
 *
 * Uses Fisher-Yates shuffle + greedy category-first selection
 * so 5 picks will always cover 5 distinct categories.
 */
export function getRandomSuggestions(count: number = 5): SuggestedQuestion[] {
  // Shallow copy and shuffle (Fisher-Yates)
  const pool = [...SUGGESTED_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Greedy pick: prefer unseen categories
  const picked: SuggestedQuestion[] = [];
  const seenCategories = new Set<QuestionCategory>();

  // First pass: one per category
  for (const q of pool) {
    if (picked.length >= count) break;
    if (!seenCategories.has(q.category)) {
      picked.push(q);
      seenCategories.add(q.category);
    }
  }

  // Second pass: fill remaining if needed (count > 11)
  if (picked.length < count) {
    for (const q of pool) {
      if (picked.length >= count) break;
      if (!picked.includes(q)) {
        picked.push(q);
      }
    }
  }

  return picked;
}
