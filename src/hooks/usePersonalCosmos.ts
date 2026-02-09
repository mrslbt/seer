/**
 * usePersonalCosmos Hook
 *
 * Manages the personalized cosmic profile system:
 * - Initializes Swiss Ephemeris
 * - Calculates natal chart from birth data
 * - Generates daily personal reports
 * - Supports multiple saved profiles with switching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BirthData as OldBirthData } from '../types/astrology';
import {
  BirthData,
  UserProfile,
  USER_PROFILE_STORAGE_KEY,
  PROFILES_STORAGE_KEY,
  ACTIVE_PROFILE_STORAGE_KEY,
  MAX_PROFILES,
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
  allProfiles: UserProfile[];

  // Actions
  setUserFromOldBirthData: (oldData: OldBirthData, name?: string) => Promise<void>;
  updateProfile: (profileId: string, oldData: OldBirthData, name: string) => Promise<void>;
  switchProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;
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
function convertOldBirthData(old: OldBirthData, name?: string): BirthData {
  const tzOffset = typeof old.timezone === 'string'
    ? (TIMEZONE_OFFSETS[old.timezone] ?? 0)
    : (old.timezone as unknown as number) ?? 0;

  return {
    name: name || 'Cosmic Traveler',
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

/**
 * Restore Date objects from JSON-parsed profile
 */
function restoreProfileDates(profile: UserProfile): UserProfile {
  profile.birthData.birthDate = new Date(profile.birthData.birthDate);
  profile.createdAt = new Date(profile.createdAt);
  profile.updatedAt = new Date(profile.updatedAt);
  return profile;
}

/**
 * Save profiles array to localStorage
 */
function saveProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Save active profile ID to localStorage
 */
function saveActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, id);
}

/**
 * Load profiles from localStorage, with migration from old single-profile format
 */
function loadProfiles(): { profiles: UserProfile[]; activeId: string | null } {
  // Try new multi-profile format first
  const savedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (savedProfiles) {
    try {
      const profiles = (JSON.parse(savedProfiles) as UserProfile[]).map(restoreProfileDates);
      const activeId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
      return { profiles, activeId };
    } catch { /* fall through to migration */ }
  }

  // Migration: try old single-profile format
  const oldProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (oldProfile) {
    try {
      const profile = restoreProfileDates(JSON.parse(oldProfile) as UserProfile);
      // Ensure profile has a name
      if (!profile.birthData.name) {
        profile.birthData.name = 'Cosmic Traveler';
      }
      // Save in new format
      saveProfiles([profile]);
      saveActiveProfileId(profile.id);
      // Clean up old keys
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      localStorage.removeItem('seer_birthdata');
      return { profiles: [profile], activeId: profile.id };
    } catch { /* fall through */ }
  }

  return { profiles: [], activeId: null };
}

