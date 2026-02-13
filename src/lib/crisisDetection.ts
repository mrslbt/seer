/**
 * Crisis detection — catches user input that suggests distress.
 *
 * When triggered, the app shows crisis resources instead of
 * generating an astrological reading. This is a safety measure,
 * not a clinical tool.
 */

const CRISIS_PATTERNS = [
  /\b(kill|end)\s+(my|him|her|them)self\b/i,
  /\bsuicid/i,
  /\bself[- ]?harm/i,
  /\bwant\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bend\s+(my|it\s+all|everything)\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|go\s+on)\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bcan'?t\s+(go\s+on|take\s+(it|this)\s+anymore)\b/i,
  /\bhurt\s+myself\b/i,
  /\bcutting\s+myself\b/i,
];

export function detectCrisis(input: string): boolean {
  const text = input.toLowerCase().trim();
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
}

export const CRISIS_RESPONSE = `You are not alone. What you are feeling matters, and this app is not the right place for this.

Please reach out to someone who can help:

US: Call or text 988 (24/7)
UK: Call 116 123 (Samaritans, 24/7)
Canada: Call or text 988 (24/7)
Australia: Call 13 11 14 (Lifeline, 24/7)
EU: Call 116 123
Japan: 0120-279-338 (よりそいホットライン, 24/7)
Vietnam: 1800 599 920
International: findahelpline.com

You deserve support from a real person, not a reading from the stars.`;
