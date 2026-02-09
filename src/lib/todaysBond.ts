/**
 * Today's Bond — Daily oracle pulse generator
 *
 * Combines transit data, moon phase, and synastry context to produce
 * a daily-changing snapshot of the energetic weather between two people.
 */

import type { UserProfile, Planet, NatalChart, Transit } from '../types/userProfile';
import type { SynastryReport } from './synastry';
import type { BondMood, TodaysBondData } from '../components/TodaysBond';
import {
  calculateCurrentPositions,
  calculateTransits,
  getMoonPhase,
  getDayRuler,
  getHouseForLongitude,
} from './ephemerisService';

// ============================================
// PLANET NAMES (oracle voice)
// ============================================

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
// MOOD DETERMINATION
// ============================================

/** Relationship-sensitive planets */
const LOVE_PLANETS: Planet[] = ['venus', 'mars', 'moon', 'sun'];
const INTENSITY_PLANETS: Planet[] = ['pluto', 'uranus', 'neptune'];

interface TransitProfile {
  harmoniousCount: number;
  challengingCount: number;
  exactCount: number;
  hasVenusTransit: boolean;
  hasMarsTransit: boolean;
  hasPlutoTransit: boolean;
  hasUranusTransit: boolean;
  hasNeptuneTransit: boolean;
  hasSaturnTransit: boolean;
  hasMoonTransit: boolean;
  venusRetrograde: boolean;
  topTransits: ScoredTransit[];
}

interface ScoredTransit {
  transit: Transit;
  personIndex: 1 | 2;
  relevance: number; // higher = more relevant to daily bond
}

function profileTransits(
  profile1: UserProfile,
  profile2: UserProfile,
  currentPositions: NatalChart,
): TransitProfile {
  let transits1: Transit[] = [];
  let transits2: Transit[] = [];

  try {
    transits1 = calculateTransits(profile1.natalChart, currentPositions);
  } catch { /* empty */ }
  try {
    transits2 = calculateTransits(profile2.natalChart, currentPositions);
  } catch { /* empty */ }

  const scored: ScoredTransit[] = [];

  const processTransit = (t: Transit, personIndex: 1 | 2) => {
    const isLoveNatal = LOVE_PLANETS.includes(t.natalPlanet);
    const isLoveTransit = LOVE_PLANETS.includes(t.transitPlanet);
    const isIntense = INTENSITY_PLANETS.includes(t.transitPlanet);
    // Relevance: love planets score high, exact aspects score higher
    let relevance = 0;
    if (isLoveNatal) relevance += 3;
    if (isLoveTransit) relevance += 2;
    if (isIntense) relevance += 2;
    if (t.isExact) relevance += 4;
    relevance += Math.max(0, 3 - t.orb); // tighter orb = more relevant
    scored.push({ transit: t, personIndex, relevance });
  };

  for (const t of transits1) processTransit(t, 1);
  for (const t of transits2) processTransit(t, 2);

  // Sort by relevance (highest first)
  scored.sort((a, b) => b.relevance - a.relevance);

  const allTransits = [...transits1, ...transits2];
  const loveTransits = allTransits.filter(t =>
    LOVE_PLANETS.includes(t.natalPlanet) || LOVE_PLANETS.includes(t.transitPlanet)
  );

  return {
    harmoniousCount: loveTransits.filter(t =>
      t.aspectType === 'trine' || t.aspectType === 'sextile' || t.aspectType === 'conjunction'
    ).length,
    challengingCount: loveTransits.filter(t =>
      t.aspectType === 'square' || t.aspectType === 'opposition'
    ).length,
    exactCount: allTransits.filter(t => t.isExact).length,
    hasVenusTransit: allTransits.some(t => t.transitPlanet === 'venus' && t.orb < 3),
    hasMarsTransit: allTransits.some(t => t.transitPlanet === 'mars' && t.orb < 3),
    hasPlutoTransit: allTransits.some(t => t.transitPlanet === 'pluto' && t.orb < 2),
    hasUranusTransit: allTransits.some(t => t.transitPlanet === 'uranus' && t.orb < 2),
    hasNeptuneTransit: allTransits.some(t => t.transitPlanet === 'neptune' && t.orb < 2),
    hasSaturnTransit: allTransits.some(t => t.transitPlanet === 'saturn' && t.orb < 2),
    hasMoonTransit: allTransits.some(t => t.transitPlanet === 'moon' && t.orb < 3),
    venusRetrograde: currentPositions.venus?.isRetrograde ?? false,
    topTransits: scored.slice(0, 6),
  };
}

