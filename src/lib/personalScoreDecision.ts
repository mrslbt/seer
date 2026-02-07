/**
 * Personal Score Decision
 *
 * This is the NEW scoring system that uses YOUR personal daily report
 * to answer questions. No more generic transits - this is about YOU.
 */

import type { QuestionCategory, Verdict, ScoringResult, ScoringFactor } from '../types/astrology';
import { PersonalDailyReport } from './personalDailyReport';
import {
  classifyQuestionWithConfidence,
  detectActionPolarity,
  hasNegativeIntent,
  ActionPolarity
} from './scoreDecision';

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
  spiritual: 'spiritual'
};

/**
 * Convert category score (1-10) to verdict
 *
 * STRICT THRESHOLDS for risky actions (gambling, buying crypto, etc.)
 * Your natal chart (Venus/Mars in Pisces) already penalizes your base money score
 * So we need HIGH scores (7+) to say YES to risky financial moves
 */
function scoreToVerdict(score: number, polarity: ActionPolarity): Verdict {
  // For PULL actions (rest, retreat), invert the logic
  // High energy days are BAD for resting
  if (polarity === 'pull') {
    score = 11 - score; // Flip: 10 becomes 1, 1 becomes 10
  }

  // STRICT thresholds - be conservative with YES
  if (score >= 8) return 'HARD_YES';   // Only 8-10 is confident YES
  if (score >= 7) return 'SOFT_YES';   // 7 is cautious yes
  if (score === 6) return 'NEUTRAL';   // 6 is truly neutral
  if (score >= 4) return 'SOFT_NO';    // 4-5 = lean NO (be cautious!)
  return 'HARD_NO';                     // 1-3 = definite NO
}

/**
 * Flip verdict for negative questions
 */
function flipVerdict(verdict: Verdict): Verdict {
  const flips: Record<Verdict, Verdict> = {
    'HARD_YES': 'HARD_NO',
    'SOFT_YES': 'SOFT_NO',
    'NEUTRAL': 'NEUTRAL',
    'SOFT_NO': 'SOFT_YES',
    'HARD_NO': 'HARD_YES',
    'UNCLEAR': 'UNCLEAR'
  };
  return flips[verdict];
}

/**
 * Score a question against the user's personal daily report
 * This is the main function that powers the personalized 8-ball
 */
