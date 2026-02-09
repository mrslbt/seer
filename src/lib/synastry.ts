/**
 * Synastry Engine — The Space Between Two Charts
 *
 * Compares two natal charts to determine compatibility:
 * - Cross-chart aspects (planet-to-planet connections)
 * - Element/modality harmony
 * - Key relationship signatures (Venus-Mars, Sun-Moon, etc.)
 * - Overall synastry score and themes
 *
 * Uses the real Swiss Ephemeris natal charts from userProfile types.
 */

import type { ZodiacSign } from '../types/astrology';
import type {
  NatalChart,
  PlanetPosition,
  Planet,
  AspectType,
  UserProfile,
} from '../types/userProfile';

// ============================================
// TYPES
// ============================================

export interface SynastryAspect {
  planet1: Planet;       // from person 1
  planet2: Planet;       // from person 2
  person1Name: string;
  person2Name: string;
  type: AspectType;
  orb: number;
  weight: number;        // importance (1-10)
  nature: 'harmonious' | 'challenging' | 'intense';
  theme: SynastryTheme;
  description: string;   // oracle-voice one-liner
}

export type SynastryTheme =
  | 'attraction'     // Venus-Mars, physical pull
  | 'soul'           // Sun-Moon, deep recognition
  | 'communication'  // Mercury contacts
  | 'growth'         // Jupiter contacts, expansion
  | 'commitment'     // Saturn contacts, staying power
  | 'transformation' // Pluto contacts, power dynamics
  | 'chaos'          // Uranus contacts, electric instability
  | 'dreams'         // Neptune contacts, idealization
  | 'destiny'        // Node contacts, karmic pull
  | 'passion'        // Mars-Mars, fire
  | 'emotional'      // Moon-Moon, Moon-Venus, emotional current
  | 'identity';      // Sun-Sun, ego dynamic

export type CompatibilityTier =
  | 'fated'          // 85-100: rare, electric, undeniable
  | 'magnetic'       // 70-84: strong pull, real chemistry
  | 'kindred'        // 55-69: natural understanding, ease
  | 'complex'        // 40-54: push-pull, growth-oriented
  | 'friction'       // 25-39: challenging, requires work
  | 'distant';       // 0-24: little resonance

export interface SynastryReport {
  // Profiles
  person1: { name: string; sunSign: ZodiacSign; moonSign: ZodiacSign };
  person2: { name: string; sunSign: ZodiacSign; moonSign: ZodiacSign };

  // Score
  score: number;              // 0-100
  tier: CompatibilityTier;

  // Aspects
  aspects: SynastryAspect[];
  keyAspects: SynastryAspect[];  // top 5 most important

  // Thematic breakdown
  themes: SynastryThemeScore[];

  // Element harmony
  elementHarmony: {
    score: number;             // 0-10
    description: string;
  };

  // Strengths & challenges
  strengths: string[];         // oracle-voice bullet points
  challenges: string[];        // oracle-voice bullet points

  // The oracle's overall read
  oracleVerdict: string;       // 1-2 sentence oracle summary
}

export interface SynastryThemeScore {
  theme: SynastryTheme;
  score: number;               // 0-10
  label: string;               // human-readable theme name
}

// ============================================
// CONSTANTS
// ============================================

/** Planets to include in synastry (core 10 + nodes) */
const SYNASTRY_PLANETS: Planet[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'northNode',
];

/** Aspect definitions with synastry-specific orbs (tighter than natal) */
const SYNASTRY_ASPECTS: { type: AspectType; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 7 },
  { type: 'trine', angle: 120, orb: 6 },
  { type: 'square', angle: 90, orb: 6 },
  { type: 'sextile', angle: 60, orb: 4 },
  { type: 'quincunx', angle: 150, orb: 3 },
];

