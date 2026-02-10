/**
 * LLM Oracle Service
 *
 * Unified client for ALL Seer LLM calls:
 * - callLLMOracle()   — personal oracle questions
 * - callBondLLM()     — relationship/bond questions
 * - callFollowUpLLM() — deeper insight after any reading
 *
 * Falls back gracefully when the API fails.
 */

import type { UserProfile, Planet } from '../types/userProfile';
import type { PersonalDailyReport } from './personalDailyReport';
import type { SynastryReport } from './synastry';
import type { TodaysBondData } from '../components/TodaysBond';
import type { QuestionCategory } from '../types/astrology';
import { HOUSE_MEANINGS } from './personalDailyReport';

// ── Result type shared across all callers ──
export interface LLMOracleResult {
  text: string;
  source: 'llm' | 'fallback';
}

// ── Serialize natal chart → readable text for LLM ──
function serializeChart(profile: UserProfile): string {
  const chart = profile.natalChart;
  const lines: string[] = [];

  const planets: { name: string; key: Planet }[] = [
    { name: 'Sun', key: 'sun' }, { name: 'Moon', key: 'moon' },
    { name: 'Mercury', key: 'mercury' }, { name: 'Venus', key: 'venus' },
    { name: 'Mars', key: 'mars' }, { name: 'Jupiter', key: 'jupiter' },
    { name: 'Saturn', key: 'saturn' }, { name: 'Uranus', key: 'uranus' },
    { name: 'Neptune', key: 'neptune' }, { name: 'Pluto', key: 'pluto' },
  ];

  for (const p of planets) {
    const pos = chart[p.key];
    if (!pos) continue;
    const retro = pos.isRetrograde ? ' (retrograde)' : '';
    lines.push(`${p.name}: ${pos.sign} ${Math.floor(pos.degree)}${retro}`);
  }

  if (chart.ascendant) lines.push(`Rising: ${chart.ascendant.sign} ${Math.floor(chart.ascendant.degree)}`);
  if (chart.midheaven) lines.push(`Midheaven: ${chart.midheaven.sign} ${Math.floor(chart.midheaven.degree)}`);
  if (chart.northNode) lines.push(`North Node: ${chart.northNode.sign} ${Math.floor(chart.northNode.degree)}`);
  if (chart.chiron) lines.push(`Chiron: ${chart.chiron.sign} ${Math.floor(chart.chiron.degree)}`);

  if (chart.houses && chart.houses.cusps.length > 0) {
    const houseLines = chart.houses.cusps.map(h =>
      `H${h.house}: ${h.sign} (${HOUSE_MEANINGS[h.house] || ''})`
    );
    lines.push(houseLines.join(', '));
  }

  return lines.join('\n');
}

// ── Serialize transits → readable text for LLM ──
function serializeTransits(report: PersonalDailyReport): string {
  if (report.keyTransits.length === 0) return 'No major transits today.';

  return report.keyTransits.map(t => {
    const { transit, interpretation, impact } = t;
    const exact = transit.isExact ? ' (EXACT)' : ` (orb: ${transit.orb.toFixed(1)})`;
    const house = transit.transitHouse
      ? ` in house ${transit.transitHouse} (${HOUSE_MEANINGS[transit.transitHouse] || ''})`
      : '';
    return `${interpretation}${house}${exact} [${impact}]`;
  }).join('\n');
}

// ── Serialize synastry report → readable text for LLM ──
function serializeSynastry(report: SynastryReport): string {
  const lines: string[] = [];

  lines.push(`Overall score: ${report.score}/100, tier: ${report.tier}`);
  lines.push(`Element harmony: ${report.elementHarmony.score}/10 - ${report.elementHarmony.description}`);

  const topThemes = [...report.themes].sort((a, b) => b.score - a.score).slice(0, 5);
  lines.push('Top themes: ' + topThemes.map(t => `${t.label} (${t.score.toFixed(1)})`).join(', '));

  if (report.keyAspects.length > 0) {
    lines.push('Key cross-chart aspects:');
    for (const a of report.keyAspects) {
      lines.push(`  ${a.person1Name}'s ${a.planet1} ${a.type} ${a.person2Name}'s ${a.planet2} (${a.nature}, orb ${a.orb.toFixed(1)}) - ${a.description}`);
    }
  }

  if (report.strengths.length > 0) {
    lines.push('Strengths: ' + report.strengths.slice(0, 3).join('; '));
  }
  if (report.challenges.length > 0) {
    lines.push('Challenges: ' + report.challenges.slice(0, 3).join('; '));
  }

  if (report.houseOverlays) {
    const overlays = [
      ...report.houseOverlays.person1InPerson2Houses,
      ...report.houseOverlays.person2InPerson1Houses,
    ].slice(0, 4);
    if (overlays.length > 0) {
      lines.push('House overlays: ' + overlays.map(o =>
        `${o.personName}'s ${o.planet} in ${o.hostName}'s house ${o.house}`
      ).join(', '));
    }
  }

  return lines.join('\n');
}

