/**
 * Oracle Response Generator
 *
 * Transforms scoring verdicts into oracle prose.
 * The Seer speaks like someone old, direct, and slightly unsettling.
 * Short sentences. No filler. No em dashes. No corporate mysticism.
 *
 * When a daily report is available, the oracle references actual
 * planetary transits, not generic quotes.
 */

import type { Verdict, QuestionCategory } from '../types/astrology';
import type { Planet, AspectType } from '../types/userProfile';
import type { PersonalDailyReport } from './personalDailyReport';
import { HOUSE_MEANINGS } from './personalDailyReport';
import type { ReadingPatterns } from './readingHistory';

// ---- Category mapping (question category -> report category) ----
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

// ---- Aspect voice: descriptions per aspect type x impact ----
const ASPECT_VOICE: Record<AspectType, Record<string, string[]>> = {
  conjunction: {
    positive: [
      '{tp} sits right on top of your natal {np}. That kind of closeness amplifies everything.',
      '{tp} and your natal {np} share the same degree. When that happens, doors tend to open.',
    ],
    negative: [
      '{tp} presses into your natal {np}. That intensity can be useful, but you have to stay sharp.',
      '{tp} and your natal {np} are fused together right now. Handle with care.',
    ],
    neutral: [
      '{tp} and your natal {np} occupy the same space. The result could go either way.',
    ],
  },
  trine: {
    positive: [
      '{tp} flows easily with your natal {np}. You will not have to force anything today.',
      '{tp} and your natal {np} are working together. This kind of ease is rare. Use it.',
      '{tp} supports your natal {np}. The path of least resistance is also the right one.',
    ],
    negative: [
      '{tp} harmonizes with your natal {np}, but ease can make you careless. Stay aware.',
    ],
    neutral: [
      '{tp} and your natal {np} share a gentle connection. Let it carry you.',
    ],
  },
  square: {
    positive: [
      '{tp} squares your natal {np}. There is friction, but friction creates momentum.',
    ],
    negative: [
      '{tp} grinds against your natal {np}. There is a wall here. It will pass, but not today.',
      '{tp} squares your natal {np}. What you want and what is possible are pulling apart.',
      '{tp} clashes with your natal {np}. Something has to bend.',
    ],
    neutral: [
      '{tp} challenges your natal {np}. You may be asked to choose before you feel ready.',
    ],
  },
  opposition: {
    positive: [
      '{tp} faces your natal {np} from the other side. The tension brings clarity.',
    ],
    negative: [
      '{tp} opposes your natal {np}. What you want pulls against what is available.',
      '{tp} and your natal {np} face off. Two truths compete. Only one can lead.',
    ],
    neutral: [
      '{tp} and your natal {np} mirror each other. Balance is the work today.',
    ],
  },
  sextile: {
    positive: [
      '{tp} opens a small window toward your natal {np}. Easy to miss if you are not looking.',
      '{tp} reaches toward your natal {np}. A quiet invitation. Accept it.',
    ],
    negative: [
      '{tp} offers your natal {np} a chance, but you have to meet it halfway.',
    ],
    neutral: [
      '{tp} and your natal {np} exchange a subtle signal. Watch for small openings.',
    ],
  },
  quincunx: {
    positive: [
      '{tp} makes an odd angle to your natal {np}. Adjustment leads to unexpected progress.',
    ],
    negative: [
      '{tp} and your natal {np} do not quite fit together right now. Give it time.',
    ],
    neutral: [
      '{tp} asks your natal {np} to adapt. The discomfort is information, not failure.',
    ],
  },
};

