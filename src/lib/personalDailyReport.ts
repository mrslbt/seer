/**
 * Personal Daily Report Generator
 *
 * This is the core of the personalized cosmic 8-ball.
 * It generates a daily report based on YOUR natal chart and current transits.
 * Questions are then scored against this report.
 */

import { QuestionCategory } from '../types/astrology';
import {
  Transit,
  Planet,
  AspectType,
  UserProfile
} from '../types/userProfile';
import {
  calculateCurrentPositions,
  calculateTransits,
  getMoonPhase,
  getDayRuler,
  isRetrograde
} from './ephemerisService';

export interface CategoryScore {
  score: number; // 1-10
  reasoning: string[];
  advice: string;
  goodFor: string[];
  badFor: string[];
}

export interface PersonalDailyReport {
  date: Date;
  userId: string;

  // Overall energy
  overallScore: number; // 1-10
  overallEnergy: 'excellent' | 'good' | 'mixed' | 'challenging' | 'difficult';
  headline: string;

  // Category-specific scores
  categories: {
    love: CategoryScore;
    career: CategoryScore;
    money: CategoryScore;
    health: CategoryScore;
    social: CategoryScore;
    decisions: CategoryScore;
    creativity: CategoryScore;
    spiritual: CategoryScore;
  };

  // Key transits affecting you today
  keyTransits: {
    transit: Transit;
    interpretation: string;
    affectedCategories: QuestionCategory[];
    impact: 'positive' | 'negative' | 'neutral';
  }[];

  // General guidance
  moonPhase: {
    name: string;
    advice: string;
  };

  // Planetary retrogrades affecting you
  retrogrades: {
    planet: Planet;
    inNatalHouse?: string;
    advice: string;
  }[];

  // Cached timestamp
  generatedAt: Date;
}

/**
 * Planet influences on different categories
 */
const PLANET_CATEGORY_INFLUENCE: Record<Planet, QuestionCategory[]> = {
  sun: ['career', 'decisions', 'health'],
  moon: ['love', 'health', 'spiritual'],
  mercury: ['career', 'decisions', 'social'],
  venus: ['love', 'money', 'creativity', 'social'],
  mars: ['career', 'health', 'decisions'],
  jupiter: ['money', 'career', 'spiritual'],
  saturn: ['career', 'money', 'health'],
  uranus: ['decisions', 'creativity', 'social'],
  neptune: ['spiritual', 'creativity', 'love'],
  pluto: ['decisions', 'spiritual', 'career'],
  ascendant: ['social', 'health'],
  midheaven: ['career'],
  northNode: ['spiritual', 'career'],
  chiron: ['health', 'spiritual']
};

/**
 * Aspect type impacts
 */
const ASPECT_IMPACTS: Record<AspectType, { score: number; nature: 'positive' | 'negative' | 'neutral' }> = {
  conjunction: { score: 0, nature: 'neutral' }, // Can be positive or negative depending on planets
  trine: { score: 2, nature: 'positive' },
  sextile: { score: 1, nature: 'positive' },
  square: { score: -2, nature: 'negative' },       // Grinding friction — hardest aspect
  opposition: { score: -1.5, nature: 'negative' },  // Clear polarity — tense but resolvable
  quincunx: { score: -1, nature: 'negative' }
};

/**
 * Benefic vs Malefic planets
 */
const BENEFIC_PLANETS: Planet[] = ['venus', 'jupiter', 'sun'];
const MALEFIC_PLANETS: Planet[] = ['mars', 'saturn', 'pluto'];

/**
 * Get conjunction impact based on planets involved
 */
function getConjunctionImpact(planet1: Planet, planet2: Planet): number {
  const isBenefic1 = BENEFIC_PLANETS.includes(planet1);
  const isBenefic2 = BENEFIC_PLANETS.includes(planet2);
  const isMalefic1 = MALEFIC_PLANETS.includes(planet1);
  const isMalefic2 = MALEFIC_PLANETS.includes(planet2);

  if (isBenefic1 && isBenefic2) return 2;
  if (isMalefic1 && isMalefic2) return -2;
  if ((isBenefic1 && isMalefic2) || (isMalefic1 && isBenefic2)) return -1;
  return 0;
}

