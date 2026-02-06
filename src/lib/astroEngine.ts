/**
 * Astrology Engine - Deterministic planetary calculations
 *
 * This module provides astronomical calculations for natal charts and daily ephemeris.
 * All calculations are deterministic based on established astronomical formulas.
 *
 * Enhanced with:
 * - Lunar Nodes (North/South)
 * - Part of Fortune
 * - Planetary Dignities
 * - Additional Aspects (quincunx, semi-sextile)
 * - Planetary Patterns (Grand Trine, T-Square, Stellium)
 * - Day Ruler & Planetary Hours
 */

import type {
  ZodiacSign,
  Planet,
  MoonPhase,
  House,
  PlanetaryPlacement,
  Aspect,
  AspectType,
  TransitAspect,
  BirthData,
  NatalChart,
  DailyEphemeris,
  AstroContext,
  VibeTag,
  PlanetaryDignity,
  DignityType,
  PatternInfo,
  DayRuler,
} from '../types/astrology';

// Zodiac signs in order (0° Aries = 0)
const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Planet symbols for display
export const PLANET_SYMBOLS: Record<Planet, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇'
};

// Zodiac symbols
export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
};

// Aspect orbs (maximum degrees from exact) - expanded with new aspects
const ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  sextile: 4,
  square: 7,
  trine: 7,
  opposition: 8,
  quincunx: 3,      // 150° - minor aspect, tighter orb
  'semi-sextile': 2  // 30° - minor aspect, very tight orb
};

// Aspect angles - expanded
const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  quincunx: 150,
  'semi-sextile': 30
};

// ============================================
// PLANETARY DIGNITIES SYSTEM
// ============================================

// Planetary rulerships (traditional + modern)
const RULERSHIPS: Record<Planet, ZodiacSign[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mercury: ['Gemini', 'Virgo'],
  Venus: ['Taurus', 'Libra'],
  Mars: ['Aries', 'Scorpio'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Saturn: ['Capricorn', 'Aquarius'],
  Uranus: ['Aquarius'],
  Neptune: ['Pisces'],
  Pluto: ['Scorpio']
};

// Exaltations (planet at its best)
const EXALTATIONS: Record<Planet, ZodiacSign> = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mercury: 'Virgo',
  Venus: 'Pisces',
  Mars: 'Capricorn',
  Jupiter: 'Cancer',
  Saturn: 'Libra',
  Uranus: 'Scorpio',
  Neptune: 'Leo',
  Pluto: 'Aries'
};

// Detriments (opposite of rulership)
const DETRIMENTS: Record<Planet, ZodiacSign[]> = {
  Sun: ['Aquarius'],
  Moon: ['Capricorn'],
  Mercury: ['Sagittarius', 'Pisces'],
  Venus: ['Scorpio', 'Aries'],
  Mars: ['Libra', 'Taurus'],
  Jupiter: ['Gemini', 'Virgo'],
  Saturn: ['Cancer', 'Leo'],
  Uranus: ['Leo'],
  Neptune: ['Virgo'],
  Pluto: ['Taurus']
};

// Falls (opposite of exaltation)
const FALLS: Record<Planet, ZodiacSign> = {
  Sun: 'Libra',
  Moon: 'Scorpio',
  Mercury: 'Pisces',
  Venus: 'Virgo',
  Mars: 'Cancer',
  Jupiter: 'Capricorn',
  Saturn: 'Aries',
  Uranus: 'Taurus',
  Neptune: 'Aquarius',
  Pluto: 'Libra'
};

// Day rulers (Chaldean order)
const DAY_RULERS: DayRuler[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

// Planetary hour sequence
const PLANETARY_HOUR_ORDER: Planet[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

// ============================================
// CALCULATION FUNCTIONS
// ============================================

// Julian Day calculation
function toJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) +
         Math.floor(30.6001 * (m + 1)) +
         day + hour / 24 + B - 1524.5;
}

