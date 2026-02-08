/**
 * Follow-Up Response Generator
 *
 * After a reading, the user can ask "Tell Me More" or "When will this change?"
 * This generates a deeper, transit-aware response that builds on the original verdict.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';
import type { PersonalDailyReport } from './personalDailyReport';

export type FollowUpType = 'tell_me_more' | 'when_change';

/**
 * Generate a follow-up response based on the original reading context
 */
export function generateFollowUpResponse(
  type: FollowUpType,
  originalVerdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  if (type === 'when_change') {
    return generateTimingResponse(originalVerdict, category, report);
  }
  return generateDeeperInsight(originalVerdict, category, report);
}

function generateDeeperInsight(
  verdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  const pools = DEEPER_INSIGHT_POOLS[verdict] || DEEPER_INSIGHT_POOLS.NEUTRAL;

  // Pick base response
  let response = pick(pools);

  // Enrich with transit context if available
  if (report) {
    const catScore = report.categories[category as keyof typeof report.categories];
    if (catScore) {
      // Add a reasoning fragment from the daily report
      if (catScore.reasoning.length > 0) {
        const reason = catScore.reasoning[0];
        response += ` ${reason}.`;
      }
      // Add good/bad for hints
      if (catScore.goodFor.length > 0) {
        response += ` This energy favors ${catScore.goodFor[0]}.`;
      }
      if (catScore.badFor.length > 0) {
        response += ` Avoid ${catScore.badFor[0]} for now.`;
      }
    }
  }

  return response;
}

function generateTimingResponse(
  verdict: Verdict,
  _category: QuestionCategory,
  report: PersonalDailyReport | null,
): string {
  // Check retrogrades for timing hints
  if (report && report.retrogrades.length > 0) {
    const retro = report.retrogrades[0];
    const retroResponses = [
      `${capitalize(retro.planet)} is retrograde — this energy will shift when it goes direct. ${retro.advice}.`,
      `The retrograde ${capitalize(retro.planet)} is slowing things down. When it stations direct, the path will feel clearer.`,
      `With ${capitalize(retro.planet)} in retrograde, the timing isn't ideal for forcing outcomes. Wait for the station direct.`,
    ];
    return pick(retroResponses);
  }

  // Check moon phase for timing
  if (report) {
    const moonTimingPools: Record<string, string[]> = {
      'New Moon': [
        'The New Moon just seeded this energy. Give it two weeks until the Full Moon for clarity.',
        'This cycle is just beginning. The next Full Moon will illuminate what\'s hidden.',
      ],
      'Waxing Crescent': [
        'The energy is building. By the First Quarter, you\'ll feel the momentum shift.',
        'Early in the cycle — the universe is gathering force. Stay attentive.',
      ],
      'First Quarter': [
        'You\'re at a decision point in the lunar cycle. Action taken now shapes the Full Moon outcome.',
      ],
      'Waxing Gibbous': [
        'The Full Moon approaches. Within days, this situation will reach its peak.',
        'Refinement time — the answer becomes clearer as the moon fills.',
      ],
      'Full Moon': [
        'The Full Moon is here — this is the peak. What you learn now will guide the next two weeks.',
        'Emotions and truths are at their brightest. The energy will settle as the moon wanes.',
      ],
      'Waning Gibbous': [
        'The peak has passed. Integration happens over the coming week.',
        'Gratitude and sharing wisdom is the theme. The intensity will fade.',
      ],
      'Last Quarter': [
        'Release what isn\'t working. The next New Moon in a week offers a fresh start.',
      ],
      'Waning Crescent': [
        'The cycle is almost complete. Rest now — a new beginning comes with the New Moon.',
        'Surrender and reflection. The next New Moon is your reset point.',
      ],
    };

    const pool = moonTimingPools[report.moonPhase.name];
    if (pool) return pick(pool);
  }

  // Fallback timing responses based on verdict
  const timingPools: Record<Verdict, string[]> = {
    HARD_YES: [
      'The window is open now. Don\'t wait too long.',
      'This favorable energy has momentum — act while it lasts.',
    ],
    SOFT_YES: [
      'The energy tilts positive but isn\'t permanent. Move within the next few days.',
      'A gentle current — it won\'t push you forever. Take the step soon.',
    ],
    NEUTRAL: [
      'The energy is balanced and will shift with the next major transit. Stay aware.',
      'Neither pushed nor pulled — the next lunar phase may tip the scales.',
    ],
    SOFT_NO: [
      'Give it a week or two. The friction you feel now will ease.',
      'The resistance is temporary. Let the transits shift before trying again.',
    ],
    HARD_NO: [
      'This is not the time. Wait for a significant shift — possibly the next New or Full Moon.',
      'Major resistance. The energy needs a full lunar cycle to reset.',
    ],
    UNCLEAR: [
      'The timing is genuinely ambiguous. Wait for a clearer signal from the cosmos.',
      'Too many forces in play. Give it time — clarity will come.',
    ],
  };

  return pick(timingPools[verdict] || timingPools.NEUTRAL);
}

const DEEPER_INSIGHT_POOLS: Record<Verdict, string[]> = {
  HARD_YES: [
    'The alignment is unusually strong. This isn\'t just favorable — it\'s rare.',
    'Multiple forces converge in your favor. The cosmos rarely aligns this clearly.',
    'Your natal chart amplifies today\'s energy. This is deeply personal.',
  ],
  SOFT_YES: [
    'The energy leans positive, but with caveats. Proceed with awareness.',
    'There\'s support here, but it asks something of you in return.',
    'The stars favor this — with one condition: be honest with yourself about your motives.',
  ],
  NEUTRAL: [
    'The cosmos is genuinely neutral here. Your free will is the deciding factor.',
    'Neither encouraged nor warned. This decision belongs entirely to you.',
    'The universe is watching, not guiding. Trust your own judgment.',
  ],
  SOFT_NO: [
    'The resistance is real but not absolute. Timing or approach may be the issue.',
    'Something doesn\'t align — but it could be temporary.',
    'The cosmos hesitates. Ask yourself what you might be overlooking.',
  ],
  HARD_NO: [
    'The forces are clear: this path meets significant resistance right now.',
    'The cosmos doesn\'t say "never" — but it says "not this way, not right now."',
    'There\'s a lesson in this resistance. What is the universe trying to protect you from?',
  ],
  UNCLEAR: [
    'The signals are genuinely mixed. This is the cosmos being honest about complexity.',
    'Not every question has a clean answer. Sit with the ambiguity.',
    'The universe acknowledges the question but offers no easy path.',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
