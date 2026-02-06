/**
 * Interpreter Layer
 *
 * Generates human-readable explanations from the astro context and verdict.
 * This module is designed to work with or without an LLM backend.
 * The standalone version uses deterministic template-based generation.
 */

import type {
  AstroContext,
  ScoringResult,
  Reading,
  Verdict,
  QuestionCategory,
  Planet,
} from '../types/astrology';
import { formatTransitAspect, PLANET_SYMBOLS } from './astroEngine';
import { getVerdictText } from './scoreDecision';

// Planet meanings for explanations
const PLANET_MEANINGS: Record<Planet, { keyword: string; rules: string }> = {
  Sun: { keyword: 'identity & will', rules: 'your core self, vitality, ego, life purpose' },
  Moon: { keyword: 'emotions & instincts', rules: 'feelings, intuition, emotional needs, subconscious' },
  Mercury: { keyword: 'mind & communication', rules: 'thinking, speaking, writing, learning, travel' },
  Venus: { keyword: 'love & values', rules: 'relationships, beauty, pleasure, money, self-worth' },
  Mars: { keyword: 'drive & action', rules: 'energy, ambition, aggression, courage, desire' },
  Jupiter: { keyword: 'growth & luck', rules: 'expansion, optimism, wisdom, abundance, opportunities' },
  Saturn: { keyword: 'structure & lessons', rules: 'discipline, responsibility, limitations, karma, time' },
  Uranus: { keyword: 'change & rebellion', rules: 'innovation, freedom, sudden shifts, awakening' },
  Neptune: { keyword: 'dreams & illusion', rules: 'spirituality, imagination, confusion, escapism' },
  Pluto: { keyword: 'transformation & power', rules: 'rebirth, intensity, secrets, control, the unconscious' },
};

type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

// Generate transit explanation based on transit planet, natal planet, and aspect
function getTransitExplanation(
  transitPlanet: Planet,
  natalPlanet: Planet,
  aspectType: AspectType,
  isPositive: boolean
): { summary: string; meaning: string; translation: string } {
  const transit = PLANET_MEANINGS[transitPlanet];
  const natal = PLANET_MEANINGS[natalPlanet];

  // Create summary like "Moon supports natal Sun"
  const verb = isPositive ? 'supports' : 'challenges';
  const summary = `${transitPlanet} ${verb} natal ${natalPlanet}`;

  // Create meaning based on aspect type
  let meaning = '';
  let translation = '';

  if (aspectType === 'conjunction') {
    meaning = `Today's ${transit.keyword} energy merges directly with your natal ${natal.keyword}.`;
    if (isPositive) {
      translation = `Your ${natalPlanet.toLowerCase()} nature is amplified. What you feel IS what you are right now.`;
    } else {
      translation = `Intensity is high. The ${transitPlanet.toLowerCase()} energy may overwhelm your usual ${natalPlanet.toLowerCase()} expression.`;
    }
  } else if (aspectType === 'trine' || aspectType === 'sextile') {
    meaning = `Today's ${transit.keyword} flows harmoniously with your natal ${natal.keyword}.`;
    if (transitPlanet === 'Moon' && natalPlanet === 'Sun') {
      translation = `You're emotionally in sync with who you are. Acting feels natural, not forced.`;
    } else if (transitPlanet === 'Moon' && natalPlanet === 'Moon') {
      translation = `Your inner emotional state is stable and reinforced. Feelings are clear, not conflicted.`;
    } else if (transitPlanet === 'Mercury' && natalPlanet === 'Sun') {
      translation = `Thoughts and words align with intention. You can express what you mean clearly.`;
    } else if (transitPlanet === 'Venus') {
      translation = `Charm, attraction, and social grace come easily. Relationships flow smoothly.`;
    } else if (transitPlanet === 'Mars') {
      translation = `Energy and courage are available when needed. Action feels right, not reckless.`;
    } else if (transitPlanet === 'Jupiter') {
      translation = `Luck and expansion favor you. Opportunities present themselves naturally.`;
    } else if (transitPlanet === 'Uranus') {
      translation = `Sudden courage or a break from hesitation is favored. Bold moves feel easier.`;
    } else {
      translation = `The cosmic energy supports your natural ${natalPlanet.toLowerCase()} expression. Things click into place.`;
    }
  } else if (aspectType === 'square') {
    meaning = `Today's ${transit.keyword} creates tension with your natal ${natal.keyword}.`;
    if (transitPlanet === 'Saturn') {
      translation = `Obstacles or delays test your resolve. What feels blocked is actually being strengthened.`;
    } else if (transitPlanet === 'Mars') {
      translation = `Friction may spark conflict or frustration. Channel the energy, don't let it explode.`;
    } else if (transitPlanet === 'Uranus') {
      translation = `Restlessness or unexpected disruptions. The urge to break free may be premature.`;
    } else {
      translation = `Pressure creates diamonds—or cracks. How you handle this tension matters.`;
    }
  } else if (aspectType === 'opposition') {
    meaning = `Today's ${transit.keyword} stands opposite your natal ${natal.keyword}, creating awareness through contrast.`;
    translation = `What you encounter externally reflects something internal. Others may trigger important realizations.`;
  }

  return { summary, meaning, translation };
}

