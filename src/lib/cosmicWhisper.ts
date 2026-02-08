/**
 * Cosmic Whisper Generator
 *
 * The Seer speaks first — an unsolicited one-liner
 * based on today's transits, moon phase, and retrogrades.
 * Displayed on app open, before the user asks anything.
 */

import type { PersonalDailyReport } from './personalDailyReport';

/**
 * Whisper pools — organized by energy level and context.
 * Each whisper is a short, evocative fragment. Not a sentence.
 * The Seer doesn't explain — it hints.
 */

const EXCELLENT_WHISPERS = [
  'The stars lean in your favor today.',
  'Something golden stirs in the cosmos.',
  'The universe has been waiting for you to ask.',
  'Today carries a rare alignment.',
  'The heavens are unusually generous.',
  'A door is open that won\'t stay open long.',
  'The cosmos hums with possibility.',
  'What you seek is also seeking you today.',
  'The sky speaks of momentum.',
  'Fortune favors the bold — especially today.',
];

const GOOD_WHISPERS = [
  'The energy is steady. Trust your instincts.',
  'A gentle current flows in your direction.',
  'The stars are listening.',
  'Today holds quiet promise.',
  'Something subtle shifts in your favor.',
  'The cosmos offers a steady hand today.',
  'You are more aligned than you realize.',
  'The winds are calm. A good sign.',
  'Today\'s sky favors the attentive.',
  'There is warmth in the heavens tonight.',
];

const MIXED_WHISPERS = [
  'The cosmos is in two minds today.',
  'Pay attention to what stirs beneath the surface.',
  'Not everything is as it appears right now.',
  'Today asks for discernment, not haste.',
  'The sky holds both shadow and light.',
  'Walk carefully — the path forks ahead.',
  'Some doors open as others close.',
  'Today rewards patience over passion.',
  'The stars whisper of tension and release.',
  'Hold your questions close before asking.',
];

const CHALLENGING_WHISPERS = [
  'The cosmos counsels caution today.',
  'Not every impulse should be followed right now.',
  'The sky carries a heaviness. Tread lightly.',
  'Today is better for listening than acting.',
  'Some truths are uncomfortable but necessary.',
  'Resistance is part of the lesson today.',
  'The heavens are testing resolve.',
  'Wait. The timing will shift.',
  'Today\'s friction is tomorrow\'s clarity.',
  'The universe is rearranging something. Be patient.',
];

const DIFFICULT_WHISPERS = [
  'The cosmos is turbulent. Guard your energy.',
  'Today is a day for stillness, not action.',
  'The stars warn against major decisions right now.',
  'Something must be released before you can move forward.',
  'The sky is heavy with unfinished business.',
  'Not today. The cosmos will tell you when.',
  'Protect what matters. Let the rest go.',
  'The universe is asking you to surrender control.',
  'This too shall pass — but not today.',
  'Rest. The stars will be kinder soon.',
];

// Moon-specific whispers that override general ones on special phases
const NEW_MOON_WHISPERS = [
  'The New Moon whispers of beginnings.',
  'In darkness, seeds are planted.',
  'The slate is clean. What will you write?',
  'The New Moon asks: what do you truly want?',
  'A cycle begins in silence.',
];

const FULL_MOON_WHISPERS = [
  'The Full Moon illuminates what was hidden.',
  'Under this light, truth cannot hide.',
  'The Full Moon demands honesty — with yourself first.',
  'What was planted now bears fruit. Look closely.',
  'The veil is thin tonight. Ask wisely.',
];

// Retrograde whispers that can be sprinkled in
const MERCURY_RETRO_WHISPERS = [
  'Mercury walks backward. Choose your words with care.',
  'The messenger god pauses. So should your contracts.',
  'Mercury retreats — a time for revision, not decision.',
];

const VENUS_RETRO_WHISPERS = [
  'Venus looks inward. Old loves may resurface.',
  'The heart is reconsidering. Don\'t force it.',
];

const MARS_RETRO_WHISPERS = [
  'Mars retreats. Channel frustration into reflection.',
  'Action is delayed, not denied. Be patient.',
];

/**
 * Generate a cosmic whisper based on today's report.
 * Returns null if no report is available.
 */
export function generateCosmicWhisper(report: PersonalDailyReport): string {
  // Check for special moon phases first (30% chance to use them)
  if (Math.random() < 0.3) {
    if (report.moonPhase.name === 'New Moon') {
      return pick(NEW_MOON_WHISPERS);
    }
    if (report.moonPhase.name === 'Full Moon') {
      return pick(FULL_MOON_WHISPERS);
    }
  }

  // Check for notable retrogrades (25% chance to use them)
  if (report.retrogrades.length > 0 && Math.random() < 0.25) {
    const retro = report.retrogrades[0];
    if (retro.planet === 'mercury') return pick(MERCURY_RETRO_WHISPERS);
    if (retro.planet === 'venus') return pick(VENUS_RETRO_WHISPERS);
    if (retro.planet === 'mars') return pick(MARS_RETRO_WHISPERS);
  }

  // Default: pick from energy-appropriate pool
  switch (report.overallEnergy) {
    case 'excellent': return pick(EXCELLENT_WHISPERS);
    case 'good': return pick(GOOD_WHISPERS);
    case 'mixed': return pick(MIXED_WHISPERS);
    case 'challenging': return pick(CHALLENGING_WHISPERS);
    case 'difficult': return pick(DIFFICULT_WHISPERS);
    default: return pick(MIXED_WHISPERS);
  }
}

/**
 * Get today's whisper, cached by date so the same whisper
 * persists throughout the day (not re-randomized on every render).
 */
const WHISPER_CACHE_KEY = 'seer_daily_whisper';

interface CachedWhisper {
  date: string;
  whisper: string;
}

export function getDailyWhisper(report: PersonalDailyReport): string {
  const today = new Date().toDateString();

  // Check cache
  try {
    const cached = localStorage.getItem(WHISPER_CACHE_KEY);
    if (cached) {
      const parsed: CachedWhisper = JSON.parse(cached);
      if (parsed.date === today) {
        return parsed.whisper;
      }
    }
  } catch { /* ignore */ }

  // Generate new whisper
  const whisper = generateCosmicWhisper(report);

  // Cache it
  try {
    localStorage.setItem(WHISPER_CACHE_KEY, JSON.stringify({ date: today, whisper }));
  } catch { /* ignore */ }

  return whisper;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