// ---- Planet + category flavor: specific lines for key pairings ----
type CategoryKey = QuestionCategory | keyof PersonalDailyReport['categories'];
const PLANET_FLAVOR: Partial<Record<Planet, Partial<Record<CategoryKey, { positive: string; negative: string }>>>> = {
  venus: {
    love: {
      positive: 'Venus is warm right now. What you feel, the sky confirms.',
      negative: 'Venus has gone quiet. Desire meets a closed door. Wait, do not chase.',
    },
    money: {
      positive: 'Venus draws good things your way today. Be ready to receive.',
      negative: 'Venus in tension. Watch impulse spending and wishful numbers.',
    },
    social: {
      positive: 'Venus lights up your presence. People notice you more than usual.',
      negative: 'Venus tangles the social thread today. Go gently in groups.',
    },
  },
  saturn: {
    career: {
      positive: 'Saturn pays off the work you already put in. Results show.',
      negative: 'Saturn asks more from you first. Not punishment. Preparation.',
    },
    decisions: {
      positive: 'Saturn brings hard clarity. Trust what you have already built.',
      negative: 'Saturn narrows your options. But fewer choices reveal what actually matters.',
    },
  },
  jupiter: {
    money: {
      positive: 'Jupiter opens the financial picture up. Opportunity is real.',
      negative: 'Jupiter pushes toward excess. Generosity without a boundary becomes loss.',
    },
    spiritual: {
      positive: 'Jupiter lights the inner world. Wisdom comes without effort today.',
      negative: 'Jupiter expands too much too fast. Ground yourself before seeking more.',
    },
  },
  mercury: {
    communication: {
      positive: 'Mercury sharpens your words. What you say will land.',
      negative: 'Mercury scrambles the signal. Silence protects you more than speech today.',
    },
    social: {
      positive: 'Mercury quickens your mind. Conversation and connection come easily.',
      negative: 'Mercury scatters your attention. Conversations may go nowhere.',
    },
  },
  mars: {
    career: {
      positive: 'Mars backs your ambition. Drive and timing line up.',
      negative: 'Mars stirs the professional sphere. Ambition without patience turns to conflict.',
    },
    health: {
      positive: 'Mars fills your body with energy. Physical vitality peaks.',
      negative: 'Mars pushes too hard. Your body wants rest, not force.',
    },
    conflict: {
      positive: 'Mars stands with you. Strength and resolve are yours today.',
      negative: 'Mars heats the situation. Engaging now costs more than stepping back.',
    },
  },
  moon: {
    love: {
      positive: 'The Moon deepens what you feel. Closeness comes naturally.',
      negative: 'The Moon stirs old feelings. What rises needs to be seen, not acted on.',
    },
    health: {
      positive: 'The Moon nurtures your body. Listen to what it asks for.',
      negative: 'The Moon brings restlessness. Sleep may be difficult. Be patient with yourself.',
    },
  },
  sun: {
    career: {
      positive: 'The Sun lights your path. Visibility and recognition increase.',
      negative: 'The Sun exposes what you hoped to keep private. There is no hiding today.',
    },
    creativity: {
      positive: 'The Sun ignites creative fire. Expression flows without filter.',
      negative: 'The Sun burns too bright. Creative vision blurs under its glare.',
    },
  },
  pluto: {
    spiritual: {
      positive: 'Pluto draws you deep. Transformation happens in the quiet.',
      negative: 'Pluto stirs what was buried. Uncomfortable, but necessary.',
    },
    decisions: {
      positive: 'Pluto reveals hidden truth. See it clearly and choose.',
      negative: 'Pluto hides motives. Including your own. Move only with honesty.',
    },
  },
  neptune: {
    spiritual: {
      positive: 'Neptune thins the veil. Intuition and reality meet beautifully today.',
      negative: 'Neptune fogs your vision. What feels like intuition might be wishing.',
    },
    creativity: {
      positive: 'Neptune floods you with ideas. Let them carry you.',
      negative: 'Neptune drowns focus. Creative vision dissolves into noise.',
    },
  },
  uranus: {
    decisions: {
      positive: 'Uranus breaks the pattern. A sudden shift changes everything.',
      negative: 'Uranus destabilizes. Quick decisions now will need fixing later.',
    },
    career: {
      positive: 'Uranus opens an unexpected door. Be ready for it.',
      negative: 'Uranus disrupts your plans. Flexibility is survival today.',
    },
  },
};

