/**
 * Follow-Up Response Generator
 *
 * After a reading, the user can ask "Tell Me More" or "When will this change?"
 * This generates a deeper, transit-aware response that builds on the original verdict.
 *
 * Transit-aware: when a daily report is available, responses reference actual
 * planetary aspects, explain WHY the verdict is what it is, and give
 * speed-based timing estimates instead of generic pools.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';
import type { Planet } from '../types/userProfile';
import type { PersonalDailyReport } from './personalDailyReport';

export type FollowUpType = 'tell_me_more' | 'when_change';

// ---- Category mapping (same as oracleResponse.ts) ----
const CATEGORY_MAP: Record<QuestionCategory, keyof PersonalDailyReport['categories']> = {
  love: 'love',
  career: 'career',
  money: 'money',
  communication: 'social',
  conflict: 'decisions',
  timing: 'decisions',
  health: 'health',
  social: 'social',
  decisions: 'decisions',
  creativity: 'creativity',
  spiritual: 'spiritual'
};

// ---- Planet display names ----
const PLANET_NAME: Record<Planet, string> = {
  sun: 'the Sun',
  moon: 'the Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  ascendant: 'your Ascendant',
  midheaven: 'your Midheaven',
  northNode: 'the North Node',
  chiron: 'Chiron',
};

// ---- Aspect type explanations in plain language ----
const ASPECT_EXPLAINED: Record<string, string> = {
  conjunction: 'A conjunction is fusion — two forces merging into one. The result depends entirely on what meets.',
  trine: 'A trine is grace. Energy flows without effort — but ease can become complacency if unexamined.',
  square: 'A square is tension. It demands action, forces growth, and refuses to let you stay comfortable.',
  opposition: 'An opposition is polarity. Two truths face each other. Integration, not elimination, is the path.',
  sextile: 'A sextile is an invitation — a door left ajar. It opens only if you push.',
  quincunx: 'A quincunx is awkward misalignment. The energies don\'t speak the same language — adjustment is required.',
};

// ---- Planet speed classes for timing ----
type SpeedClass = 'fast' | 'medium' | 'slow' | 'glacial';

const PLANET_SPEED: Record<Planet, SpeedClass> = {
  moon: 'fast',
  mercury: 'fast',
  venus: 'fast',
  sun: 'medium',
  mars: 'medium',
  jupiter: 'slow',
  saturn: 'slow',
  uranus: 'glacial',
  neptune: 'glacial',
  pluto: 'glacial',
  ascendant: 'medium',
  midheaven: 'medium',
  northNode: 'glacial',
  chiron: 'glacial',
};

const SPEED_TIMING: Record<SpeedClass, string[]> = {
  fast: [
    'This transit moves quickly — the energy shifts within days.',
    'A fast-moving influence. Expect a change in tone within the week.',
    'This won\'t linger. The shift comes in days, not weeks.',
  ],
  medium: [
    'This influence stretches across a week or two. Patience, not passivity.',
    'Give it one to two weeks. The energy needs time to complete its arc.',
    'A mid-tempo transit — the shift will be felt within a couple of weeks.',
  ],
  slow: [
    'This is a slow-moving influence — think weeks, possibly months. It reshapes, not just shifts.',
    'Patience is essential. This transit operates on a timeline of several weeks.',
    'A deep, structural change that unfolds over weeks to months.',
  ],
  glacial: [
    'This spans months — it is a season, not weather. The shift is generational in nature.',
    'The outer planets move slowly. This influence defines a chapter, not a day.',
    'Measured in months. This energy is the background music of your current life phase.',
  ],
};

// ---- Retrograde category relevance (same as oracleResponse.ts) ----
const RETRO_CATEGORY_MAP: Partial<Record<Planet, QuestionCategory[]>> = {
  mercury: ['communication', 'career', 'social', 'decisions'],
  venus: ['love', 'money', 'creativity', 'social'],
  mars: ['career', 'health', 'conflict', 'decisions'],
  jupiter: ['money', 'spiritual', 'career'],
  saturn: ['career', 'decisions'],
};

/**
 * Generate a follow-up response based on the original reading context
 */
export function generateFollowUpResponse(
  type: FollowUpType,
  originalVerdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  if (type === 'when_change') {
    return generateTimingResponse(originalVerdict, category, report);
  }
  return generateDeeperInsight(originalVerdict, category, report);
}

