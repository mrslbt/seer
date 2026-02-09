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

import type { SynastryReport, CompatibilityTier } from './synastry';
import type { UserProfile, Planet, NatalChart } from '../types/userProfile';
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

/**
 * Determine verdict for a relationship question based on synastry report
 */
function getRelationshipVerdict(
  category: RelationshipQuestionCategory,
  report: SynastryReport,
  transitFavor: number, // -1 to 1 from current transits
): RelationshipAnswer['verdict'] {
  // Base score from synastry report (0-100 mapped to -1 to 1)
  const baseScore = (report.score - 50) / 50;

  // Theme-specific modifiers
  let themeBonus = 0;
  const themeScores = Object.fromEntries(report.themes.map(t => [t.theme, t.score]));

  switch (category) {
    case 'match':
      // Overall compatibility — use the raw score
      break;
    case 'attraction':
      themeBonus = ((themeScores['attraction'] || 0) + (themeScores['passion'] || 0)) / 20 - 0.3;
      break;
    case 'future':
      themeBonus = ((themeScores['commitment'] || 0) + (themeScores['soul'] || 0)) / 20 - 0.3;
      break;
    case 'conflict':
      // For conflict, high score is BAD (more conflict)
      const conflictAspects = report.aspects.filter(a => a.nature === 'challenging').length;
      themeBonus = -(conflictAspects / report.aspects.length - 0.3);
      break;
    case 'timing':
      // Timing leans heavily on current transits
      themeBonus = transitFavor * 0.5;
      break;
    case 'trust':
      themeBonus = ((themeScores['commitment'] || 0) - (themeScores['chaos'] || 0)) / 15 - 0.2;
      break;
    case 'commitment':
      themeBonus = ((themeScores['commitment'] || 0) + (themeScores['soul'] || 0) - (themeScores['chaos'] || 0)) / 20 - 0.2;
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

/** Response templates by category x verdict */
const RELATIONSHIP_RESPONSES: Record<RelationshipQuestionCategory, Record<RelationshipAnswer['verdict'], string[]>> = {
  match: {
    yes: [
      'The charts confirm it. This is not a stretch. The fit is real.',
      'You match in the ways that matter. The stars do not say this lightly.',
    ],
    leaning_yes: [
      'More aligns than clashes. The foundation is there. Build on it.',
      'The charts lean toward yes. Not without work, but the raw material is good.',
    ],
    uncertain: [
      'Some pieces fit. Others resist. The match depends on what you are willing to negotiate.',
      'The charts show both harmony and tension. Whether you call that a match is up to you.',
    ],
    leaning_no: [
      'The fit is tighter than it should be. Not impossible, but demanding.',
      'More friction than flow between these charts. Proceed with open eyes.',
    ],
    no: [
      'The charts do not support this match. That is honest, not cruel.',
      'What you hope for is not what the charts reflect. Listen to that.',
    ],
  },
  attraction: {
    yes: [
      'The pull is unmistakable. Venus and Mars leave no doubt.',
      'Chemistry is written in both charts. This is not imagination.',
    ],
    leaning_yes: [
      'A current runs between you. Not overwhelming, but real enough to notice.',
      'The attraction simmers. It is there, underneath, waiting to surface.',
    ],
    uncertain: [
      'The spark is conditional. Sometimes lit, sometimes dormant. Context matters.',
      'Attraction exists in pockets. Intense in moments, invisible in others.',
    ],
    leaning_no: [
      'The charts show more friendship than fire. That is not nothing, but it is not what you asked.',
      'The pull is faint. You may be seeing what you want rather than what is there.',
    ],
    no: [
      'The chemistry the charts describe is minimal. Bodies that speak different languages.',
      'What you feel may be real, but the charts do not echo it.',
    ],
  },
  future: {
    yes: [
      'Saturn and the nodes agree: this has staying power. Build with confidence.',
      'The long view is strong. These charts can weather time.',
    ],
    leaning_yes: [
      'The ingredients for longevity are present. But ingredients require cooking.',
      'Duration is possible. The charts show structure, not just spark.',
    ],
    uncertain: [
      'The charts show a present connection, not a guaranteed future. That is normal. Most love is made, not fated.',
      'Long-term depends on choices, not charts alone. The foundation exists. The building is yours.',
    ],
    leaning_no: [
      'The charts favor intensity over duration. Bright and brief.',
      'Staying power is not the strength here. Enjoy what is, without demanding forever.',
    ],
    no: [
      'The charts do not point to longevity. That does not erase what you had.',
      'Some connections are meant to be vivid and brief. This may be one.',
    ],
  },
  conflict: {
    yes: [
      'Yes. The charts show friction. Mars squares and Saturn pressure points are real. You will fight.',
      'Conflict is baked into this dynamic. The question is whether you fight well together.',
    ],
    leaning_yes: [
      'Tension runs through the charts. Not constant warfare, but regular sparks. Learn each other\'s triggers.',
      'Arguments will come. The charts say so. But they also show the capacity to resolve.',
    ],
    uncertain: [
      'Some friction, some ease. Average terrain. How you handle disagreement matters more than the stars here.',
      'The charts are mixed. You will not be conflict-free, but you will not be at war.',
    ],
    leaning_no: [
      'Less friction than you might fear. The charts show harmony in the places that matter.',
      'Conflict is manageable. More disagreement than destruction.',
    ],
    no: [
      'The charts show remarkable ease between you. Conflict will be rare and resolvable.',
      'Little fire and friction here. The risk is not fighting — it is stagnation. Keep things alive.',
    ],
  },
  timing: {
    yes: [
      'The transits favor this moment. What you are considering — do it now.',
      'The sky opens a window. Current planetary positions support action between you.',
    ],
    leaning_yes: [
      'The timing leans favorable. Not perfect, but waiting may not improve it.',
      'A decent window. The cosmos gives a gentle push.',
    ],
    uncertain: [
      'The timing is neutral. Neither favored nor blocked. Your courage matters more than the calendar.',
      'No strong signal on timing. The stars shrug. You decide.',
    ],
    leaning_no: [
      'The transits suggest patience. Not permanent delay — just not this moment.',
      'The window is not fully open. A little more patience serves you.',
    ],
    no: [
      'Not now. The transits actively resist. Wait for the sky to shift.',
      'The timing is wrong. The stars are clear about this. Patience.',
    ],
  },
  trust: {
    yes: [
      'The charts suggest loyalty. Saturn and the nodes point to reliability.',
      'Trust finds solid ground between these charts. The bond has integrity.',
    ],
    leaning_yes: [
      'More loyalty than deception in these charts. Trust cautiously, then fully.',
      'The charts lean toward reliability. Not blind trust — earned trust.',
    ],
    uncertain: [
      'Trust is built, not born, between these charts. The raw material is neutral.',
      'Neither deeply trustworthy nor untrustworthy by the charts. Character fills what the stars leave open.',
    ],
    leaning_no: [
      'Instability shows in the charts. Not necessarily betrayal, but unpredictability.',
      'The charts advise caution. Not paranoia. Caution.',
    ],
    no: [
      'The charts show volatility where you need stability. Guard your trust.',
      'What you want to believe and what the charts show diverge. Be careful.',
    ],
  },
  commitment: {
    yes: [
      'Saturn blesses this. The commitment signature is strong in both charts.',
      'These charts can hold the weight of a real commitment. Structure exists.',
    ],
    leaning_yes: [
      'Commitment is possible. The charts show willingness beneath the surface.',
      'The structure for commitment exists. But structure needs filling.',
    ],
    uncertain: [
      'The charts are neutral on commitment. It is available, not automatic.',
      'Whether this becomes committed depends on will, not stars. The charts allow it.',
    ],
    leaning_no: [
      'Freedom themes run strong. Commitment asks more than these charts naturally give.',
      'The charts favor independence over merging. Not rejection — preference.',
    ],
    no: [
      'The charts do not favor binding commitment here. Honor what this is instead of forcing what it is not.',
      'What you want is serious. What the charts describe is not. The gap matters.',
    ],
  },
  general: {
    yes: [
      'The charts speak favorably. What you sense between you has foundation.',
      'The connection is real and strong. The stars confirm.',
    ],
    leaning_yes: [
      'More flows than resists between you. A good sign.',
      'The charts lean positive. Trust the current.',
    ],
    uncertain: [
      'The charts hold both light and shadow here. Your question needs sharpening.',
      'Between you lives complexity. Neither purely good nor purely difficult.',
    ],
    leaning_no: [
      'The charts advise caution here. Not doom — awareness.',
      'More resistance than flow in this area. Proceed knowingly.',
    ],
    no: [
      'The charts do not support what you are asking about. Listen.',
      'A clear signal against. The stars protect as much as they guide.',
    ],
  },
};

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
 * Answer a question about the relationship between two profiles
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
  const responses = RELATIONSHIP_RESPONSES[category][verdict];
  const response = pick(responses);

  // Build final response with transit context
  let fullResponse = response;
  if (transitContext && (category === 'timing' || category === 'general' || category === 'attraction')) {
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