/** Weight multipliers for planet pairs — how important is this connection? */
const PAIR_WEIGHTS: Record<string, number> = {
  // Romantic heavyweights (10 = life-altering)
  'venus-mars': 10,
  'sun-moon': 9,
  'moon-venus': 8,
  'sun-venus': 8,
  'mars-mars': 7,
  'venus-venus': 7,
  'moon-mars': 7,

  // Identity & soul
  'sun-sun': 6,
  'moon-moon': 7,
  'sun-mars': 6,

  // Communication
  'mercury-mercury': 5,
  'mercury-venus': 5,
  'mercury-mars': 4,
  'sun-mercury': 4,
  'moon-mercury': 5,

  // Growth & expansion
  'jupiter-sun': 6,
  'jupiter-moon': 5,
  'jupiter-venus': 6,
  'jupiter-mars': 5,

  // Commitment & structure
  'saturn-sun': 6,
  'saturn-moon': 6,
  'saturn-venus': 7,
  'saturn-mars': 5,

  // Transformation
  'pluto-sun': 7,
  'pluto-moon': 7,
  'pluto-venus': 8,
  'pluto-mars': 7,

  // Electric / chaotic
  'uranus-sun': 5,
  'uranus-moon': 5,
  'uranus-venus': 6,
  'uranus-mars': 5,

  // Dream / illusion
  'neptune-sun': 5,
  'neptune-moon': 6,
  'neptune-venus': 7,
  'neptune-mars': 4,

  // Destiny / karma
  'northNode-sun': 7,
  'northNode-moon': 7,
  'northNode-venus': 7,
  'northNode-mars': 5,
};

/** Map planet pairs to themes */
const PAIR_THEMES: Record<string, SynastryTheme> = {
  'venus-mars': 'attraction',
  'mars-venus': 'attraction',
  'moon-mars': 'passion',
  'mars-moon': 'passion',
  'mars-mars': 'passion',
  'sun-moon': 'soul',
  'moon-sun': 'soul',
  'sun-sun': 'identity',
  'moon-moon': 'emotional',
  'moon-venus': 'emotional',
  'venus-moon': 'emotional',
  'venus-venus': 'attraction',
  'sun-venus': 'attraction',
  'venus-sun': 'attraction',
  'mercury-mercury': 'communication',
  'mercury-venus': 'communication',
  'venus-mercury': 'communication',
  'mercury-mars': 'communication',
  'mars-mercury': 'communication',
  'sun-mercury': 'communication',
  'mercury-sun': 'communication',
  'moon-mercury': 'communication',
  'mercury-moon': 'communication',
  'jupiter-sun': 'growth',
  'sun-jupiter': 'growth',
  'jupiter-moon': 'growth',
  'moon-jupiter': 'growth',
  'jupiter-venus': 'growth',
  'venus-jupiter': 'growth',
  'jupiter-mars': 'growth',
  'mars-jupiter': 'growth',
  'saturn-sun': 'commitment',
  'sun-saturn': 'commitment',
  'saturn-moon': 'commitment',
  'moon-saturn': 'commitment',
  'saturn-venus': 'commitment',
  'venus-saturn': 'commitment',
  'saturn-mars': 'commitment',
  'mars-saturn': 'commitment',
  'pluto-sun': 'transformation',
  'sun-pluto': 'transformation',
  'pluto-moon': 'transformation',
  'moon-pluto': 'transformation',
  'pluto-venus': 'transformation',
  'venus-pluto': 'transformation',
  'pluto-mars': 'transformation',
  'mars-pluto': 'transformation',
  'uranus-sun': 'chaos',
  'sun-uranus': 'chaos',
  'uranus-moon': 'chaos',
  'moon-uranus': 'chaos',
  'uranus-venus': 'chaos',
  'venus-uranus': 'chaos',
  'uranus-mars': 'chaos',
  'mars-uranus': 'chaos',
  'neptune-sun': 'dreams',
  'sun-neptune': 'dreams',
  'neptune-moon': 'dreams',
  'moon-neptune': 'dreams',
  'neptune-venus': 'dreams',
  'venus-neptune': 'dreams',
  'neptune-mars': 'dreams',
  'mars-neptune': 'dreams',
  'northNode-sun': 'destiny',
  'sun-northNode': 'destiny',
  'northNode-moon': 'destiny',
  'moon-northNode': 'destiny',
  'northNode-venus': 'destiny',
  'venus-northNode': 'destiny',
  'northNode-mars': 'destiny',
  'mars-northNode': 'destiny',
};

/** Zodiac element map */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water',
};

/** Element compatibility matrix */
const ELEMENT_COMPAT: Record<string, number> = {
  'fire-fire': 8, 'fire-air': 9, 'fire-earth': 4, 'fire-water': 3,
  'air-fire': 9, 'air-air': 7, 'air-earth': 4, 'air-water': 5,
  'earth-fire': 4, 'earth-air': 4, 'earth-earth': 8, 'earth-water': 9,
  'water-fire': 3, 'water-air': 5, 'water-earth': 9, 'water-water': 7,
};

