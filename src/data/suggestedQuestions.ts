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

export interface SuggestedQuestion {
  text: string;
  category: QuestionCategory;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  // Love — the #1 reason people consult oracles
  { text: 'Is this love real?', category: 'love' },
  { text: 'Should I walk away?', category: 'love' },
  { text: 'Will they come back?', category: 'love' },
  { text: 'Am I holding on too long?', category: 'love' },

  // Career — stakes, not scheduling
  { text: 'Should I take the risk?', category: 'career' },
  { text: 'Am I wasting my potential?', category: 'career' },
  { text: 'Is this the right move?', category: 'career' },

  // Money — fortune and risk
  { text: 'Is this the wrong bet?', category: 'money' },
  { text: 'Should I invest now?', category: 'money' },
  { text: 'Will this pay off?', category: 'money' },

  // Communication — truth and vulnerability
  { text: 'Should I say what I feel?', category: 'communication' },
  { text: 'Is it time to tell the truth?', category: 'communication' },
  { text: 'Will they understand?', category: 'communication' },

  // Conflict — confrontation and resolution
  { text: 'Am I being deceived?', category: 'conflict' },
  { text: 'Is this fight worth it?', category: 'conflict' },
  { text: 'Should I stand my ground?', category: 'conflict' },

  // Timing — the oracle's domain
  { text: 'Is it time?', category: 'timing' },
  { text: 'Should I wait longer?', category: 'timing' },
  { text: 'Will this pass?', category: 'timing' },

  // Health — vitality, not gym routines
  { text: 'Should I rest or push forward?', category: 'health' },
  { text: 'Is my body telling me something?', category: 'health' },

  // Social — bonds, not parties
  { text: 'Can I trust them?', category: 'social' },
  { text: 'Will this friendship survive?', category: 'social' },

  // Decisions — crossroads
  { text: 'Should I take the leap?', category: 'decisions' },
  { text: 'Is this the right path?', category: 'decisions' },
  { text: 'Am I making a mistake?', category: 'decisions' },

  // Creativity — calling and purpose
  { text: 'Should I start something new?', category: 'creativity' },
  { text: 'Is inspiration near?', category: 'creativity' },
  { text: 'What creative energy is available to me?', category: 'creativity' },

  // Spiritual — intuition and signs
  { text: 'Should I trust my gut?', category: 'spiritual' },
  { text: 'What am I not seeing?', category: 'spiritual' },
  { text: 'Is the universe sending a sign?', category: 'spiritual' },
  { text: 'What energy should I focus on today?', category: 'spiritual' },

  // Open-ended guidance questions (what/how/where)
  { text: 'What is blocking me in love?', category: 'love' },
  { text: 'How should I approach my career right now?', category: 'career' },
  { text: 'What does my financial energy look like?', category: 'money' },
  { text: 'How can I improve my health today?', category: 'health' },
  { text: 'What do I need to know right now?', category: 'decisions' },
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