/** Determine the day's bond mood from transit profile + synastry context */
function determineMood(tp: TransitProfile, report: SynastryReport, moonPhaseValue: number): BondMood {
  // Strong outer-planet transits create specific moods
  if (tp.hasPlutoTransit && tp.hasMarsTransit) return 'raw';
  if (tp.hasPlutoTransit) return 'volatile';
  if (tp.hasUranusTransit) return 'electric';
  if (tp.hasNeptuneTransit) return 'dissolving';

  // Saturn creates heaviness
  if (tp.hasSaturnTransit && tp.challengingCount > tp.harmoniousCount) return 'still';

  // Venus + Mars = magnetic
  if (tp.hasVenusTransit && tp.hasMarsTransit) return 'magnetic';

  // Venus alone = tender
  if (tp.hasVenusTransit && tp.harmoniousCount >= tp.challengingCount) return 'tender';

  // Mars alone + challenges = restless
  if (tp.hasMarsTransit && tp.challengingCount > 0) return 'restless';

  // Full moon intensifies
  if (moonPhaseValue > 0.45 && moonPhaseValue < 0.55) {
    return tp.harmoniousCount > tp.challengingCount ? 'magnetic' : 'volatile';
  }

  // New moon = stillness or potential
  if (moonPhaseValue < 0.05 || moonPhaseValue > 0.95) return 'still';

  // Lots of harmonious = expanding
  if (tp.harmoniousCount >= 3 && tp.challengingCount <= 1) return 'expanding';

  // High score synastry + good transits
  if (report.score >= 70 && tp.harmoniousCount > tp.challengingCount) return 'fated';

  // Challenging day
  if (tp.challengingCount > tp.harmoniousCount + 1) return 'restless';

  // Venus retrograde adds rawness
  if (tp.venusRetrograde) return 'raw';

  // Default: quiet magnetism
  return tp.harmoniousCount > 0 ? 'tender' : 'still';
}

// ============================================
// PULSE SCORE
// ============================================

/** Calculate the daily bond pulse (0-100) */
function calculatePulse(tp: TransitProfile, report: SynastryReport): number {
  // Start from a base related to the static compatibility
  let pulse = report.score * 0.4; // 0-40 base

  // Harmonious transits push up
  pulse += tp.harmoniousCount * 5;

  // Exact aspects are powerful
  pulse += tp.exactCount * 4;

  // Challenging transits don't necessarily lower — they add intensity
  pulse += tp.challengingCount * 2;

  // Venus + Mars together = high pulse
  if (tp.hasVenusTransit && tp.hasMarsTransit) pulse += 10;

  // Venus retrograde dampens
  if (tp.venusRetrograde) pulse -= 8;

  // Moon transits add a little buzz
  if (tp.hasMoonTransit) pulse += 3;

  return Math.max(5, Math.min(99, Math.round(pulse)));
}

// ============================================
// TRANSIT LINES (oracle voice)
// ============================================

interface TransitLine {
  text: string;
  relevance: number;
}

function generateTransitLines(
  tp: TransitProfile,
  profile1: UserProfile,
  profile2: UserProfile,
): string[] {
  const lines: TransitLine[] = [];

  for (const scored of tp.topTransits.slice(0, 4)) {
    const t = scored.transit;
    const tpName = PLANET_NAME[t.transitPlanet] || t.transitPlanet;
    const npName = PLANET_NAME[t.natalPlanet] || t.natalPlanet;
    const personName = scored.personIndex === 1
      ? profile1.birthData.name
      : profile2.birthData.name;

    const isHarmonious = t.aspectType === 'trine' || t.aspectType === 'sextile' || t.aspectType === 'conjunction';
    const isExact = t.isExact;

    let text: string;

    if (isExact && isHarmonious) {
      text = pickRandom([
        `${tpName} meets ${personName}'s ${npName} exactly. The timing is precise.`,
        `${tpName} touches ${npName} in ${personName}'s chart. Something aligns.`,
        `${tpName} and ${npName} converge for ${personName}. Pay attention.`,
      ]);
    } else if (isExact) {
      text = pickRandom([
        `${tpName} presses against ${personName}'s ${npName}. Friction has a purpose.`,
        `${tpName} confronts ${npName} in ${personName}'s chart. Tension is a teacher.`,
        `${tpName} squares off with ${personName}'s ${npName}. Handle with awareness.`,
      ]);
    } else if (isHarmonious) {
      text = pickRandom([
        `${tpName} drifts toward ${personName}'s ${npName}. A soft pull.`,
        `${tpName} warms ${personName}'s ${npName}. The current is gentle.`,
      ]);
    } else {
      text = pickRandom([
        `${tpName} unsettles ${personName}'s ${npName}. Something stirs beneath.`,
        `${tpName} tests ${personName}'s ${npName}. Growth rarely feels comfortable.`,
      ]);
    }

    lines.push({ text, relevance: scored.relevance });
  }

  // Venus retrograde context
  if (tp.venusRetrograde && lines.length < 2) {
    lines.push({
      text: 'Venus is retrograde. Desire reroutes. Old patterns resurface.',
      relevance: 5,
    });
  }

  // Sort by relevance and take top 2
  lines.sort((a, b) => b.relevance - a.relevance);
  return lines.slice(0, 2).map(l => l.text);
}

