/**
 * User Profile Types
 * Stores birth data and calculated natal chart
 */

import { ZodiacSign } from './astrology';

export interface BirthData {
  name: string;
  birthDate: Date;
  birthTime: string; // "HH:MM" format
  birthLocation: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: number; // UTC offset in hours
  };
}

export interface PlanetPosition {
  longitude: number; // 0-360 degrees
  latitude: number;
  speed: number; // degrees per day (negative = retrograde)
  sign: ZodiacSign;
  degree: number; // degree within sign (0-30)
  isRetrograde: boolean;
}

export interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  // Calculated points
  ascendant?: PlanetPosition;
  midheaven?: PlanetPosition;
  northNode?: PlanetPosition;
  chiron?: PlanetPosition;
}

export type Planet = keyof NatalChart;

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number; // how exact the aspect is (0 = perfect)
  applying: boolean; // is the aspect getting tighter?
}

export type AspectType =
  | 'conjunction' // 0° - merging energy
  | 'opposition'  // 180° - tension/awareness
  | 'trine'       // 120° - easy flow
  | 'square'      // 90° - challenge/action
  | 'sextile'     // 60° - opportunity
  | 'quincunx';   // 150° - adjustment needed

export interface Transit {
  transitPlanet: Planet;
  natalPlanet: Planet;
  aspectType: AspectType;
  orb: number;
  transitPosition: number;
  natalPosition: number;
  isExact: boolean; // orb < 1°
  interpretation?: string;
}

export interface UserProfile {
  id: string;
  birthData: BirthData;
  natalChart: NatalChart;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to get zodiac sign from longitude
export function getZodiacFromLongitude(longitude: number): { sign: ZodiacSign; degree: number } {
  const signs: ZodiacSign[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  return { sign: signs[signIndex], degree };
}

// Local storage key for user profile
export const USER_PROFILE_STORAGE_KEY = 'cosmic8ball_user_profile';
