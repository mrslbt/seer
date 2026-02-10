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
  // Love — the #1 reason people consult oracles
  { key: 'sq.loveReal', category: 'love' },
  { key: 'sq.walkAway', category: 'love' },
  { key: 'sq.comeBack', category: 'love' },
  { key: 'sq.holdingOn', category: 'love' },

  // Career — stakes, not scheduling
  { key: 'sq.takeRisk', category: 'career' },
  { key: 'sq.wastingPotential', category: 'career' },
  { key: 'sq.rightMove', category: 'career' },

  // Money — fortune and risk
  { key: 'sq.wrongBet', category: 'money' },
  { key: 'sq.investNow', category: 'money' },
  { key: 'sq.payOff', category: 'money' },

  // Communication — truth and vulnerability
  { key: 'sq.sayFeel', category: 'communication' },
  { key: 'sq.tellTruth', category: 'communication' },
  { key: 'sq.willUnderstand', category: 'communication' },

  // Conflict — confrontation and resolution
  { key: 'sq.deceived', category: 'conflict' },
  { key: 'sq.fightWorth', category: 'conflict' },
  { key: 'sq.standGround', category: 'conflict' },

  // Timing — the oracle's domain
  { key: 'sq.isItTime', category: 'timing' },
  { key: 'sq.waitLonger', category: 'timing' },
  { key: 'sq.willPass', category: 'timing' },

  // Health — vitality, not gym routines
  { key: 'sq.restOrPush', category: 'health' },
  { key: 'sq.bodyTelling', category: 'health' },

  // Social — bonds, not parties
  { key: 'sq.canTrust', category: 'social' },
  { key: 'sq.friendshipSurvive', category: 'social' },

  // Decisions — crossroads
  { key: 'sq.takeLeap', category: 'decisions' },
  { key: 'sq.rightPath', category: 'decisions' },
  { key: 'sq.makingMistake', category: 'decisions' },

  // Creativity — calling and purpose
  { key: 'sq.startNew', category: 'creativity' },
  { key: 'sq.inspirationNear', category: 'creativity' },
  { key: 'sq.creativeEnergy', category: 'creativity' },

  // Spiritual — intuition and signs
  { key: 'sq.trustGut', category: 'spiritual' },
  { key: 'sq.notSeeing', category: 'spiritual' },
  { key: 'sq.universeSign', category: 'spiritual' },
  { key: 'sq.focusToday', category: 'spiritual' },

  // Open-ended guidance questions (what/how/where)
  { key: 'sq.blockingLove', category: 'love' },
  { key: 'sq.approachCareer', category: 'career' },
  { key: 'sq.financialEnergy', category: 'money' },
  { key: 'sq.improveHealth', category: 'health' },
  { key: 'sq.needToKnow', category: 'decisions' },

  // Personality & self-discovery — what makes the LLM shine
  { key: 'sq.myCharm', category: 'love' },
  { key: 'sq.attractivePoints', category: 'love' },
  { key: 'sq.whatJob', category: 'career' },
  { key: 'sq.spiritualGift', category: 'spiritual' },
  { key: 'sq.placesHome', category: 'decisions' },
  { key: 'sq.hiddenStrength', category: 'decisions' },
  { key: 'sq.drawnTo', category: 'social' },
  { key: 'sq.creativitySource', category: 'creativity' },
  { key: 'sq.focusWeek', category: 'decisions' },
  { key: 'sq.naturallyGifted', category: 'career' },
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
