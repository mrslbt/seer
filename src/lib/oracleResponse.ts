/**
 * Oracle Response Generator
 *
 * Transforms scoring verdicts into elaborate, mystical oracle prose.
 * The Seer speaks in poetic but clear language -- never vague,
 * always direct. Like counsel from someone who has seen everything.
 *
 * Now transit-aware: when a daily report is available, the oracle
 * references actual planetary transits, not generic mystical quotes.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';
import type { Planet, AspectType } from '../types/userProfile';
import type { PersonalDailyReport } from './personalDailyReport';

// ---- Category mapping (question category → report category) ----
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

// ---- Planet display names ----
const PLANET_NAME: Record<Planet, string> = {
  sun: 'the Sun',
  moon: 'the Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  ascendant: 'your Ascendant',
  midheaven: 'your Midheaven',
  northNode: 'the North Node',
  chiron: 'Chiron',
};

// ---- Aspect voice: poetic descriptions per aspect type × impact ----
const ASPECT_VOICE: Record<AspectType, Record<string, string[]>> = {
  conjunction: {
    positive: [
      '{tp} merges its power with your natal {np} — a rare fusion that amplifies everything in its path.',
      '{tp} and your natal {np} occupy the same degree — their combined force opens doors.',
    ],
    negative: [
      '{tp} collides with your natal {np} — the intensity demands careful navigation.',
      '{tp} and your natal {np} blend into something volatile — awareness is your shield.',
    ],
    neutral: [
      '{tp} and your natal {np} share the same space — their energies intertwine in unpredictable ways.',
    ],
  },
  trine: {
    positive: [
      '{tp} flows in harmony with your natal {np} — the kind of ease that rarely needs to be forced.',
      '{tp} and your natal {np} dance together today — grace comes naturally.',
      '{tp} harmonizes with your natal {np} — the path of least resistance is also the wisest one.',
    ],
    negative: [
      '{tp} harmonizes with your natal {np}, though the ease may breed complacency. Stay alert.',
    ],
    neutral: [
      '{tp} and your natal {np} share a graceful connection — gentle currents carry you forward.',
    ],
  },
  square: {
    positive: [
      '{tp} squares your natal {np} — friction that, handled well, becomes fuel for growth.',
    ],
    negative: [
      '{tp} clashes with your natal {np} — there is a wall between desire and availability.',
      '{tp} grinds against your natal {np} — the tension is real, but temporary.',
      '{tp} squares your natal {np} — resistance meets ambition. Something has to give.',
    ],
    neutral: [
      '{tp} challenges your natal {np} — the tension demands a choice you may not feel ready to make.',
    ],
  },
  opposition: {
    positive: [
      '{tp} stands across from your natal {np} — the polarity brings clarity through contrast.',
    ],
    negative: [
      '{tp} opposes your natal {np} — what you want pulls against what the moment allows.',
      '{tp} and your natal {np} face off — two truths compete. Only one can lead.',
    ],
    neutral: [
      '{tp} and your natal {np} mirror each other — balance is today\'s lesson.',
    ],
  },
  sextile: {
    positive: [
      '{tp} winks at your natal {np} — a gentle opportunity, easily missed if you do not look.',
      '{tp} extends a hand toward your natal {np} — accept the invitation.',
    ],
    negative: [
      '{tp} offers your natal {np} a chance, but it requires your initiative to claim it.',
    ],
    neutral: [
      '{tp} and your natal {np} exchange a subtle signal — pay attention to small openings.',
    ],
  },
  quincunx: {
    positive: [
      '{tp} makes an awkward angle to your natal {np} — adjustment leads to unexpected growth.',
    ],
    negative: [
      '{tp} and your natal {np} speak different languages today — translation is required before action.',
    ],
    neutral: [
      '{tp} asks your natal {np} to adapt — discomfort is not failure, it is information.',
    ],
  },
};

// ---- Planet + category flavor: specific poetic lines for key pairings ----
type CategoryKey = QuestionCategory | keyof PersonalDailyReport['categories'];
const PLANET_FLAVOR: Partial<Record<Planet, Partial<Record<CategoryKey, { positive: string; negative: string }>>>> = {
  venus: {
    love: {
      positive: 'Venus opens the heart without reservation — what you feel is reciprocated by the cosmos.',
      negative: 'Venus withholds her warmth — desire meets a closed door. Patience, not pursuit.',
    },
    money: {
      positive: 'Venus attracts abundance naturally today — receive it.',
      negative: 'Venus in tension warns against impulse spending and wishful accounting.',
    },
    social: {
      positive: 'Venus lights your social presence — you are more magnetic than you realize.',
      negative: 'Venus complicates social dynamics today — tread lightly in group settings.',
    },
  },
  saturn: {
    career: {
      positive: 'Saturn rewards the work you have already done — results materialize from past effort.',
      negative: 'Saturn demands more from you before it yields — this is a test, not a punishment.',
    },
    decisions: {
      positive: 'Saturn brings the clarity of hard-won wisdom — trust the structure you have built.',
      negative: 'Saturn restricts your options — but constraints reveal what truly matters.',
    },
  },
  jupiter: {
    money: {
      positive: 'Jupiter expands your financial horizons — abundance flows toward the prepared.',
      negative: 'Jupiter\'s excess tips toward recklessness — generosity without boundaries becomes loss.',
    },
    spiritual: {
      positive: 'Jupiter illuminates your inner world — wisdom arrives without effort today.',
      negative: 'Jupiter\'s expansion feels overwhelming — ground yourself before seeking more.',
    },
  },
  mercury: {
    communication: {
      positive: 'Mercury sharpens every word you speak — truth lands where it needs to.',
      negative: 'Mercury tangles the signal — silence protects more than speech today.',
    },
    social: {
      positive: 'Mercury quickens your social mind — wit and connection flow easily.',
      negative: 'Mercury scatters your attention — conversations may lead nowhere.',
    },
  },
  mars: {
    career: {
      positive: 'Mars fuels your ambition — drive and opportunity align.',
      negative: 'Mars agitates your professional sphere — ambition without patience becomes conflict.',
    },
    health: {
      positive: 'Mars energizes your body — physical vitality peaks.',
      negative: 'Mars pushes too hard — the body needs rest, not more force.',
    },
    conflict: {
      positive: 'Mars stands beside you — strength and resolve are yours today.',
      negative: 'Mars inflames the situation — engagement now costs more than retreat.',
    },
  },
  moon: {
    love: {
      positive: 'The Moon deepens emotional currents — intimacy comes naturally.',
      negative: 'The Moon stirs old feelings — what surfaces needs acknowledgment, not action.',
    },
    health: {
      positive: 'The Moon nurtures your body — listen to what it craves.',
      negative: 'The Moon brings restlessness — sleep may elude you. Be gentle with yourself.',
    },
  },
  sun: {
    career: {
      positive: 'The Sun illuminates your path forward — visibility and recognition increase.',
      negative: 'The Sun exposes what you hoped to keep hidden — transparency is unavoidable.',
    },
    creativity: {
      positive: 'The Sun ignites creative fire — self-expression flows without filter.',
      negative: 'The Sun burns too bright — creative vision blurs under its intensity.',
    },
  },
  pluto: {
    spiritual: {
      positive: 'Pluto draws you into profound depths — transformation happens in the silence.',
      negative: 'Pluto churns the deep waters — what rises is uncomfortable but necessary.',
    },
    decisions: {
      positive: 'Pluto reveals the hidden truth — see clearly and choose accordingly.',
      negative: 'Pluto obscures motives — including your own. Proceed only with radical honesty.',
    },
  },
  neptune: {
    spiritual: {
      positive: 'Neptune dissolves the veil — intuition and reality merge beautifully today.',
      negative: 'Neptune clouds your vision — what feels like intuition may be wishful thinking.',
    },
    creativity: {
      positive: 'Neptune floods you with inspiration — let the current carry you.',
      negative: 'Neptune drowns clarity — creative vision dissolves into confusion.',
    },
  },
  uranus: {
    decisions: {
      positive: 'Uranus breaks the pattern — a sudden insight changes everything.',
      negative: 'Uranus destabilizes — decisions made impulsively now will need revision.',
    },
    career: {
      positive: 'Uranus opens an unexpected door — be ready to walk through it.',
      negative: 'Uranus disrupts your plans — flexibility is survival today.',
    },
  },
};

// ---- Verdict openers (one-liners to set the tone) ----
const VERDICT_OPENERS: Record<Verdict, string[]> = {
  HARD_YES: [
    'The stars burn bright for you.',
    'A rare alignment graces this moment.',
    'The cosmos have cleared your path.',
    'The heavens speak with unusual certainty.',
    'Every cosmic signal converges in your favor.',
  ],
  SOFT_YES: [
    'The stars lean in your favor, gently.',
    'A warm current stirs in your chart.',
    'The cosmic winds carry encouragement.',
    'The cosmos tilt toward yes, with caveats.',
    'A favorable current runs through this question.',
  ],
  NEUTRAL: [
    'The stars neither pull nor push.',
    'The cosmos hold their counsel for now.',
    'The celestial balance hangs even.',
    'Neither blessing nor warning today.',
    'The oracle sees both sides with equal weight.',
  ],
  SOFT_NO: [
    'The stars urge you to pause.',
    'A shadow drifts across this path.',
    'The cosmos counsel patience, not action.',
    'Resistance builds in your chart.',
    'The celestial currents run contrary.',
  ],
  HARD_NO: [
    'The stars stand firmly against this.',
    'The cosmos speak with rare severity.',
    'A clear warning echoes through your chart.',
    'The heavens close this door deliberately.',
    'Every cosmic signal urges retreat.',
  ],
  UNCLEAR: [
    'The cosmos cannot read what you have not defined.',
    'The signal dissolves in cosmic noise.',
    'The oracle requires more clarity from you.',
  ],
};

// ---- Guidance closers based on verdict + category data ----
function buildGuidance(
  verdict: Verdict,
  reportCategory: keyof PersonalDailyReport['categories'],
  report: PersonalDailyReport,
): string {
  const cat = report.categories[reportCategory];
  const goodFor = cat.goodFor.filter(g => g.length > 0);
  const badFor = cat.badFor.filter(b => b.length > 0);

  if (verdict === 'HARD_YES' || verdict === 'SOFT_YES') {
    if (goodFor.length > 0) {
      return `This energy favors ${goodFor.slice(0, 2).join(' and ')}. Move with it.`;
    }
    return 'The path forward is open. Walk it with intention.';
  }

  if (verdict === 'HARD_NO' || verdict === 'SOFT_NO') {
    if (badFor.length > 0) {
      return `The cosmos urge caution around ${badFor.slice(0, 2).join(' and ')} for now.`;
    }
    return 'This is not the moment. Wait for the current to shift.';
  }

  if (verdict === 'NEUTRAL') {
    if (goodFor.length > 0 && badFor.length > 0) {
      return `The day favors ${goodFor[0]} but resists ${badFor[0]}. Choose accordingly.`;
    }
    return 'Neither pushed nor held back — the choice is entirely yours.';
  }

  return 'Sharpen your question and return. The stars respond to clarity.';
}

// ---- Transit insight builder ----
function buildTransitInsight(
  category: QuestionCategory,
  reportCategory: keyof PersonalDailyReport['categories'],
  report: PersonalDailyReport,
): string | null {
  // Find the strongest transit affecting this category
  const relevantTransit = report.keyTransits.find(t =>
    t.affectedCategories.includes(category) ||
    t.affectedCategories.includes(reportCategory as QuestionCategory)
  );

  if (!relevantTransit) {
    // Fall back to first reasoning line if available
    const reasoning = report.categories[reportCategory].reasoning;
    if (reasoning.length > 0) {
      // Filter out natal warnings (they don't start with "Transit")
      const transitReasoning = reasoning.find(r => r.startsWith('Transit'));
      if (transitReasoning) {
        return `The stars cite this: ${transitReasoning.replace(/\(orb:.*?\)/, '').trim()}.`;
      }
    }
    return null;
  }

  const { transit, impact } = relevantTransit;
  const tp = transit.transitPlanet;
  const np = transit.natalPlanet;

  // Check for planet+category-specific flavor first
  const flavor = PLANET_FLAVOR[tp]?.[category] ?? PLANET_FLAVOR[tp]?.[reportCategory];
  if (flavor) {
    const line = impact === 'negative' ? flavor.negative : flavor.positive;
    return transit.isExact ? `An exact aspect today — ${line}` : line;
  }

  // Fall back to aspect voice
  const aspectVoices = ASPECT_VOICE[transit.aspectType];
  if (!aspectVoices) return null;

  const impactKey = impact || 'neutral';
  const pool = aspectVoices[impactKey] ?? aspectVoices['neutral'] ?? [];
  if (pool.length === 0) return null;

  const template = pool[Math.floor(Math.random() * pool.length)];
  const line = template
    .replace('{tp}', PLANET_NAME[tp] || capitalize(tp))
    .replace('{np}', PLANET_NAME[np] || capitalize(np));

  return transit.isExact ? `An exact aspect today — ${line}` : line;
}

// ---- Retrograde/moon extras ----
function buildExtras(
  category: QuestionCategory,
  report: PersonalDailyReport,
): string | null {
  const parts: string[] = [];

  // Check for relevant retrograde
  const retroCategoryMap: Partial<Record<Planet, QuestionCategory[]>> = {
    mercury: ['communication', 'career', 'social', 'decisions'],
    venus: ['love', 'money', 'creativity', 'social'],
    mars: ['career', 'health', 'conflict', 'decisions'],
    jupiter: ['money', 'spiritual', 'career'],
    saturn: ['career', 'decisions'],
  };

  for (const retro of report.retrogrades) {
    const affects = retroCategoryMap[retro.planet];
    if (affects && affects.includes(category)) {
      parts.push(`${capitalize(retro.planet)} is retrograde — ${retro.advice.toLowerCase()}.`);
      break; // Only mention one retrograde
    }
  }

  // Check for significant moon phase
  const moonName = report.moonPhase.name;
  if (moonName === 'New Moon' || moonName === 'Full Moon') {
    parts.push(`The ${moonName} adds its own weight: ${report.moonPhase.advice.toLowerCase()}.`);
  }

  if (parts.length === 0) return null;
  return parts.join(' ');
}

// ---- Static template fallback (original system) ----
interface OracleTemplate {
  opening: string;
  guidance: string;
}

const TEMPLATES: Record<Verdict, Record<QuestionCategory, OracleTemplate[]>> = {
  HARD_YES: {
    love: [
      { opening: "The stars burn bright for you.", guidance: "Venus opens the gate. Walk through without hesitation. What your heart knows, the cosmos confirms." },
      { opening: "The heavens smile upon this bond.", guidance: "Love is not asking permission today. It is arriving. Receive it fully." },
      { opening: "A rare alignment graces your heart.", guidance: "The universe conspires in your favor. Trust the pull you feel. It is real, and it is earned." },
    ],
    career: [
      { opening: "The cosmos have cleared your path.", guidance: "Move boldly. Saturn lifts its weight and opportunity stands where doubt once was." },
      { opening: "Your ambition finds its moment.", guidance: "The stars demand action, not contemplation. What you build now carries the force of destiny." },
    ],
    money: [
      { opening: "Fortune turns its gaze toward you.", guidance: "The cosmic ledger favors your move. Abundance flows where courage meets preparation." },
      { opening: "Jupiter bestows its full blessing upon your ventures.", guidance: "The financial currents run strong and clear. Trust your judgment." },
    ],
    communication: [{ opening: "Mercury lends you its silver tongue.", guidance: "Your words will land exactly where they need to. Speak your truth." }],
    conflict: [{ opening: "Strength flows through your chart today.", guidance: "You have the cosmic advantage. Stand firm." }],
    timing: [{ opening: "The moment is ripe.", guidance: "Every celestial clock points to now. Hesitation is the only enemy." }],
    health: [{ opening: "Vitality surges through your chart.", guidance: "Your body and the cosmos are in harmony. Push forward." }],
    social: [{ opening: "The stars weave connections around you.", guidance: "Social energy is abundant. Every meeting carries potential." }],
    decisions: [{ opening: "Clarity descends from the heavens.", guidance: "Your mind is sharp and the cosmos agree with your instinct. Decide without doubt." }],
    creativity: [{ opening: "The muse descends with celestial fire.", guidance: "Create without restraint. This is your moment." }],
    spiritual: [{ opening: "The veil between worlds thins.", guidance: "Profound insight awaits. Open your inner eye." }],
  },
  SOFT_YES: {
    love: [{ opening: "The stars lean in your favor, gently.", guidance: "Proceed with an open heart, but not a blind one." }],
    career: [{ opening: "The cosmic winds carry encouragement.", guidance: "Opportunity approaches, though not without effort." }],
    money: [{ opening: "The financial stars show cautious promise.", guidance: "Gain is possible, but measure your steps." }],
    communication: [{ opening: "Your voice carries weight today.", guidance: "The message will be received, though timing matters." }],
    conflict: [{ opening: "The cosmos offer you an edge, but a thin one.", guidance: "Choose your battles wisely." }],
    timing: [{ opening: "The timing is favorable, if imperfect.", guidance: "Do not wait for the perfect moment." }],
    health: [{ opening: "Your vitality holds steady.", guidance: "Energy is available. Use it wisely." }],
    social: [{ opening: "Social currents run in your direction.", guidance: "Connections await, though they require your presence." }],
    decisions: [{ opening: "The cosmos tilt toward your instinct.", guidance: "Your gut feeling has merit. Trust it, but verify." }],
    creativity: [{ opening: "Creative energy stirs beneath the surface.", guidance: "Inspiration is near. Reach for it." }],
    spiritual: [{ opening: "A quiet opening appears in the cosmos.", guidance: "Insight comes to those who sit still long enough." }],
  },
  NEUTRAL: {
    love: [{ opening: "The stars neither pull nor push.", guidance: "Let clarity come before commitment." }],
    career: [{ opening: "The professional cosmos stand in balance.", guidance: "Neither green light nor red. Prepare, but do not force." }],
    money: [{ opening: "The financial stars are quiet.", guidance: "Guard what you have and wait for clearer signs." }],
    communication: [{ opening: "Mercury wanders a middle path.", guidance: "Words carry their usual weight. No more, no less." }],
    conflict: [{ opening: "The cosmic battlefield is still.", guidance: "If you can avoid the fight, do." }],
    timing: [{ opening: "The cosmic clock ticks, but reveals nothing.", guidance: "If pressed, you may act, but better days exist." }],
    health: [{ opening: "Your energy holds a steady middle ground.", guidance: "Listen to your body. It will tell you what it needs." }],
    social: [{ opening: "Social energies are unremarkable today.", guidance: "Go if you wish, stay if you prefer." }],
    decisions: [{ opening: "The cosmos offer no decisive counsel.", guidance: "The signs are mixed. If this can wait, let it." }],
    creativity: [{ opening: "The muse is neither present nor absent.", guidance: "Work steadily and let it come." }],
    spiritual: [{ opening: "The veil remains as it is.", guidance: "Practice your rituals and trust the process." }],
  },
  SOFT_NO: {
    love: [{ opening: "The stars urge you to pause.", guidance: "What feels urgent may be premature." }],
    career: [{ opening: "The professional winds blow against you, gently.", guidance: "Resistance is building. Reconsider your approach." }],
    money: [{ opening: "The financial cosmos whisper caution.", guidance: "Hold your resources close." }],
    communication: [{ opening: "The signal from Mercury weakens.", guidance: "Words may land wrong today. If it can wait, let it." }],
    conflict: [{ opening: "The stars do not favor this fight.", guidance: "Retreat is wisdom, not weakness." }],
    timing: [{ opening: "The cosmic clock suggests delay.", guidance: "Better timing awaits." }],
    health: [{ opening: "Your energy reserves run lower than usual.", guidance: "The body asks for rest, not exertion." }],
    social: [{ opening: "Social energies are complicated today.", guidance: "Choose solitude if it calls." }],
    decisions: [{ opening: "The compass needle trembles.", guidance: "Doubt is not your enemy today. It is your guardian." }],
    creativity: [{ opening: "The muse turns away, briefly.", guidance: "Rest and return when the well refills." }],
    spiritual: [{ opening: "The inner world feels distant.", guidance: "Release the expectation. Presence alone is enough." }],
  },
  HARD_NO: {
    love: [{ opening: "The stars stand firmly against this.", guidance: "What the heart craves, the cosmos deny. For now. Trust the no." }],
    career: [{ opening: "The cosmos erect a wall before you.", guidance: "This path is blocked, and for good reason." }],
    money: [{ opening: "The financial heavens flash a warning.", guidance: "Every cosmic signal screams caution. Protect what you have." }],
    communication: [{ opening: "Mercury opposes your intent.", guidance: "Every word risks misunderstanding. Swallow what you want to say." }],
    conflict: [{ opening: "The cosmos warn against battle.", guidance: "You will not win this fight today. Walk away." }],
    timing: [{ opening: "The stars say: not now.", guidance: "This is the wrong moment, full stop." }],
    health: [{ opening: "Your cosmic vitality hits a low.", guidance: "The body and stars agree: rest." }],
    social: [{ opening: "The social cosmos close their doors.", guidance: "Isolation serves you better today." }],
    decisions: [{ opening: "The cosmos speak with rare clarity: no.", guidance: "Do not proceed. What you are considering will cost more than you think." }],
    creativity: [{ opening: "The muse has departed.", guidance: "Creative wells are dry. Wait for the waters to return." }],
    spiritual: [{ opening: "The inner world is turbulent.", guidance: "Ground yourself in the physical. Spirit will return." }],
  },
  UNCLEAR: {
    love: [{ opening: "The cosmos cannot read what you have not defined.", guidance: "Sharpen your question. Ask with a specific heart." }],
    career: [{ opening: "Your question dissolves in the cosmic noise.", guidance: "Ask with more precision." }],
    money: [{ opening: "The financial oracle requires a clearer question.", guidance: "What exactly do you seek?" }],
    communication: [{ opening: "The signal is too weak.", guidance: "Refine your question and return." }],
    conflict: [{ opening: "The cosmos sense confusion in your asking.", guidance: "Clarify your intent." }],
    timing: [{ opening: "Time itself seems uncertain in your asking.", guidance: "Be specific." }],
    health: [{ opening: "The question is unclear to the stars.", guidance: "Ask again with intention." }],
    social: [{ opening: "Social matters blur in the cosmic lens.", guidance: "What specifically do you wish to know?" }],
    decisions: [{ opening: "The decision you describe is shapeless.", guidance: "Give the cosmos something concrete." }],
    creativity: [{ opening: "The creative question lacks form.", guidance: "Even the muse needs a starting point." }],
    spiritual: [{ opening: "The spiritual realm reflects your own confusion.", guidance: "Still your mind. Then ask again." }],
  },
};

// ---- Utility ----
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate an oracle response from a verdict and category.
 * When a daily report is available, weaves in actual transit data.
 * Falls back to static templates when report is null.
 */