export function scorePersonalDecision(
  question: string,
  report: PersonalDailyReport
): ScoringResult {
  const { category: questionCategory, confidence } = classifyQuestionWithConfidence(question);
  const isNegativeQuestion = hasNegativeIntent(question);
  const actionPolarity = detectActionPolarity(question);
  const factors: ScoringFactor[] = [];

  // If question is too vague, return UNCLEAR
  if (confidence < 0.25) {
    factors.push({
      description: 'Question unclear',
      points: 0,
      source: `Confidence: ${Math.round(confidence * 100)}%`
    });
    return {
      verdict: 'UNCLEAR',
      score: 0,
      factors,
      category: questionCategory
    };
  }

  // Get the category from the report
  const reportCategory = CATEGORY_MAP[questionCategory];
  const categoryScore = report.categories[reportCategory];

  // Base score from category
  factors.push({
    description: `${reportCategory} energy: ${categoryScore.score}/10`,
    points: (categoryScore.score - 5) * 10,
    source: `Daily ${reportCategory} score`
  });

  // Factor in action polarity
  if (actionPolarity === 'push') {
    if (categoryScore.score >= 7) {
      factors.push({
        description: 'Energy supports action',
        points: 10,
        source: 'Action polarity'
      });
    } else if (categoryScore.score <= 4) {
      factors.push({
        description: 'Low energy for this',
        points: -15,
        source: 'Action polarity'
      });
    }
  } else if (actionPolarity === 'pull') {
    if (categoryScore.score <= 4) {
      factors.push({
        description: 'Good for rest',
        points: 15,
        source: 'Action polarity'
      });
    } else if (categoryScore.score >= 7) {
      factors.push({
        description: 'High energy resists rest',
        points: -10,
        source: 'Action polarity'
      });
    }
  }

  // Add key transit impacts (simplified)
  const relevantTransits = report.keyTransits.filter(t =>
    t.affectedCategories.includes(questionCategory as any)
  );

  for (const [i, transitData] of relevantTransits.slice(0, 3).entries()) {
    const weight = i === 0 ? 1 : i === 1 ? 0.6 : 0.3; // Diminishing returns
    const basePoints = transitData.impact === 'positive' ? 10 :
                       transitData.impact === 'negative' ? -10 : 0;
    const impactPoints = Math.round(basePoints * weight);
    factors.push({
      description: transitData.interpretation,
      points: impactPoints,
      source: 'Transit'
    });
  }

  // Moon phase influence
  if (actionPolarity === 'push' && report.moonPhase.name.includes('Waning')) {
    factors.push({
      description: `${report.moonPhase.name}`,
      points: -8,
      source: 'Moon phase'
    });
  }
  if (actionPolarity === 'push' && report.moonPhase.name.includes('Waxing')) {
    factors.push({
      description: `${report.moonPhase.name}`,
      points: 6,
      source: 'Moon phase'
    });
  }
  if (actionPolarity === 'pull' && report.moonPhase.name.includes('Waning')) {
    factors.push({
      description: `${report.moonPhase.name}`,
      points: 6,
      source: 'Moon phase'
    });
  }

  // Retrograde warnings
  for (const retro of report.retrogrades) {
    if (
      (retro.planet === 'mercury' && ['communication', 'career'].includes(questionCategory)) ||
      (retro.planet === 'venus' && ['love', 'money'].includes(questionCategory)) ||
      (retro.planet === 'mars' && actionPolarity === 'push')
    ) {
      factors.push({
        description: `${retro.planet.charAt(0).toUpperCase() + retro.planet.slice(1)} retrograde`,
        points: -12,
        source: 'Retrograde'
      });
    }
  }

  // Calculate final score
  let totalScore = factors.reduce((sum, f) => sum + f.points, 0);

  // Clamp to -100 to +100
  const clampedScore = Math.max(-100, Math.min(100, totalScore));

  // Get verdict based on category score and polarity
  // THE CATEGORY SCORE IS THE PRIMARY FACTOR - it includes your natal modifiers
  let verdict = scoreToVerdict(categoryScore.score, actionPolarity);

  // Only make MINOR adjustments based on other factors
  // NEVER override a NO verdict to YES just because of accumulated points
  if (verdict === 'NEUTRAL') {
    // Neutral can be nudged either way
    if (clampedScore >= 20) verdict = 'SOFT_YES';
    if (clampedScore <= -20) verdict = 'SOFT_NO';
  } else if (verdict === 'SOFT_NO' && clampedScore <= -30) {
    // Can strengthen a NO but never flip to YES
    verdict = 'HARD_NO';
  } else if (verdict === 'SOFT_YES' && clampedScore >= 30) {
    // Can strengthen a YES
    verdict = 'HARD_YES';
  }
  // IMPORTANT: We NEVER flip a NO to YES or vice versa
  // Your natal chart says be cautious with money = stay cautious

  // Flip for negative questions
  if (isNegativeQuestion) {
    verdict = flipVerdict(verdict);
  }

  return {
    verdict,
    score: isNegativeQuestion ? -clampedScore : clampedScore,
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    category: questionCategory
  };
}

/**
 * Get simple advice based on verdict - CLEAR YES/NO answers
 */
export function getSimpleAdvice(
  verdict: Verdict,
  _category: QuestionCategory,
  _report: PersonalDailyReport
): string {
  // Direct, clear answers - the whole point is the scoring system!
  const responses: Record<Verdict, string> = {
    HARD_YES: "Yes",
    SOFT_YES: "Leaning Yes",
    NEUTRAL: "Uncertain",
    SOFT_NO: "Leaning No",
    HARD_NO: "No",
    UNCLEAR: "Ask clearer"
  };

  return responses[verdict];
}

// Keep old function name for backwards compatibility but use new logic
export function getSassyAdvice(
  verdict: Verdict,
  category: QuestionCategory,
  report: PersonalDailyReport
): string {
  return getSimpleAdvice(verdict, category, report);
}

/**
 * Format the category advice from the report
 */
export function formatCategoryAdvice(
  category: QuestionCategory,
  report: PersonalDailyReport
): { goodFor: string[]; badFor: string[]; advice: string } {
  const reportCategory = CATEGORY_MAP[category];
  const categoryScore = report.categories[reportCategory];

  return {
    goodFor: categoryScore.goodFor,
    badFor: categoryScore.badFor,
    advice: categoryScore.advice
  };
}
