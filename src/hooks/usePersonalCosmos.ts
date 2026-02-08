/**
 * usePersonalCosmos Hook
 *
 * Manages the personalized cosmic profile system:
 * - Initializes Swiss Ephemeris
 * - Calculates natal chart from birth data
 * - Generates daily personal reports
 * - Provides personalized question scoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BirthData as OldBirthData } from '../types/astrology';
import {
  BirthData,
  UserProfile,
  USER_PROFILE_STORAGE_KEY
} from '../types/userProfile';
import {
  initEphemeris,
  closeEphemeris,
  calculateNatalChart,
} from '../lib/ephemerisService';
import {
  PersonalDailyReport,
  generatePersonalDailyReport
} from '../lib/personalDailyReport';

interface UsePersonalCosmosReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  userProfile: UserProfile | null;
  dailyReport: PersonalDailyReport | null;

  // Actions
  setUserFromOldBirthData: (oldData: OldBirthData) => Promise<void>;
  refreshDailyReport: () => void;
  clearProfile: () => void;
}

/**
 * IANA timezone string to UTC offset (standard time, no DST).
 * Covers all timezones used in the cities database plus common extras.
 */
const TIMEZONE_OFFSETS: Record<string, number> = {
  // Americas
  'America/New_York': -5,
  'America/Toronto': -5,
  'America/Montreal': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Phoenix': -7,
  'America/Los_Angeles': -8,
  'America/Vancouver': -8,
  'America/Mexico_City': -6,
  'America/Sao_Paulo': -3,
  'America/Argentina/Buenos_Aires': -3,
  'America/Lima': -5,
  'America/Bogota': -5,
  'America/Santiago': -4,
  // Europe
  'Europe/London': 0,
  'Europe/Dublin': 0,
  'Europe/Lisbon': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Europe/Madrid': 1,
  'Europe/Rome': 1,
  'Europe/Amsterdam': 1,
  'Europe/Vienna': 1,
  'Europe/Brussels': 1,
  'Europe/Stockholm': 1,
  'Europe/Oslo': 1,
  'Europe/Copenhagen': 1,
  'Europe/Prague': 1,
  'Europe/Warsaw': 1,
  'Europe/Budapest': 1,
  'Europe/Athens': 2,
  'Europe/Moscow': 3,
  'Europe/Istanbul': 3,
  // Africa
  'Africa/Casablanca': 1,
  'Africa/Lagos': 1,
  'Africa/Cairo': 2,
  'Africa/Johannesburg': 2,
  'Africa/Nairobi': 3,
  // Asia
  'Asia/Dubai': 4,
  'Asia/Kolkata': 5.5,
  'Asia/Bangkok': 7,
  'Asia/Jakarta': 7,
  'Asia/Singapore': 8,
  'Asia/Hong_Kong': 8,
  'Asia/Manila': 8,
  'Asia/Taipei': 8,
  'Asia/Shanghai': 8,
  'Asia/Seoul': 9,
  'Asia/Tokyo': 9,
  'Asia/Jerusalem': 2,
  // Oceania
  'Australia/Perth': 8,
  'Australia/Brisbane': 10,
  'Australia/Sydney': 10,
  'Australia/Melbourne': 10,
  'Pacific/Auckland': 12,
};

/**
 * Convert old BirthData format to new format
 */
function convertOldBirthData(old: OldBirthData): BirthData {
  const tzOffset = typeof old.timezone === 'string'
    ? (TIMEZONE_OFFSETS[old.timezone] ?? 0)
    : (old.timezone as unknown as number) ?? 0;

  return {
    name: 'Cosmic Traveler',
    birthDate: old.date,
    birthTime: old.time,
    birthLocation: {
      city: old.city,
      country: old.country,
      latitude: old.latitude,
      longitude: old.longitude,
      timezone: tzOffset
    }
  };
}

export function usePersonalCosmos(): UsePersonalCosmosReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyReport, setDailyReport] = useState<PersonalDailyReport | null>(null);

  const initAttempted = useRef(false);

  // Initialize ephemeris on mount
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    const init = async () => {
      try {
        setIsLoading(true);
        await initEphemeris();
        setIsInitialized(true);

        // Try to load saved profile
        const saved = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
        if (saved) {
          const profile = JSON.parse(saved) as UserProfile;
          // Restore dates
          profile.birthData.birthDate = new Date(profile.birthData.birthDate);
          profile.createdAt = new Date(profile.createdAt);
          profile.updatedAt = new Date(profile.updatedAt);

          // Migration: recalculate natal chart if houses are missing
          if (!profile.natalChart.houses) {
            try {
              const freshChart = calculateNatalChart(profile.birthData);
              profile.natalChart = freshChart;
              profile.updatedAt = new Date();
              localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
              console.log('Migrated profile: added house data');
            } catch (err) {
              console.warn('House migration failed, continuing without houses:', err);
            }
          }

          setUserProfile(profile);

          // Generate today's report
          const report = generatePersonalDailyReport(profile);
          setDailyReport(report);
        }
      } catch (err) {
        console.error('Failed to initialize ephemeris:', err);
        setError('Failed to initialize cosmic calculations');
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      closeEphemeris();
    };
  }, []);

  // Convert old birth data and create profile
  const setUserFromOldBirthData = useCallback(async (oldData: OldBirthData) => {
    if (!isInitialized) {
      setError('Cosmic calculations not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert to new format
      const birthData = convertOldBirthData(oldData);

      // Calculate natal chart
      const natalChart = calculateNatalChart(birthData);

      // Create user profile
      const profile: UserProfile = {
        id: crypto.randomUUID(),
        birthData,
        natalChart,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to localStorage
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      setUserProfile(profile);

      // Generate daily report
      const report = generatePersonalDailyReport(profile);
      setDailyReport(report);

    } catch (err) {
      console.error('Failed to create cosmic profile:', err);
      setError('Failed to calculate your cosmic profile');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Refresh daily report (e.g., at midnight or on demand)
  const refreshDailyReport = useCallback(() => {
    if (!userProfile) return;

    try {
      const report = generatePersonalDailyReport(userProfile);
      setDailyReport(report);
    } catch (err) {
      console.error('Failed to refresh daily report:', err);
    }
  }, [userProfile]);

  // Clear profile
  const clearProfile = useCallback(() => {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    setUserProfile(null);
    setDailyReport(null);
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    userProfile,
    dailyReport,
    setUserFromOldBirthData,
    refreshDailyReport,
    clearProfile
  };
}