/**
 * Interpret a transit for the report
 */
function interpretTransit(transit: Transit): string {
  const planetNames: Record<Planet, string> = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
    mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus',
    neptune: 'Neptune', pluto: 'Pluto', ascendant: 'Ascendant',
    midheaven: 'Midheaven', northNode: 'North Node', chiron: 'Chiron'
  };

  const aspectVerbs: Record<AspectType, string> = {
    conjunction: 'merges with',
    opposition: 'opposes',
    trine: 'harmonizes with',
    square: 'challenges',
    sextile: 'supports',
    quincunx: 'creates tension with'
  };

  const tp = planetNames[transit.transitPlanet];
  const np = planetNames[transit.natalPlanet];
  const verb = aspectVerbs[transit.aspectType];

  return `Transit ${tp} ${verb} your natal ${np}`;
}

/**
 * Zodiac sign element and modality
 */
type ZodiacSign = 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo' |
                  'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water'
};

/**
 * Natal placement modifiers for categories
 * These adjust the BASE score based on where your planets naturally sit
 *
 * For example: Venus in Pisces = naturally dreamy/idealistic about money
 * This means you need HIGHER transit support to take financial risks
 */
interface NatalModifier {
  planet: Planet;
  sign: ZodiacSign;
  categoryModifiers: Partial<Record<QuestionCategory, number>>;
  warnings: Partial<Record<QuestionCategory, string>>;
}

function getNatalModifiers(natalChart: UserProfile['natalChart']): NatalModifier[] {
  const modifiers: NatalModifier[] = [];

  // NatalChart has individual planet properties, not a 'planets' object
  const planetEntries: [string, { sign: ZodiacSign }][] = [
    ['sun', natalChart.sun],
    ['moon', natalChart.moon],
    ['mercury', natalChart.mercury],
    ['venus', natalChart.venus],
    ['mars', natalChart.mars],
    ['jupiter', natalChart.jupiter],
    ['saturn', natalChart.saturn],
    ['uranus', natalChart.uranus],
    ['neptune', natalChart.neptune],
    ['pluto', natalChart.pluto]
  ];

  for (const [planet, data] of planetEntries) {
    if (!data) continue;
    const sign = data.sign as ZodiacSign;
    const element = SIGN_ELEMENTS[sign];

    // ---- Sun placement ----
    if (planet === 'sun') {
      if (sign === 'Leo') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { creativity: 1, social: 1 },
          warnings: {}
        });
      } else if (sign === 'Capricorn') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { career: 1, creativity: -1 },
          warnings: { creativity: 'Your Capricorn Sun favors structure over spontaneity' }
        });
      }
    }

    // ---- Moon placement ----
    if (planet === 'moon') {
      if (sign === 'Cancer') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { love: 1, health: 1 },
          warnings: {}
        });
      } else if (sign === 'Aquarius') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { love: -1, social: 1, spiritual: 1 },
          warnings: { love: 'Your Aquarius Moon may overthink emotional matters' }
        });
      } else if (sign === 'Capricorn') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { love: -1, career: 1 },
          warnings: { love: 'Your Capricorn Moon can hold back emotional expression' }
        });
      } else if (sign === 'Scorpio') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { spiritual: 1, social: -1 },
          warnings: { social: 'Your Scorpio Moon prefers depth over breadth in connections' }
        });
      }
    }

    // ---- Mercury placement ----
    if (planet === 'mercury') {
      if (sign === 'Gemini' || sign === 'Virgo') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { decisions: 1 },
          warnings: {}
        });
      } else if (sign === 'Pisces') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { decisions: -1 },
          warnings: { decisions: 'Your Pisces Mercury thinks in dreams, not data' }
        });
      } else if (sign === 'Sagittarius') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { social: -1 },
          warnings: { social: 'Your Sagittarius Mercury can be blunt in communication' }
        });
      }
    }

    // ---- Venus placement ----
    if (planet === 'venus') {
      if (sign === 'Pisces') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { money: -2, love: 1 },
          warnings: { money: 'Your Venus in Pisces makes you idealistic about money - be extra cautious with financial risks' }
        });
      } else if (sign === 'Taurus' || sign === 'Capricorn') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { money: 1 },
          warnings: {}
        });
      } else if (sign === 'Libra') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { social: 1, love: 1 },
          warnings: {}
        });
      } else if (sign === 'Scorpio') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { social: -1, spiritual: 1 },
          warnings: { social: 'Your Scorpio Venus craves intensity over casual connection' }
        });
      } else if (sign === 'Aries') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { love: -1 },
          warnings: { love: 'Your Aries Venus can be impatient in romance' }
        });
      }
    }

    // ---- Mars placement ----
    if (planet === 'mars') {
      if (sign === 'Aries' || sign === 'Scorpio') {
        // Mars in domicile
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { career: 1, decisions: 1, health: 1 },
          warnings: {}
        });
      } else if (sign === 'Libra') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { decisions: -1 },
          warnings: { decisions: 'Your Libra Mars hesitates under pressure' }
        });
      } else if (element === 'water') {
        // Water Mars (Cancer, Pisces) = passive, intuitive action
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { money: -1, decisions: -1 },
          warnings: {
            money: 'Your Mars in water sign prefers flowing with circumstances over forcing outcomes',
            decisions: 'Trust your gut but verify with logic'
          }
        });
      } else if (element === 'fire') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { decisions: 1, health: 1 },
          warnings: {}
        });
      }
    }

    // ---- Jupiter placement ----
    if (planet === 'jupiter') {
      if (sign === 'Sagittarius' || sign === 'Pisces') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { money: 1, spiritual: 1 },
          warnings: {}
        });
      } else if (sign === 'Capricorn') {
        modifiers.push({
          planet: planet as Planet, sign,
          categoryModifiers: { spiritual: -1 },
          warnings: { spiritual: 'Your Capricorn Jupiter favors material over mystical' }
        });
      }
    }

    // ---- Saturn placement ----
    if (planet === 'saturn') {
      modifiers.push({
        planet: planet as Planet, sign,
        categoryModifiers: {
          [element === 'earth' ? 'career' : 'decisions']: -1
        },
        warnings: {}
      });
    }
  }

  return modifiers;
}

