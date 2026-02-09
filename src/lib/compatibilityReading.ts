/**
 * Compatibility Reading Generator — Oracle Voice for Synastry
 *
 * Takes a SynastryReport and generates oracle-voice readings:
 * 1. Full compatibility reading (the initial reveal)
 * 2. Relationship question answering (interrogate the oracle about "the space between")
 *
 * The Seer speaks about relationships the same way it speaks about everything:
 * direct, knowing, slightly unsettling. No filler. No corporate mysticism.
 */

import type { SynastryReport, SynastryTheme, CompatibilityTier } from './synastry';
import type { UserProfile, Planet, NatalChart } from '../types/userProfile';
import type { ZodiacSign } from '../types/astrology';
import { calculateTransits, calculateCurrentPositions } from './ephemerisService';
import type { Transit } from '../types/userProfile';

// ============================================
// TYPES
// ============================================

export interface CompatibilityReading {
  /** The opening line — sets the tone */
  opening: string;
  /** Core reading — 2-3 sentences about the connection */
  core: string;
  /** What draws them together */
  pull: string;
  /** What creates friction */
  friction: string;
  /** The oracle's closing wisdom */
  closing: string;
  /** Full assembled text */
  fullText: string;
}

export type RelationshipQuestionCategory =
  | 'match'          // do we make a good match?
  | 'attraction'     // is there real chemistry?
  | 'future'         // will this last?
  | 'conflict'       // will we fight?
  | 'timing'         // is now the right time?
  | 'trust'          // can I trust them?
  | 'commitment'     // are they serious?
  | 'lifestyle'      // trips, adventures, hobbies, daily life
  | 'energy'         // dynamics, roles, who leads
  | 'emotional'      // deep feelings, vulnerability, understanding
  | 'general';       // catch-all

export interface RelationshipAnswer {
  verdict: 'yes' | 'leaning_yes' | 'uncertain' | 'leaning_no' | 'no';
  response: string;
  transitContext?: string;   // what the sky says RIGHT NOW about this
}

// ============================================
// RELATIONSHIP QUESTION CLASSIFICATION
// ============================================

const RELATIONSHIP_KEYWORDS: Record<RelationshipQuestionCategory, string[]> = {
  match: ['match', 'compatible', 'compatibility', 'suited', 'meant to be', 'right for', 'good together', 'work out', 'fit'],
  attraction: ['attraction', 'chemistry', 'spark', 'desire', 'physical', 'pull', 'drawn', 'attracted', 'magnetic', 'sexy'],
  future: ['last', 'future', 'long term', 'forever', 'marry', 'marriage', 'years', 'stay together', 'end up', 'grow old'],
  conflict: ['fight', 'argue', 'conflict', 'disagree', 'clash', 'tension', 'toxic', 'break up', 'hurt'],
  timing: ['now', 'today', 'ask out', 'make a move', 'approach', 'tell them', 'confess', 'when', 'right time', 'ready'],
  trust: ['trust', 'loyal', 'cheat', 'honest', 'faithful', 'deceive', 'lie', 'lying', 'reliable', 'depend'],
  commitment: ['serious', 'commit', 'commitment', 'settle', 'exclusive', 'official', 'ready for', 'willing'],
  lifestyle: ['trip', 'trips', 'travel', 'adventure', 'adventures', 'hobby', 'hobbies', 'fun', 'enjoy', 'like together', 'do together', 'activity', 'activities', 'routine', 'live together', 'daily', 'weekend', 'vacation', 'vibe'],
  energy: ['dynamic', 'dynamics', 'energy', 'lead', 'leader', 'power', 'role', 'roles', 'dominant', 'balance', 'who wears', 'alpha', 'control', 'charge'],
  emotional: ['feel', 'feeling', 'feelings', 'emotion', 'emotional', 'deep', 'vulnerable', 'understand', 'connect', 'connection', 'cry', 'love language', 'safe', 'open up', 'intimacy', 'intimate'],
  general: [],
};