// ======================================================================
// TELL ME MORE
// ======================================================================
function generateDeeperInsight(
  verdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  // No report → fallback to generic pools
  if (!report) {
    return pick(DEEPER_INSIGHT_POOLS[verdict] || DEEPER_INSIGHT_POOLS.NEUTRAL);
  }

  const reportCategory = CATEGORY_MAP[category];
  const catScore = report.categories[reportCategory];
  const parts: string[] = [];

  // 1. Lead with the specific transit affecting this category
  const relevantTransit = report.keyTransits.find(t =>
    t.affectedCategories.includes(category) ||
    t.affectedCategories.includes(reportCategory as QuestionCategory)
  );

  if (relevantTransit) {
    const { transit } = relevantTransit;
    const tp = PLANET_NAME[transit.transitPlanet] || capitalize(transit.transitPlanet);
    const np = PLANET_NAME[transit.natalPlanet] || capitalize(transit.natalPlanet);

    // Name the aspect and planets
    const aspectName = transit.aspectType;
    parts.push(
      `The core of this reading: ${tp} forms a ${aspectName} with ${np}` +
      (transit.isExact ? ' — an exact aspect today, intensifying its effect.' : ` (orb: ${transit.orb.toFixed(1)}°).`)
    );

    // Explain aspect type in plain language
    const explanation = ASPECT_EXPLAINED[aspectName];
    if (explanation) {
      parts.push(explanation);
    }

    // Impact interpretation from the transit data
    if (relevantTransit.interpretation) {
      parts.push(relevantTransit.interpretation + '.');
    }
  } else {
    // No specific transit — use verdict-based opening
    parts.push(pick(DEEPER_INSIGHT_POOLS[verdict] || DEEPER_INSIGHT_POOLS.NEUTRAL));
  }

  // 2. Natal modifier warnings from reasoning
  const natalWarnings = catScore.reasoning.filter(r =>
    r.includes('Natal') || r.includes('natal') || r.includes('Venus in') || r.includes('Mars in')
  );
  if (natalWarnings.length > 0) {
    parts.push(`Your birth chart adds context: ${natalWarnings[0]}.`);
  }

  // 3. Full goodFor/badFor breakdown
  const goodFor = catScore.goodFor.filter(g => g.length > 0);
  const badFor = catScore.badFor.filter(b => b.length > 0);

  if (goodFor.length > 0) {
    parts.push(`Today favors: ${goodFor.join(', ')}.`);
  }
  if (badFor.length > 0) {
    parts.push(`Today cautions against: ${badFor.join(', ')}.`);
  }

  // 4. Retrograde context if relevant
  for (const retro of report.retrogrades) {
    const affects = RETRO_CATEGORY_MAP[retro.planet];
    if (affects && affects.includes(category)) {
      parts.push(`Note: ${capitalize(retro.planet)} is retrograde — ${retro.advice.toLowerCase()}.`);
      break;
    }
  }

  // 5. Category score context
  parts.push(`Your ${reportCategory} energy today scores ${catScore.score}/10.`);

  return parts.join(' ');
}

// ======================================================================
// WHEN WILL THIS CHANGE?
// ======================================================================
function generateTimingResponse(
  verdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  // No report → fallback
  if (!report) {
    return pick(TIMING_FALLBACK_POOLS[verdict] || TIMING_FALLBACK_POOLS.NEUTRAL);
  }

  const reportCategory = CATEGORY_MAP[category];
  const parts: string[] = [];

  // 1. Find the dominant transit for this category and use speed-based timing
  const relevantTransit = report.keyTransits.find(t =>
    t.affectedCategories.includes(category) ||
    t.affectedCategories.includes(reportCategory as QuestionCategory)
  );

  if (relevantTransit) {
    const { transit } = relevantTransit;
    const tp = PLANET_NAME[transit.transitPlanet] || capitalize(transit.transitPlanet);
    const speed = PLANET_SPEED[transit.transitPlanet] || 'medium';

    // Speed-based timing estimate
    const timingLine = pick(SPEED_TIMING[speed]);
    parts.push(`${tp} drives this reading. ${timingLine}`);

    // If there's a second relevant transit, mention the layering
    const secondTransit = report.keyTransits.find(t =>
      t !== relevantTransit &&
      (t.affectedCategories.includes(category) ||
       t.affectedCategories.includes(reportCategory as QuestionCategory))
    );
    if (secondTransit) {
      const sp = PLANET_NAME[secondTransit.transit.transitPlanet] || capitalize(secondTransit.transit.transitPlanet);
      const secondSpeed = PLANET_SPEED[secondTransit.transit.transitPlanet] || 'medium';
      if (secondSpeed === 'slow' || secondSpeed === 'glacial') {
        parts.push(`But ${sp} adds a deeper, slower layer — the underlying theme takes longer to resolve.`);
      } else {
        parts.push(`${sp} also plays a role and will shift soon.`);
      }
    }
  } else {
    // No specific transit — use moon phase + general timing
    parts.push('No dominant transit drives this reading directly.');
  }

  // 2. Retrograde timing layer
  for (const retro of report.retrogrades) {
    const affects = RETRO_CATEGORY_MAP[retro.planet];
    if (affects && affects.includes(category)) {
      parts.push(
        `${capitalize(retro.planet)} is retrograde, adding a layer of review and delay. ` +
        `When it stations direct, the path will feel clearer.`
      );
      break;
    }
  }

  // 3. Moon phase timing
  const moonName = report.moonPhase.name;
  const moonTimingLine = MOON_TIMING[moonName];
  if (moonTimingLine) {
    parts.push(moonTimingLine);
  }

  // If we still have nothing meaningful, fallback
  if (parts.length === 0) {
    return pick(TIMING_FALLBACK_POOLS[verdict] || TIMING_FALLBACK_POOLS.NEUTRAL);
  }

  return parts.join(' ');
}