/**
 * Generate category score based on relevant transits AND natal placements
 */
function generateCategoryScore(
  category: QuestionCategory,
  transits: Transit[],
  moonPhase: { phase: number; phaseName: string },
  natalModifiers?: NatalModifier[]
): CategoryScore {
  let score = 5; // Start neutral
  const reasoning: string[] = [];
  const goodFor: string[] = [];
  const badFor: string[] = [];

  // FIRST: Apply natal modifiers (your permanent tendencies)
  if (natalModifiers) {
    for (const mod of natalModifiers) {
      const categoryMod = mod.categoryModifiers[category];
      if (categoryMod !== undefined) {
        score += categoryMod;
        if (mod.warnings[category]) {
          reasoning.push(mod.warnings[category]!);
        }
        if (categoryMod < 0) {
          badFor.push('risky moves', 'impulsive decisions');
        }
      }
    }
  }

  // Find transits affecting this category
  for (const transit of transits) {
    const transitInfluences = PLANET_CATEGORY_INFLUENCE[transit.transitPlanet] || [];
    const natalInfluences = PLANET_CATEGORY_INFLUENCE[transit.natalPlanet] || [];

    if (transitInfluences.includes(category) || natalInfluences.includes(category)) {
      let impact: number;

      if (transit.aspectType === 'conjunction') {
        impact = getConjunctionImpact(transit.transitPlanet, transit.natalPlanet);
      } else {
        impact = ASPECT_IMPACTS[transit.aspectType].score;
      }

      // Tighter orbs have stronger effects
      const orbMultiplier = transit.isExact ? 1.5 : (1 - transit.orb / 8);
      score += impact * orbMultiplier;

      const interpretation = interpretTransit(transit);
      reasoning.push(`${interpretation} (orb: ${transit.orb.toFixed(1)}°)`);
    }
  }

  // Moon phase influence — affects more than just decisions/creativity
  if (moonPhase.phaseName === 'New Moon') {
    if (category === 'decisions' || category === 'creativity') {
      score += 1;
      reasoning.push('New Moon favors new beginnings');
      goodFor.push('starting projects');
    }
    if (category === 'spiritual') {
      score += 0.5;
      reasoning.push('New Moon deepens introspection');
    }
  } else if (moonPhase.phaseName === 'Full Moon') {
    if (category === 'decisions' || category === 'creativity') {
      score += 0.5;
      reasoning.push('Full Moon brings clarity but high emotions');
      goodFor.push('completion', 'celebration');
      badFor.push('starting new things');
    }
    if (category === 'love') {
      score += 0.5;
      reasoning.push('Full Moon heightens emotional connections');
    }
    if (category === 'social') {
      score += 0.5;
      reasoning.push('Full Moon increases visibility and social energy');
    }
    if (category === 'health') {
      score -= 0.5;
      reasoning.push('Full Moon can bring restlessness and poor sleep');
      badFor.push('rest', 'recovery');
    }
  } else if (moonPhase.phaseName.includes('Waning')) {
    if (category === 'decisions') {
      score -= 0.5;
      reasoning.push('Waning moon is not the time to initiate');
      badFor.push('starting new ventures');
    }
  } else if (moonPhase.phaseName.includes('Waxing')) {
    if (category === 'career') {
      score += 0.5;
      reasoning.push('Waxing moon builds career momentum');
      goodFor.push('pushing forward');
    }
  }

  // Clamp score to 1-10
  score = Math.max(1, Math.min(10, Math.round(score)));

  // Generate advice based on score
  let advice: string;
  if (score >= 8) {
    advice = 'Excellent energy! Go for it.';
    goodFor.push('taking action', 'making moves');
  } else if (score >= 6) {
    advice = 'Good energy. Proceed with awareness.';
    goodFor.push('steady progress');
  } else if (score >= 4) {
    advice = 'Mixed energy. Be cautious.';
    badFor.push('major decisions', 'rushing');
  } else {
    advice = 'Challenging energy. Wait if possible.';
    badFor.push('big moves', 'confrontation');
    goodFor.push('reflection', 'planning');
  }

  // Deduplicate lists
  return {
    score,
    reasoning: [...new Set(reasoning)],
    advice,
    goodFor: [...new Set(goodFor)],
    badFor: [...new Set(badFor)],
  };
}