// Retrograde explanations with translations
const RETROGRADE_EXPLANATIONS: Record<Planet, { meaning: string; translation: string }> = {
  Mercury: {
    meaning: 'Mercury retrograde slows communication, technology, and travel.',
    translation: 'Double-check everything. Miscommunications are likely. Not ideal for signing contracts or starting new projects.',
  },
  Venus: {
    meaning: 'Venus retrograde turns attention inward on love and values.',
    translation: 'Past relationships may resurface. Avoid new romances or major purchases. Reflect on what you truly value.',
  },
  Mars: {
    meaning: 'Mars retrograde dampens drive and initiative.',
    translation: 'Actions may backfire or need revision. Channel energy into finishing, not starting. Avoid major confrontations.',
  },
  Jupiter: {
    meaning: 'Jupiter retrograde shifts growth inward.',
    translation: 'External expansion slows. Focus on internal wisdom and spiritual growth rather than material gains.',
  },
  Saturn: {
    meaning: 'Saturn retrograde loosens restrictions temporarily.',
    translation: 'Review commitments and responsibilities. Karma from past actions may surface for resolution.',
  },
  Uranus: {
    meaning: 'Uranus retrograde internalizes the urge for change.',
    translation: 'Revolutionary energy turns inward. Process needed changes before acting on them.',
  },
  Neptune: {
    meaning: 'Neptune retrograde clarifies illusions.',
    translation: 'Rose-colored glasses come off. Dreams may be tested against reality.',
  },
  Pluto: {
    meaning: 'Pluto retrograde deepens transformation.',
    translation: 'Intense inner work. Buried issues surface for healing. Power dynamics shift internally.',
  },
  Sun: { meaning: '', translation: '' },
  Moon: { meaning: '', translation: '' },
};

// Moon phase explanations with translations
const MOON_PHASE_EXPLANATIONS: Record<string, { meaning: string; translation: string }> = {
  'New Moon': {
    meaning: 'The New Moon represents pure potential and new beginnings.',
    translation: 'Set intentions now. The energy supports fresh starts and planting seeds. Visibility is low—trust the process.',
  },
  'Waxing Crescent': {
    meaning: 'Energy builds as the Moon grows toward first quarter.',
    translation: 'Take action on intentions. The cosmos supports initiative. Momentum is building.',
  },
  'First Quarter': {
    meaning: 'The First Quarter Moon brings the first test of your intentions.',
    translation: 'Challenges arise to strengthen your resolve. Adjust your approach. Push through or pivot.',
  },
  'Waxing Gibbous': {
    meaning: 'Energy continues building toward the Full Moon climax.',
    translation: 'Refine and adjust. Fine-tune before the big reveal. Almost there.',
  },
  'Full Moon': {
    meaning: 'Full Moon illumination reveals truth and brings matters to completion.',
    translation: 'Emotions run high. What was hidden becomes visible. Harvest time—see what you\'ve cultivated.',
  },
  'Waning Gibbous': {
    meaning: 'Energy shifts toward gratitude and sharing after the Full Moon peak.',
    translation: 'Process what was revealed. Share wisdom. Begin releasing what no longer serves.',
  },
  'Last Quarter': {
    meaning: 'The Last Quarter Moon prompts release and letting go.',
    translation: 'Clear away the old. Make space for new cycles. Forgiveness over resentment.',
  },
  'Waning Crescent': {
    meaning: 'The final phase before renewal—a time of rest and reflection.',
    translation: 'Surrender and prepare. Healing happens in stillness. The next cycle approaches.',
  },
};