// ============================================
// RITUAL LINES
// ============================================

const RITUAL_BY_MOOD: Record<BondMood, string[]> = {
  electric: [
    'Say the thing you\'ve been holding back.',
    'Act on impulse today. Think about it tomorrow.',
    'The charge between you is real. Don\'t ground it out — let it arc.',
  ],
  tender: [
    'Be gentle. The opening is real.',
    'Say less. Be near.',
    'Today favors softness over strategy.',
  ],
  volatile: [
    'Name the tension before it names you.',
    'Don\'t reach for control. Sit with the discomfort.',
    'Conflict today is information, not a verdict.',
  ],
  still: [
    'Wait. The stillness is not emptiness.',
    'Nothing needs to happen today. Let the space breathe.',
    'Patience is not passive. It is precision.',
  ],
  magnetic: [
    'You don\'t need to understand the pull. Just notice it.',
    'Proximity matters today. Close the distance.',
    'What draws you together today is old and certain.',
  ],
  fated: [
    'This was always going to happen. Be present for it.',
    'The thread between you tightens. Follow it.',
    'Pay attention to the echoes. They carry meaning.',
  ],
  restless: [
    'Move your body. The restlessness is signal, not noise.',
    'Don\'t mistake agitation for incompatibility.',
    'Channel the friction outward. Build something. Move.',
  ],
  raw: [
    'Today strips the surface. Let it.',
    'Vulnerability is not weakness. It is the fastest path in.',
    'Honesty costs something today. Pay it.',
  ],
  expanding: [
    'Dream bigger together today. The sky permits it.',
    'Share what excites you. Enthusiasm is contagious under this sky.',
    'Growth is happening. You might not see it yet — but you\'ll feel it.',
  ],
  dissolving: [
    'Boundaries soften. Notice what flows in.',
    'Don\'t cling to the shape of things. Let the edges blur.',
    'Something unseen passes between you today. Trust it.',
  ],
};

function pickRitual(mood: BondMood): string {
  // Use date as seed for daily consistency
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const options = RITUAL_BY_MOOD[mood];
  return options[daySeed % options.length];
}

// ============================================
// MOON HOUSE CONTEXT
// ============================================

/** Check which house today's Moon falls in for each person */
function getMoonHouseContext(
  currentPositions: NatalChart,
  profile1: UserProfile,
  profile2: UserProfile,
): string | null {
  const moonLon = currentPositions.moon?.longitude;
  if (moonLon == null) return null;

  const KEY_HOUSES = new Set([1, 4, 5, 7, 8, 12]);
  const contexts: string[] = [];

  if (profile1.natalChart.houses) {
    const house = getHouseForLongitude(moonLon, profile1.natalChart.houses.cusps);
    if (KEY_HOUSES.has(house)) {
      contexts.push(`Moon transits ${profile1.birthData.name}'s ${ordinal(house)} house`);
    }
  }

  if (profile2.natalChart.houses) {
    const house = getHouseForLongitude(moonLon, profile2.natalChart.houses.cusps);
    if (KEY_HOUSES.has(house)) {
      contexts.push(`Moon transits ${profile2.birthData.name}'s ${ordinal(house)} house`);
    }
  }

  if (contexts.length === 0) return null;
  return contexts.join(' · ');
}

function ordinal(n: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || 'th');
}

// ============================================
// FALLBACK TRANSIT LINES
// ============================================