/**
 * Generate the complete personal daily report
 */
export function generatePersonalDailyReport(
  userProfile: UserProfile,
  date: Date = new Date()
): PersonalDailyReport {
  // Get current positions
  const currentPositions = calculateCurrentPositions(date);

  // Calculate transits to user's natal chart
  const transits = calculateTransits(userProfile.natalChart, currentPositions);

  // Get natal modifiers based on user's permanent chart placements
  const natalModifiers = getNatalModifiers(userProfile.natalChart);

  // Get moon phase
  const moonPhase = getMoonPhase(date);

  // Get day ruler (used for future headline generation)
  getDayRuler(date); // Called for side effects/validation

  // Calculate category scores - NOW INCLUDES NATAL MODIFIERS!
  const categories = {
    love: generateCategoryScore('love', transits, moonPhase, natalModifiers),
    career: generateCategoryScore('career', transits, moonPhase, natalModifiers),
    money: generateCategoryScore('money', transits, moonPhase, natalModifiers),
    health: generateCategoryScore('health', transits, moonPhase, natalModifiers),
    social: generateCategoryScore('social', transits, moonPhase, natalModifiers),
    decisions: generateCategoryScore('decisions', transits, moonPhase, natalModifiers),
    creativity: generateCategoryScore('creativity', transits, moonPhase, natalModifiers),
    spiritual: generateCategoryScore('spiritual', transits, moonPhase, natalModifiers)
  };

  // Calculate overall score (weighted average)
  const categoryScores = Object.values(categories).map(c => c.score);
  const overallScore = Math.round(
    categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
  );

  // Determine overall energy
  let overallEnergy: PersonalDailyReport['overallEnergy'];
  if (overallScore >= 8) overallEnergy = 'excellent';
  else if (overallScore >= 6) overallEnergy = 'good';
  else if (overallScore >= 4) overallEnergy = 'mixed';
  else if (overallScore >= 2) overallEnergy = 'challenging';
  else overallEnergy = 'difficult';

  // Generate headline based on strongest transit
  const strongestTransit = transits[0];
  let headline = 'The cosmos are in motion.';
  if (strongestTransit && strongestTransit.isExact) {
    headline = `Major energy: ${interpretTransit(strongestTransit)}`;
  }

  // Key transits (top 5 by orb)
  const keyTransits = transits.slice(0, 5).map(transit => {
    const affectedCategories = [
      ...PLANET_CATEGORY_INFLUENCE[transit.transitPlanet] || [],
      ...PLANET_CATEGORY_INFLUENCE[transit.natalPlanet] || []
    ].filter((v, i, a) => a.indexOf(v) === i) as QuestionCategory[];

    let impact: 'positive' | 'negative' | 'neutral';
    if (transit.aspectType === 'conjunction') {
      const conj = getConjunctionImpact(transit.transitPlanet, transit.natalPlanet);
      impact = conj > 0 ? 'positive' : conj < 0 ? 'negative' : 'neutral';
    } else {
      impact = ASPECT_IMPACTS[transit.aspectType].nature;
    }

    return {
      transit,
      interpretation: interpretTransit(transit),
      affectedCategories,
      impact
    };
  });

  // Check for retrogrades
  const retrogradePlanets: Planet[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const retrogrades = retrogradePlanets
    .filter(planet => isRetrograde(planet, date))
    .map(planet => ({
      planet,
      advice: getRetrogradeAdvice(planet)
    }));

  return {
    date,
    userId: userProfile.id,
    overallScore,
    overallEnergy,
    headline,
    categories,
    keyTransits,
    moonPhase: {
      name: moonPhase.phaseName,
      advice: getMoonPhaseAdvice(moonPhase.phaseName)
    },
    retrogrades,
    generatedAt: new Date()
  };
}

/**
 * Get advice for a retrograde planet
 */
function getRetrogradeAdvice(planet: Planet): string {
  const advice: Record<Planet, string> = {
    mercury: 'Review communications, avoid signing contracts',
    venus: 'Reflect on relationships and values',
    mars: 'Channel energy inward, avoid conflicts',
    jupiter: 'Internal growth over external expansion',
    saturn: 'Reassess structures and responsibilities',
    uranus: 'Inner revolution before outer change',
    neptune: 'Deep spiritual reflection',
    pluto: 'Internal transformation in progress',
    sun: '', moon: '', ascendant: '', midheaven: '', northNode: '', chiron: ''
  };
  return advice[planet] || 'Reflect and review';
}

/**
 * Get advice for moon phase
 */
function getMoonPhaseAdvice(phaseName: string): string {
  const advice: Record<string, string> = {
    'New Moon': 'Set intentions, plant seeds, begin fresh',
    'Waxing Crescent': 'Take first steps, build momentum',
    'First Quarter': 'Take action, overcome obstacles',
    'Waxing Gibbous': 'Refine and adjust your approach',
    'Full Moon': 'Harvest results, celebrate, release',
    'Waning Gibbous': 'Share wisdom, express gratitude',
    'Last Quarter': 'Release what no longer serves',
    'Waning Crescent': 'Rest, reflect, prepare for renewal'
  };
  return advice[phaseName] || 'Flow with the lunar cycle';
}

/**
 * Get the score for a specific category from the daily report
 * This is what the 8-ball will use to answer questions
 */
export function getCategoryScoreFromReport(
  report: PersonalDailyReport,
  category: QuestionCategory
): CategoryScore {
  const categoryMap: Record<QuestionCategory, keyof PersonalDailyReport['categories']> = {
    love: 'love',
    career: 'career',
    money: 'money',
    health: 'health',
    social: 'social',
    decisions: 'decisions',
    creativity: 'creativity',
    spiritual: 'spiritual',
    communication: 'social',
    conflict: 'decisions',
    timing: 'decisions'
  };

  return report.categories[categoryMap[category]] || report.categories.decisions;
}