// ---- Verdict openers (one-liners to set the tone) ----
const VERDICT_OPENERS: Record<Verdict, string[]> = {
  HARD_YES: [
    'The stars burn bright for you.',
    'This is rare. The sky is clear and certain.',
    'Everything points the same direction.',
    'The heavens do not hesitate today.',
    'A strong alignment. You have the green light.',
  ],
  SOFT_YES: [
    'The stars lean your way. Gently.',
    'Something warm moves through your chart.',
    'The sky says yes, with one eye open.',
    'Encouragement, not certainty. But real.',
    'A good current runs through this question.',
  ],
  NEUTRAL: [
    'The stars say nothing either way.',
    'The sky holds still. No push, no pull.',
    'Neither blessing nor warning.',
    'Both sides weigh the same today.',
    'The oracle sees it both ways.',
  ],
  SOFT_NO: [
    'The stars ask you to slow down.',
    'A shadow touches this path.',
    'Patience, not action.',
    'Resistance is forming in your chart.',
    'The sky leans the other way. Not hard, but clearly.',
  ],
  HARD_NO: [
    'The stars say no.',
    'A clear warning runs through your chart.',
    'The sky closes this door on purpose.',
    'Every signal points away from this.',
    'The heavens are not subtle about it.',
  ],
  UNCLEAR: [
    'Your question is not sharp enough for the stars to read.',
    'The signal breaks apart before it arrives.',
    'The oracle needs more from you. Ask again, with specifics.',
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
      return `Today favors ${goodFor.slice(0, 2).join(' and ')}. Move with it.`;
    }
    return 'The way forward is open. Walk it.';
  }

  if (verdict === 'HARD_NO' || verdict === 'SOFT_NO') {
    if (badFor.length > 0) {
      return `Be careful with ${badFor.slice(0, 2).join(' and ')} right now.`;
    }
    return 'Not the moment. Wait for the sky to shift.';
  }

  if (verdict === 'NEUTRAL') {
    if (goodFor.length > 0 && badFor.length > 0) {
      return `The day helps with ${goodFor[0]} but resists ${badFor[0]}.`;
    }
    return 'You are not being pushed or held back. The choice is yours.';
  }

  return 'Make the question sharper. Then come back.';
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
    const reasoning = report.categories[reportCategory].reasoning;
    if (reasoning.length > 0) {
      const transitReasoning = reasoning.find(r => r.startsWith('Transit'));
      if (transitReasoning) {
        return transitReasoning.replace(/\(orb:.*?\)/, '').trim() + '.';
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
    return transit.isExact ? `An exact aspect today. ${line}` : line;
  }

  // Fall back to aspect voice
  const aspectVoices = ASPECT_VOICE[transit.aspectType];
  if (!aspectVoices) return null;

  const impactKey = impact || 'neutral';
  const pool = aspectVoices[impactKey] ?? aspectVoices['neutral'] ?? [];
  if (pool.length === 0) return null;

  const template = pool[Math.floor(Math.random() * pool.length)];
  let line = template
    .replace('{tp}', PLANET_NAME[tp] || capitalize(tp))
    .replace('{np}', PLANET_NAME[np] || capitalize(np));

  // Append house context when available
  if (transit.transitHouse && HOUSE_MEANINGS[transit.transitHouse]) {
    line += ` This plays out in your ${ordinal(transit.transitHouse)} house of ${HOUSE_MEANINGS[transit.transitHouse]}.`;
  }

  return transit.isExact ? `An exact aspect today. ${line}` : line;
}

// ---- Session memory line (the oracle remembers) ----
const CATEGORY_DISPLAY: Partial<Record<QuestionCategory, string>> = {
  love: 'love',
  career: 'work',
  money: 'money',
  health: 'your body',
  social: 'people',
  decisions: 'decisions',
  creativity: 'creating',
  spiritual: 'the inner world',
  communication: 'words',
  conflict: 'conflict',
  timing: 'timing',
};

function buildSessionMemory(
  verdict: Verdict,
  category: QuestionCategory,
  patterns?: ReadingPatterns | null,
): string | null {
  if (!patterns) return null;

  const parts: string[] = [];

  // 1. Acknowledge repeat category (3+ times in 7 days)
  const freq = patterns.categoryFrequency[category] ?? 0;
  if (freq >= 3) {
    const domainLabel = CATEGORY_DISPLAY[category] || category;
    const repeatLines = [
      `You keep asking about ${domainLabel}. ${freq} times this week. The pull is real.`,
      `${freq} times in seven days you have asked about ${domainLabel}. The oracle notices.`,
      `${domainLabel}, again. ${freq} times now. Something in you keeps circling back.`,
    ];
    parts.push(pick(repeatLines));
  }

  // 2. Verdict changed from last time in same category
  const prevVerdict = patterns.previousVerdictForCategory[category];
  if (prevVerdict && prevVerdict !== verdict) {
    const isPositiveShift =
      (prevVerdict === 'HARD_NO' || prevVerdict === 'SOFT_NO') &&
      (verdict === 'HARD_YES' || verdict === 'SOFT_YES');
    const isNegativeShift =
      (prevVerdict === 'HARD_YES' || prevVerdict === 'SOFT_YES') &&
      (verdict === 'HARD_NO' || verdict === 'SOFT_NO');

    if (isPositiveShift) {
      parts.push('Last time you asked, the answer was no. Today the sky has changed.');
    } else if (isNegativeShift) {
      parts.push('The stars once favored this. That window has closed.');
    } else {
      parts.push('The answer is different from last time. The sky has moved.');
    }
  }

  if (parts.length === 0) return null;
  return parts.join(' ');
}