// ---- Moon phase timing lines ----
const MOON_TIMING: Record<string, string> = {
  'New Moon': 'The New Moon signals a fresh cycle — set intentions now and watch them unfold over the coming two weeks.',
  'Waxing Crescent': 'The moon is building strength. Momentum gathers over the next week.',
  'First Quarter': 'The First Quarter moon marks a turning point — action taken now shapes what the Full Moon reveals.',
  'Waxing Gibbous': 'The Full Moon approaches within days. Clarity is imminent.',
  'Full Moon': 'The Full Moon illuminates everything. What you learn now guides the next two weeks of integration.',
  'Waning Gibbous': 'The peak has passed. The coming week is for digesting what was revealed.',
  'Last Quarter': 'Release what no longer serves you. The New Moon arrives within a week, bringing a clean slate.',
  'Waning Crescent': 'The cycle nears completion. Rest now — a new beginning arrives with the next New Moon.',
};

// ---- Fallback pools (no report) ----
const DEEPER_INSIGHT_POOLS: Record<Verdict, string[]> = {
  HARD_YES: [
    'The alignment is unusually strong. This isn\'t just favorable — it\'s rare.',
    'Multiple forces converge in your favor. The cosmos rarely aligns this clearly.',
    'Your natal chart amplifies today\'s energy. This is deeply personal.',
  ],
  SOFT_YES: [
    'The energy leans positive, but with caveats. Proceed with awareness.',
    'There\'s support here, but it asks something of you in return.',
    'The stars favor this — with one condition: be honest with yourself about your motives.',
  ],
  NEUTRAL: [
    'The cosmos is genuinely neutral here. Your free will is the deciding factor.',
    'Neither encouraged nor warned. This decision belongs entirely to you.',
    'The universe is watching, not guiding. Trust your own judgment.',
  ],
  SOFT_NO: [
    'The resistance is real but not absolute. Timing or approach may be the issue.',
    'Something doesn\'t align — but it could be temporary.',
    'The cosmos hesitates. Ask yourself what you might be overlooking.',
  ],
  HARD_NO: [
    'The forces are clear: this path meets significant resistance right now.',
    'The cosmos doesn\'t say "never" — but it says "not this way, not right now."',
    'There\'s a lesson in this resistance. What is the universe trying to protect you from?',
  ],
  UNCLEAR: [
    'The signals are genuinely mixed. This is the cosmos being honest about complexity.',
    'Not every question has a clean answer. Sit with the ambiguity.',
    'The universe acknowledges the question but offers no easy path.',
  ],
};

const TIMING_FALLBACK_POOLS: Record<Verdict, string[]> = {
  HARD_YES: [
    'The window is open now. Don\'t wait too long.',
    'This favorable energy has momentum — act while it lasts.',
  ],
  SOFT_YES: [
    'The energy tilts positive but isn\'t permanent. Move within the next few days.',
    'A gentle current — it won\'t push you forever. Take the step soon.',
  ],
  NEUTRAL: [
    'The energy is balanced and will shift with the next major transit. Stay aware.',
    'Neither pushed nor pulled — the next lunar phase may tip the scales.',
  ],
  SOFT_NO: [
    'Give it a week or two. The friction you feel now will ease.',
    'The resistance is temporary. Let the transits shift before trying again.',
  ],
  HARD_NO: [
    'This is not the time. Wait for a significant shift — possibly the next New or Full Moon.',
    'Major resistance. The energy needs a full lunar cycle to reset.',
  ],
  UNCLEAR: [
    'The timing is genuinely ambiguous. Wait for a clearer signal from the cosmos.',
    'Too many forces in play. Give it time — clarity will come.',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