export function usePersonalCosmos(): UsePersonalCosmosReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
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

        // Load saved profiles (with migration)
        const { profiles, activeId } = loadProfiles();

        if (profiles.length > 0) {
          // Migration: recalculate natal charts if houses are missing
          let needsSave = false;
          for (const profile of profiles) {
            if (!profile.natalChart.houses) {
              try {
                const freshChart = calculateNatalChart(profile.birthData);
                profile.natalChart = freshChart;
                profile.updatedAt = new Date();
                needsSave = true;
              } catch (err) {
                console.warn('House migration failed for', profile.birthData.name, err);
              }
            }
          }
          if (needsSave) {
            saveProfiles(profiles);
          }

          setAllProfiles(profiles);

          // Find active profile
          const active = profiles.find(p => p.id === activeId) || profiles[0];
          setUserProfile(active);
          saveActiveProfileId(active.id);

          // Generate today's report
          const report = generatePersonalDailyReport(active);
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

    return () => {
      closeEphemeris();
    };
  }, []);

  // Convert old birth data, create profile, and add to profiles array
  const setUserFromOldBirthData = useCallback(async (oldData: OldBirthData, name?: string) => {
    if (!isInitialized) {
      setError('Cosmic calculations not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert to new format
      const birthData = convertOldBirthData(oldData, name);

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

      // Add to profiles array (enforce max limit)
      setAllProfiles(prev => {
        const updated = [...prev, profile].slice(-MAX_PROFILES);
        saveProfiles(updated);
        return updated;
      });

      // Set as active
      saveActiveProfileId(profile.id);
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

  // Update an existing profile's birth data and name
  const updateProfile = useCallback(async (profileId: string, oldData: OldBirthData, name: string) => {
    if (!isInitialized) {
      setError('Cosmic calculations not ready');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert to new format
      const birthData = convertOldBirthData(oldData, name);

      // Recalculate natal chart
      const natalChart = calculateNatalChart(birthData);

      // Update in profiles array
      setAllProfiles(prev => {
        const updated = prev.map(p => {
          if (p.id !== profileId) return p;
          return {
            ...p,
            birthData,
            natalChart,
            updatedAt: new Date(),
          };
        });
        saveProfiles(updated);

        // If this is the active profile, update it + regenerate report
        if (userProfile?.id === profileId) {
          const updatedProfile = updated.find(p => p.id === profileId)!;
          setUserProfile(updatedProfile);

          // Clear whisper cache for fresh generation
          localStorage.removeItem(`seer_daily_whisper_${profileId}`);

          try {
            const report = generatePersonalDailyReport(updatedProfile);
            setDailyReport(report);
          } catch (err) {
            console.error('Failed to regenerate daily report:', err);
          }
        }

        return updated;
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update your cosmic profile');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, userProfile]);

  // Switch to a different profile
  const switchProfile = useCallback((profileId: string) => {
    const profile = allProfiles.find(p => p.id === profileId);
    if (!profile) return;

    saveActiveProfileId(profileId);
    setUserProfile(profile);

    // Clear whisper cache for fresh generation
    localStorage.removeItem(`seer_daily_whisper_${profileId}`);

    // Generate daily report for new profile
    try {
      const report = generatePersonalDailyReport(profile);
      setDailyReport(report);
    } catch (err) {
      console.error('Failed to generate daily report:', err);
    }
  }, [allProfiles]);

  // Delete a profile
  const deleteProfile = useCallback((profileId: string) => {
    setAllProfiles(prev => {
      const updated = prev.filter(p => p.id !== profileId);
      saveProfiles(updated);

      // If we deleted the active profile, switch to first remaining
      if (userProfile?.id === profileId) {
        if (updated.length > 0) {
          const next = updated[0];
          saveActiveProfileId(next.id);
          setUserProfile(next);
          try {
            const report = generatePersonalDailyReport(next);
            setDailyReport(report);
          } catch { /* ignore */ }
        } else {
          // No profiles left — return to onboarding
          localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
          setUserProfile(null);
          setDailyReport(null);
        }
      }

      // Clean up whisper cache for deleted profile
      localStorage.removeItem(`seer_daily_whisper_${profileId}`);

      return updated;
    });
  }, [userProfile]);

  // Refresh daily report
  const refreshDailyReport = useCallback(() => {
    if (!userProfile) return;

    try {
      const report = generatePersonalDailyReport(userProfile);
      setDailyReport(report);
    } catch (err) {
      console.error('Failed to refresh daily report:', err);
    }
  }, [userProfile]);

  // Clear all profiles
  const clearProfile = useCallback(() => {
    localStorage.removeItem(PROFILES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    setAllProfiles([]);
    setUserProfile(null);
    setDailyReport(null);
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    userProfile,
    dailyReport,
    allProfiles,
    setUserFromOldBirthData,
    updateProfile,
    switchProfile,
    deleteProfile,
    refreshDailyReport,
    clearProfile
  };
}
