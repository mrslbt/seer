/**
 * Score Decision Layer
 *
 * Classifies user questions and scores the astrological context
 * to produce a deterministic verdict.
 */

import type {
  AstroContext,
  QuestionCategory,
  Verdict,
  ScoringResult,
  ScoringFactor,
  TransitAspect,
  Planet,
  AspectType,
} from '../types/astrology';

// Keywords for question classification
// Note: Use word boundaries in matching to avoid "workout" matching "work"
const CATEGORY_KEYWORDS: Record<QuestionCategory, string[]> = {
  love: [
    'love', 'relationship', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife',
    'date', 'dating', 'romance', 'romantic', 'crush', 'ex', 'marriage', 'marry',
    'confess', 'feelings', 'heart', 'soulmate', 'attraction', 'attracted', 'chemistry',
    'breakup', 'break up', 'together', 'commitment', 'kiss', 'text', 'message him', 'message her'
  ],
  career: [
    'job', 'career', 'promotion', 'boss', 'interview', 'hire', 'hired',
    'quit job', 'resign', 'business', 'company', 'professional', 'office', 'salary',
    'raise', 'position', 'role', 'project', 'deadline', 'meeting', 'presentation',
    'opportunity', 'offer', 'negotiate', 'client', 'coworker', 'colleague'
    // Note: 'work' removed - too ambiguous (workout, work out, etc.)
  ],
  money: [
    'money', 'financial', 'finance', 'invest', 'investment', 'stock', 'crypto',
    'buy', 'purchase', 'sell', 'loan', 'debt', 'savings', 'budget', 'expensive',
    'afford', 'rich', 'wealth', 'income', 'spend', 'spending', 'bank', 'mortgage',
    'rent', 'price', 'cost', 'pay', 'payment',
    // Gambling and risky financial moves
    'gamble', 'gambling', 'bet', 'betting', 'casino', 'lottery', 'bitcoin', 'btc',
    'ethereum', 'eth', 'trade', 'trading', 'forex', 'options', 'futures'
  ],
  communication: [
    'tell', 'say', 'talk', 'speak', 'conversation', 'communicate', 'email',
    'call', 'phone', 'respond', 'reply', 'discuss', 'explain', 'share',
    'announce', 'reveal', 'admit', 'confide', 'express', 'voice', 'letter',
    'apology', 'apologize', 'confront', 'ask', 'question', 'answer'
  ],
  conflict: [
    'fight', 'argue', 'argument', 'conflict', 'disagree', 'disagreement',
    'angry', 'anger', 'upset', 'confront', 'confrontation', 'defend',
    'attack', 'sue', 'legal', 'lawsuit', 'dispute', 'problem', 'issue',
    'difficult', 'challenge', 'enemy', 'rival', 'compete', 'competition'
  ],
  timing: [
    'when', 'today', 'tomorrow', 'now', 'soon', 'wait', 'time', 'timing',
    'right time', 'good time', 'start', 'begin', 'launch', 'initiate',
    'move', 'travel', 'trip', 'vacation', 'sign', 'contract', 'decision',
    'choose', 'decide', 'ready', 'prepared'
  ],
  health: [
    'workout', 'work out', 'exercise', 'gym', 'run', 'running', 'jog', 'jogging',
    'fitness', 'health', 'healthy', 'diet', 'eat', 'eating', 'food', 'meal',
    'sleep', 'rest', 'meditation', 'yoga', 'sport', 'sports', 'training',
    'body', 'weight', 'muscle', 'cardio', 'stretch', 'walk', 'walking',
    'swim', 'swimming', 'bike', 'cycling', 'hike', 'hiking'
  ],
  social: [
    'friend', 'friends', 'party', 'gathering', 'event', 'social', 'hangout',
    'meet', 'meeting', 'network', 'networking', 'group', 'community'
  ],
  decisions: [
    'decide', 'decision', 'choose', 'choice', 'option', 'should i', 'should we',
    'right choice', 'best choice', 'pick', 'select'
  ],
  creativity: [
    'creative', 'create', 'art', 'artistic', 'write', 'writing', 'paint', 'music',
    'design', 'idea', 'inspiration', 'project', 'build', 'make'
  ],
  spiritual: [
    'spiritual', 'spirit', 'soul', 'meditation', 'pray', 'prayer', 'faith',
    'universe', 'cosmic', 'divine', 'energy', 'healing', 'intuition'
  ]
};