// ============================================
// ASPECT DESCRIPTIONS (Oracle Voice)
// ============================================

/** One-liner aspect descriptions in oracle voice */
function getAspectDescription(
  planet1: Planet,
  planet2: Planet,
  aspectType: AspectType,
  nature: 'harmonious' | 'challenging' | 'intense',
): string {
  const key = `${planet1}-${planet2}`;

  // Specific high-impact descriptions
  const specifics: Record<string, Record<string, string>> = {
    'venus-mars': {
      harmonious: 'The pull between you is effortless. Desire flows without resistance.',
      challenging: 'Want burns bright but clashes with how love is given. Fire and friction.',
      intense: 'Your bodies speak the same language. The magnetism is immediate.',
    },
    'mars-venus': {
      harmonious: 'The pull between you is effortless. Desire flows without resistance.',
      challenging: 'Want burns bright but clashes with how love is given. Fire and friction.',
      intense: 'Your bodies speak the same language. The magnetism is immediate.',
    },
    'sun-moon': {
      harmonious: 'One shines, the other reflects. A dance of recognition.',
      challenging: 'Your core and their depths pull in different tides.',
      intense: 'The soul recognizes what the mind has not yet named.',
    },
    'moon-sun': {
      harmonious: 'One shines, the other reflects. A dance of recognition.',
      challenging: 'Your depths and their core pull in different tides.',
      intense: 'The soul recognizes what the mind has not yet named.',
    },
    'moon-moon': {
      harmonious: 'Your emotional tides rise and fall in rhythm.',
      challenging: 'Two inner worlds that speak different emotional languages.',
      intense: 'Emotional merging. What one feels, the other absorbs.',
    },
    'venus-venus': {
      harmonious: 'You love in the same language. Ease and beauty between you.',
      challenging: 'You both want love, but ask for it differently.',
      intense: 'Mirror of desire. You see yourself in how they love.',
    },
    'mars-mars': {
      harmonious: 'Your drives align. Ambition and energy feed each other.',
      challenging: 'Two wills collide. The friction can ignite or destroy.',
      intense: 'Raw energy meets raw energy. Competition or combustion.',
    },
    'saturn-venus': {
      harmonious: 'Love with staying power. Structure around tenderness.',
      challenging: 'One seeks freedom in love, the other demands commitment.',
      intense: 'The bond is heavy, ancient. Not easily escaped.',
    },
    'venus-saturn': {
      harmonious: 'Love with staying power. Structure around tenderness.',
      challenging: 'One seeks freedom in love, the other demands commitment.',
      intense: 'The bond is heavy, ancient. Not easily escaped.',
    },
    'pluto-venus': {
      harmonious: 'Love that transforms. Nothing stays the same after this.',
      challenging: 'Obsession and desire tangle. Power plays in love.',
      intense: 'A consuming connection. All or nothing.',
    },
    'venus-pluto': {
      harmonious: 'Love that transforms. Nothing stays the same after this.',
      challenging: 'Obsession and desire tangle. Power plays in love.',
      intense: 'A consuming connection. All or nothing.',
    },
    'neptune-venus': {
      harmonious: 'A dream of love made real. Beauty and illusion intertwined.',
      challenging: 'The romance you imagine may not be the romance you have.',
      intense: 'Transcendent love — or a beautiful fog. Time will tell.',
    },
    'venus-neptune': {
      harmonious: 'A dream of love made real. Beauty and illusion intertwined.',
      challenging: 'The romance you imagine may not be the romance you have.',
      intense: 'Transcendent love — or a beautiful fog. Time will tell.',
    },
  };

  if (specifics[key]?.[nature]) {
    return specifics[key][nature];
  }

  // Generic fallbacks by nature
  const p1 = planet1.replace('northNode', 'destiny');
  const p2 = planet2.replace('northNode', 'destiny');

  const genericMap: Record<string, Record<string, string>> = {
    attraction: {
      harmonious: `Your ${p1} and their ${p2} flow together with ease.`,
      challenging: `Your ${p1} and their ${p2} create friction that pulls you closer.`,
      intense: `Your ${p1} merges with their ${p2}. The connection is undeniable.`,
    },
    soul: {
      harmonious: `A deep recognition between your ${p1} and their ${p2}.`,
      challenging: `Your ${p1} and their ${p2} illuminate uncomfortable truths.`,
      intense: `Your ${p1} and their ${p2} lock in. Fated.`,
    },
    commitment: {
      harmonious: `Structure and endurance between your ${p1} and their ${p2}.`,
      challenging: `Your ${p1} meets the weight of their ${p2}. Growth through pressure.`,
      intense: `Your ${p1} is bound to their ${p2}. Ancient obligations.`,
    },
    transformation: {
      harmonious: `Their ${p2} transforms your ${p1}. Evolution through connection.`,
      challenging: `Their ${p2} forces your ${p1} into uncomfortable depths.`,
      intense: `Their ${p2} reaches into your ${p1}. Nothing stays hidden.`,
    },
    destiny: {
      harmonious: `Your ${p1} aligns with their path. A sense of purpose together.`,
      challenging: `Your ${p1} disrupts their direction. Karmic recalibration.`,
      intense: `Your paths were meant to cross. The nodes confirm it.`,
    },
  };

  const theme = PAIR_THEMES[key] || 'attraction';
  return genericMap[theme]?.[nature]
    || `Your ${p1} connects to their ${p2} through ${aspectType}.`;
}