export function generateOracleResponse(
  verdict: Verdict,
  category: QuestionCategory,
  report?: PersonalDailyReport | null,
  _question?: string,
): string {
  // --- Fallback path: no report, use static templates ---
  if (!report) {
    const categoryTemplates = TEMPLATES[verdict]?.[category];
    if (!categoryTemplates || categoryTemplates.length === 0) {
      const fallback = TEMPLATES[verdict]?.decisions;
      if (fallback && fallback.length > 0) {
        const t = pick(fallback);
        return `${t.opening} ${t.guidance}`;
      }
      return "The cosmos are silent. Ask again when the stars speak.";
    }
    const template = pick(categoryTemplates);
    return `${template.opening} ${template.guidance}`;
  }

  // --- Transit-aware path ---
  const reportCategory = CATEGORY_MAP[category];

  // 1. Opener: set the mystical tone
  const opener = pick(VERDICT_OPENERS[verdict] ?? VERDICT_OPENERS.NEUTRAL);

  // 2. Transit insight: reference the actual planetary alignment
  const transitInsight = buildTransitInsight(category, reportCategory, report);

  // 3. Guidance: actionable advice from goodFor/badFor
  const guidance = buildGuidance(verdict, reportCategory, report);

  // 4. Extras: retrograde/moon phase context (only if relevant)
  const extras = buildExtras(category, report);

  // Assemble — target 3-5 sentences
  let response = opener;
  if (transitInsight) response += ' ' + transitInsight;
  response += ' ' + guidance;

  // Only add extras if total length stays reasonable
  if (extras && response.length < 350) {
    response += ' ' + extras;
  }

  return response;
}

/**
 * Get the verdict color for the seer theme.
 */
export function getSeerVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    HARD_YES: "#C9A84C",
    SOFT_YES: "#D4BE7A",
    NEUTRAL: "#8A8A8A",
    SOFT_NO: "#A67458",
    HARD_NO: "#8B4A4A",
    UNCLEAR: "#7A6F8A",
  };
  return colors[verdict];
}