// ---- Retrograde/moon extras ----
function buildExtras(
  category: QuestionCategory,
  report: PersonalDailyReport,
): string | null {
  const parts: string[] = [];

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
      parts.push(`${capitalize(retro.planet)} is retrograde. ${retro.advice}`);
      break;
    }
  }

  const moonName = report.moonPhase.name;
  if (moonName === 'New Moon' || moonName === 'Full Moon') {
    parts.push(`The ${moonName} adds weight. ${report.moonPhase.advice}`);
  }

  if (parts.length === 0) return null;
  return parts.join(' ');
}

// ---- Static template fallback (when no daily report) ----
interface OracleTemplate {
  opening: string;
  guidance: string;
}

const TEMPLATES: Record<Verdict, Record<QuestionCategory, OracleTemplate[]>> = {
  HARD_YES: {
    love: [
      { opening: "The stars burn bright for you.", guidance: "What your heart knows is real. Walk toward it." },
      { opening: "A rare alignment touches your heart.", guidance: "Love is not asking permission today. It is arriving." },
      { opening: "The sky is clear and warm.", guidance: "Trust the pull you feel. It is earned." },
    ],
    career: [
      { opening: "Your path is wide open.", guidance: "Move now. Opportunity stands where doubt used to be." },
      { opening: "The sky demands action.", guidance: "What you build right now will last." },
    ],
    money: [
      { opening: "Fortune turns your way.", guidance: "The numbers favor your move. Trust your instinct." },
      { opening: "Jupiter gives its full weight.", guidance: "The financial picture is clear. Act on it." },
    ],
    communication: [{ opening: "Mercury backs you completely.", guidance: "Your words will land exactly where they need to." }],
    conflict: [{ opening: "Strength runs through your chart.", guidance: "You have the advantage. Stand firm." }],
    timing: [{ opening: "The moment is now.", guidance: "Every clock points to this. Waiting is the only risk." }],
    health: [{ opening: "Vitality runs high.", guidance: "Your body and the sky agree. Push forward." }],
    social: [{ opening: "The stars pull people toward you.", guidance: "Every meeting today carries potential." }],
    decisions: [{ opening: "Rare clarity.", guidance: "Your mind is sharp. Your instinct is right. Decide." }],
    creativity: [{ opening: "Inspiration arrives with force.", guidance: "Create without holding back. This is your moment." }],
    spiritual: [{ opening: "The veil thins.", guidance: "Profound seeing is available. Open up." }],
  },
  SOFT_YES: {
    love: [{ opening: "The stars lean your way. Gently.", guidance: "Go with an open heart. But keep your eyes open too." }],
    career: [{ opening: "Encouragement, not certainty.", guidance: "Opportunity comes, though it takes effort." }],
    money: [{ opening: "The financial picture shows promise.", guidance: "Gain is possible. Measure your steps." }],
    communication: [{ opening: "Your voice carries weight today.", guidance: "The message will be heard. Timing matters." }],
    conflict: [{ opening: "You have a slight edge.", guidance: "Pick your fights carefully." }],
    timing: [{ opening: "The timing is good, not perfect.", guidance: "Do not wait for ideal." }],
    health: [{ opening: "Your energy holds steady.", guidance: "Use it wisely." }],
    social: [{ opening: "People are open to you.", guidance: "Show up. They will meet you halfway." }],
    decisions: [{ opening: "Your gut has merit.", guidance: "Trust it. But verify." }],
    creativity: [{ opening: "Something creative stirs underneath.", guidance: "Reach for it." }],
    spiritual: [{ opening: "A quiet opening.", guidance: "Sit with it long enough and insight comes." }],
  },
  NEUTRAL: {
    love: [{ opening: "The stars say nothing either way.", guidance: "Let clarity come before commitment." }],
    career: [{ opening: "The sky holds still on career.", guidance: "Prepare, but do not force." }],
    money: [{ opening: "The financial sky is quiet.", guidance: "Guard what you have. Wait for a clearer sign." }],
    communication: [{ opening: "Mercury wanders a middle path.", guidance: "Words carry their usual weight. No more, no less." }],
    conflict: [{ opening: "The field is calm.", guidance: "If you can avoid the fight, do." }],
    timing: [{ opening: "No clear signal on timing.", guidance: "You may act if pressed. Better days exist." }],
    health: [{ opening: "Steady energy. Nothing remarkable.", guidance: "Listen to your body. It knows." }],
    social: [{ opening: "Nothing special in the social sky.", guidance: "Go if you want. Stay if you prefer." }],
    decisions: [{ opening: "No strong counsel either way.", guidance: "If it can wait, let it." }],
    creativity: [{ opening: "The creative well is neither full nor empty.", guidance: "Work steadily." }],
    spiritual: [{ opening: "The inner world is quiet.", guidance: "Do your practice. Trust the process." }],
  },
  SOFT_NO: {
    love: [{ opening: "The stars ask you to slow down.", guidance: "What feels urgent may be premature." }],
    career: [{ opening: "The professional sky resists.", guidance: "Rethink your approach." }],
    money: [{ opening: "The financial sky urges caution.", guidance: "Hold your resources close." }],
    communication: [{ opening: "The signal weakens.", guidance: "Words may miss today. If it can wait, let it." }],
    conflict: [{ opening: "The stars do not favor this fight.", guidance: "Retreat is not weakness." }],
    timing: [{ opening: "Not yet.", guidance: "Better timing waits ahead." }],
    health: [{ opening: "Your reserves run low.", guidance: "Your body asks for rest." }],
    social: [{ opening: "Social ground is unsteady.", guidance: "Choose solitude if it calls." }],
    decisions: [{ opening: "The compass trembles.", guidance: "Your doubt is protecting you. Listen to it." }],
    creativity: [{ opening: "The well is dry for now.", guidance: "Rest. Return when it refills." }],
    spiritual: [{ opening: "The inner world feels far away.", guidance: "Release the expectation. Being present is enough." }],
  },
  HARD_NO: {
    love: [{ opening: "The stars say no.", guidance: "What the heart wants, the sky denies. For now. Trust the no." }],
    career: [{ opening: "A wall stands in front of you.", guidance: "This path is blocked. For good reason." }],
    money: [{ opening: "The financial sky flashes a warning.", guidance: "Protect what you have." }],
    communication: [{ opening: "Mercury opposes you.", guidance: "Every word risks being misread. Say less." }],
    conflict: [{ opening: "Do not fight today.", guidance: "You will not win this one. Walk away." }],
    timing: [{ opening: "Not now.", guidance: "Wrong moment. Full stop." }],
    health: [{ opening: "Vitality dips low.", guidance: "Body and sky agree: rest." }],
    social: [{ opening: "The social doors are shut.", guidance: "Being alone serves you better today." }],
    decisions: [{ opening: "No. Clearly.", guidance: "Do not proceed. The cost is higher than you think." }],
    creativity: [{ opening: "The well is empty.", guidance: "Nothing comes by forcing it. Wait." }],
    spiritual: [{ opening: "The inner world is rough.", guidance: "Ground yourself in the physical. Spirit returns." }],
  },
  UNCLEAR: {
    love: [{ opening: "Your question is too vague for the stars.", guidance: "Ask with a specific heart." }],
    career: [{ opening: "The question dissolves.", guidance: "Be more precise." }],
    money: [{ opening: "The oracle needs a sharper question.", guidance: "What exactly do you want to know?" }],
    communication: [{ opening: "Too faint to read.", guidance: "Try again with more detail." }],
    conflict: [{ opening: "Confusion in the asking.", guidance: "Clarify what you actually want." }],
    timing: [{ opening: "Time itself blurs in your question.", guidance: "Be specific." }],
    health: [{ opening: "The question does not reach the stars.", guidance: "Ask again with intention." }],
    social: [{ opening: "Too vague.", guidance: "What do you actually want to know?" }],
    decisions: [{ opening: "The question has no shape.", guidance: "Give the oracle something concrete." }],
    creativity: [{ opening: "The creative question lacks form.", guidance: "Even inspiration needs a starting point." }],
    spiritual: [{ opening: "The signal mirrors your own confusion.", guidance: "Quiet your mind. Then ask." }],
  },
};

