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
  TransitTiming,
  AspectType,
  HouseCusp,
  HouseSystem,
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
 * Calculate house cusps using Swiss Ephemeris.
 * Uses Placidus by default, falls back to Whole Sign for high latitudes.
 */
export function calculateHouseCusps(
  jd: number,
  latitude: number,
  longitude: number,
): HouseSystem {
  const swe = getSwe();
  let systemCode = 'P'; // Placidus

  try {
    const result = swe.houses(jd, latitude, longitude, systemCode);
    // result.cusps is Float64Array[13] where cusps[1..12] are the 12 house cusps
    // result.ascmc is Float64Array[10] where ascmc[0] = ASC, ascmc[1] = MC

    const cusps: HouseCusp[] = [];
    for (let i = 1; i <= 12; i++) {
      const lon = result.cusps[i];
      const { sign, degree } = getZodiacFromLongitude(lon);
      cusps.push({ house: i, longitude: lon, sign, degree });
    }

    return {
      system: 'P',
      cusps,
      ascendantLongitude: result.ascmc[0],
      midheavenLongitude: result.ascmc[1],
    };
  } catch {
    // Placidus can fail at extreme latitudes (>66°) — fall back to Whole Sign
    console.warn('Placidus failed, falling back to Whole Sign houses');
    systemCode = 'W';
    const result = swe.houses(jd, latitude, longitude, systemCode);

    const cusps: HouseCusp[] = [];
    for (let i = 1; i <= 12; i++) {
      const lon = result.cusps[i];
      const { sign, degree } = getZodiacFromLongitude(lon);
      cusps.push({ house: i, longitude: lon, sign, degree });
    }

    return {
      system: 'W',
      cusps,
      ascendantLongitude: result.ascmc[0],
      midheavenLongitude: result.ascmc[1],
    };
  }
}

/**
 * Determine which house (1-12) a planet falls in given house cusps.
 * A planet is in house N if its longitude is between cusp N and cusp N+1
 * (wrapping around at 360°).
 */
export function getHouseForLongitude(longitude: number, cusps: HouseCusp[]): number {
  // Normalize longitude to 0-360
  const lon = ((longitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const currentCusp = cusps[i].longitude;
    const nextCusp = cusps[(i + 1) % 12].longitude;

    if (nextCusp > currentCusp) {
      // Normal case: no 360° wrap
      if (lon >= currentCusp && lon < nextCusp) {
        return cusps[i].house;
      }
    } else {
      // Wraps around 360°
      if (lon >= currentCusp || lon < nextCusp) {
        return cusps[i].house;
      }
    }
  }

  // Fallback — should not reach here
  return 1;
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

  // Calculate house cusps
  const houses = calculateHouseCusps(
    jd,
    birthData.birthLocation.latitude,
    birthData.birthLocation.longitude,
  );

  // Calculate ascendant/midheaven from house data (more accurate than planet calc)
  const ascSign = getZodiacFromLongitude(houses.ascendantLongitude);
  const mcSign = getZodiacFromLongitude(houses.midheavenLongitude);

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
    chiron: calculatePlanetPosition(jd, swe.SE_CHIRON),
    ascendant: {
      longitude: houses.ascendantLongitude,
      latitude: 0,
      speed: 0,
      sign: ascSign.sign,
      degree: ascSign.degree,
      isRetrograde: false,
    },
    midheaven: {
      longitude: houses.midheavenLongitude,
      latitude: 0,
      speed: 0,
      sign: mcSign.sign,
      degree: mcSign.degree,
      isRetrograde: false,
    },
    houses,
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
        const transitEntry: Transit = {
          transitPlanet,
          natalPlanet,
          aspectType: aspect.type,
          orb: aspect.orb,
          transitPosition: transitPos.longitude,
          natalPosition: natalPos.longitude,
          isExact: aspect.orb < 1
        };

        // Tag with house if natal chart has house data
        if (natalChart.houses) {
          transitEntry.transitHouse = getHouseForLongitude(
            transitPos.longitude,
            natalChart.houses.cusps
          );
        }

        transits.push(transitEntry);
      }
    }
  }

  // Sort by orb (tightest aspects first)
  return transits.sort((a, b) => a.orb - b.orb);
}

/**
 * Planet name → Swiss Ephemeris constant ID
 */
function getPlanetId(planet: Planet): number | null {
  const swe = getSwe();
  const map: Partial<Record<Planet, number>> = {
    sun: swe.SE_SUN,
    moon: swe.SE_MOON,
    mercury: swe.SE_MERCURY,
    venus: swe.SE_VENUS,
    mars: swe.SE_MARS,
    jupiter: swe.SE_JUPITER,
    saturn: swe.SE_SATURN,
    uranus: swe.SE_URANUS,
    neptune: swe.SE_NEPTUNE,
    pluto: swe.SE_PLUTO,
    northNode: swe.SE_TRUE_NODE,
    chiron: swe.SE_CHIRON,
  };
  return map[planet] ?? null;
}

/**
 * Scan forward in time to find when a transit becomes exact and/or separates.
 * Steps day-by-day (2hr for Moon) up to maxDays, tracking the orb.
 */
export function scanTransitTiming(
  natalLongitude: number,
  transitPlanet: Planet,
  aspectAngle: number,
  aspectOrb: number,
  currentOrb: number,
  maxDays: number = 60,
): TransitTiming | null {
  const swe = getSwe();
  const planetId = getPlanetId(transitPlanet);
  if (planetId === null) return null;

  const stepHours = transitPlanet === 'moon' ? 2 : 24;
  const stepDays = stepHours / 24;
  const now = new Date();
  const nowJd = swe.julday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours() + now.getUTCMinutes() / 60
  );

  // Current state
  let prevOrb = currentOrb;
  let exactDate: Date | undefined;
  let separationDate: Date | undefined;
  let isApplying = false;

  // Check direction: step forward once and see if orb is shrinking
  const nextJd = nowJd + stepDays;
  const nextPos = swe.calc_ut(nextJd, planetId, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
  const nextLon = nextPos[0];
  let nextDiff = Math.abs(nextLon - natalLongitude);
  if (nextDiff > 180) nextDiff = 360 - nextDiff;
  const nextOrb = Math.abs(nextDiff - aspectAngle);
  isApplying = nextOrb < currentOrb;

  // Scan forward
  for (let day = stepDays; day <= maxDays; day += stepDays) {
    const jd = nowJd + day;
    const pos = swe.calc_ut(jd, planetId, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
    const lon = pos[0];

    let diff = Math.abs(lon - natalLongitude);
    if (diff > 180) diff = 360 - diff;
    const orb = Math.abs(diff - aspectAngle);

    // Check for exact (orb crossed zero or reached minimum)
    if (!exactDate && prevOrb > orb && orb < 0.5) {
      // Near exact — interpolate to the day
      const daysFromNow = day;
      exactDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    }

    // Check for separation (orb exceeds the aspect's max orb)
    if (!separationDate && orb > aspectOrb && prevOrb <= aspectOrb) {
      const daysFromNow = day;
      separationDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
      break; // Once separated, we're done
    }

    prevOrb = orb;
  }

  const daysUntilExact = exactDate
    ? Math.round((exactDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : undefined;
  const daysUntilSeparation = separationDate
    ? Math.round((separationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : undefined;

  return {
    currentOrb,
    isApplying,
    exactDate,
    separationDate,
    daysUntilExact,
    daysUntilSeparation,
  };
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
