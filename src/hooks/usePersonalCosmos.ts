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
 * Convert old BirthData format to new format
 */
function convertOldBirthData(old: OldBirthData): BirthData {
  // Parse timezone string to number (e.g., "Asia/Manila" -> 8)
  // For simplicity, we'll use a lookup or default to 0
  const timezoneOffsets: Record<string, number> = {
    'Asia/Manila': 8,
    'America/New_York': -5,
    'America/Los_Angeles': -8,
    'Europe/London': 0,
    'Europe/Paris': 1,
    'Asia/Tokyo': 9,
    'Australia/Sydney': 10,
  };

  const tzOffset = typeof old.timezone === 'string'
    ? (timezoneOffsets[old.timezone] ?? 0)
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
