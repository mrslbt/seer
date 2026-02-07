/**
 * Ephemeris Service
 * Uses Swiss Ephemeris (WASM) for astronomical calculations
 */

import {
  BirthData,
  NatalChart,
  PlanetPosition,
  Planet,
  Transit,
  AspectType,
  getZodiacFromLongitude
} from '../types/userProfile';

// Singleton instance - lazy loaded
let sweInstance: any = null;
let isInitialized = false;
let SwissEphClass: any = null;

/**
 * Initialize Swiss Ephemeris (call once on app start)
 *
 * The swisseph-wasm package requires a .wasm binary (bundled by Vite) and a
 * .data file (~12 MB of ephemeris tables) fetched at runtime by the Emscripten
 * loader. After Vite bundles, the library's locateFile resolves .data to
 * /wsam/swisseph.data — so we place the file at public/wsam/swisseph.data
 * to match that path in production.
 */
export async function initEphemeris(): Promise<void> {
  if (isInitialized) return;

  try {
    const module = await import('swisseph-wasm');
    SwissEphClass = module.default;
    sweInstance = new SwissEphClass();
    await sweInstance.initSwissEph();
    isInitialized = true;
    console.log('Swiss Ephemeris initialized successfully');
  } catch (err) {
    console.error('Swiss Ephemeris initialization failed:', err);
    throw err;
  }
}

/**
 * Clean up Swiss Ephemeris (call on app unmount)
 */
export function closeEphemeris(): void {
  if (sweInstance) {
    sweInstance.close();
    sweInstance = null;
    isInitialized = false;
  }
}

/**
 * Get Swiss Ephemeris instance
 */
function getSwe(): any {
  if (!isInitialized || !sweInstance) {
    throw new Error('Swiss Ephemeris not initialized. Call initEphemeris() first.');
  }
  return sweInstance;
}

/**
 * Calculate Julian Day from date and time
 */
export function calculateJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezoneOffset: number
): number {
  const swe = getSwe();
  // Convert local time to UTC
  const utcHour = hour + minute / 60 - timezoneOffset;
  return swe.julday(year, month, day, utcHour);
}

/**
 * Calculate position of a single planet at a given Julian Day
 */
function calculatePlanetPosition(jd: number, planetId: number): PlanetPosition {
  const swe = getSwe();
  const pos = swe.calc_ut(jd, planetId, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);

  const longitude = pos[0];
  const { sign, degree } = getZodiacFromLongitude(longitude);

  return {
    longitude,
    latitude: pos[1],
    speed: pos[3],
    sign,
    degree,
    isRetrograde: pos[3] < 0
  };
}

/**
 * Calculate complete natal chart from birth data
 */
export function calculateNatalChart(birthData: BirthData): NatalChart {
  const swe = getSwe();

  const birthDate = new Date(birthData.birthDate);
  const [hours, minutes] = birthData.birthTime.split(':').map(Number);

  const jd = calculateJulianDay(
    birthDate.getFullYear(),
    birthDate.getMonth() + 1,
    birthDate.getDate(),
    hours,
    minutes,
    birthData.birthLocation.timezone
  );

  return {
    sun: calculatePlanetPosition(jd, swe.SE_SUN),
    moon: calculatePlanetPosition(jd, swe.SE_MOON),
    mercury: calculatePlanetPosition(jd, swe.SE_MERCURY),
    venus: calculatePlanetPosition(jd, swe.SE_VENUS),
    mars: calculatePlanetPosition(jd, swe.SE_MARS),
    jupiter: calculatePlanetPosition(jd, swe.SE_JUPITER),
    saturn: calculatePlanetPosition(jd, swe.SE_SATURN),
    uranus: calculatePlanetPosition(jd, swe.SE_URANUS),
    neptune: calculatePlanetPosition(jd, swe.SE_NEPTUNE),
    pluto: calculatePlanetPosition(jd, swe.SE_PLUTO),
    northNode: calculatePlanetPosition(jd, swe.SE_TRUE_NODE),
    chiron: calculatePlanetPosition(jd, swe.SE_CHIRON)
  };
}

/**
 * Calculate current planetary positions
 */
export function calculateCurrentPositions(date: Date = new Date()): NatalChart {
  const swe = getSwe();

  const jd = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60
  );

  return {
    sun: calculatePlanetPosition(jd, swe.SE_SUN),
    moon: calculatePlanetPosition(jd, swe.SE_MOON),
    mercury: calculatePlanetPosition(jd, swe.SE_MERCURY),
    venus: calculatePlanetPosition(jd, swe.SE_VENUS),
    mars: calculatePlanetPosition(jd, swe.SE_MARS),
    jupiter: calculatePlanetPosition(jd, swe.SE_JUPITER),
    saturn: calculatePlanetPosition(jd, swe.SE_SATURN),
    uranus: calculatePlanetPosition(jd, swe.SE_URANUS),
    neptune: calculatePlanetPosition(jd, swe.SE_NEPTUNE),
    pluto: calculatePlanetPosition(jd, swe.SE_PLUTO),
    northNode: calculatePlanetPosition(jd, swe.SE_TRUE_NODE),
    chiron: calculatePlanetPosition(jd, swe.SE_CHIRON)
  };
}