// ---- Guidance: house-based answer seeds ----
// When a transit is in a specific house, these give concrete, tangible answers
// instead of abstract "energy" talk.
const HOUSE_GUIDANCE: Record<number, {
  places: string;
  focus: string;
  blocking: string;
  general: string;
}> = {
  1: {
    places: 'Places where you can be fully yourself. No performance, no mask. Somewhere you walk in and your body relaxes.',
    focus: 'Your own presence. How you carry yourself. The version of you that shows up when no one is watching.',
    blocking: 'You are getting in your own way. The obstacle wears your face.',
    general: 'This is about identity. Who you are becoming, not who you were.',
  },
  2: {
    places: 'Somewhere that feels like yours. Owned, earned, built by your hands. A space with weight and texture.',
    focus: 'What you already have. Your resources, your talents, the things you undervalue.',
    blocking: 'A disconnect between what you value and what you chase. The two need to match.',
    general: 'This is about worth. Not just money. What you bring to the table.',
  },
  3: {
    places: 'Your neighborhood. Familiar streets, local spots, the cafe where they know your order. Closeness, not distance.',
    focus: 'Conversations you have been putting off. Words that need to be said or written.',
    blocking: 'Scattered thoughts. Too many inputs, not enough processing. Simplify.',
    general: 'This is about communication and your immediate world.',
  },
  4: {
    places: 'Home. Not a concept of home. The physical space where you sleep, eat, and let your guard down.',
    focus: 'Your roots. Family patterns, emotional foundations, the ground beneath you.',
    blocking: 'Old family patterns running in the background. You inherited something that needs examining.',
    general: 'This is about your emotional foundation and private life.',
  },
  5: {
    places: 'Anywhere you play. Studios, stages, date spots, places where joy is the point and productivity is not.',
    focus: 'What makes you feel alive. Not useful. Alive. Follow that thread.',
    blocking: 'You forgot how to play. Everything became serious. Let something be fun again.',
    general: 'This is about creativity, pleasure, and self-expression.',
  },
  6: {
    places: 'Structured spaces. The gym, the office, anywhere with routine and rhythm. You thrive inside a system right now.',
    focus: 'Your daily habits. The small things you do repeatedly shape everything else.',
    blocking: 'Neglecting the basics. Sleep, food, movement. The foundation is cracking.',
    general: 'This is about health, daily work, and service.',
  },
  7: {
    places: 'Wherever the other person is. A partner, a collaborator, a mirror. You find yourself through someone else right now.',
    focus: 'Your closest relationships. What you give, what you receive, and whether the balance is honest.',
    blocking: 'Expecting from others what you will not give yourself. The mirror shows both sides.',
    general: 'This is about partnership and one-on-one relationships.',
  },
  8: {
    places: 'Somewhere private and intense. Therapy rooms, deep conversations at 2am, places where pretending is impossible.',
    focus: 'What you share with others. Intimacy, trust, vulnerability. The stuff that scares you.',
    blocking: 'Control. You are gripping too tightly. Let something die so something else can grow.',
    general: 'This is about transformation, shared resources, and deep bonds.',
  },
  9: {
    places: 'Far from home. Unfamiliar landscapes, foreign cities, universities, temples. Somewhere that stretches your worldview.',
    focus: 'The bigger picture. Your beliefs, your philosophy, the story you tell about what life means.',
    blocking: 'A narrow lens. You are looking at this from too close. Step back. Way back.',
    general: 'This is about meaning, travel, and expanding beyond the familiar.',
  },
  10: {
    places: 'Public spaces. Offices, stages, boardrooms, anywhere your reputation precedes you. Where the world sees your work.',
    focus: 'Your legacy. What you are building that will outlast this moment.',
    blocking: 'Ambition without direction. You are climbing, but check the ladder is on the right wall.',
    general: 'This is about career, public image, and long-term direction.',
  },
  11: {
    places: 'In community. Groups, movements, networks of people who share your vision. You belong in a collective right now.',
    focus: 'Your hopes. Not plans. Hopes. The future you actually want, not the safe one.',
    blocking: 'Isolation. You are trying to do this alone. That is the problem.',
    general: 'This is about community, friendship, and your vision for the future.',
  },
  12: {
    places: 'Quiet places. Water, solitude, retreats, anywhere the noise stops. Your answers come in silence, not crowds.',
    focus: 'What is hidden. Dreams, intuition, the things you feel but cannot name. Go inward.',
    blocking: 'Something unconscious is running the show. You cannot fight what you cannot see. Slow down and look.',
    general: 'This is about the unconscious, solitude, and spiritual surrender.',
  },
};