// Planet relevance by category
const PLANET_RELEVANCE: Record<QuestionCategory, Planet[]> = {
  love: ['Venus', 'Moon', 'Mars', 'Jupiter'],
  career: ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Mercury'],
  money: ['Jupiter', 'Venus', 'Saturn', 'Pluto'],
  communication: ['Mercury', 'Moon', 'Jupiter'],
  conflict: ['Mars', 'Saturn', 'Pluto', 'Uranus'],
  timing: ['Moon', 'Mercury', 'Sun', 'Mars'],
  health: ['Mars', 'Sun', 'Moon', 'Saturn'],
  social: ['Venus', 'Moon', 'Mercury', 'Jupiter'],
  decisions: ['Mercury', 'Saturn', 'Jupiter', 'Sun'],
  creativity: ['Venus', 'Neptune', 'Uranus', 'Moon'],
  spiritual: ['Neptune', 'Jupiter', 'Pluto', 'Moon']
};

// Aspect quality (positive/negative influence) - expanded with new aspects
const ASPECT_QUALITY: Record<AspectType, 'positive' | 'negative' | 'neutral'> = {
  conjunction: 'neutral', // Depends on planets
  sextile: 'positive',
  trine: 'positive',
  square: 'negative',
  opposition: 'negative',
  quincunx: 'negative',     // Requires adjustment, not easy
  'semi-sextile': 'neutral' // Minor, slight tension
};

// Base points for aspects - BALANCED: reduced positive, increased negative
const ASPECT_BASE_POINTS: Record<AspectType, number> = {
  conjunction: 10,     // Reduced from 15 - conjunctions are intense, not always good
  sextile: 8,          // Reduced from 10
  trine: 15,           // Reduced from 20
  square: -18,         // Increased from -15 - squares are genuinely challenging
  opposition: -22,     // Increased from -20 - oppositions create real tension
  quincunx: -12,       // Increased from -8 - quincunx requires real adjustment
  'semi-sextile': 2    // Reduced from 3
};

// Day ruler bonuses by category - BALANCED: each day has strengths AND weaknesses
const DAY_RULER_BONUS: Record<string, Record<QuestionCategory, number>> = {
  Sun: { love: -3, career: 8, money: 5, communication: 0, conflict: 5, timing: 3, health: 10, social: 5, decisions: 5, creativity: 3, spiritual: 0 },
  Moon: { love: 6, career: -5, money: -3, communication: 3, conflict: -8, timing: 5, health: 3, social: 5, decisions: -3, creativity: 8, spiritual: 8 },
  Mars: { love: -5, career: 5, money: 0, communication: -8, conflict: 10, timing: 3, health: 12, social: -5, decisions: 5, creativity: -3, spiritual: -5 },
  Mercury: { love: 0, career: 5, money: 5, communication: 10, conflict: -5, timing: 3, health: 0, social: 8, decisions: 8, creativity: 5, spiritual: 0 },
  Jupiter: { love: 5, career: 8, money: 10, communication: 5, conflict: -3, timing: 5, health: 5, social: 8, decisions: 5, creativity: 5, spiritual: 10 },
  Venus: { love: 10, career: -3, money: 8, communication: 5, conflict: -10, timing: 0, health: -5, social: 10, decisions: -3, creativity: 10, spiritual: 5 },
  Saturn: { love: -10, career: 10, money: 5, communication: -5, conflict: 8, timing: -8, health: 8, social: -5, decisions: 8, creativity: -5, spiritual: 5 }
};

/**
 * Action polarity - whether a question is about pushing forward or pulling back
 * This helps differentiate "should I work extra" vs "should I rest"
 */
export type ActionPolarity = 'push' | 'pull' | 'neutral';

/**
 * Detect if question has negative intent (asking about NOT doing something)
 */
export function hasNegativeIntent(question: string): boolean {
  const lowerQuestion = question.toLowerCase();

  // Patterns that indicate negative/avoidance intent
  const negativePatterns = [
    /\bshould\s*(i|we)\s*not\b/,
    /\bshouldn'?t\s*(i|we)\b/,
    /\bshould\s*(i|we)\s*avoid\b/,
    /\bshould\s*(i|we)\s*skip\b/,
    /\bshould\s*(i|we)\s*wait\b/,
    /\bshould\s*(i|we)\s*delay\b/,
    /\bshould\s*(i|we)\s*hold off\b/,
    /\bshould\s*(i|we)\s*stop\b/,
    /\bshould\s*(i|we)\s*quit\b/,
    /\bshould\s*(i|we)\s*cancel\b/,
    /\bshould\s*(i|we)\s*refuse\b/,
    /\bshould\s*(i|we)\s*reject\b/,
    /\bis\s*it\s*(a\s*)?bad\s*(idea|time|day)\b/,
    /\bdon'?t\s*(i|we)\b/,
    /\bavoid\b/,
    /\bstay\s*away\b/,
    /\bnot\s*(a\s*)?(good|right|best)\s*(time|idea|day)\b/,
  ];

  return negativePatterns.some(pattern => pattern.test(lowerQuestion));
}

