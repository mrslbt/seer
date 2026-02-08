/**
 * Insight Article Generator
 *
 * Generates a full personalized article/reading for a given category
 * based on the user's daily report. This is what powers the "Why?" button.
 */

import type { QuestionCategory, Verdict, AstroContext } from '../types/astrology';
import type { PersonalDailyReport, CategoryScore } from './personalDailyReport';

export interface InsightArticle {
  title: string;
  score: number;
  sections: {
    heading: string;
    body: string;
  }[];
}

/**
 * Category display names and themes
 */
const CATEGORY_THEMES: Record<string, { title: string; noun: string; icon: string }> = {
  love: { title: "Matters of the Heart", noun: "love", icon: "Venus" },
  career: { title: "Your Professional Path", noun: "career", icon: "Saturn" },
  money: { title: "Fortune & Abundance", noun: "finances", icon: "Jupiter" },
  health: { title: "Vitality & Wellbeing", noun: "health", icon: "Mars" },
  social: { title: "Connections & Community", noun: "social life", icon: "Mercury" },
  decisions: { title: "Clarity of Mind", noun: "judgment", icon: "The Sun" },
  creativity: { title: "The Creative Flame", noun: "creativity", icon: "Neptune" },
  spiritual: { title: "The Inner World", noun: "spiritual path", icon: "The Moon" },
};

/**
 * Map question categories to report categories
 */
const CATEGORY_MAP: Record<QuestionCategory, keyof PersonalDailyReport['categories']> = {
  love: 'love',
  career: 'career',
  money: 'money',
  communication: 'social',
  conflict: 'decisions',
  timing: 'decisions',
  health: 'health',
  social: 'social',
  decisions: 'decisions',
  creativity: 'creativity',
  spiritual: 'spiritual',
};

/**
 * Describe the energy level poetically
 */
function describeEnergy(score: number): string {
  if (score >= 9) return "An extraordinary surge of cosmic energy flows through this domain. Rarely do the stars align with such conviction.";
  if (score >= 7) return "Strong currents of celestial favor run through this area of your life. The cosmos lean decidedly in your direction.";
  if (score >= 6) return "A steady, supportive energy surrounds this aspect of your existence. The stars offer quiet encouragement.";
  if (score === 5) return "The cosmic scales rest in perfect balance. Neither blessing nor challenge dominates. This is a day of equilibrium.";
  if (score >= 4) return "A gentle headwind blows against your efforts here. The cosmos counsel patience rather than force.";
  if (score >= 2) return "The celestial currents run contrary to progress in this sphere. Resistance is not punishment but redirection.";
  return "The stars stand firmly in opposition. This is the cosmos protecting you from a path best avoided today.";
}

/**
 * Format the score as a poetic assessment
 */
function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 7) return "Favorable";
  if (score >= 6) return "Steady";
  if (score === 5) return "Balanced";
  if (score >= 4) return "Cautious";
  if (score >= 2) return "Challenged";
  return "Difficult";
}

/**
 * Generate the insight article for a given category
 */
export function generateInsightArticle(
  category: QuestionCategory,
  report: PersonalDailyReport
): InsightArticle {
  const reportCat = CATEGORY_MAP[category];
  const catScore: CategoryScore = report.categories[reportCat];
  const theme = CATEGORY_THEMES[reportCat] || CATEGORY_THEMES.decisions;

  const sections: { heading: string; body: string }[] = [];

  // Section 1: Energy overview
  sections.push({
    heading: "Today's Energy",
    body: describeEnergy(catScore.score),
  });

  // Section 2: The reasoning (why the cosmos say what they say)
  // Separate natal warnings, moon phase reasons, and transit reasons
  if (catScore.reasoning.length > 0) {
    const transitReasons = catScore.reasoning.filter(r => r.startsWith('Transit'));
    const moonReasons = catScore.reasoning.filter(r =>
      !r.startsWith('Transit') && (r.includes('Moon') || r.includes('moon') || r.includes('Waning') || r.includes('Waxing'))
    );
    const natalReasons = catScore.reasoning.filter(r =>
      !r.startsWith('Transit') && !moonReasons.includes(r)
    );
    const visibleReasons = [...natalReasons, ...moonReasons, ...transitReasons.slice(0, 3)];
    const overflow = transitReasons.length > 3 ? transitReasons.length - 3 : 0;

    let reasoningText = visibleReasons
      .map((r) => `\u2022 ${r}`)
      .join("\n");

    if (overflow > 0) {
      reasoningText += `\n\n+${overflow} more transit${overflow > 1 ? 's' : ''} in Active Transits below`;
    }

    sections.push({
      heading: "What the Stars Reveal",
      body: reasoningText,
    });
  }

  // Section 3: Favorable activities
  if (catScore.goodFor.length > 0) {
    sections.push({
      heading: "Favorable For",
      body: catScore.goodFor.map((g) => `\u2022 ${g}`).join("\n"),
    });
  }

  // Section 4: Activities to avoid
  if (catScore.badFor.length > 0) {
    sections.push({
      heading: "Best Avoided",
      body: catScore.badFor.map((b) => `\u2022 ${b}`).join("\n"),
    });
  }

  // Section 5: Key transits affecting this category
  const relevantTransits = report.keyTransits.filter((t) =>
    t.affectedCategories.includes(category)
  );
  if (relevantTransits.length > 0) {
    const transitLines = relevantTransits.map((t) => {
      const impact =
        t.impact === "positive" ? "\u2191" : t.impact === "negative" ? "\u2193" : "\u2194";
      return `${impact} ${t.interpretation}`;
    });
    sections.push({
      heading: "Active Transits",
      body: transitLines.join("\n"),
    });
  }

  // Section 6: Retrogrades
  const relevantRetrogrades = report.retrogrades.filter((r) => {
    if (r.planet === "mercury" && ["communication", "career", "social"].includes(category)) return true;
    if (r.planet === "venus" && ["love", "money", "creativity"].includes(category)) return true;
    if (r.planet === "mars" && ["career", "health", "decisions"].includes(category)) return true;
    if (r.planet === "jupiter" && ["money", "career", "spiritual"].includes(category)) return true;
    if (r.planet === "saturn" && ["career", "money", "health"].includes(category)) return true;
    return false;
  });

  if (relevantRetrogrades.length > 0) {
    const retroLines = relevantRetrogrades.map(
      (r) =>
        `${r.planet.charAt(0).toUpperCase() + r.planet.slice(1)} retrograde: ${r.advice}`
    );
    sections.push({
      heading: "Retrograde Influence",
      body: retroLines.join("\n"),
    });
  }

  // Section 7: Moon phase
  sections.push({
    heading: "Lunar Guidance",
    body: `${report.moonPhase.name} \u2014 ${report.moonPhase.advice}`,
  });

  // Section 8: Personal advice
  if (catScore.advice) {
    sections.push({
      heading: "The Oracle Counsels",
      body: catScore.advice,
    });
  }

  return {
    title: theme.title,
    score: catScore.score,
    sections,
  };
}

