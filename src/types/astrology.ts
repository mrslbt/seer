// Zodiac signs
export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

// Planets
export type Planet =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

// Aspect types (added quincunx and semi-sextile for more nuance)
export type AspectType =
  | 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  | 'quincunx' | 'semi-sextile';

// Sensitive points
export type SensitivePoint = 'NorthNode' | 'SouthNode' | 'PartOfFortune' | 'Vertex';

// Planetary dignity types
export type DignityType = 'rulership' | 'exaltation' | 'detriment' | 'fall' | 'neutral';

// Planetary patterns
export type PlanetaryPattern = 'Grand Trine' | 'T-Square' | 'Stellium' | 'Yod' | 'Grand Cross';

// Day ruler (planetary day)
export type DayRuler = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

// Moon phases
export type MoonPhase =
  | 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous'
  | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent';

// House (1-12)
export type House = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Planetary placement
export interface PlanetaryPlacement {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;
  minute: number;
  house: House;
  isRetrograde: boolean;
}

// Aspect between two planets
export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number; // degrees of separation from exact
  applying: boolean; // getting tighter or separating
}

// Transit aspect (transit planet to natal planet)
export interface TransitAspect {
  transitPlanet: Planet;
  natalPlanet: Planet;
  type: AspectType;
  orb: number;
  applying: boolean;
}

// Birth data input
export interface BirthData {
  date: Date;
  time: string; // HH:mm format
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Natal chart
export interface NatalChart {
  birthData: BirthData;
  placements: PlanetaryPlacement[];
  ascendant: { sign: ZodiacSign; degree: number };
  midheaven: { sign: ZodiacSign; degree: number };
  // New fields
  lunarNodes?: {
    northNode: SensitivePointPlacement;
    southNode: SensitivePointPlacement;
  };
  partOfFortune?: SensitivePointPlacement;
  dignities?: PlanetaryDignity[];
  patterns?: PatternInfo[];
}

// Daily ephemeris
export interface DailyEphemeris {
  date: Date;
  placements: PlanetaryPlacement[];
  moonPhase: MoonPhase;
  moonPhasePercent: number; // 0-100 illumination
  retrogrades: Planet[];
  // New fields
  lunarNodes?: {
    northNode: SensitivePointPlacement;
    southNode: SensitivePointPlacement;
  };
  dayRuler?: DayRuler;
  planetaryHour?: Planet;
}

// Vibe tags for interpretation
export type VibeTag =
  | 'romance' | 'caution' | 'clarity' | 'conflict'
  | 'momentum' | 'transformation' | 'stability' | 'communication'
  | 'expansion' | 'restriction' | 'intuition' | 'action'
  | 'karmic' | 'fortunate' | 'fated' | 'adjustment' | 'powerful' | 'harmonious';

// Sensitive point placement
export interface SensitivePointPlacement {
  point: SensitivePoint;
  sign: ZodiacSign;
  degree: number;
  minute: number;
}

// Planetary dignity info
export interface PlanetaryDignity {
  planet: Planet;
  dignity: DignityType;
  strength: number; // -2 to +2 multiplier
}

// Pattern detection result
export interface PatternInfo {
  pattern: PlanetaryPattern;
  planets: Planet[];
  description: string;
  influence: 'positive' | 'challenging' | 'mixed';
}

// Complete astro context for a reading
export interface AstroContext {
  natal: NatalChart;
  ephemeris: DailyEphemeris;
  transits: TransitAspect[];
  vibeTags: VibeTag[];
}

// Question categories
export type QuestionCategory =
  | 'love' | 'career' | 'money' | 'communication' | 'conflict' | 'timing' | 'health'
  | 'social' | 'decisions' | 'creativity' | 'spiritual';

// Verdict enum
export type Verdict =
  | 'HARD_YES' | 'SOFT_YES' | 'NEUTRAL' | 'SOFT_NO' | 'HARD_NO' | 'UNCLEAR';

// Overall cosmic energy direction
export type CosmicEnergy = 'push' | 'pull' | 'chaotic' | 'balanced';

// Daily cosmic report - computed once per day
export interface DailyCosmicReport {
  date: Date;

  // Overall energy of the day
  overallEnergy: CosmicEnergy;
  energyDescription: string;

  // Category modifiers (pre-computed from transits)
  categoryModifiers: Record<QuestionCategory, number>;

  // Which categories are favored/challenged today
  favoredCategories: QuestionCategory[];
  challengedCategories: QuestionCategory[];

  // Key cosmic events for the day
  headlines: string[];

  // Warnings (retrogrades, difficult aspects)
  warnings: string[];

  // Moon info
  moonPhase: MoonPhase;
  moonSign: ZodiacSign;

  // Day ruler
  dayRuler: DayRuler;

  // Is it a good day for action or rest?
  actionAdvice: 'go' | 'slow' | 'wait';
}

// Scoring result
export interface ScoringResult {
  verdict: Verdict;
  score: number; // -100 to +100
  factors: ScoringFactor[];
  category: QuestionCategory;
}

// Individual scoring factor
export interface ScoringFactor {
  description: string;
  points: number;
  source: string; // which transit/aspect caused this
}

// Final reading output
export interface Reading {
  verdict: Verdict;
  reasons: string[];
  reasonDetails?: (string | undefined)[]; // Detailed explanations for each reason
  advice: string;
  astroContext: AstroContext;
  scoring: ScoringResult;
}
