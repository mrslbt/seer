/**
 * Pre-made question suggestions for The Seer.
 *
 * Each question is crafted to contain keywords from CATEGORY_KEYWORDS
 * in scoreDecision.ts, ensuring strong classification confidence (0.8).
 */

import type { QuestionCategory } from '../types/astrology';

export interface SuggestedQuestion {
  text: string;
  category: QuestionCategory;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  // Love
  { text: 'Should I confess my feelings?', category: 'love' },
  { text: 'Will my relationship grow stronger?', category: 'love' },
  { text: 'Is my crush thinking about me?', category: 'love' },
  { text: 'Should I text my ex?', category: 'love' },

  // Career
  { text: 'Should I go for the promotion?', category: 'career' },
  { text: 'Will my interview go well?', category: 'career' },
  { text: 'Is this job offer right for me?', category: 'career' },

  // Money
  { text: 'Should I invest my savings now?', category: 'money' },
  { text: 'Is today good for a big purchase?', category: 'money' },
  { text: 'Will my financial situation improve?', category: 'money' },

  // Communication
  { text: 'Should I tell them the truth?', category: 'communication' },
  { text: 'Is now the time to apologize?', category: 'communication' },
  { text: 'Should I have that conversation?', category: 'communication' },

  // Conflict
  { text: 'Should I confront this problem?', category: 'conflict' },
  { text: 'Will this disagreement resolve itself?', category: 'conflict' },
  { text: 'Should I defend my position?', category: 'conflict' },

  // Timing
  { text: 'Is today the right time to begin?', category: 'timing' },
  { text: 'Should I wait or act now?', category: 'timing' },
  { text: 'Is this a good time to travel?', category: 'timing' },

  // Health
  { text: 'Should I start a new workout?', category: 'health' },
  { text: 'Is today better for rest or exercise?', category: 'health' },
  { text: 'Should I change my diet?', category: 'health' },

  // Social
  { text: 'Should I go to the party tonight?', category: 'social' },
  { text: 'Will this friendship last?', category: 'social' },
  { text: 'Is this gathering worth attending?', category: 'social' },

  // Decisions
  { text: 'Should I take the leap of faith?', category: 'decisions' },
  { text: 'Is this the right choice for me?', category: 'decisions' },
  { text: 'Should I follow my gut feeling?', category: 'decisions' },

  // Creativity
  { text: 'Will my creative project succeed?', category: 'creativity' },
  { text: 'Should I start writing today?', category: 'creativity' },
  { text: 'Is inspiration coming my way?', category: 'creativity' },

  // Spiritual
  { text: 'What does my intuition say?', category: 'spiritual' },
  { text: 'Is the universe sending me a sign?', category: 'spiritual' },
  { text: 'Should I trust my spiritual path?', category: 'spiritual' },
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