/**
 * Detect action polarity - is this about pushing forward or pulling back?
 * PUSH = effort, action, intensity, starting, doing more
 * PULL = rest, retreat, ease, ending, doing less
 */
export function detectActionPolarity(question: string): ActionPolarity {
  const lowerQuestion = question.toLowerCase();

  // PUSH keywords - action, effort, intensity, spending money, taking risks
  const pushKeywords = [
    'extra', 'more', 'harder', 'push', 'start', 'begin', 'launch', 'initiate',
    'ask out', 'confess', 'confront', 'challenge', 'apply', 'pursue', 'chase',
    'accelerate', 'intensify', 'invest', 'commit', 'engage', 'attack', 'fight',
    'overtime', 'extra hours', 'work late', 'stay late', 'hustle', 'grind',
    'take on', 'accept', 'say yes', 'go for', 'dive in', 'jump in',
    // Financial push actions - these REQUIRE good energy
    'buy', 'purchase', 'spend', 'gamble', 'bet', 'trade', 'crypto', 'btc',
    'bitcoin', 'stock', 'stocks', 'invest', 'investment', 'put money'
  ];

  // PULL keywords - rest, retreat, ease
  const pullKeywords = [
    'rest', 'relax', 'early', 'leave', 'quit', 'stop', 'pause', 'break',
    'home', 'go home', 'take off', 'slow down', 'step back', 'retreat',
    'decline', 'refuse', 'say no', 'skip', 'pass', 'delay', 'postpone',
    'wait', 'hold off', 'ease', 'chill', 'unwind', 'recover', 'heal',
    'less', 'reduce', 'cut back', 'dial down', 'take it easy'
  ];

  let pushScore = 0;
  let pullScore = 0;

  for (const keyword of pushKeywords) {
    if (lowerQuestion.includes(keyword)) pushScore++;
  }

  for (const keyword of pullKeywords) {
    if (lowerQuestion.includes(keyword)) pullScore++;
  }

  if (pushScore > pullScore) return 'push';
  if (pullScore > pushScore) return 'pull';
  return 'neutral';
}

/**
 * Flip a verdict to its opposite
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
 * Classify a question into a category
 * Returns both the category and a confidence score
 */
export function classifyQuestion(question: string): QuestionCategory {
  const result = classifyQuestionWithConfidence(question);
  return result.category;
}

/**
 * Classify a question with confidence score
 * Low confidence = generic/trivial question
 */
export function classifyQuestionWithConfidence(question: string): { category: QuestionCategory; confidence: number } {
  const lowerQuestion = question.toLowerCase();
  const scores: Record<QuestionCategory, number> = {
    love: 0, career: 0, money: 0, communication: 0, conflict: 0, timing: 0, health: 0,
    social: 0, decisions: 0, creativity: 0, spiritual: 0
  };

  // Check for "work" with word boundaries (not workout, work out, etc.)
  // This is checked separately to avoid career matching fitness questions
  const hasWorkJob = /\b(work|working)\b/.test(lowerQuestion) &&
                     !/\b(work\s*out|workout|working\s*out)\b/.test(lowerQuestion);
  if (hasWorkJob) {
    scores.career += 1;
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [QuestionCategory, string[]][]) {
    for (const keyword of keywords) {
      if (lowerQuestion.includes(keyword)) {
        scores[category] += 1;
      }
    }
  }

  // Find category with highest score
  let maxCategory: QuestionCategory = 'timing'; // Default
  let maxScore = 0;
  let totalMatches = 0;

  for (const [category, score] of Object.entries(scores) as [QuestionCategory, number][]) {
    totalMatches += score;
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category;
    }
  }

  // Confidence based on keyword matches only
  // If we matched a keyword, we know what category this is - length doesn't matter
  // "should i gamble" is just as clear as "should i gamble on bitcoin today"
  const confidence = totalMatches >= 1 ? 0.8 : 0.2;

  return { category: maxCategory, confidence };
}