/**
 * Aspect definitions with orbs
 */
const ASPECT_DEFINITIONS: { type: AspectType; angle: number; orb: number }[] = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'trine', angle: 120, orb: 6 },
  { type: 'square', angle: 90, orb: 6 },
  { type: 'sextile', angle: 60, orb: 4 },
  { type: 'quincunx', angle: 150, orb: 3 }
];

/**
 * Calculate the angular difference between two points
 */
function getAspectAngle(long1: number, long2: number): number {
  let diff = Math.abs(long1 - long2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Check if an aspect exists between two points
 */
function findAspect(long1: number, long2: number): { type: AspectType; orb: number } | null {
  const angle = getAspectAngle(long1, long2);

  for (const aspect of ASPECT_DEFINITIONS) {
    const orb = Math.abs(angle - aspect.angle);
    if (orb <= aspect.orb) {
      return { type: aspect.type, orb };
    }
  }

  return null;
}

/**
 * Calculate all transits from current positions to natal chart
 */
export function calculateTransits(
  natalChart: NatalChart,
  currentPositions: NatalChart
): Transit[] {
  const transits: Transit[] = [];

  const planets: Planet[] = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
  ];

  for (const transitPlanet of planets) {
    const transitPos = currentPositions[transitPlanet];
    if (!transitPos) continue;

    for (const natalPlanet of planets) {
      const natalPos = natalChart[natalPlanet];
      if (!natalPos) continue;

      const aspect = findAspect(transitPos.longitude, natalPos.longitude);

      if (aspect) {
        transits.push({
          transitPlanet,
          natalPlanet,
          aspectType: aspect.type,
          orb: aspect.orb,
          transitPosition: transitPos.longitude,
          natalPosition: natalPos.longitude,
          isExact: aspect.orb < 1
        });
      }
    }
  }

  // Sort by orb (tightest aspects first)
  return transits.sort((a, b) => a.orb - b.orb);
}

/**
 * Get moon phase (0-1, where 0=new, 0.5=full)
 */
export function getMoonPhase(date: Date = new Date()): {
  phase: number;
  phaseName: string;
  illumination: number;
} {
  const positions = calculateCurrentPositions(date);
  const sunLong = positions.sun.longitude;
  const moonLong = positions.moon.longitude;

  // Calculate the angle between Moon and Sun
  let phase = (moonLong - sunLong + 360) % 360;
  const phaseNormalized = phase / 360;

  // Illumination is roughly based on phase
  const illumination = (1 - Math.cos(phaseNormalized * 2 * Math.PI)) / 2;

  // Determine phase name
  let phaseName: string;
  if (phase < 45) phaseName = 'New Moon';
  else if (phase < 90) phaseName = 'Waxing Crescent';
  else if (phase < 135) phaseName = 'First Quarter';
  else if (phase < 180) phaseName = 'Waxing Gibbous';
  else if (phase < 225) phaseName = 'Full Moon';
  else if (phase < 270) phaseName = 'Waning Gibbous';
  else if (phase < 315) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  return {
    phase: phaseNormalized,
    phaseName,
    illumination
  };
}

/**
 * Check if a planet is retrograde
 */
export function isRetrograde(planet: Planet, date: Date = new Date()): boolean {
  const positions = calculateCurrentPositions(date);
  return positions[planet]?.isRetrograde ?? false;
}

/**
 * Get the day ruler based on day of week
 */
export function getDayRuler(date: Date = new Date()): {
  ruler: Planet;
  quality: 'beneficial' | 'challenging' | 'neutral';
} {
  const dayRulers: { ruler: Planet; quality: 'beneficial' | 'challenging' | 'neutral' }[] = [
    { ruler: 'sun', quality: 'beneficial' },      // Sunday
    { ruler: 'moon', quality: 'neutral' },        // Monday
    { ruler: 'mars', quality: 'challenging' },    // Tuesday
    { ruler: 'mercury', quality: 'neutral' },     // Wednesday
    { ruler: 'jupiter', quality: 'beneficial' },  // Thursday
    { ruler: 'venus', quality: 'beneficial' },    // Friday
    { ruler: 'saturn', quality: 'challenging' }   // Saturday
  ];

  return dayRulers[date.getDay()];
}
