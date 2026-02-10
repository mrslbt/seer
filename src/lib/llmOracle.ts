/**
 * LLM Oracle Service
 *
 * Calls the /api/oracle serverless function with the user's chart data.
 * Falls back to local template generation if the API fails.
 */

import type { UserProfile, Planet } from '../types/userProfile';
import type { PersonalDailyReport } from './personalDailyReport';
import type { QuestionCategory, Verdict } from '../types/astrology';
import { HOUSE_MEANINGS } from './personalDailyReport';

// ── Serialize natal chart into a readable summary for the LLM ──
function serializeChart(profile: UserProfile): string {
  const chart = profile.natalChart;
  const lines: string[] = [];

  const planets: { name: string; key: Planet }[] = [
    { name: 'Sun', key: 'sun' },
    { name: 'Moon', key: 'moon' },
    { name: 'Mercury', key: 'mercury' },
    { name: 'Venus', key: 'venus' },
    { name: 'Mars', key: 'mars' },
    { name: 'Jupiter', key: 'jupiter' },
    { name: 'Saturn', key: 'saturn' },
    { name: 'Uranus', key: 'uranus' },
    { name: 'Neptune', key: 'neptune' },
    { name: 'Pluto', key: 'pluto' },
  ];

  for (const p of planets) {
    const pos = chart[p.key];
    if (!pos) continue;
    const retro = pos.isRetrograde ? ' (retrograde)' : '';
    lines.push(`${p.name}: ${pos.sign} ${Math.floor(pos.degree)}°${retro}`);
  }

  // Key points
  if (chart.ascendant) {
    lines.push(`Rising: ${chart.ascendant.sign} ${Math.floor(chart.ascendant.degree)}°`);
  }
  if (chart.midheaven) {
    lines.push(`Midheaven: ${chart.midheaven.sign} ${Math.floor(chart.midheaven.degree)}°`);
  }
  if (chart.northNode) {
    lines.push(`North Node: ${chart.northNode.sign} ${Math.floor(chart.northNode.degree)}°`);
  }
  if (chart.chiron) {
    lines.push(`Chiron: ${chart.chiron.sign} ${Math.floor(chart.chiron.degree)}°`);
  }

  // Houses
  if (chart.houses && chart.houses.cusps.length > 0) {
    const houseLines = chart.houses.cusps.map(h =>
      `House ${h.house}: ${h.sign} (${HOUSE_MEANINGS[h.house] || ''})`
    );
    lines.push('');
    lines.push(houseLines.join(', '));
  }

  return lines.join('\n');
}

// ── Serialize current transits into a readable summary ──
function serializeTransits(report: PersonalDailyReport): string {
  if (report.keyTransits.length === 0) return 'No major transits today.';

  return report.keyTransits.map(t => {
    const { transit, interpretation, impact } = t;
    const exact = transit.isExact ? ' (EXACT)' : ` (orb: ${transit.orb.toFixed(1)}°)`;
    const house = transit.transitHouse
      ? ` in house ${transit.transitHouse} (${HOUSE_MEANINGS[transit.transitHouse] || ''})`
      : '';
    return `${interpretation}${house}${exact} [${impact}]`;
  }).join('\n');
}

// ── Main LLM call ──
export interface LLMOracleResult {
  text: string;
  source: 'llm' | 'fallback';
}

export async function callLLMOracle(
  question: string,
  questionMode: 'directional' | 'guidance',
  category: QuestionCategory,
  verdict: Verdict,
  profile: UserProfile,
  report: PersonalDailyReport,
): Promise<LLMOracleResult> {
  const reportCategory = mapCategory(category);
  const cat = report.categories[reportCategory];

  const payload = {
    question,
    questionMode,
    category,
    verdict: questionMode === 'directional' ? verdict : undefined,
    chartSummary: serializeChart(profile),
    transitSummary: serializeTransits(report),
    categoryScore: cat.score,
    goodFor: cat.goodFor.filter(g => g.length > 0),
    badFor: cat.badFor.filter(b => b.length > 0),
    moonPhase: report.moonPhase.name,
    retrogrades: report.retrogrades.map(r => r.planet),
  };

  try {
    const response = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('LLM oracle API returned', response.status);
      return { text: '', source: 'fallback' };
    }

    const data = await response.json();
    if (data.oracleText && typeof data.oracleText === 'string' && data.oracleText.length > 10) {
      // Strip any wrapping quotes the LLM might add
      let text = data.oracleText;
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1);
      }
      return { text, source: 'llm' };
    }

    return { text: '', source: 'fallback' };
  } catch (err) {
    console.warn('LLM oracle network error:', err);
    return { text: '', source: 'fallback' };
  }
}

// ── Category mapping (same as oracleResponse.ts) ──
function mapCategory(category: QuestionCategory): keyof PersonalDailyReport['categories'] {
  const map: Record<QuestionCategory, keyof PersonalDailyReport['categories']> = {
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
  return map[category];
}