/**
 * Extract both transit and natal planets from factor source
 */
function extractPlanets(source: string): { transit: Planet | null; natal: Planet | null } {
  const planets: Planet[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
  ];

  let transit: Planet | null = null;
  let natal: Planet | null = null;

  // Pattern: "TransitPlanet aspect NatalPlanet"
  for (const planet of planets) {
    if (source.includes(planet)) {
      if (!transit) {
        transit = planet;
      } else if (!natal) {
        natal = planet;
        break;
      }
    }
  }

  return { transit, natal };
}

/**
 * Extract aspect type from source string
 */
function extractAspectType(source: string): AspectType | null {
  const aspects: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
  const lowerSource = source.toLowerCase();

  for (const aspect of aspects) {
    if (lowerSource.includes(aspect)) {
      return aspect;
    }
  }
  return null;
}

/**
 * Represents a reason with detailed explanation
 */
export interface DetailedReason {
  summary: string;
  meaning?: string;
  translation?: string;
}

/**
 * Generate detailed reasons based on specific transits
 */
function generateDetailedReasons(
  scoring: ScoringResult,
  context: AstroContext
): DetailedReason[] {
  const reasons: DetailedReason[] = [];

  // Add top factors as reasons (up to 4)
  const topFactors = scoring.factors.slice(0, 4);

  for (const factor of topFactors) {
    const { transit, natal } = extractPlanets(factor.source);
    const aspectType = extractAspectType(factor.source);

    // Retrograde check
    if (factor.source.includes('retrograde') && transit) {
      const retroExplanation = RETROGRADE_EXPLANATIONS[transit];
      if (retroExplanation.meaning) {
        reasons.push({
          summary: `${PLANET_SYMBOLS[transit]} ${transit} is retrograde`,
          meaning: retroExplanation.meaning,
          translation: retroExplanation.translation,
        });
        continue;
      }
    }

    // Moon phase check
    if (factor.source.includes('phase')) {
      const phase = context.ephemeris.moonPhase;
      const phaseExplanation = MOON_PHASE_EXPLANATIONS[phase];
      if (phaseExplanation) {
        reasons.push({
          summary: `${phase}`,
          meaning: phaseExplanation.meaning,
          translation: phaseExplanation.translation,
        });
        continue;
      }
    }

    // Transit aspect explanation
    if (transit && natal && aspectType) {
      const isPositive = factor.points > 0;
      const explanation = getTransitExplanation(transit, natal, aspectType, isPositive);
      reasons.push({
        summary: `${PLANET_SYMBOLS[transit]} ${explanation.summary}`,
        meaning: explanation.meaning,
        translation: explanation.translation,
      });
    } else {
      // Fallback for other factors
      reasons.push({
        summary: factor.description,
        meaning: `This astrological factor ${factor.points > 0 ? 'supports' : 'challenges'} your question.`,
        translation: factor.points > 0
          ? 'The cosmic energy is working in your favor here.'
          : 'Some resistance or caution is indicated.',
      });
    }
  }

  // Add moon phase if not already included
  const hasMoonPhase = reasons.some(r => r.summary.includes('Moon'));
  if (!hasMoonPhase && reasons.length < 4) {
    const phase = context.ephemeris.moonPhase;
    const phaseExplanation = MOON_PHASE_EXPLANATIONS[phase];
    if (phaseExplanation && (phase === 'Full Moon' || phase === 'New Moon')) {
      reasons.push({
        summary: `🌙 ${phase}`,
        meaning: phaseExplanation.meaning,
        translation: phaseExplanation.translation,
      });
    }
  }

  // Add Mercury retrograde warning if applicable
  if (context.ephemeris.retrogrades.includes('Mercury')) {
    const hasMercury = reasons.some(r => r.summary.toLowerCase().includes('mercury'));
    if (!hasMercury && reasons.length < 4) {
      const retroExplanation = RETROGRADE_EXPLANATIONS['Mercury'];
      reasons.push({
        summary: `☿ Mercury is retrograde`,
        meaning: retroExplanation.meaning,
        translation: retroExplanation.translation,
      });
    }
  }

  return reasons.slice(0, 4);
}