function getFallbackTransitLines(
  dayRulerPlanet: Planet,
  mood: BondMood,
): string[] {
  const ruler = PLANET_NAME[dayRulerPlanet] || dayRulerPlanet;
  const moodFallbacks: Record<BondMood, string> = {
    electric: `${ruler} rules the day. The current runs faster than usual.`,
    tender: `${ruler} rules the day. Softness finds an opening.`,
    volatile: `${ruler} rules the day. The ground is less steady than it seems.`,
    still: `${ruler} rules the day. Silence speaks between you.`,
    magnetic: `${ruler} rules the day. The pull is quiet but certain.`,
    fated: `${ruler} rules the day. Something old remembers itself.`,
    restless: `${ruler} rules the day. Energy moves without direction.`,
    raw: `${ruler} rules the day. The surface is thinner than usual.`,
    expanding: `${ruler} rules the day. The space between you grows outward.`,
    dissolving: `${ruler} rules the day. Edges blur where you meet.`,
  };
  return [moodFallbacks[mood]];
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Calculate the daily bond data for a pair.
 * Falls back to synastry-only data if ephemeris is unavailable.
 */
export function calculateTodaysBond(
  profile1: UserProfile,
  profile2: UserProfile,
  report: SynastryReport,
): TodaysBondData {
  let currentPositions: NatalChart | null = null;
  try {
    currentPositions = calculateCurrentPositions();
  } catch (e) {
    console.warn('Today\'s Bond: ephemeris unavailable, using synastry-only fallback', e);
  }

  // Moon data (may fail independently)
  let moonPhaseName = 'the sky';
  let moonIllumination = 50;
  let moonPhaseValue = 0.25;
  try {
    const moonData = getMoonPhase();
    moonPhaseName = moonData.phaseName.toLowerCase();
    moonIllumination = Math.round(moonData.illumination * 100);
    moonPhaseValue = moonData.phase;
  } catch { /* use defaults */ }

  let dayRulerPlanet: Planet = 'sun';
  try {
    dayRulerPlanet = getDayRuler().ruler;
  } catch { /* use default */ }

  // If we have current positions, do full transit analysis
  if (currentPositions) {
    const tp = profileTransits(profile1, profile2, currentPositions);
    const mood = determineMood(tp, report, moonPhaseValue);
    const pulseScore = calculatePulse(tp, report);

    let transitLines = generateTransitLines(tp, profile1, profile2);
    if (transitLines.length === 0) {
      transitLines = getFallbackTransitLines(dayRulerPlanet, mood);
    }

    const moonHouseContext = getMoonHouseContext(currentPositions, profile1, profile2);
    if (moonHouseContext && transitLines.length < 2) {
      transitLines.push(moonHouseContext + '.');
    }

    return {
      mood,
      pulseScore,
      transitLines,
      moonPhase: moonPhaseName,
      moonIllumination,
      ritual: pickRitual(mood),
      person1Name: profile1.birthData.name,
      person2Name: profile2.birthData.name,
    };
  }

  // Fallback: no ephemeris — derive mood purely from synastry report
  const mood = deriveMoodFromSynastry(report);
  const pulseScore = Math.max(10, Math.min(90, Math.round(report.score * 0.6 + 20)));
  const transitLines = getFallbackTransitLines(dayRulerPlanet, mood);

  return {
    mood,
    pulseScore,
    transitLines,
    moonPhase: moonPhaseName,
    moonIllumination,
    ritual: pickRitual(mood),
    person1Name: profile1.birthData.name,
    person2Name: profile2.birthData.name,
  };
}

// ============================================
// HELPERS
// ============================================

/** Derive mood from synastry alone (no transit data) */
function deriveMoodFromSynastry(report: SynastryReport): BondMood {
  const topTheme = report.themes[0]?.theme;

  if (report.score >= 80) return 'fated';
  if (report.score >= 65) {
    if (topTheme === 'passion' || topTheme === 'attraction') return 'magnetic';
    if (topTheme === 'soul' || topTheme === 'destiny') return 'fated';
    return 'expanding';
  }
  if (report.score >= 45) {
    if (topTheme === 'emotional') return 'tender';
    if (topTheme === 'chaos') return 'restless';
    return 'still';
  }
  if (topTheme === 'transformation') return 'raw';
  return 'still';
}

function pickRandom<T>(arr: T[]): T {
  // Use date-seeded index for daily consistency within the same session
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return arr[seed % arr.length];
}