// ── Serialize today's bond → readable text for LLM ──
function serializeTodaysBond(bond: TodaysBondData): string {
  return [
    `Mood: ${bond.mood}`,
    `Pulse: ${bond.pulseScore}/100`,
    `Moon: ${bond.moonPhase}`,
    bond.transitLines.length > 0 ? `Transits: ${bond.transitLines.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

// ── Call API helper ──
async function callAPI(payload: Record<string, unknown>, lang?: string): Promise<LLMOracleResult> {
  try {
    const response = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, lang: lang || 'en' }),
    });

    if (!response.ok) {
      console.warn('LLM oracle API returned', response.status);
      return { text: '', source: 'fallback' };
    }

    const data = await response.json();
    if (data.oracleText && typeof data.oracleText === 'string' && data.oracleText.length > 10) {
      let text = data.oracleText;
      if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
      return { text, source: 'llm' };
    }

    return { text: '', source: 'fallback' };
  } catch (err) {
    console.warn('LLM oracle network error:', err);
    return { text: '', source: 'fallback' };
  }
}

// ── Category mapping ──
function mapCategory(category: QuestionCategory): keyof PersonalDailyReport['categories'] {
  const map: Record<QuestionCategory, keyof PersonalDailyReport['categories']> = {
    love: 'love', career: 'career', money: 'money',
    communication: 'social', conflict: 'decisions', timing: 'decisions',
    health: 'health', social: 'social', decisions: 'decisions',
    creativity: 'creativity', spiritual: 'spiritual',
  };
  return map[category];
}

// ════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════

/**
 * Personal oracle question (Seer tab)
 */
export async function callLLMOracle(
  question: string,
  questionMode: 'directional' | 'guidance',
  category: QuestionCategory,
  profile: UserProfile,
  report: PersonalDailyReport,
  lang?: string,
): Promise<LLMOracleResult> {
  const reportCategory = mapCategory(category);
  const cat = report.categories[reportCategory];

  return callAPI({
    type: 'seer',
    question,
    questionMode,
    category,
    chartSummary: serializeChart(profile),
    transitSummary: serializeTransits(report),
    categoryScore: cat.score,
    goodFor: cat.goodFor.filter(g => g.length > 0),
    badFor: cat.badFor.filter(b => b.length > 0),
    moonPhase: report.moonPhase.name,
    retrogrades: report.retrogrades.map(r => r.planet),
  }, lang);
}

/**
 * Bond/relationship question (Bonds tab)
 */
export async function callBondLLM(
  question: string,
  questionMode: 'directional' | 'guidance',
  profile1: UserProfile,
  profile2: UserProfile,
  synastryReport: SynastryReport,
  todaysBond?: TodaysBondData | null,
  lang?: string,
): Promise<LLMOracleResult> {
  return callAPI({
    type: 'bond',
    question,
    questionMode,
    person1Name: profile1.birthData.name,
    person2Name: profile2.birthData.name,
    chart1Summary: serializeChart(profile1),
    chart2Summary: serializeChart(profile2),
    synastryData: serializeSynastry(synastryReport),
    todaysBondData: todaysBond ? serializeTodaysBond(todaysBond) : undefined,
  }, lang);
}

/**
 * Chart personality reading — short poetic summary of who the person is
 */
export async function callChartReadingLLM(
  profile: UserProfile,
  lang?: string,
): Promise<LLMOracleResult> {
  return callAPI({
    type: 'chartReading',
    question: 'read my chart',
    questionMode: 'guidance' as const,
    chartSummary: serializeChart(profile),
    personName: profile.birthData.name || 'this person',
  }, lang);
}

/**
 * Follow-up question after any reading
 */
export async function callFollowUpLLM(
  followUpQuestion: string,
  originalQuestion: string,
  originalAnswer: string,
  category: QuestionCategory,
  profile: UserProfile,
  report: PersonalDailyReport,
  lang?: string,
): Promise<LLMOracleResult> {
  return callAPI({
    type: 'followup',
    question: followUpQuestion,
    questionMode: 'guidance' as const,
    originalQuestion,
    originalAnswer,
    category,
    chartSummary: serializeChart(profile),
    transitSummary: serializeTransits(report),
  }, lang);
}