/**
 * Get the category display name
 */
export function getCategoryDisplayName(category: QuestionCategory): string {
  const reportCat = CATEGORY_MAP[category];
  const theme = CATEGORY_THEMES[reportCat] || CATEGORY_THEMES.decisions;
  return theme.title;
}

/**
 * Get the score label
 */
export function getScoreLabel(score: number): string {
  return scoreLabel(score);
}

/**
 * Verdict to a rough 1-10 score for the fallback article
 */
function verdictToScore(verdict: Verdict): number {
  switch (verdict) {
    case 'HARD_YES': return 9;
    case 'SOFT_YES': return 7;
    case 'NEUTRAL': return 5;
    case 'SOFT_NO': return 3;
    case 'HARD_NO': return 2;
    case 'UNCLEAR': return 5;
    default: return 5;
  }
}

/**
 * Generate a fallback insight article when no PersonalDailyReport is available.
 * Uses the AstroContext (generic transits) to build a simpler reading.
 */
export function generateFallbackArticle(
  category: QuestionCategory,
  verdict: Verdict,
  astroContext: AstroContext
): InsightArticle {
  const reportCat = CATEGORY_MAP[category] || 'decisions';
  const theme = CATEGORY_THEMES[reportCat] || CATEGORY_THEMES.decisions;
  const score = verdictToScore(verdict);

  const sections: { heading: string; body: string }[] = [];

  // Energy overview
  sections.push({
    heading: "Today's Energy",
    body: describeEnergy(score),
  });

  // Moon phase
  const moonDesc = astroContext.ephemeris.moonPhase;
  const moonSign = astroContext.ephemeris.placements.find(p => p.planet === 'Moon');
  if (moonDesc) {
    const moonText = moonSign
      ? `${moonDesc} in ${moonSign.sign}`
      : `${moonDesc}`;
    sections.push({
      heading: "Lunar Guidance",
      body: moonText,
    });
  }

  // Retrogrades
  if (astroContext.ephemeris.retrogrades.length > 0) {
    const retroLines = astroContext.ephemeris.retrogrades.map(
      (p) => `\u2022 ${p} is retrograde`
    );
    sections.push({
      heading: "Retrograde Influence",
      body: retroLines.join("\n"),
    });
  }

  // Vibe tags as general guidance
  if (astroContext.vibeTags.length > 0) {
    const vibeText = astroContext.vibeTags
      .slice(0, 5)
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
      .join(", ");
    sections.push({
      heading: "Cosmic Themes",
      body: `The day carries energies of: ${vibeText}.`,
    });
  }

  // Key transits
  const transits = astroContext.transits.slice(0, 3);
  if (transits.length > 0) {
    const transitLines = transits.map((t) => {
      const aspect = t.type.charAt(0).toUpperCase() + t.type.slice(1);
      return `\u2022 ${t.transitPlanet} ${aspect} your natal ${t.natalPlanet}`;
    });
    sections.push({
      heading: "Active Transits",
      body: transitLines.join("\n"),
    });
  }

  return {
    title: theme.title,
    score,
    sections,
  };
}