export function classifyRelationshipQuestion(question: string): RelationshipQuestionCategory {
  const q = question.toLowerCase();
  let bestCategory: RelationshipQuestionCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(RELATIONSHIP_KEYWORDS) as [RelationshipQuestionCategory, string[]][]) {
    if (category === 'general') continue;
    let score = 0;
    for (const keyword of keywords) {
      if (q.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ============================================
// COMPATIBILITY READING GENERATOR
// ============================================

/** Pick a random element deterministically based on a seed string */
function seededPick<T>(arr: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return arr[Math.abs(hash) % arr.length];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Opening lines by tier */
const TIER_OPENINGS: Record<CompatibilityTier, string[]> = {
  fated: [
    'The charts lock. This is not a question of chance.',
    'I have seen thousands of charts. This one stops me.',
    'The cosmos does not write this pattern often.',
  ],
  magnetic: [
    'There is a pull here that neither of you invented.',
    'The charts speak clearly. This connection is real.',
    'Something old stirs between these two charts.',
  ],
  kindred: [
    'A natural warmth lives in the space between you.',
    'The charts show ease. Not fireworks. Something quieter.',
    'You understand each other without trying too hard.',
  ],
  complex: [
    'This is not simple. But simple connections rarely change anyone.',
    'The charts show a tangle. Not chaos. A pattern that demands attention.',
    'Push and pull. The stars give with one hand and take with the other.',
  ],
  friction: [
    'The charts resist each other. That is worth knowing.',
    'Tension runs through the space between you.',
    'The stars do not make this easy. They never promised to.',
  ],
  distant: [
    'The charts barely touch.',
    'Little resonance lives between these two skies.',
    'The cosmos sees two separate orbits.',
  ],
};

/** Core reading builders by dominant theme */
function buildCoreReading(report: SynastryReport): string {
  const topThemes = report.themes.filter(t => t.score >= 4).slice(0, 3);

  if (topThemes.length === 0) {
    return 'The connection between you is subtle. Not absent. Subtle. It asks for patience and intention.';
  }

  const parts: string[] = [];

  for (const t of topThemes.slice(0, 2)) {
    switch (t.theme) {
      case 'attraction':
        parts.push('The physical pull is written in both charts. Venus and Mars confirm what the body already knows.');
        break;
      case 'soul':
        parts.push('Sun and Moon mirror each other across your charts. A recognition that runs deeper than reason.');
        break;
      case 'emotional':
        parts.push('Your emotional currents run in parallel. What one feels, the other senses without words.');
        break;
      case 'communication':
        parts.push('Mercury bridges the gap between you. Words and thought flow with unusual ease.');
        break;
      case 'commitment':
        parts.push('Saturn touches this bond. That means weight, structure, staying power. Not passion alone.');
        break;
      case 'transformation':
        parts.push('Pluto runs through this connection. You will not leave each other unchanged. That is a promise and a warning.');
        break;
      case 'growth':
        parts.push('Jupiter expands everything you share. Together, the world feels larger.');
        break;
      case 'destiny':
        parts.push('The nodes align between your charts. Karmic threads. You were not meant to miss each other.');
        break;
      case 'passion':
        parts.push('Mars burns in both directions. The energy between you is raw, relentless, and hard to ignore.');
        break;
      case 'dreams':
        parts.push('Neptune veils this connection in beauty. The dream is real. Whether it matches reality is the question.');
        break;
      case 'chaos':
        parts.push('Uranus electrifies the space between you. Excitement and instability. Both real.');
        break;
      case 'identity':
        parts.push('Two suns in the same sky. The ego dynamic defines this bond. Admiration or competition.');
        break;
    }
  }

  return parts.join(' ');
}

/** What pulls them together */
function buildPull(report: SynastryReport): string {
  if (report.strengths.length === 0) {
    return 'The pull between you is quiet. Not forceful. Not absent.';
  }

  const strength = report.strengths[0];

  // Add the best aspect detail
  const bestAspect = report.keyAspects[0];
  if (bestAspect && bestAspect.nature !== 'challenging') {
    return `${strength} ${bestAspect.description}`;
  }

  return strength;
}

/** What creates friction */
function buildFriction(report: SynastryReport): string {
  if (report.challenges.length === 0) {
    return 'Few challenges appear in the charts. That is its own kind of test.';
  }

  const challenge = report.challenges[0];

  // Add the hardest aspect detail
  const hardAspect = report.aspects.find(a => a.nature === 'challenging' && a.weight > 5);
  if (hardAspect) {
    return `${challenge} ${hardAspect.description}`;
  }

  return challenge;
}

/** Closing wisdom by tier */
const TIER_CLOSINGS: Record<CompatibilityTier, string[]> = {
  fated: [
    'Some bonds the stars insist upon. This may be one.',
    'Pay attention to this one. The cosmos rarely repeats this signature.',
  ],
  magnetic: [
    'The connection is real. What you do with it is yours to decide.',
    'Follow the thread. It leads somewhere worth going.',
  ],
  kindred: [
    'Ease between two charts is a gift. Do not take it for granted.',
    'Comfort is not boring. It is rare. Protect it.',
  ],
  complex: [
    'The question is not whether this is difficult. The question is whether the difficulty teaches you both.',
    'Growth lives here. But growth is never comfortable.',
  ],
  friction: [
    'Not every bond is meant to be easy. Some are meant to be brief and honest.',
    'The stars do not forbid this. They ask if you are willing to do the work.',
  ],
  distant: [
    'Distance in the charts does not mean impossibility. It means you must build what the stars did not provide.',
    'What is not given freely must be earned. That is still valid.',
  ],
};

/**
 * Generate a full compatibility reading from two profiles
 */
export function generateCompatibilityReading(
  report: SynastryReport,
): CompatibilityReading {
  const seed = `${report.person1.name}-${report.person2.name}`;

  const opening = seededPick(TIER_OPENINGS[report.tier], seed);
  const core = buildCoreReading(report);
  const pull = buildPull(report);
  const friction = buildFriction(report);
  const closing = seededPick(TIER_CLOSINGS[report.tier], seed + 'close');

  const fullText = [opening, core, pull, friction, closing].join('\n\n');

  return { opening, core, pull, friction, closing, fullText };
}

// ============================================
// RELATIONSHIP QUESTION ANSWERING
// ============================================

/** Planet name display */
const PLANET_NAME: Record<string, string> = {
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
  northNode: 'the North Node',
  chiron: 'Chiron',
  ascendant: 'the Ascendant',
  midheaven: 'the Midheaven',
};

// ============================================
// DYNAMIC RESPONSE BUILDER
// ============================================

/** Sign element and modality data for building rich responses */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water',
};

const SIGN_MODALITIES: Record<ZodiacSign, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Taurus: 'fixed', Gemini: 'mutable', Cancer: 'cardinal',
  Leo: 'fixed', Virgo: 'mutable', Libra: 'cardinal', Scorpio: 'fixed',
  Sagittarius: 'mutable', Capricorn: 'cardinal', Aquarius: 'fixed', Pisces: 'mutable',
};

/** Element energy descriptions for lifestyle/adventure responses */
const ELEMENT_LIFESTYLE: Record<string, string[]> = {
  'fire-fire': [
    'Two fires side by side. You need adrenaline together — spontaneous trips, physical challenges, anything that pushes boundaries.',
    'Fire craves fire. Your best moments will be impulsive, loud, and memorable. Sit still together and you will both suffer.',
  ],
  'fire-air': [
    'Fire fed by air. You thrive on new ideas turned into action — road trips planned at midnight, conversations that turn into adventures.',
    'Your combined energy is restless and brilliant. Travel for inspiration, not relaxation.',
  ],
  'fire-earth': [
    'Fire wants to run. Earth wants to plant. Your best adventures balance spontaneity with comfort — luxury meets risk.',
    'One pushes to explore, the other needs grounding. Plan the trip but leave room for wildness.',
  ],
  'fire-water': [
    'Fire and water make steam. Intense, emotional experiences draw you together — travel that transforms, not just entertains.',
    'You need shared experiences that go deep, not just far. A cabin beats a resort.',
  ],
  'air-air': [
    'Two minds in motion. You feed on culture, conversation, city energy. Museums, markets, foreign languages — anything that stimulates thought.',
    'Your connection lives in ideas. Travel that teaches, not just relaxes.',
  ],
  'air-earth': [
    'Mind meets body. Your best shared time balances culture with comfort — a hike that ends at a great restaurant.',
    'Earth grounds what air imagines. One plans, the other improvises. It works when you let it.',
  ],
  'air-water': [
    'Thought meets feeling. You bond through meaningful experiences — art, music, places with emotional weight.',
    'You need adventures that engage the heart and the mind equally.',
  ],
  'earth-earth': [
    'Two bodies rooted in the physical. Good food, beautiful places, nature. You share a sensory language.',
    'Your adventures are unhurried and rich. Quality over novelty every time.',
  ],
  'earth-water': [
    'Garden energy. Nurturing, sensory, emotionally deep. Your best time is spent in places that feel like home — even far from it.',
    'Nature, water, quiet beauty. You share a reverence for stillness.',
  ],
  'water-water': [
    'Two oceans merging. Your shared world is emotional and internal. Retreats, meaningful journeys, pilgrimage over tourism.',
    'You do not vacation. You go on emotional expeditions. Quiet beaches, rainstorms, places with soul.',
  ],
};

/** Theme-specific fragments for weaving into answers */
const THEME_FRAGMENTS: Record<SynastryTheme, { strength: string; dynamic: string }> = {
  attraction: {
    strength: 'Venus and Mars speak clearly between you',
    dynamic: 'the physical pull shapes how you experience everything together',
  },
  soul: {
    strength: 'your Sun and Moon recognize each other',
    dynamic: 'there is a soul-familiarity that colors every shared moment',
  },
  communication: {
    strength: 'Mercury bridges your minds with ease',
    dynamic: 'you process the world similarly — conversation is your glue',
  },
  growth: {
    strength: 'Jupiter expands what you share',
    dynamic: 'together you think bigger than either of you would alone',
  },
  commitment: {
    strength: 'Saturn binds this bond with structure',
    dynamic: 'there is a weight here — not heavy, but anchoring',
  },
  transformation: {
    strength: 'Pluto runs deep between you',
    dynamic: 'you change each other — willingly or not',
  },
  chaos: {
    strength: 'Uranus electrifies the connection',
    dynamic: 'unpredictability keeps things alive but exhausting',
  },
  dreams: {
    strength: 'Neptune veils this bond in beauty',
    dynamic: 'you see each other through a lens that is equal parts real and imagined',
  },
  destiny: {
    strength: 'the Nodes tie your paths together',
    dynamic: 'something karmic echoes between you',
  },
  passion: {
    strength: 'Mars ignites on both sides',
    dynamic: 'raw energy drives this connection forward',
  },
  emotional: {
    strength: 'the emotional current between you is strong',
    dynamic: 'you feel each other without words',
  },
  identity: {
    strength: 'your core selves interact intensely',
    dynamic: 'ego and identity are part of what you navigate together',
  },
};

/** Modality dynamics */
function getModalityDynamic(sign1: ZodiacSign, sign2: ZodiacSign): string {
  const m1 = SIGN_MODALITIES[sign1];
  const m2 = SIGN_MODALITIES[sign2];
  if (m1 === 'cardinal' && m2 === 'cardinal') return 'Both of you lead. That creates momentum and collision.';
  if (m1 === 'fixed' && m2 === 'fixed') return 'Two fixed wills. Loyalty runs deep but so does stubbornness.';
  if (m1 === 'mutable' && m2 === 'mutable') return 'Both of you adapt. Flexibility is your gift and your curse.';
  if ((m1 === 'cardinal' && m2 === 'fixed') || (m1 === 'fixed' && m2 === 'cardinal')) return 'One initiates, the other sustains. A natural division of power.';
  if ((m1 === 'cardinal' && m2 === 'mutable') || (m1 === 'mutable' && m2 === 'cardinal')) return 'One leads, the other flows around obstacles. Effective when you trust each other.';
  return 'One holds form, the other shifts. Balance comes through acceptance.';
}

/**
 * Get the dominant shared element between two charts
 */
function getDominantElements(report: SynastryReport): { el1: string; el2: string; key: string } {
  const el1 = SIGN_ELEMENTS[report.person1.sunSign];
  const el2 = SIGN_ELEMENTS[report.person2.sunSign];
  // Normalize key so fire-water and water-fire map to the same entry
  const sorted = [el1, el2].sort();
  const key = `${sorted[0]}-${sorted[1]}`;
  return { el1, el2, key };
}

/**
 * Get the top active themes from the report
 */
function getActiveThemes(report: SynastryReport): SynastryTheme[] {
  return report.themes.filter(t => t.score >= 3).map(t => t.theme).slice(0, 4);
}

/**
 * Build a dynamic, context-aware response based on actual synastry data
 */
function buildDynamicResponse(
  category: RelationshipQuestionCategory,
  verdict: RelationshipAnswer['verdict'],
  report: SynastryReport,
  _question: string,
): string {
  const { el1, el2, key: elKey } = getDominantElements(report);
  const activeThemes = getActiveThemes(report);
  const topTheme = activeThemes[0];
  const topAspect = report.keyAspects[0];
  const sun1 = report.person1.sunSign;
  const sun2 = report.person2.sunSign;
  const moon1 = report.person1.moonSign;
  const moon2 = report.person2.moonSign;
  const tierLabel = report.tier;

  const isPositive = verdict === 'yes' || verdict === 'leaning_yes';
  const isNegative = verdict === 'no' || verdict === 'leaning_no';

  // Shared fragments
  const themeFragment = topTheme ? THEME_FRAGMENTS[topTheme] : null;
  const signIntro = `${sun1} and ${sun2}. `;
  const moonIntro = `${moon1} Moon meets ${moon2} Moon. `;

  switch (category) {
    // ---- LIFESTYLE: trips, adventures, hobbies ----
    case 'lifestyle': {
      const elResponses = ELEMENT_LIFESTYLE[elKey] || ELEMENT_LIFESTYLE[`${el2}-${el1}`];
      const elLine = elResponses ? pick(elResponses) : `${el1} meets ${el2}. Your shared energy shapes what you enjoy together.`;
      const themeColor = themeFragment
        ? ` And because ${themeFragment.dynamic}, even mundane moments carry charge.`
        : '';
      return `${signIntro}${elLine}${themeColor}`;
    }

    // ---- ENERGY: dynamics, roles, who leads ----
    case 'energy': {
      const modDynamic = getModalityDynamic(sun1, sun2);
      let energyLine: string;
      if (activeThemes.includes('passion') || activeThemes.includes('attraction')) {
        energyLine = `Mars is active between you. The energy runs hot — neither of you sits back easily. ${modDynamic}`;
      } else if (activeThemes.includes('commitment')) {
        energyLine = `Saturn shapes this dynamic. There is a natural sense of responsibility between you. ${modDynamic}`;
      } else if (activeThemes.includes('transformation')) {
        energyLine = `Pluto enters the equation. Power is not shared evenly — one pulls, the other transforms. ${modDynamic}`;
      } else {
        energyLine = `${signIntro}${modDynamic}`;
      }
      if (topAspect && topAspect.weight > 7) {
        energyLine += ` The strongest thread: ${topAspect.description}`;
      }
      return energyLine;
    }

    // ---- EMOTIONAL: feelings, vulnerability, understanding ----
    case 'emotional': {
      const moonEl1 = SIGN_ELEMENTS[moon1];
      const moonEl2 = SIGN_ELEMENTS[moon2];
      let emotionalLine: string;
      if (moonEl1 === moonEl2) {
        emotionalLine = `${moonIntro}Same element, same emotional language. You understand each other's inner weather without explanation.`;
      } else if ((moonEl1 === 'water' && moonEl2 === 'earth') || (moonEl1 === 'earth' && moonEl2 === 'water')) {
        emotionalLine = `${moonIntro}Water nourishes earth. The emotional exchange between you is quiet, deep, and sustaining.`;
      } else if ((moonEl1 === 'fire' && moonEl2 === 'air') || (moonEl1 === 'air' && moonEl2 === 'fire')) {
        emotionalLine = `${moonIntro}One burns, the other fans the flame. Emotional expression comes easily but depth takes work.`;
      } else if ((moonEl1 === 'fire' && moonEl2 === 'water') || (moonEl1 === 'water' && moonEl2 === 'fire')) {
        emotionalLine = `${moonIntro}Steam. Your emotional styles clash — one erupts, the other submerges. Both valid. Neither comfortable for the other.`;
      } else {
        emotionalLine = `${moonIntro}Different emotional textures. Learning each other's inner world is the work that deepens this bond.`;
      }
      if (activeThemes.includes('emotional') || activeThemes.includes('soul')) {
        emotionalLine += ' The charts confirm the emotional thread is real.';
      }
      return emotionalLine;
    }

    // ---- MATCH ----
    case 'match': {
      if (isPositive) {
        return `${signIntro}The charts confirm it. ${themeFragment ? themeFragment.strength + '.' : 'The core elements align.'} The fit is not imagined — it is structural. Score: ${report.score}/100.`;
      } else if (isNegative) {
        const challengeAspect = report.aspects.find(a => a.nature === 'challenging' && a.weight > 5);
        const friction = challengeAspect ? ` ${challengeAspect.description}` : '';
        return `${signIntro}More friction than flow.${friction} That does not mean impossible — it means demanding. Score: ${report.score}/100.`;
      }
      return `${signIntro}Some pieces fit, others resist. ${themeFragment ? themeFragment.dynamic + '.' : 'The balance is yours to find.'} The match is neither granted nor denied.`;
    }

    // ---- ATTRACTION ----
    case 'attraction': {
      const venusAspect = report.aspects.find(a =>
        (a.planet1 === 'venus' && a.planet2 === 'mars') || (a.planet1 === 'mars' && a.planet2 === 'venus')
      );
      if (venusAspect) {
        return isPositive
          ? `Venus and Mars form a ${venusAspect.type} between your charts (${venusAspect.orb}° orb). ${venusAspect.description} The chemistry is astronomical, not imagined.`
          : `Venus and Mars ${venusAspect.type} with ${venusAspect.orb}° orb. ${venusAspect.description} The tension is part of the pull.`;
      }
      if (isPositive) {
        return `${signIntro}The charts show attraction through ${activeThemes[0] || 'subtle resonance'}. ${themeFragment ? themeFragment.strength + '.' : 'Something draws you beyond logic.'}`;
      }
      return `${signIntro}The charts show more warmth than fire. Attraction here is built, not handed to you.`;
    }

    // ---- FUTURE ----
    case 'future': {
      const hasSaturn = activeThemes.includes('commitment');
      const hasDestiny = activeThemes.includes('destiny');
      if (isPositive) {
        if (hasSaturn && hasDestiny) return `Saturn and the Nodes both touch this bond. The charts see staying power AND karmic purpose. ${tierLabel} energy runs long.`;
        if (hasSaturn) return `Saturn blesses this. Structure exists between ${sun1} and ${sun2}. Build with confidence.`;
        if (hasDestiny) return `The Nodes tie your paths. Something ancient echoes here. The future is not promised, but the thread is strong.`;
        return `${signIntro}The ingredients for longevity are present. ${themeFragment ? themeFragment.strength + '.' : 'The foundation holds.'}`;
      }
      if (isNegative) {
        return `${signIntro}The charts favor intensity over duration. ${activeThemes.includes('chaos') ? 'Uranus disrupts what Saturn needs to build.' : 'Enjoy what is without demanding forever.'}`;
      }
      return `${signIntro}Long-term depends on choices, not charts alone. The raw material is there — the craftsmanship is yours.`;
    }

    // ---- CONFLICT ----
    case 'conflict': {
      const squares = report.aspects.filter(a => a.type === 'square').length;
      const oppositions = report.aspects.filter(a => a.type === 'opposition').length;
      const hardCount = squares + oppositions;
      if (hardCount >= 5) {
        return `${hardCount} challenging aspects between your charts. ${squares} squares, ${oppositions} oppositions. You will clash — regularly. The question is whether you fight to win or fight to understand. ${getModalityDynamic(sun1, sun2)}`;
      }
      if (hardCount >= 3) {
        return `Some friction is built in. ${squares} squares pull at different needs. ${getModalityDynamic(sun1, sun2)} Conflict will visit, but it does not have to stay.`;
      }
      return `Few hard aspects between you. ${sun1} and ${sun2} find natural ease. Your battles will be about boredom before hostility.`;
    }

    // ---- TIMING ----
    case 'timing': {
      // Timing answers are mostly transit-driven — keep short, add chart context
      if (isPositive) return `The current sky supports action between ${sun1} and ${sun2}. What you are considering — the window is open.`;
      if (isNegative) return `The transits resist this moment for ${sun1} and ${sun2}. Not a permanent no. A patient wait.`;
      return `No strong signal on timing. The stars shrug. Your courage matters more than the calendar.`;
    }

    // ---- TRUST ----
    case 'trust': {
      const hasChaos = activeThemes.includes('chaos');
      const hasCommitment = activeThemes.includes('commitment');
      if (isPositive) {
        return `${signIntro}${hasCommitment ? 'Saturn touches this bond — loyalty has structural support.' : 'The charts lean toward reliability.'} ${moonIntro.trim()} The emotional foundation supports trust.`;
      }
      if (isNegative) {
        return `${signIntro}${hasChaos ? 'Uranus introduces unpredictability where you need steadiness.' : 'Volatility lives where you need stability.'} Guard your trust, do not abandon it.`;
      }
      return `${signIntro}Trust is built, not born, between these charts. ${moonIntro.trim()} The emotional wiring is ${SIGN_ELEMENTS[moon1] === SIGN_ELEMENTS[moon2] ? 'compatible' : 'different'}. Patience rewarded.`;
    }

    // ---- COMMITMENT ----
    case 'commitment': {
      const saturnScore = report.themes.find(t => t.theme === 'commitment')?.score || 0;
      if (isPositive) {
        return `Saturn scores ${saturnScore.toFixed(1)} between you. ${signIntro}The structure for commitment exists. This bond can hold weight.`;
      }
      if (isNegative) {
        return `${signIntro}Freedom themes run strong. ${activeThemes.includes('chaos') ? 'Uranus resists containment.' : 'The charts favor independence over merging.'} Commitment asks more than these charts naturally give.`;
      }
      return `${signIntro}The charts allow commitment without demanding it. Whether this becomes permanent depends on will, not planets.`;
    }

    // ---- GENERAL (catch-all — but now with actual data) ----
    case 'general':
    default: {
      // Build a response from whatever is most relevant
      const parts: string[] = [signIntro];

      if (topAspect) {
        parts.push(topAspect.description);
      }

      if (themeFragment) {
        parts.push(`At its core, ${themeFragment.dynamic}.`);
      }

      if (isPositive) {
        parts.push('The charts support what you are asking about.');
      } else if (isNegative) {
        parts.push('The charts resist here. Not a judgment — a reading.');
      } else {
        parts.push('The answer lives in the grey. Neither fully supported nor blocked.');
      }

      return parts.join(' ');
    }
  }
}

/**
 * Determine verdict for a relationship question based on synastry report
 */
function getRelationshipVerdict(
  category: RelationshipQuestionCategory,
  report: SynastryReport,
  transitFavor: number,
): RelationshipAnswer['verdict'] {
  const baseScore = (report.score - 50) / 50;
  let themeBonus = 0;
  const themeScores = Object.fromEntries(report.themes.map(t => [t.theme, t.score]));

  switch (category) {
    case 'match':
      break;
    case 'attraction':
      themeBonus = ((themeScores['attraction'] || 0) + (themeScores['passion'] || 0)) / 20 - 0.3;
      break;
    case 'future':
      themeBonus = ((themeScores['commitment'] || 0) + (themeScores['soul'] || 0)) / 20 - 0.3;
      break;
    case 'conflict': {
      const conflictAspects = report.aspects.filter(a => a.nature === 'challenging').length;
      themeBonus = -(conflictAspects / Math.max(report.aspects.length, 1) - 0.3);
      break;
    }
    case 'timing':
      themeBonus = transitFavor * 0.5;
      break;
    case 'trust':
      themeBonus = ((themeScores['commitment'] || 0) - (themeScores['chaos'] || 0)) / 15 - 0.2;
      break;
    case 'commitment':
      themeBonus = ((themeScores['commitment'] || 0) + (themeScores['soul'] || 0) - (themeScores['chaos'] || 0)) / 20 - 0.2;
      break;
    case 'lifestyle':
      // Lifestyle is about element harmony
      themeBonus = (report.elementHarmony.score - 5) / 10;
      break;
    case 'energy':
      // Energy dynamics — passion and identity themes
      themeBonus = ((themeScores['passion'] || 0) + (themeScores['identity'] || 0)) / 20 - 0.3;
      break;
    case 'emotional':
      // Emotional connection — emotional and soul themes
      themeBonus = ((themeScores['emotional'] || 0) + (themeScores['soul'] || 0)) / 20 - 0.3;
      break;
    case 'general':
      break;
  }

  const finalScore = baseScore + themeBonus + transitFavor * 0.3;

  if (finalScore > 0.4) return 'yes';
  if (finalScore > 0.15) return 'leaning_yes';
  if (finalScore > -0.15) return 'uncertain';
  if (finalScore > -0.4) return 'leaning_no';
  return 'no';
}

/**
 * Calculate a transit-based "current energy" score for the relationship
 * Looks at current transits hitting BOTH natal charts' Venus, Mars, and 7th house
 */
function calculateTransitFavor(
  profile1: UserProfile,
  profile2: UserProfile,
): { favor: number; context: string | null } {
  let currentPositions: NatalChart;
  try {
    currentPositions = calculateCurrentPositions();
  } catch {
    return { favor: 0, context: null };
  }

  // Get transits to both charts
  let transits1: Transit[];
  let transits2: Transit[];
  try {
    transits1 = calculateTransits(profile1.natalChart, currentPositions);
    transits2 = calculateTransits(profile2.natalChart, currentPositions);
  } catch {
    return { favor: 0, context: null };
  }

  // Relationship-relevant planets
  const lovePlanets: Planet[] = ['venus', 'mars', 'moon', 'sun'];

  // Score transits hitting love planets
  let score = 0;
  let contextLine: string | null = null;

  const allTransits = [...transits1, ...transits2];
  for (const transit of allTransits) {
    if (!lovePlanets.includes(transit.natalPlanet)) continue;

    const isHarmonious = transit.aspectType === 'trine' || transit.aspectType === 'sextile' || transit.aspectType === 'conjunction';
    const isChallenging = transit.aspectType === 'square' || transit.aspectType === 'opposition';

    if (isHarmonious) {
      score += transit.isExact ? 0.3 : 0.15;
    } else if (isChallenging) {
      score -= transit.isExact ? 0.2 : 0.1;
    }

    // Best transit for context
    if (transit.isExact && !contextLine) {
      const tpName = PLANET_NAME[transit.transitPlanet] || transit.transitPlanet;
      const npName = PLANET_NAME[transit.natalPlanet] || transit.natalPlanet;
      if (isHarmonious) {
        contextLine = `${tpName} touches ${npName} exactly today. The timing carries weight.`;
      } else {
        contextLine = `${tpName} presses against ${npName} today. The sky adds friction to the moment.`;
      }
    }
  }

  // Venus retrograde penalty
  if (currentPositions.venus?.isRetrograde) {
    score -= 0.2;
    if (!contextLine) {
      contextLine = 'Venus is retrograde. Matters of the heart move sideways, not forward.';
    }
  }

  // Clamp to -1 to 1
  const favor = Math.max(-1, Math.min(1, score));

  return { favor, context: contextLine };
}

/**
 * Answer a question about the relationship between two profiles.
 * Generates dynamic, context-aware responses using actual synastry data.
 */
export function answerRelationshipQuestion(
  question: string,
  profile1: UserProfile,
  profile2: UserProfile,
  report: SynastryReport,
): RelationshipAnswer {
  const category = classifyRelationshipQuestion(question);
  const { favor: transitFavor, context: transitContext } = calculateTransitFavor(profile1, profile2);

  const verdict = getRelationshipVerdict(category, report, transitFavor);

  // Build dynamic response from actual chart data
  const response = buildDynamicResponse(category, verdict, report, question);

  // Append transit context for timing-sensitive questions
  let fullResponse = response;
  if (transitContext && (category === 'timing' || category === 'lifestyle' || category === 'energy')) {
    fullResponse += ' ' + transitContext;
  }

  return {
    verdict,
    response: fullResponse,
    transitContext: transitContext || undefined,
  };
}

/**
 * Get verdict display text
 */
export function getCompatibilityVerdictText(verdict: RelationshipAnswer['verdict']): string {
  const map: Record<RelationshipAnswer['verdict'], string> = {
    yes: 'Yes.',
    leaning_yes: 'The path opens.',
    uncertain: 'The path is veiled.',
    leaning_no: 'The stars resist.',
    no: 'No.',
  };
  return map[verdict];
}

/**
 * Get verdict color (matches The Seer's palette)
 */
export function getCompatibilityVerdictColor(verdict: RelationshipAnswer['verdict']): string {
  const map: Record<RelationshipAnswer['verdict'], string> = {
    yes: '#C9A84C',
    leaning_yes: '#D4BE7A',
    uncertain: '#8A8A8A',
    leaning_no: '#A67458',
    no: '#8B4A4A',
  };
  return map[verdict];
}