// ============================================
// CORE CALCULATION
// ============================================

/**
 * Get position for a planet from the natal chart
 */
function getPosition(chart: NatalChart, planet: Planet): PlanetPosition | undefined {
  return chart[planet] as PlanetPosition | undefined;
}

/**
 * Calculate angular distance between two longitudes (0-180)
 */
function angularDistance(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Determine aspect nature from type
 */
function getAspectNature(type: AspectType): 'harmonious' | 'challenging' | 'intense' {
  switch (type) {
    case 'trine':
    case 'sextile':
      return 'harmonious';
    case 'square':
    case 'opposition':
    case 'quincunx':
      return 'challenging';
    case 'conjunction':
      return 'intense';
  }
}

/**
 * Get weight for a planet pair (order-independent)
 */
function getPairWeight(p1: Planet, p2: Planet): number {
  return PAIR_WEIGHTS[`${p1}-${p2}`]
    || PAIR_WEIGHTS[`${p2}-${p1}`]
    || 3; // default weight for unlisted pairs
}

/**
 * Get theme for a planet pair
 */
function getPairTheme(p1: Planet, p2: Planet): SynastryTheme {
  return PAIR_THEMES[`${p1}-${p2}`]
    || PAIR_THEMES[`${p2}-${p1}`]
    || 'identity';
}

/**
 * Calculate all cross-chart aspects between two natal charts
 */
function calculateSynastryAspects(
  chart1: NatalChart,
  chart2: NatalChart,
  name1: string,
  name2: string,
): SynastryAspect[] {
  const aspects: SynastryAspect[] = [];

  for (const p1 of SYNASTRY_PLANETS) {
    const pos1 = getPosition(chart1, p1);
    if (!pos1) continue;

    for (const p2 of SYNASTRY_PLANETS) {
      const pos2 = getPosition(chart2, p2);
      if (!pos2) continue;

      const dist = angularDistance(pos1.longitude, pos2.longitude);

      for (const aspDef of SYNASTRY_ASPECTS) {
        const orb = Math.abs(dist - aspDef.angle);
        if (orb <= aspDef.orb) {
          const nature = getAspectNature(aspDef.type);
          const weight = getPairWeight(p1, p2);
          const theme = getPairTheme(p1, p2);

          // Tighter orb = stronger aspect (boost weight)
          const orbBonus = 1 + (1 - orb / aspDef.orb) * 0.5;
          const effectiveWeight = weight * orbBonus;

          aspects.push({
            planet1: p1,
            planet2: p2,
            person1Name: name1,
            person2Name: name2,
            type: aspDef.type,
            orb: Math.round(orb * 10) / 10,
            weight: Math.round(effectiveWeight * 10) / 10,
            nature,
            theme,
            description: getAspectDescription(p1, p2, aspDef.type, nature),
          });
          break; // only one aspect per pair
        }
      }
    }
  }

  // Sort by weight (most important first)
  return aspects.sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate element distribution for a chart
 */
function getElementDistribution(chart: NatalChart): Record<'fire' | 'earth' | 'air' | 'water', number> {
  const dist = { fire: 0, earth: 0, air: 0, water: 0 };
  const corePlanets: Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars'];

  // Core planets weighted more heavily
  for (const p of corePlanets) {
    const pos = getPosition(chart, p);
    if (pos) dist[SIGN_ELEMENTS[pos.sign]] += 2;
  }

  // Outer planets count less
  const outerPlanets: Planet[] = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  for (const p of outerPlanets) {
    const pos = getPosition(chart, p);
    if (pos) dist[SIGN_ELEMENTS[pos.sign]] += 1;
  }

  return dist;
}

/**
 * Calculate element harmony between two charts
 */
function calculateElementHarmony(
  chart1: NatalChart,
  chart2: NatalChart,
): { score: number; description: string } {
  const dist1 = getElementDistribution(chart1);
  const dist2 = getElementDistribution(chart2);

  // Find dominant element for each person
  const dominant1 = (Object.entries(dist1) as [string, number][])
    .sort(([, a], [, b]) => b - a)[0][0];
  const dominant2 = (Object.entries(dist2) as [string, number][])
    .sort(([, a], [, b]) => b - a)[0][0];

  const compatScore = ELEMENT_COMPAT[`${dominant1}-${dominant2}`] || 5;

  const descriptions: Record<string, string> = {
    'fire-fire': 'Two flames. You ignite each other — and risk burning out.',
    'fire-air': 'Air feeds fire. Your ideas meet their passion. Natural chemistry.',
    'fire-earth': 'Fire meets ground. Passion without patience, unless you learn.',
    'fire-water': 'Steam. Intensity that either warms or scalds.',
    'air-air': 'Two minds in conversation. Brilliance, but who holds the anchor?',
    'air-earth': 'Ideas meet reality. Frustrating or grounding, depending on the day.',
    'air-water': 'Thought meets feeling. Misunderstanding is possible. So is depth.',
    'earth-earth': 'Solid ground beneath you both. Reliable, but watch for stagnation.',
    'earth-water': 'The garden flourishes. Water nourishes earth. Quiet devotion.',
    'water-water': 'Two oceans meet. Emotional depth without bottom. Beautiful and overwhelming.',
  };

  const key = `${dominant1}-${dominant2}`;
  const description = descriptions[key] || descriptions[`${dominant2}-${dominant1}`]
    || 'Your elements create an unusual blend.';

  return { score: compatScore, description };
}

/**
 * Aggregate theme scores from aspects
 */
function aggregateThemes(aspects: SynastryAspect[]): SynastryThemeScore[] {
  const themeLabels: Record<SynastryTheme, string> = {
    attraction: 'Physical Attraction',
    soul: 'Soul Connection',
    communication: 'Communication',
    growth: 'Growth & Expansion',
    commitment: 'Staying Power',
    transformation: 'Transformation',
    chaos: 'Electric Instability',
    dreams: 'Fantasy & Idealism',
    destiny: 'Karmic Bond',
    passion: 'Raw Passion',
    emotional: 'Emotional Current',
    identity: 'Ego Dynamic',
  };

  const themeScores: Record<SynastryTheme, { total: number; count: number }> = {} as any;

  // Initialize all themes
  for (const theme of Object.keys(themeLabels) as SynastryTheme[]) {
    themeScores[theme] = { total: 0, count: 0 };
  }

  // Accumulate scores from aspects
  for (const aspect of aspects) {
    const entry = themeScores[aspect.theme];
    if (entry) {
      // Harmonious aspects contribute positively, challenging ones still contribute
      // (tension creates connection too)
      const contribution = aspect.nature === 'harmonious'
        ? aspect.weight
        : aspect.nature === 'intense'
          ? aspect.weight * 0.9
          : aspect.weight * 0.6;
      entry.total += contribution;
      entry.count += 1;
    }
  }

  // Convert to 0-10 scale
  return (Object.entries(themeLabels) as [SynastryTheme, string][]).map(([theme, label]) => {
    const entry = themeScores[theme];
    const rawScore = entry.count > 0 ? entry.total / entry.count : 0;
    // Normalize: weight range is ~3-15, so divide by 1.5 and cap at 10
    const score = Math.min(10, Math.round(rawScore / 1.5 * 10) / 10);
    return { theme, score, label };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Calculate overall synastry score (0-100)
 */
function calculateOverallScore(
  aspects: SynastryAspect[],
  elementHarmony: number,
): number {
  if (aspects.length === 0) return 30; // minimal data

  // Weighted sum of aspect contributions
  let harmoniousTotal = 0;
  let challengingTotal = 0;
  let intenseTotal = 0;
  let totalWeight = 0;

  for (const aspect of aspects) {
    totalWeight += aspect.weight;
    switch (aspect.nature) {
      case 'harmonious':
        harmoniousTotal += aspect.weight;
        break;
      case 'challenging':
        challengingTotal += aspect.weight;
        break;
      case 'intense':
        intenseTotal += aspect.weight;
        break;
    }
  }

  // Base score from aspect balance
  // Harmonious = full positive, intense = 80% positive, challenging = 40% positive
  // (challenging aspects create connection too — just harder)
  const positiveWeight = harmoniousTotal + intenseTotal * 0.8 + challengingTotal * 0.4;
  const aspectRatio = totalWeight > 0 ? positiveWeight / totalWeight : 0.5;

  // Score components
  const aspectScore = aspectRatio * 60;                    // 0-60 points
  const elementScore = (elementHarmony / 10) * 15;         // 0-15 points
  const volumeBonus = Math.min(15, aspects.length * 0.8);  // 0-15 points (more connections = more chemistry)
  const qualityBonus = aspects.slice(0, 5)                 // 0-10 points (top aspects quality)
    .reduce((sum, a) => sum + (a.weight > 7 ? 2 : a.weight > 5 ? 1 : 0), 0);

  const raw = aspectScore + elementScore + volumeBonus + qualityBonus;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Get compatibility tier from score
 */
function getTier(score: number): CompatibilityTier {
  if (score >= 85) return 'fated';
  if (score >= 70) return 'magnetic';
  if (score >= 55) return 'kindred';
  if (score >= 40) return 'complex';
  if (score >= 25) return 'friction';
  return 'distant';
}

/**
 * Generate oracle verdict (1-2 sentence summary)
 */
function generateOracleVerdict(
  tier: CompatibilityTier,
  themes: SynastryThemeScore[],
  _person1: string,
  _person2: string,
): string {
  const topTheme = themes[0]?.theme;

  const verdicts: Record<CompatibilityTier, string[]> = {
    fated: [
      'The stars rarely align like this. What stands between you is not chance — it is design.',
      'This bond was written before either of you drew breath. Deny it if you wish. It will wait.',
      'The cosmos does not repeat this pattern often. Pay attention.',
    ],
    magnetic: [
      'There is a current between you that neither logic nor distance can sever.',
      'The pull is real. Not imagined, not projected. The charts confirm what you already felt.',
      'You are not strangers. The stars have introduced you before.',
    ],
    kindred: [
      'A natural ease lives between you. Not every connection needs to be a storm.',
      'You understand each other without trying. That is rarer than you think.',
      'The space between you is warm. Comfortable. Worth protecting.',
    ],
    complex: [
      'This is not easy. But easy connections rarely transform anyone.',
      'Push and pull. Growth and friction. The stars ask: is the work worth the reward?',
      'You will challenge each other. That is either the problem or the point.',
    ],
    friction: [
      'The stars see tension where you seek harmony. Proceed, but with open eyes.',
      'This path demands more than it gives — at least for now. Timing matters.',
      'Not every connection is meant to be comfortable. Some are meant to teach.',
    ],
    distant: [
      'The stars see little resonance between these charts. That does not mean nothing — it means effort.',
      'Your orbits rarely cross in the cosmos. Connection here is made, not found.',
    ],
  };

  const options = verdicts[tier];
  // Deterministic selection based on theme
  const index = topTheme ? topTheme.length % options.length : 0;
  return options[index];
}

/**
 * Generate strengths and challenges in oracle voice
 */
function generateInsights(
  aspects: SynastryAspect[],
  themes: SynastryThemeScore[],
): { strengths: string[]; challenges: string[] } {
  const strengths: string[] = [];
  const challenges: string[] = [];

  // From top themes
  const topThemes = themes.filter(t => t.score >= 5);
  const weakThemes = themes.filter(t => t.score > 0 && t.score < 3);

  for (const t of topThemes.slice(0, 3)) {
    switch (t.theme) {
      case 'attraction':
        strengths.push('Physical chemistry is strong. The body knows.');
        break;
      case 'soul':
        strengths.push('A soul-level recognition that bypasses logic.');
        break;
      case 'communication':
        strengths.push('Words flow between you. Understanding comes without effort.');
        break;
      case 'growth':
        strengths.push('You expand each other\'s world. Together, everything feels possible.');
        break;
      case 'commitment':
        strengths.push('Built to last. This bond has structural integrity.');
        break;
      case 'emotional':
        strengths.push('Emotional attunement runs deep. You feel each other.');
        break;
      case 'destiny':
        strengths.push('Karmic threads connect you. This meeting was not accidental.');
        break;
      case 'transformation':
        strengths.push('You will not leave this connection unchanged.');
        break;
      case 'passion':
        strengths.push('Fire meets fire. The energy between you is relentless.');
        break;
      case 'dreams':
        strengths.push('A shared dream world. Beauty and imagination flow between you.');
        break;
      default:
        break;
    }
  }

  for (const t of weakThemes.slice(0, 2)) {
    switch (t.theme) {
      case 'communication':
        challenges.push('Words may fail where feeling should carry. Learn each other\'s language.');
        break;
      case 'commitment':
        challenges.push('Staying power is not guaranteed. This bond needs conscious tending.');
        break;
      case 'emotional':
        challenges.push('Emotional rhythms differ. Patience with each other\'s inner weather.');
        break;
      case 'attraction':
        challenges.push('The physical spark requires kindling. It won\'t light itself.');
        break;
      default:
        break;
    }
  }

  // From challenging aspects
  const hardAspects = aspects.filter(a => a.nature === 'challenging' && a.weight > 5);
  for (const a of hardAspects.slice(0, 2)) {
    if (!challenges.some(c => c.includes(a.theme))) {
      switch (a.theme) {
        case 'transformation':
          challenges.push('Power dynamics lurk beneath the surface. Name them before they name you.');
          break;
        case 'chaos':
          challenges.push('Unpredictability keeps things electric — and exhausting.');
          break;
        case 'identity':
          challenges.push('Two strong egos in the same space. Make room or make war.');
          break;
        case 'commitment':
          challenges.push('Freedom and structure compete. Finding the balance is the work.');
          break;
        default:
          break;
      }
    }
  }

  // Ensure at least one of each
  if (strengths.length === 0) {
    strengths.push('Every connection carries a lesson. This one is no different.');
  }
  if (challenges.length === 0) {
    challenges.push('Few challenges appear. Guard against complacency — ease is its own test.');
  }

  return { strengths, challenges };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Calculate full synastry report between two profiles
 */
export function calculateSynastry(
  profile1: UserProfile,
  profile2: UserProfile,
): SynastryReport {
  const chart1 = profile1.natalChart;
  const chart2 = profile2.natalChart;
  const name1 = profile1.birthData.name;
  const name2 = profile2.birthData.name;

  // Calculate cross-chart aspects
  const aspects = calculateSynastryAspects(chart1, chart2, name1, name2);

  // Key aspects = top 5 by weight
  const keyAspects = aspects.slice(0, 5);

  // Themes
  const themes = aggregateThemes(aspects);

  // Element harmony
  const elementHarmony = calculateElementHarmony(chart1, chart2);

  // Overall score
  const score = calculateOverallScore(aspects, elementHarmony.score);
  const tier = getTier(score);

  // Oracle verdict
  const oracleVerdict = generateOracleVerdict(tier, themes, name1, name2);

  // Strengths & challenges
  const { strengths, challenges } = generateInsights(aspects, themes);

  // Person info
  const person1 = {
    name: name1,
    sunSign: chart1.sun.sign,
    moonSign: chart1.moon.sign,
  };
  const person2 = {
    name: name2,
    sunSign: chart2.sun.sign,
    moonSign: chart2.moon.sign,
  };

  return {
    person1,
    person2,
    score,
    tier,
    aspects,
    keyAspects,
    themes,
    elementHarmony,
    strengths,
    challenges,
    oracleVerdict,
  };
}

/**
 * Get the oracle-voice tier label
 */
export function getTierLabel(tier: CompatibilityTier): string {
  const labels: Record<CompatibilityTier, string> = {
    fated: 'Fated',
    magnetic: 'Magnetic',
    kindred: 'Kindred',
    complex: 'Complex',
    friction: 'Friction',
    distant: 'Distant',
  };
  return labels[tier];
}

/**
 * Get a color for the compatibility tier
 */
export function getTierColor(tier: CompatibilityTier): string {
  const colors: Record<CompatibilityTier, string> = {
    fated: '#C9A84C',      // gold — the highest honor
    magnetic: '#B89D45',   // warm gold
    kindred: '#8B8B6A',    // sage
    complex: '#7A7A7A',    // neutral grey
    friction: '#8B5A5A',   // muted red
    distant: '#5A5A5A',    // dim
  };
  return colors[tier];
}
