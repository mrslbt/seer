/**
 * Analytics — PostHog event tracking
 *
 * Tracks key user actions without being creepy.
 * PostHog handles product analytics (funnels, events, retention).
 * Cloudflare Web Analytics handles page views (added via script tag in index.html).
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let initialized = false;

/**
 * Initialize PostHog — call once at app startup
 */
export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST || 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    autocapture: false,        // we track manually — cleaner data
    capture_pageview: true,    // capture page views with correct domain
    capture_pageleave: true,
    persistence: 'localStorage',
    disable_session_recording: true,  // no session replays needed
  });

  initialized = true;
}

/**
 * Track a custom event
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/**
 * Identify a user (by profile ID, no PII)
 */
export function identifyUser(profileId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(profileId, traits);
}

/**
 * Reset identity on profile switch
 */
export function resetUser(): void {
  if (!initialized) return;
  posthog.reset();
}

// ── Convenience trackers for key events ──

export function trackQuestionAsked(tab: string, questionMode: string): void {
  track('question_asked', { tab, question_mode: questionMode });
}

export function trackTabSwitched(from: string, to: string): void {
  track('tab_switched', { from, to });
}

export function trackProfileCreated(): void {
  track('profile_created');
}

export function trackReadingShared(): void {
  track('reading_shared');
}

export function trackPartnerSelected(): void {
  track('partner_selected');
}

export function trackLanguageChanged(lang: string): void {
  track('language_changed', { lang });
}

export function trackVisionLimitHit(count: number): void {
  track('vision_limit_hit', { daily_count: count });
}