/**
 * Score a transit aspect for a given category
 */
function scoreTransit(
  transit: TransitAspect,
  category: QuestionCategory
): ScoringFactor | null {
  const relevantPlanets = PLANET_RELEVANCE[category];

  // Check if either planet is relevant to this category
  const transitRelevant = relevantPlanets.includes(transit.transitPlanet);
  const natalRelevant = relevantPlanets.includes(transit.natalPlanet);

  if (!transitRelevant && !natalRelevant) {
    return null; // Not relevant to this question type
  }

  let basePoints = ASPECT_BASE_POINTS[transit.type];
  const quality = ASPECT_QUALITY[transit.type];

  // Conjunction quality depends on planet nature
  if (transit.type === 'conjunction') {
    const benefics: Planet[] = ['Venus', 'Jupiter'];
    const malefics: Planet[] = ['Mars', 'Saturn', 'Pluto'];

    if (benefics.includes(transit.transitPlanet)) {
      basePoints = Math.abs(basePoints); // Positive
    } else if (malefics.includes(transit.transitPlanet)) {
      basePoints = -Math.abs(basePoints) / 2; // Mildly negative
    }
  }

  // Tighter orbs = stronger effect (multiply by orb factor)
  const orbFactor = 1 - (transit.orb / 8); // Max orb ~8 degrees
  let points = Math.round(basePoints * orbFactor);

  // Double relevance = slightly stronger (reduced from 1.5x to 1.25x)
  if (transitRelevant && natalRelevant) {
    points = Math.round(points * 1.25);
  }

  // Applying aspects are slightly stronger (reduced from 1.2x to 1.1x)
  if (transit.applying) {
    points = Math.round(points * 1.1);
  }

  // Generate description
  const aspectVerb = quality === 'positive' ? 'supports' :
                     quality === 'negative' ? 'challenges' : 'activates';

  return {
    description: `${transit.transitPlanet} ${aspectVerb} natal ${transit.natalPlanet}`,
    points,
    source: `${transit.transitPlanet} ${transit.type} ${transit.natalPlanet} (${transit.orb}° orb)`
  };
}

/**
 * Score Mercury retrograde impact
 */