/**
 * Select advice based on verdict - CLEAR YES/NO answers
 */
function selectAdvice(verdict: Verdict, _category: QuestionCategory): string {
  // Direct, clear answers - not sassy templates
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

/**
 * Generate a complete reading (standalone, no LLM needed)
 */
export function generateReading(
  _question: string,
  context: AstroContext,
  scoring: ScoringResult
): Reading {
  const detailedReasons = generateDetailedReasons(scoring, context);
  const advice = selectAdvice(scoring.verdict, scoring.category);

  return {
    verdict: scoring.verdict,
    reasons: detailedReasons.map(r => r.summary),
    reasonDetails: detailedReasons.map(r =>
      r.meaning && r.translation
        ? `${r.meaning}\n\n→ ${r.translation}`
        : undefined
    ),
    advice,
    astroContext: context,
    scoring
  };
}

/**
 * Generate a prompt for an LLM to interpret the reading
 * (Use this if you want to integrate with an LLM API)
 */
export function generateLLMPrompt(
  question: string,
  context: AstroContext,
  scoring: ScoringResult
): string {
  const transitSummary = context.transits
    .slice(0, 5)
    .map(formatTransitAspect)
    .join('\n');

  const factorSummary = scoring.factors
    .slice(0, 5)
    .map(f => `- ${f.description} (${f.points > 0 ? '+' : ''}${f.points})`)
    .join('\n');

  return `You are a mystical astrology oracle with an 8-bit personality. Interpret this reading.

QUESTION: "${question}"
CATEGORY: ${scoring.category}

VERDICT (DO NOT CONTRADICT): ${getVerdictText(scoring.verdict)}
SCORE: ${scoring.score}/100

TODAY'S ASTRO DATA:
- Moon Phase: ${context.ephemeris.moonPhase} (${context.ephemeris.moonPhasePercent}% illuminated)
- Moon Sign: ${context.ephemeris.placements.find(p => p.planet === 'Moon')?.sign}
- Retrogrades: ${context.ephemeris.retrogrades.length > 0 ? context.ephemeris.retrogrades.join(', ') : 'None'}

KEY TRANSITS TO NATAL:
${transitSummary}

SCORING FACTORS:
${factorSummary}

VIBE TAGS: ${context.vibeTags.join(', ')}

INSTRUCTIONS:
1. The verdict is ${getVerdictText(scoring.verdict)}. You MUST support this verdict.
2. Provide 2-4 SHORT bullet-point reasons citing specific transits
3. Give ONE actionable piece of advice (one sentence)
4. Use a mystical but grounded tone
5. Keep responses brief and punchy (8-bit oracle style)

FORMAT YOUR RESPONSE AS:
REASONS:
• [reason 1]
• [reason 2]
• [reason 3]

ADVICE: [one sentence of actionable guidance]`;
}

/**
 * Parse LLM response into Reading format
 * (Use this if integrating with an LLM API)
 */
export function parseLLMResponse(
  response: string,
  context: AstroContext,
  scoring: ScoringResult
): Reading {
  // Extract reasons
  const reasonsMatch = response.match(/REASONS:\s*([\s\S]*?)(?=ADVICE:|$)/i);
  let reasons: string[] = [];

  if (reasonsMatch) {
    reasons = reasonsMatch[1]
      .split(/[•\-\n]/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .slice(0, 4);
  }

  // Extract advice
  const adviceMatch = response.match(/ADVICE:\s*(.+)/i);
  const advice = adviceMatch
    ? adviceMatch[1].trim()
    : selectAdvice(scoring.verdict, scoring.category);

  // Fallback if parsing failed
  if (reasons.length === 0) {
    const detailed = generateDetailedReasons(scoring, context);
    reasons = detailed.map(r => r.summary);
  }

  return {
    verdict: scoring.verdict,
    reasons,
    advice,
    astroContext: context,
    scoring
  };
}