// Convert degrees to sign + degree within sign
function degreesToSign(degrees: number): { sign: ZodiacSign; degree: number; minute: number } {
  const normalized = ((degrees % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;
  const wholeDegree = Math.floor(degreeInSign);
  const minute = Math.round((degreeInSign - wholeDegree) * 60);

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: wholeDegree,
    minute: minute
  };
}

// Simplified planetary longitude calculation using VSOP87-like approximations
function calculatePlanetLongitude(planet: Planet, jd: number): number {
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  switch (planet) {
    case 'Sun': {
      const L0 = 280.4664567 + 360007.6982779 * T + 0.03032028 * T * T;
      const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
      const Mrad = M * Math.PI / 180;
      const C = (1.9146 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
              + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
              + 0.00029 * Math.sin(3 * Mrad);
      return (L0 + C) % 360;
    }

    case 'Moon': {
      const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
      const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
      const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
      const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
      const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;

      const Drad = D * Math.PI / 180;
      const Mrad = M * Math.PI / 180;
      const Mprad = Mp * Math.PI / 180;
      const Frad = F * Math.PI / 180;

      let longitude = Lp
        + 6.289 * Math.sin(Mprad)
        + 1.274 * Math.sin(2 * Drad - Mprad)
        + 0.658 * Math.sin(2 * Drad)
        + 0.214 * Math.sin(2 * Mprad)
        - 0.186 * Math.sin(Mrad)
        - 0.114 * Math.sin(2 * Frad);

      return ((longitude % 360) + 360) % 360;
    }

    case 'Mercury': {
      const L = 252.2509 + 149472.6746 * T;
      const e = 0.2056;
      const M = (174.7948 + 149472.5153 * T) * Math.PI / 180;
      const v = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      return ((L + (v - M) * 180 / Math.PI) % 360 + 360) % 360;
    }

    case 'Venus': {
      const L = 181.9798 + 58517.8157 * T;
      const M = (50.4161 + 58517.8039 * T) * Math.PI / 180;
      const e = 0.0068;
      const v = M + 2 * e * Math.sin(M);
      return ((L + (v - M) * 180 / Math.PI) % 360 + 360) % 360;
    }

    case 'Mars': {
      const L = 355.4330 + 19140.2993 * T;
      const M = (19.3730 + 19139.8585 * T) * Math.PI / 180;
      const e = 0.0934;
      const v = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
      return ((L + (v - M) * 180 / Math.PI) % 360 + 360) % 360;
    }

    case 'Jupiter': {
      const L = 34.3515 + 3034.9057 * T;
      const M = (20.0202 + 3034.6874 * T) * Math.PI / 180;
      const e = 0.0484;
      const v = M + 2 * e * Math.sin(M);
      return ((L + (v - M) * 180 / Math.PI) % 360 + 360) % 360;
    }

    case 'Saturn': {
      const L = 50.0774 + 1222.1138 * T;
      const M = (317.0207 + 1222.1138 * T) * Math.PI / 180;
      const e = 0.0542;
      const v = M + 2 * e * Math.sin(M);
      return ((L + (v - M) * 180 / Math.PI) % 360 + 360) % 360;
    }

    case 'Uranus': {
      const L = 314.0550 + 428.4669 * T;
      return ((L) % 360 + 360) % 360;
    }

    case 'Neptune': {
      const L = 304.3487 + 218.4602 * T;
      return ((L) % 360 + 360) % 360;
    }

    case 'Pluto': {
      const L = 238.9288 + 145.1781 * T;
      return ((L) % 360 + 360) % 360;
    }
  }
}

// ============================================
// LUNAR NODES CALCULATION
// ============================================

/**
 * Calculate Mean Lunar North Node (Rahu)
 * The South Node (Ketu) is always 180° opposite
 */
function calculateLunarNodes(jd: number): { northNode: number; southNode: number } {
  const T = (jd - 2451545.0) / 36525;

  // Mean Longitude of Ascending Node (North Node)
  // This regresses through the zodiac (moves backwards)
  let northNode = 125.0445479
    - 1934.1362891 * T
    + 0.0020754 * T * T
    + T * T * T / 467441
    - T * T * T * T / 60616000;

  northNode = ((northNode % 360) + 360) % 360;
  const southNode = (northNode + 180) % 360;

  return { northNode, southNode };
}

// ============================================
// PART OF FORTUNE CALCULATION
// ============================================

/**
 * Calculate Part of Fortune (Pars Fortuna)
 * Day formula: ASC + Moon - Sun
 * Night formula: ASC + Sun - Moon (when Sun is below horizon)
 */
function calculatePartOfFortune(
  ascendant: number,
  sunLon: number,
  moonLon: number,
  isNight: boolean = false
): number {
  let pof: number;

  if (isNight) {
    // Night birth: ASC + Sun - Moon
    pof = ascendant + sunLon - moonLon;
  } else {
    // Day birth: ASC + Moon - Sun
    pof = ascendant + moonLon - sunLon;
  }

  return ((pof % 360) + 360) % 360;
}

// ============================================
// PLANETARY DIGNITY CALCULATION
// ============================================

/**
 * Calculate the dignity of a planet in a given sign
 */
function calculateDignity(planet: Planet, sign: ZodiacSign): PlanetaryDignity {
  let dignity: DignityType = 'neutral';
  let strength = 0;

  // Check rulership (+2)
  if (RULERSHIPS[planet]?.includes(sign)) {
    dignity = 'rulership';
    strength = 2;
  }
  // Check exaltation (+1)
  else if (EXALTATIONS[planet] === sign) {
    dignity = 'exaltation';
    strength = 1;
  }
  // Check detriment (-1)
  else if (DETRIMENTS[planet]?.includes(sign)) {
    dignity = 'detriment';
    strength = -1;
  }
  // Check fall (-2)
  else if (FALLS[planet] === sign) {
    dignity = 'fall';
    strength = -2;
  }

  return { planet, dignity, strength };
}

// ============================================
// PLANETARY PATTERN DETECTION
// ============================================

/**
 * Detect planetary patterns in a chart
 */
function detectPatterns(placements: PlanetaryPlacement[]): PatternInfo[] {
  const patterns: PatternInfo[] = [];

  // Get longitudes for all planets
  const longitudes: { planet: Planet; lon: number }[] = placements.map(p => ({
    planet: p.planet,
    lon: ZODIAC_SIGNS.indexOf(p.sign) * 30 + p.degree + p.minute / 60
  }));

  // Helper to check if two points are within orb
  const inOrb = (lon1: number, lon2: number, targetAngle: number, orb: number): boolean => {
    let diff = Math.abs(lon1 - lon2);
    if (diff > 180) diff = 360 - diff;
    return Math.abs(diff - targetAngle) <= orb;
  };

  // Detect STELLIUM (3+ planets in same sign)
  const signCounts: Record<ZodiacSign, Planet[]> = {} as Record<ZodiacSign, Planet[]>;
  for (const p of placements) {
    if (!signCounts[p.sign]) signCounts[p.sign] = [];
    signCounts[p.sign].push(p.planet);
  }
  for (const [sign, planets] of Object.entries(signCounts)) {
    if (planets.length >= 3) {
      patterns.push({
        pattern: 'Stellium',
        planets: planets as Planet[],
        description: `${planets.length} planets concentrated in ${sign} - intense focus on ${sign} themes`,
        influence: 'mixed'
      });
    }
  }

  // Detect GRAND TRINE (3 planets each ~120° apart)
  for (let i = 0; i < longitudes.length; i++) {
    for (let j = i + 1; j < longitudes.length; j++) {
      for (let k = j + 1; k < longitudes.length; k++) {
        const p1 = longitudes[i];
        const p2 = longitudes[j];
        const p3 = longitudes[k];

        if (inOrb(p1.lon, p2.lon, 120, 8) &&
            inOrb(p2.lon, p3.lon, 120, 8) &&
            inOrb(p3.lon, p1.lon, 120, 8)) {
          patterns.push({
            pattern: 'Grand Trine',
            planets: [p1.planet, p2.planet, p3.planet],
            description: 'Harmonious triangle of energy - natural talents and ease',
            influence: 'positive'
          });
        }
      }
    }
  }

  // Detect T-SQUARE (2 planets in opposition, both square to a third)
  for (let i = 0; i < longitudes.length; i++) {
    for (let j = i + 1; j < longitudes.length; j++) {
      // Check for opposition
      if (inOrb(longitudes[i].lon, longitudes[j].lon, 180, 8)) {
        // Look for planet squaring both
        for (let k = 0; k < longitudes.length; k++) {
          if (k !== i && k !== j) {
            if (inOrb(longitudes[i].lon, longitudes[k].lon, 90, 7) &&
                inOrb(longitudes[j].lon, longitudes[k].lon, 90, 7)) {
              patterns.push({
                pattern: 'T-Square',
                planets: [longitudes[i].planet, longitudes[j].planet, longitudes[k].planet],
                description: 'Dynamic tension creating drive and ambition',
                influence: 'challenging'
              });
            }
          }
        }
      }
    }
  }

  // Detect GRAND CROSS (4 planets in cross pattern - rare)
  for (let i = 0; i < longitudes.length; i++) {
    for (let j = i + 1; j < longitudes.length; j++) {
      for (let k = j + 1; k < longitudes.length; k++) {
        for (let l = k + 1; l < longitudes.length; l++) {
          const p1 = longitudes[i];
          const p2 = longitudes[j];
          const p3 = longitudes[k];
          const p4 = longitudes[l];

          // Check if forms a cross (oppositions + squares)
          if ((inOrb(p1.lon, p3.lon, 180, 8) && inOrb(p2.lon, p4.lon, 180, 8)) &&
              (inOrb(p1.lon, p2.lon, 90, 7) && inOrb(p2.lon, p3.lon, 90, 7) &&
               inOrb(p3.lon, p4.lon, 90, 7) && inOrb(p4.lon, p1.lon, 90, 7))) {
            patterns.push({
              pattern: 'Grand Cross',
              planets: [p1.planet, p2.planet, p3.planet, p4.planet],
              description: 'Intense configuration requiring balance and integration',
              influence: 'challenging'
            });
          }
        }
      }
    }
  }

  return patterns;
}

// ============================================
// DAY RULER & PLANETARY HOURS
// ============================================

/**
 * Get the planetary ruler of the day
 */
function getDayRuler(date: Date): DayRuler {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday
  return DAY_RULERS[dayOfWeek];
}

/**
 * Get the planetary hour ruler
 * Simplified calculation based on day/night hours
 */
function getPlanetaryHour(date: Date): Planet {
  const dayRuler = getDayRuler(date);
  const hour = date.getUTCHours();

  // Get starting index for the day ruler
  const startIndex = PLANETARY_HOUR_ORDER.indexOf(dayRuler as Planet);

  // Each hour is ruled by next planet in Chaldean sequence
  // Simplified: assume 12 day hours starting at 6am
  const hourIndex = (startIndex + hour) % 7;

  return PLANETARY_HOUR_ORDER[hourIndex];
}

// ============================================
// EXISTING FUNCTIONS (updated)
// ============================================

function isRetrograde(planet: Planet, jd: number): boolean {
  if (planet === 'Sun' || planet === 'Moon') return false;

  const lon1 = calculatePlanetLongitude(planet, jd - 0.5);
  const lon2 = calculatePlanetLongitude(planet, jd + 0.5);

  let diff = lon2 - lon1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff < 0;
}

function calculateHouse(longitude: number, ascendant: number): House {
  const normalizedLon = ((longitude - ascendant + 360) % 360);
  const house = Math.floor(normalizedLon / 30) + 1;
  return (house > 12 ? house - 12 : house) as House;
}

function calculateAscendant(jd: number, latitude: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525;
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                 0.000387933 * T * T - T * T * T / 38710000;
  const LST = ((theta0 + longitude) % 360 + 360) % 360;

  const eps = 23.4393 - 0.013 * T;
  const epsRad = eps * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const lstRad = LST * Math.PI / 180;

  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad);
  let asc = Math.atan2(y, x) * 180 / Math.PI;

  return ((asc % 360) + 360) % 360;
}

function calculateMoonPhase(sunLon: number, moonLon: number): { phase: MoonPhase; percent: number } {
  let angle = ((moonLon - sunLon + 360) % 360);
  const percent = (1 - Math.cos(angle * Math.PI / 180)) / 2 * 100;

  let phase: MoonPhase;
  if (angle < 22.5 || angle >= 337.5) phase = 'New Moon';
  else if (angle < 67.5) phase = 'Waxing Crescent';
  else if (angle < 112.5) phase = 'First Quarter';
  else if (angle < 157.5) phase = 'Waxing Gibbous';
  else if (angle < 202.5) phase = 'Full Moon';
  else if (angle < 247.5) phase = 'Waning Gibbous';
  else if (angle < 292.5) phase = 'Last Quarter';
  else phase = 'Waning Crescent';

  return { phase, percent: Math.round(percent) };
}

// Calculate aspects between two sets of placements (now includes new aspects)
function calculateAspects(
  placements1: PlanetaryPlacement[],
  placements2: PlanetaryPlacement[],
  isTransit: boolean = false
): (Aspect | TransitAspect)[] {
  const aspects: (Aspect | TransitAspect)[] = [];

  for (const p1 of placements1) {
    for (const p2 of placements2) {
      if (p1.planet === p2.planet && !isTransit) continue;

      const actualLon1 = ZODIAC_SIGNS.indexOf(p1.sign) * 30 + p1.degree + p1.minute / 60;
      const actualLon2 = ZODIAC_SIGNS.indexOf(p2.sign) * 30 + p2.degree + p2.minute / 60;

      let diff = Math.abs(actualLon1 - actualLon2);
      if (diff > 180) diff = 360 - diff;

      for (const [aspectType, angle] of Object.entries(ASPECT_ANGLES) as [AspectType, number][]) {
        const orb = Math.abs(diff - angle);
        const maxOrb = ASPECT_ORBS[aspectType];

        if (orb <= maxOrb) {
          const applying = diff < angle;

          if (isTransit) {
            aspects.push({
              transitPlanet: p1.planet,
              natalPlanet: p2.planet,
              type: aspectType,
              orb: Math.round(orb * 10) / 10,
              applying
            } as TransitAspect);
          } else {
            aspects.push({
              planet1: p1.planet,
              planet2: p2.planet,
              type: aspectType,
              orb: Math.round(orb * 10) / 10,
              applying
            } as Aspect);
          }
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

// Generate vibe tags based on astro context (enhanced)
function generateVibeTags(
  ephemeris: DailyEphemeris,
  transits: TransitAspect[],
  natal?: NatalChart
): VibeTag[] {
  const tags: Set<VibeTag> = new Set();

  // Moon sign based vibes
  const moonSign = ephemeris.placements.find(p => p.planet === 'Moon')?.sign;
  switch (moonSign) {
    case 'Aries': case 'Leo': case 'Sagittarius':
      tags.add('action');
      tags.add('momentum');
      break;
    case 'Taurus': case 'Virgo': case 'Capricorn':
      tags.add('stability');
      break;
    case 'Gemini': case 'Libra': case 'Aquarius':
      tags.add('communication');
      break;
    case 'Cancer': case 'Scorpio': case 'Pisces':
      tags.add('intuition');
      break;
  }

  // Moon phase vibes
  if (ephemeris.moonPhase === 'New Moon') tags.add('transformation');
  if (ephemeris.moonPhase === 'Full Moon') tags.add('clarity');

  // Retrograde vibes
  if (ephemeris.retrogrades.includes('Mercury')) tags.add('caution');
  if (ephemeris.retrogrades.includes('Venus')) tags.add('romance');

  // Day ruler vibes
  if (ephemeris.dayRuler) {
    switch (ephemeris.dayRuler) {
      case 'Sun': tags.add('powerful'); break;
      case 'Moon': tags.add('intuition'); break;
      case 'Mars': tags.add('action'); break;
      case 'Mercury': tags.add('communication'); break;
      case 'Jupiter': tags.add('expansion'); tags.add('fortunate'); break;
      case 'Venus': tags.add('romance'); tags.add('harmonious'); break;
      case 'Saturn': tags.add('stability'); tags.add('restriction'); break;
    }
  }

  // Lunar nodes vibes
  if (ephemeris.lunarNodes) {
    // Check for transits to nodes
    const northNodeLon = ZODIAC_SIGNS.indexOf(ephemeris.lunarNodes.northNode.sign) * 30
      + ephemeris.lunarNodes.northNode.degree;
    const moonLon = ZODIAC_SIGNS.indexOf(moonSign!) * 30
      + (ephemeris.placements.find(p => p.planet === 'Moon')?.degree || 0);

    let nodeDiff = Math.abs(moonLon - northNodeLon);
    if (nodeDiff > 180) nodeDiff = 360 - nodeDiff;

    if (nodeDiff < 10 || Math.abs(nodeDiff - 180) < 10) {
      tags.add('karmic');
      tags.add('fated');
    }
  }

  // Transit-based vibes
  for (const transit of transits.slice(0, 8)) {
    if (transit.transitPlanet === 'Venus' || transit.natalPlanet === 'Venus') {
      tags.add('romance');
    }
    if (transit.transitPlanet === 'Mars' || transit.natalPlanet === 'Mars') {
      tags.add('action');
    }
    if (transit.transitPlanet === 'Saturn') {
      if (transit.type === 'square' || transit.type === 'opposition') {
        tags.add('restriction');
        tags.add('caution');
      } else {
        tags.add('stability');
      }
    }
    if (transit.transitPlanet === 'Jupiter') {
      tags.add('expansion');
      tags.add('fortunate');
    }
    if (transit.type === 'square' || transit.type === 'opposition') {
      tags.add('conflict');
    }
    if (transit.type === 'trine') {
      tags.add('harmonious');
    }
    if (transit.type === 'quincunx') {
      tags.add('adjustment');
    }
  }

  // Pattern-based vibes (from natal chart)
  if (natal?.patterns) {
    for (const pattern of natal.patterns) {
      if (pattern.pattern === 'Grand Trine') tags.add('harmonious');
      if (pattern.pattern === 'T-Square') tags.add('powerful');
      if (pattern.pattern === 'Stellium') tags.add('powerful');
    }
  }

  return Array.from(tags);
}

// ============================================
// MAIN FUNCTIONS
// ============================================

export function calculateNatalChart(birthData: BirthData): NatalChart {
  const [hours, minutes] = birthData.time.split(':').map(Number);
  const birthDate = new Date(birthData.date);
  birthDate.setHours(hours, minutes, 0, 0);

  const jd = toJulianDay(birthDate);
  const ascendantDegree = calculateAscendant(jd, birthData.latitude, birthData.longitude);
  const ascendantInfo = degreesToSign(ascendantDegree);

  const midheavenDegree = (ascendantDegree + 270) % 360;
  const midheavenInfo = degreesToSign(midheavenDegree);

  const planets: Planet[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
  ];

  const placements: PlanetaryPlacement[] = planets.map(planet => {
    const longitude = calculatePlanetLongitude(planet, jd);
    const signInfo = degreesToSign(longitude);

    return {
      planet,
      sign: signInfo.sign,
      degree: signInfo.degree,
      minute: signInfo.minute,
      house: calculateHouse(longitude, ascendantDegree),
      isRetrograde: isRetrograde(planet, jd)
    };
  });

  // Calculate Lunar Nodes
  const nodes = calculateLunarNodes(jd);
  const northNodeInfo = degreesToSign(nodes.northNode);
  const southNodeInfo = degreesToSign(nodes.southNode);

  // Calculate Part of Fortune
  const sunLon = calculatePlanetLongitude('Sun', jd);
  const moonLon = calculatePlanetLongitude('Moon', jd);
  const isNight = hours < 6 || hours >= 18; // Simplified day/night
  const pofDegree = calculatePartOfFortune(ascendantDegree, sunLon, moonLon, isNight);
  const pofInfo = degreesToSign(pofDegree);

  // Calculate dignities for all planets
  const dignities = placements.map(p => calculateDignity(p.planet, p.sign));

  // Detect patterns
  const patterns = detectPatterns(placements);

  return {
    birthData,
    placements,
    ascendant: { sign: ascendantInfo.sign, degree: ascendantInfo.degree },
    midheaven: { sign: midheavenInfo.sign, degree: midheavenInfo.degree },
    lunarNodes: {
      northNode: { point: 'NorthNode', sign: northNodeInfo.sign, degree: northNodeInfo.degree, minute: northNodeInfo.minute },
      southNode: { point: 'SouthNode', sign: southNodeInfo.sign, degree: southNodeInfo.degree, minute: southNodeInfo.minute }
    },
    partOfFortune: { point: 'PartOfFortune', sign: pofInfo.sign, degree: pofInfo.degree, minute: pofInfo.minute },
    dignities,
    patterns
  };
}

export function calculateDailyEphemeris(date: Date = new Date()): DailyEphemeris {
  const jd = toJulianDay(date);

  const planets: Planet[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
  ];

  const placements: PlanetaryPlacement[] = planets.map(planet => {
    const longitude = calculatePlanetLongitude(planet, jd);
    const signInfo = degreesToSign(longitude);

    return {
      planet,
      sign: signInfo.sign,
      degree: signInfo.degree,
      minute: signInfo.minute,
      house: 1 as House,
      isRetrograde: isRetrograde(planet, jd)
    };
  });

  const sunLon = calculatePlanetLongitude('Sun', jd);
  const moonLon = calculatePlanetLongitude('Moon', jd);
  const moonPhaseInfo = calculateMoonPhase(sunLon, moonLon);
  const retrogrades = planets.filter(p => isRetrograde(p, jd));

  // Calculate Lunar Nodes for today
  const nodes = calculateLunarNodes(jd);
  const northNodeInfo = degreesToSign(nodes.northNode);
  const southNodeInfo = degreesToSign(nodes.southNode);

  // Get day ruler and planetary hour
  const dayRuler = getDayRuler(date);
  const planetaryHour = getPlanetaryHour(date);

  return {
    date,
    placements,
    moonPhase: moonPhaseInfo.phase,
    moonPhasePercent: moonPhaseInfo.percent,
    retrogrades,
    lunarNodes: {
      northNode: { point: 'NorthNode', sign: northNodeInfo.sign, degree: northNodeInfo.degree, minute: northNodeInfo.minute },
      southNode: { point: 'SouthNode', sign: southNodeInfo.sign, degree: southNodeInfo.degree, minute: southNodeInfo.minute }
    },
    dayRuler,
    planetaryHour
  };
}

export function generateAstroContext(birthData: BirthData, queryDate: Date = new Date()): AstroContext {
  const natal = calculateNatalChart(birthData);
  const ephemeris = calculateDailyEphemeris(queryDate);

  const transits = calculateAspects(ephemeris.placements, natal.placements, true) as TransitAspect[];
  const vibeTags = generateVibeTags(ephemeris, transits, natal);

  return {
    natal,
    ephemeris,
    transits,
    vibeTags
  };
}

// ============================================
// HELPER/FORMAT FUNCTIONS
// ============================================

export function formatPlacement(placement: PlanetaryPlacement): string {
  const retrograde = placement.isRetrograde ? ' ℞' : '';
  return `${PLANET_SYMBOLS[placement.planet]} ${placement.degree}°${placement.minute}' ${ZODIAC_SYMBOLS[placement.sign]} ${placement.sign}${retrograde}`;
}

export function formatTransitAspect(aspect: TransitAspect): string {
  const aspectSymbols: Record<AspectType, string> = {
    conjunction: '☌',
    sextile: '⚹',
    square: '□',
    trine: '△',
    opposition: '☍',
    quincunx: '⚻',
    'semi-sextile': '⚺'
  };

  return `${aspect.transitPlanet} ${aspectSymbols[aspect.type]} natal ${aspect.natalPlanet} (${aspect.orb}°)`;
}

export function formatDignity(dignity: PlanetaryDignity): string {
  const symbols: Record<DignityType, string> = {
    rulership: '🏠',
    exaltation: '⬆️',
    detriment: '⬇️',
    fall: '📉',
    neutral: ''
  };

  if (dignity.dignity === 'neutral') return '';
  return `${PLANET_SYMBOLS[dignity.planet]} ${symbols[dignity.dignity]} ${dignity.dignity}`;
}