function scoreMercuryRetrograde(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor | null {
  if (!context.ephemeris.retrogrades.includes('Mercury')) {
    return null;
  }

  // Mercury retrograde especially affects communication and timing
  const severeCategories: QuestionCategory[] = ['communication', 'timing', 'career'];
  const points = severeCategories.includes(category) ? -20 : -10;

  return {
    description: 'Mercury retrograde urges caution',
    points,
    source: 'Mercury is retrograde'
  };
}

/**
 * Score Venus retrograde impact
 */
function scoreVenusRetrograde(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor | null {
  if (!context.ephemeris.retrogrades.includes('Venus')) {
    return null;
  }

  // Venus retrograde especially affects love and money
  if (category !== 'love' && category !== 'money') {
    return null;
  }

  return {
    description: 'Venus retrograde suggests reviewing, not initiating',
    points: -25,
    source: 'Venus is retrograde'
  };
}

/**
 * Score moon phase impact - BALANCED: phases are more nuanced
 */
function scoreMoonPhase(
  context: AstroContext,
  _category: QuestionCategory
): ScoringFactor | null {
  const { moonPhase } = context.ephemeris;

  switch (moonPhase) {
    case 'New Moon':
      return {
        description: 'New Moon favors new beginnings but lacks clarity',
        points: 3,  // Reduced - new moons are also low energy
        source: 'New Moon phase'
      };
    case 'Waxing Crescent':
      return {
        description: 'Waxing Crescent builds momentum',
        points: 5,
        source: `${moonPhase} phase`
      };
    case 'First Quarter':
      return {
        description: 'First Quarter Moon brings challenges and tension',
        points: -8,  // Increased negative - crisis point
        source: 'First Quarter Moon phase'
      };
    case 'Waxing Gibbous':
      return {
        description: 'Waxing Gibbous refines and adjusts',
        points: 3,
        source: `${moonPhase} phase`
      };
    case 'Full Moon':
      return {
        description: 'Full Moon illuminates but emotions run high',
        points: 0,  // Neutral - clarity but also emotional intensity
        source: 'Full Moon phase'
      };
    case 'Waning Gibbous':
      return {
        description: 'Waning Gibbous favors sharing wisdom, not starting',
        points: -5,
        source: `${moonPhase} phase`
      };
    case 'Last Quarter':
      return {
        description: 'Last Quarter Moon prompts release and letting go',
        points: -10,  // More negative - time to release, not initiate
        source: 'Last Quarter Moon phase'
      };
    case 'Waning Crescent':
      return {
        description: 'Waning Crescent urges rest and reflection',
        points: -8,
        source: `${moonPhase} phase`
      };
    default:
      return null;
  }
}

/**
 * Score Moon sign relevance
 */
function scoreMoonSign(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor | null {
  const moonPlacement = context.ephemeris.placements.find(p => p.planet === 'Moon');
  if (!moonPlacement) return null;

  const sign = moonPlacement.sign;

  // Sign affinities by category
  const signBonus: Partial<Record<QuestionCategory, string[]>> = {
    love: ['Taurus', 'Cancer', 'Leo', 'Libra', 'Pisces'],
    career: ['Capricorn', 'Virgo', 'Leo', 'Aries', 'Scorpio'],
    money: ['Taurus', 'Capricorn', 'Virgo', 'Scorpio'],
    communication: ['Gemini', 'Libra', 'Aquarius', 'Sagittarius'],
    conflict: ['Aries', 'Scorpio', 'Capricorn'],
    timing: ['Aries', 'Cancer', 'Libra', 'Capricorn'],
    health: ['Aries', 'Leo', 'Virgo', 'Capricorn', 'Scorpio']  // Active, disciplined signs
  };

  if (signBonus[category]?.includes(sign)) {
    return {
      description: `Moon in ${sign} supports ${category} matters`,
      points: 8,  // Reduced from 12
      source: `Moon in ${sign}`
    };
  }

  // Sign challenges
  const signMalus: Partial<Record<QuestionCategory, string[]>> = {
    love: ['Aquarius', 'Capricorn', 'Virgo'],
    career: ['Pisces', 'Cancer'],
    money: ['Sagittarius', 'Aries', 'Pisces'],
    communication: ['Scorpio', 'Cancer'],
    health: ['Pisces', 'Libra', 'Taurus']  // Indulgent or low-energy signs for fitness
  };

  if (signMalus[category]?.includes(sign)) {
    return {
      description: `Moon in ${sign} complicates ${category} matters`,
      points: -10,  // Increased from -8
      source: `Moon in ${sign}`
    };
  }

  return null;
}

/**
 * Score action polarity against current cosmic energy
 * PUSH actions favor: Mars energy, waxing moon, fire/cardinal signs
 * PULL actions favor: Moon energy, waning moon, water/mutable signs
 */
function scoreActionPolarity(
  context: AstroContext,
  polarity: ActionPolarity
): ScoringFactor[] {
  const factors: ScoringFactor[] = [];

  if (polarity === 'neutral') return factors;

  const { moonPhase, dayRuler } = context.ephemeris;
  const moonPlacement = context.ephemeris.placements.find(p => p.planet === 'Moon');

  // Moon phase alignment with polarity
  const waxingPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous'];
  const waningPhases = ['Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

  const isWaxing = waxingPhases.includes(moonPhase);
  const isWaning = waningPhases.includes(moonPhase);

  if (polarity === 'push') {
    if (isWaxing) {
      factors.push({
        description: 'Waxing moon supports action and initiative',
        points: 8,  // Reduced from 12
        source: `${moonPhase} aligns with push energy`
      });
    } else if (isWaning) {
      factors.push({
        description: 'Waning moon resists new initiatives - better for winding down',
        points: -12,  // Reduced from -15
        source: `${moonPhase} conflicts with push energy`
      });
    }
  } else if (polarity === 'pull') {
    if (isWaning) {
      factors.push({
        description: 'Waning moon supports rest and retreat',
        points: 8,  // Reduced from 12
        source: `${moonPhase} aligns with pull energy`
      });
    } else if (isWaxing) {
      factors.push({
        description: 'Waxing moon resists pulling back - energy wants to build',
        points: -8,  // Reduced from -10
        source: `${moonPhase} conflicts with pull energy`
      });
    }
  }

  // Day ruler alignment with polarity
  // Mars, Sun, Jupiter = push days
  // Moon, Venus, Saturn = pull days
  // Mercury = neutral
  const pushRulers = ['Mars', 'Sun', 'Jupiter'];
  const pullRulers = ['Moon', 'Venus', 'Saturn'];

  if (dayRuler) {
    if (polarity === 'push' && pushRulers.includes(dayRuler)) {
      factors.push({
        description: `${dayRuler}'s day favors action and effort`,
        points: 6,  // Reduced from 8
        source: `Day ruler ${dayRuler} aligns with push energy`
      });
    } else if (polarity === 'push' && pullRulers.includes(dayRuler)) {
      factors.push({
        description: `${dayRuler}'s day favors rest over action`,
        points: -6,  // Reduced from -8
        source: `Day ruler ${dayRuler} conflicts with push energy`
      });
    } else if (polarity === 'pull' && pullRulers.includes(dayRuler)) {
      factors.push({
        description: `${dayRuler}'s day supports rest and retreat`,
        points: 6,  // Reduced from 8
        source: `Day ruler ${dayRuler} aligns with pull energy`
      });
    } else if (polarity === 'pull' && pushRulers.includes(dayRuler)) {
      factors.push({
        description: `${dayRuler}'s day resists pulling back`,
        points: -6,  // Reduced from -8
        source: `Day ruler ${dayRuler} conflicts with pull energy`
      });
    }
  }

  // Moon sign alignment - fire/cardinal = push, water/mutable = pull
  if (moonPlacement) {
    const fireCardinalSigns = ['Aries', 'Leo', 'Sagittarius', 'Cancer', 'Libra', 'Capricorn'];
    const waterMutableSigns = ['Pisces', 'Cancer', 'Scorpio', 'Gemini', 'Virgo', 'Sagittarius'];

    if (polarity === 'push' && fireCardinalSigns.includes(moonPlacement.sign)) {
      factors.push({
        description: `Moon in ${moonPlacement.sign} supports taking action`,
        points: 5,
        source: `Moon sign ${moonPlacement.sign} aligns with push`
      });
    } else if (polarity === 'pull' && waterMutableSigns.includes(moonPlacement.sign)) {
      factors.push({
        description: `Moon in ${moonPlacement.sign} supports rest and flow`,
        points: 5,
        source: `Moon sign ${moonPlacement.sign} aligns with pull`
      });
    }
  }

  // Mars retrograde strongly affects push actions
  if (polarity === 'push' && context.ephemeris.retrogrades.includes('Mars')) {
    factors.push({
      description: 'Mars retrograde hampers new initiatives and effort',
      points: -18,
      source: 'Mars retrograde conflicts with push energy'
    });
  }

  return factors;
}

/**
 * Score day ruler influence
 */
function scoreDayRuler(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor | null {
  const dayRuler = context.ephemeris.dayRuler;
  if (!dayRuler) return null;

  const bonus = DAY_RULER_BONUS[dayRuler]?.[category];
  if (!bonus || bonus === 0) return null;

  const dayNames: Record<string, string> = {
    Sun: 'Sunday',
    Moon: 'Monday',
    Mars: 'Tuesday',
    Mercury: 'Wednesday',
    Jupiter: 'Thursday',
    Venus: 'Friday',
    Saturn: 'Saturday'
  };

  return {
    description: `${dayNames[dayRuler]} (${dayRuler}'s day) ${bonus > 0 ? 'favors' : 'challenges'} ${category}`,
    points: bonus,
    source: `Day ruler: ${dayRuler}`
  };
}

/**
 * Score planetary dignities
 */
function scoreDignities(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor[] {
  const factors: ScoringFactor[] = [];
  const dignities = context.natal.dignities;

  if (!dignities) return factors;

  const relevantPlanets = PLANET_RELEVANCE[category];

  for (const dignity of dignities) {
    if (!relevantPlanets.includes(dignity.planet)) continue;
    if (dignity.dignity === 'neutral') continue;

    const points = dignity.strength * 8; // +16, +8, -8, or -16

    factors.push({
      description: `${dignity.planet} in ${dignity.dignity}`,
      points,
      source: `${dignity.planet} dignity: ${dignity.dignity} (strength: ${dignity.strength})`
    });
  }

  return factors;
}

/**
 * Score planetary patterns
 */
function scorePatterns(
  context: AstroContext,
  category: QuestionCategory
): ScoringFactor[] {
  const factors: ScoringFactor[] = [];
  const patterns = context.natal.patterns;

  if (!patterns) return factors;

  for (const pattern of patterns) {
    // Check if any pattern planets are relevant to category
    const relevantPlanets = PLANET_RELEVANCE[category];
    const patternIsRelevant = pattern.planets.some(p => relevantPlanets.includes(p));

    if (!patternIsRelevant) continue;

    let points = 0;
    switch (pattern.pattern) {
      case 'Grand Trine':
        points = 10; // Reduced from 15 - trines can also indicate complacency
        break;
      case 'T-Square':
        points = -10; // Increased from -5 - real tension and stress
        break;
      case 'Stellium':
        points = 5; // Reduced from 10 - focused but can be obsessive
        break;
      case 'Grand Cross':
        points = -15; // Increased from -10 - significant challenges
        break;
    }

    factors.push({
      description: `${pattern.pattern} pattern active`,
      points,
      source: `${pattern.pattern}: ${pattern.planets.join(', ')} - ${pattern.description}`
    });
  }

  return factors;
}

/**
 * Score lunar nodes transits
 */
function scoreLunarNodes(
  context: AstroContext,
  _category: QuestionCategory
): ScoringFactor | null {
  const nodes = context.ephemeris.lunarNodes;
  if (!nodes) return null;

  // Check if Moon is near the nodes (within 10°)
  const moonPlacement = context.ephemeris.placements.find(p => p.planet === 'Moon');
  if (!moonPlacement) return null;

  const moonLon = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
                   .indexOf(moonPlacement.sign) * 30 + moonPlacement.degree;

  const northNodeLon = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
                        .indexOf(nodes.northNode.sign) * 30 + nodes.northNode.degree;

  let diff = Math.abs(moonLon - northNodeLon);
  if (diff > 180) diff = 360 - diff;

  // Moon conjunct North Node
  if (diff < 10) {
    return {
      description: 'Moon aligned with North Node - karmic support',
      points: 8,  // Reduced from 12
      source: 'Moon conjunct North Node (fated/karmic energy)'
    };
  }

  // Moon conjunct South Node (opposite)
  if (Math.abs(diff - 180) < 10) {
    return {
      description: 'Moon aligned with South Node - past patterns emerge',
      points: -5,
      source: 'Moon conjunct South Node (karmic release)'
    };
  }

  return null;
}

/**
 * Score Part of Fortune position
 */
function scorePartOfFortune(
  context: AstroContext,
  _category: QuestionCategory
): ScoringFactor | null {
  const pof = context.natal.partOfFortune;
  if (!pof) return null;

  // Check if any transit planet is conjunct Part of Fortune
  const pofLon = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
                  .indexOf(pof.sign) * 30 + pof.degree;

  for (const placement of context.ephemeris.placements) {
    const placementLon = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
                          .indexOf(placement.sign) * 30 + placement.degree;

    let diff = Math.abs(pofLon - placementLon);
    if (diff > 180) diff = 360 - diff;

    if (diff < 8 && (placement.planet === 'Jupiter' || placement.planet === 'Venus')) {
      return {
        description: `${placement.planet} activates Part of Fortune - luck amplified`,
        points: 10,  // Reduced from 15
        source: `${placement.planet} conjunct Part of Fortune`
      };
    }

    if (diff < 8 && (placement.planet === 'Saturn' || placement.planet === 'Mars')) {
      return {
        description: `${placement.planet} challenges Part of Fortune`,
        points: -12,  // Increased from -8
        source: `${placement.planet} conjunct Part of Fortune`
      };
    }
  }

  return null;
}

/**
 * Convert numeric score to verdict
 * STRICT thresholds: harder to get extreme verdicts
 * HARD_YES: 65+ (exceptional cosmic alignment needed)
 * SOFT_YES: 30 to 64 (good support)
 * NEUTRAL: -29 to 29 (mixed or unclear signals)
 * SOFT_NO: -64 to -30 (notable caution)
 * HARD_NO: -65 or below (strong cosmic resistance)
 */
function scoreToVerdict(score: number): Verdict {
  if (score >= 65) return 'HARD_YES';
  if (score >= 30) return 'SOFT_YES';
  if (score >= -29) return 'NEUTRAL';
  if (score >= -64) return 'SOFT_NO';
  return 'HARD_NO';
}

/**
 * Main scoring function
 */
export function scoreDecision(
  question: string,
  context: AstroContext
): ScoringResult {
  const { category, confidence } = classifyQuestionWithConfidence(question);
  const isNegativeQuestion = hasNegativeIntent(question);
  const actionPolarity = detectActionPolarity(question);
  const factors: ScoringFactor[] = [];

  // If question is too vague, return UNCLEAR verdict immediately
  // "should I" or "what about" with no real substance gets the side-eye
  if (confidence < 0.25) {
    factors.push({
      description: 'This question is too vague for the cosmos to care about',
      points: 0,
      source: `Confidence too low (${Math.round(confidence * 100)}%)`
    });
    return {
      verdict: 'UNCLEAR',
      score: 0,
      factors,
      category
    };
  }

  // Penalize somewhat vague questions
  if (confidence < 0.5) {
    factors.push({
      description: 'The cosmic signal is weak on this one',
      points: -15,
      source: `Low category confidence (${Math.round(confidence * 100)}%)`
    });
  }

  // Score ACTION POLARITY - this is crucial for distinguishing opposite questions
  // "Should I work extra?" vs "Should I go home and rest?"
  const polarityFactors = scoreActionPolarity(context, actionPolarity);
  factors.push(...polarityFactors);

  // Score relevant transits (top 10)
  for (const transit of context.transits.slice(0, 10)) {
    const factor = scoreTransit(transit, category);
    if (factor) {
      factors.push(factor);
    }
  }

  // Score retrogrades
  const mercuryRx = scoreMercuryRetrograde(context, category);
  if (mercuryRx) factors.push(mercuryRx);

  const venusRx = scoreVenusRetrograde(context, category);
  if (venusRx) factors.push(venusRx);

  // Score moon phase (category-based, separate from polarity)
  const moonPhase = scoreMoonPhase(context, category);
  if (moonPhase) factors.push(moonPhase);

  // Score moon sign
  const moonSign = scoreMoonSign(context, category);
  if (moonSign) factors.push(moonSign);

  // Score day ruler - scale by confidence (generic questions don't benefit as much)
  const dayRuler = scoreDayRuler(context, category);
  if (dayRuler) {
    // Reduce day ruler impact for low-confidence questions
    if (confidence < 0.5 && dayRuler.points > 0) {
      dayRuler.points = Math.round(dayRuler.points * 0.5);
    }
    factors.push(dayRuler);
  }

  // Score planetary dignities
  const dignityFactors = scoreDignities(context, category);
  factors.push(...dignityFactors);

  // Score planetary patterns
  const patternFactors = scorePatterns(context, category);
  factors.push(...patternFactors);

  // Score lunar nodes
  const nodesFactor = scoreLunarNodes(context, category);
  if (nodesFactor) factors.push(nodesFactor);

  // Score Part of Fortune
  const pofFactor = scorePartOfFortune(context, category);
  if (pofFactor) factors.push(pofFactor);

  // Calculate total score
  let totalScore = factors.reduce((sum, f) => sum + f.points, 0);

  // Add cosmic variance - the universe has an element of mystery
  // This adds -15 to +15 points of unpredictability
  const cosmicVariance = Math.floor(Math.random() * 31) - 15;
  totalScore += cosmicVariance;

  factors.push({
    description: 'Cosmic variance - the universe keeps some secrets',
    points: cosmicVariance,
    source: 'Mystery of the cosmos'
  });

  // Clamp to -100 to +100
  const clampedScore = Math.max(-100, Math.min(100, totalScore));

  // Get base verdict
  let verdict = scoreToVerdict(clampedScore);

  // If question has negative intent, flip the verdict
  // "Should I NOT ask for a raise?" with good transits → NO (don't avoid it)
  if (isNegativeQuestion) {
    verdict = flipVerdict(verdict);
  }

  return {
    verdict,
    score: isNegativeQuestion ? -clampedScore : clampedScore,
    factors: factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    category
  };
}

/**
 * Get a human-readable verdict text - SASSY STYLE
 */
export function getVerdictText(verdict: Verdict): string {
  const texts: Record<Verdict, string> = {
    HARD_YES: 'YES, PERIODT.',
    SOFT_YES: 'LEANING YES',
    NEUTRAL: 'THE VIBES ARE UNCLEAR',
    SOFT_NO: 'PROBABLY NOT',
    HARD_NO: 'ABSOLUTELY NOT',
    UNCLEAR: 'GIRL, WHAT?'
  };
  return texts[verdict];
}

/**
 * Get verdict color (for styling)
 */
export function getVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    HARD_YES: '#00ff88',  // Bright teal-green
    SOFT_YES: '#88ffaa',  // Soft mint
    NEUTRAL: '#ffcc00',   // Gold
    SOFT_NO: '#ff8866',   // Coral
    HARD_NO: '#ff4444',   // Bright red
    UNCLEAR: '#aa88ff'    // Purple (confused vibes)
  };
  return colors[verdict];
}