// Detect what kind of guidance the user is seeking from their question
type GuidanceIntent = 'places' | 'focus' | 'blocking' | 'feeling' | 'general';

function detectGuidanceIntent(question: string): GuidanceIntent {
  const q = question.toLowerCase();
  if (/\b(where|place|places|location|city|live|move|travel|go|environment|space|spaces|home|feel at home)\b/.test(q)) return 'places';
  if (/\b(block|blocking|holding.*back|stuck|obstacle|prevent|stop|resist|can'?t|cannot|struggle|wrong)\b/.test(q)) return 'blocking';
  if (/\b(focus|priorit|concentrate|direct|channel|lean into|work on|pay attention|emphasize)\b/.test(q)) return 'focus';
  if (/\b(feel|feeling|vibe|mood|emotion|sense|experience|going through)\b/.test(q)) return 'feeling';
  return 'general';
}

/**
 * Build a guidance-style response for open-ended questions.
 *
 * Architecture: Mirror → Evidence → Direction
 * 1. Mirror: acknowledge what they asked (not a generic opener)
 * 2. Evidence: cite ONE dominant transit + house as the reason
 * 3. Direction: give a specific, grounded answer connected to the question
 *
 * The question text directly shapes the response.
 */
function buildGuidanceResponse(
  category: QuestionCategory,
  reportCategory: keyof PersonalDailyReport['categories'],
  report: PersonalDailyReport,
  question: string,
  patterns?: ReadingPatterns | null,
): string {
  const cat = report.categories[reportCategory];
  const intent = detectGuidanceIntent(question);

  // Find the single strongest transit for this category
  const dominantTransit = report.keyTransits.find(t =>
    t.affectedCategories.includes(category) ||
    t.affectedCategories.includes(reportCategory as QuestionCategory)
  );

  // ── 1. MIRROR — acknowledge what they asked ──
  let mirror: string;
  if (intent === 'places') {
    mirror = 'Your chart actually points somewhere specific on this.';
  } else if (intent === 'blocking') {
    mirror = 'Your chart shows where the resistance lives.';
  } else if (intent === 'focus') {
    mirror = 'The stars have a clear answer about where your attention belongs.';
  } else if (intent === 'feeling') {
    mirror = cat.score >= 6
      ? 'There is a current moving through your chart right now. You are probably already feeling it.'
      : 'Something heavy sits in your chart today. That weight you feel is real.';
  } else {
    mirror = 'The sky speaks to this directly.';
  }

  // ── 2. EVIDENCE — one transit, woven into meaning ──
  let evidence = '';
  const house = dominantTransit?.transit.transitHouse;

  if (dominantTransit) {
    const tp = PLANET_NAME[dominantTransit.transit.transitPlanet] || capitalize(dominantTransit.transit.transitPlanet);
    const np = PLANET_NAME[dominantTransit.transit.natalPlanet] || capitalize(dominantTransit.transit.natalPlanet);
    const impact = dominantTransit.impact;

    // Use planet flavor if available, otherwise build from aspect
    const flavor = PLANET_FLAVOR[dominantTransit.transit.transitPlanet]?.[category]
      ?? PLANET_FLAVOR[dominantTransit.transit.transitPlanet]?.[reportCategory];

    if (flavor) {
      evidence = impact === 'negative' ? flavor.negative : flavor.positive;
    } else {
      // Build a clean transit sentence without template fragments
      const verb = impact === 'positive' ? 'supports' : impact === 'negative' ? 'presses against' : 'activates';
      evidence = `${tp} ${verb} your natal ${np} right now.`;
    }
  }

  // ── 3. DIRECTION — the actual answer, grounded in house + intent ──
  let direction = '';

  if (house && HOUSE_GUIDANCE[house]) {
    const houseData = HOUSE_GUIDANCE[house];
    if (intent === 'places') {
      direction = houseData.places;
    } else if (intent === 'blocking') {
      direction = houseData.blocking;
    } else if (intent === 'focus') {
      direction = houseData.focus;
    } else {
      direction = houseData.general;
    }
  } else {
    // No house data — fall back to category goodFor/badFor
    const goodFor = cat.goodFor.filter(g => g.length > 0);
    const badFor = cat.badFor.filter(b => b.length > 0);

    if (intent === 'blocking' && badFor.length > 0) {
      direction = `The tension sits around ${badFor.slice(0, 2).join(' and ')}. That is where to look.`;
    } else if (intent === 'focus' && goodFor.length > 0) {
      direction = `Your energy moves best toward ${goodFor.slice(0, 2).join(' and ')} right now.`;
    } else if (goodFor.length > 0 && badFor.length > 0) {
      direction = `Today leans toward ${goodFor[0]}. Step carefully around ${badFor[0]}.`;
    } else if (goodFor.length > 0) {
      direction = `The path opens toward ${goodFor.slice(0, 2).join(' and ')}.`;
    } else if (cat.score >= 7) {
      direction = 'The energy here is strong. Trust what pulls you.';
    } else if (cat.score <= 3) {
      direction = 'The energy is quiet. Wait for it to shift before you move.';
    } else {
      direction = 'The sky is not pushing you in any direction. The choice is genuinely yours.';
    }
  }

  // ── 4. CLOSE — one extra line if space allows ──
  let close = '';

  // Session memory (repeat category awareness)
  const sessionMemory = buildSessionMemory('NEUTRAL', category, patterns);
  if (sessionMemory) {
    close = sessionMemory;
  } else {
    // Moon/retrograde note if relevant and short
    const moonName = report.moonPhase.name;
    if (moonName === 'New Moon') {
      close = 'The New Moon favors beginning. Not finishing.';
    } else if (moonName === 'Full Moon') {
      close = 'The Full Moon illuminates. What you see now is what is really there.';
    }
  }

  // ── Assemble: 3-5 sentences, flowing narrative ──
  let response = mirror;
  if (evidence) response += ' ' + evidence;
  if (direction) response += ' ' + direction;
  if (close && response.length < 380) response += ' ' + close;

  return response;
}

// ---- Utility ----
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generate an oracle response from a verdict and category.
 * When a daily report is available, weaves in actual transit data.
 * Falls back to static templates when report is null.
 *
 * questionMode: 'guidance' skips the verdict and builds an insight-based response.
 */
export function generateOracleResponse(
  verdict: Verdict,
  category: QuestionCategory,
  report?: PersonalDailyReport | null,
  question?: string,
  patterns?: ReadingPatterns | null,
  questionMode?: 'directional' | 'guidance',
): string {
  // --- Guidance mode: open-ended insight, no yes/no ---
  if (questionMode === 'guidance' && report) {
    const reportCategory = CATEGORY_MAP[category];
    return buildGuidanceResponse(category, reportCategory, report, question || '', patterns);
  }
  // --- Fallback path: no report, use static templates ---
  if (!report) {
    const categoryTemplates = TEMPLATES[verdict]?.[category];
    if (!categoryTemplates || categoryTemplates.length === 0) {
      const fallback = TEMPLATES[verdict]?.decisions;
      if (fallback && fallback.length > 0) {
        const t = pick(fallback);
        return `${t.opening} ${t.guidance}`;
      }
      return "The stars are silent. Ask again later.";
    }
    const template = pick(categoryTemplates);
    return `${template.opening} ${template.guidance}`;
  }

  // --- Transit-aware path ---
  const reportCategory = CATEGORY_MAP[category];

  // 1. Opener
  const opener = pick(VERDICT_OPENERS[verdict] ?? VERDICT_OPENERS.NEUTRAL);

  // 2. Transit insight
  const transitInsight = buildTransitInsight(category, reportCategory, report);

  // 3. Guidance
  const guidance = buildGuidance(verdict, reportCategory, report);

  // 4. Extras (retrograde/moon)
  const extras = buildExtras(category, report);

  // 5. Session memory
  const sessionMemory = buildSessionMemory(verdict, category, patterns);

  // Assemble: target 3-5 sentences
  let response = opener;
  if (transitInsight) response += ' ' + transitInsight;
  response += ' ' + guidance;

  if (extras && response.length < 350) {
    response += ' ' + extras;
  }

  if (sessionMemory && response.length < 420) {
    response += ' ' + sessionMemory;
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
