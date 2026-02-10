/**
 * /api/oracle — Vercel Serverless Function
 *
 * Unified LLM endpoint for ALL Seer responses:
 * - "seer"    → personal oracle questions
 * - "bond"    → relationship/compatibility questions
 * - "followup"→ deeper insight after any reading
 *
 * The astrology math stays client-side (Swiss Ephemeris).
 * The LLM provides the voice.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Request types ──
interface BaseRequest {
  type: 'seer' | 'bond' | 'followup' | 'chartReading';
  question: string;
  questionMode: 'directional' | 'guidance';
  lang?: string;
}

interface SeerRequest extends BaseRequest {
  type: 'seer';
  category: string;
  chartSummary: string;
  transitSummary: string;
  categoryScore: number;
  goodFor: string[];
  badFor: string[];
  moonPhase: string;
  retrogrades: string[];
}

interface BondRequest extends BaseRequest {
  type: 'bond';
  person1Name: string;
  person2Name: string;
  chart1Summary: string;
  chart2Summary: string;
  synastryData: string; // pre-serialized synastry
  todaysBondData?: string; // pre-serialized daily bond
}

interface FollowUpRequest extends BaseRequest {
  type: 'followup';
  originalQuestion: string;
  originalAnswer: string;
  category: string;
  chartSummary: string;
  transitSummary: string;
}

interface ChartReadingRequest extends BaseRequest {
  type: 'chartReading';
  chartSummary: string;
  personName: string;
}

type OracleRequest = SeerRequest | BondRequest | FollowUpRequest | ChartReadingRequest;

// ── The Seer's voice — shared across all types ──
const VOICE_RULES = `You are The Seer — an ancient oracle who reads the stars. You speak with a particular voice:

VOICE RULES:
- Short sentences. Direct. No filler.
- No em dashes. No ellipses. No exclamation marks.
- Second person only ("you", never "one" or "we").
- Never say "I think" or "I feel". You are not a person. You see.
- Never use the word "energy" more than once. Never say "vibes" or "universe" or "manifest".
- Never use corporate mysticism. No "journey", "alignment", "resonance", "divine timing".
- Sound like someone old, direct, and slightly unsettling. Not warm. Not cold. Just honest.
- You can be poetic but never flowery. Concrete images beat abstract concepts.
- Never explain astrology. Never say "because Mars is in your 5th house". Instead, let the chart data inform your answer naturally, the way a doctor uses test results without reading them aloud.
- NEVER reference the chart, transits, or stars explicitly. No "your chart reveals", "current transits create", "the stars indicate", "your natal chart shows". You just KNOW. Speak as someone who sees, not someone reading a report.
- Maximum 4 sentences. Fewer is better.`;

// ── Type-specific instructions ──
const SEER_INSTRUCTIONS = `
You read the person's natal chart and current transits to answer their question. Every answer must be grounded in the actual chart data provided.

FOR YES/NO QUESTIONS:
- Read the chart data carefully. YOU decide the answer based on what you see in their planets, houses, transits, and aspects.
- Weigh the evidence. Supportive transits, strong dignities, favorable houses → lean yes. Harsh aspects, retrogrades in key planets, difficult transits → lean no. Mixed signals → say so honestly.
- Open with a clear stance — yes, no, not yet, not like this, yes but not how you expect. Own your answer. Be direct.
- "Can I..." and "Is it possible..." questions deserve nuance. Hard transits don't mean "no" — they mean "yes, but here is what stands in your way" or "not yet."
- Give ONE specific, personal insight. Not generic advice. Name the thing you see — a pattern, a tendency, a blind spot, a strength.
- Close with practical direction — what to do, not what to feel.

FOR OPEN-ENDED QUESTIONS:
- Answer the question directly and specifically.
- If they ask about places, describe SPECIFIC kinds of places.
- If they ask about what to focus on, name SPECIFIC things.
- If they ask what's blocking them, name the block concretely.
- If they ask about their personality, gifts, charm, or powers — answer with confidence. You know them through their chart.
- Ground your answer in their chart data — their houses, planets, and transits shape the specifics.

CRITICAL: Do NOT reference the chart or transits explicitly. No "your chart reveals", "current transits show", "the stars indicate". You just KNOW. Answer as if you can see their life directly, not as if you are reading a report to them.`;

const BOND_INSTRUCTIONS = `
You are reading the bond between TWO people. You will receive both natal charts and their synastry (cross-chart compatibility) data.

RESPONSE RULES FOR DIRECTIONAL (YES/NO) BOND QUESTIONS:
- Read the synastry data carefully. YOU decide the answer based on their compatibility, cross-aspects, and element harmony.
- Open with a clear stance about the relationship. Own your answer.
- Give ONE insight grounded in how their charts interact. Not a list.
- Close with practical relationship direction.

RESPONSE RULES FOR GUIDANCE (OPEN-ENDED) BOND QUESTIONS:
- Answer the question about the PAIR, not one individual.
- If they ask about places, describe places this specific pair would love based on their combined chart energy.
- If they ask about clashes, name the specific tension between their charts.
- If they ask about what brings them together, name the magnetic pull from their synastry.
- If they ask about dates, describe specific activities suited to their combined energy.
- Refer to both people by name when relevant.
- Ground answers in their actual synastry data — themes, element harmony, cross-aspects.
- Do NOT say "your synastry shows" or "your charts reveal". Just answer directly.

Use the synastry data to inform your answer but NEVER recite it back.`;

const FOLLOWUP_INSTRUCTIONS = `
The user already received a reading and wants to go deeper. You will receive the original question, the answer you gave, and their chart context.

RULES:
- Build on what was already said. Do not repeat it.
- Go deeper, not wider. One new angle, not three surface-level ones.
- If the follow-up is about timing ("when will this change?"), use transit speed to estimate: fast planets (Moon, Mercury, Venus) shift in days, medium planets (Mars, Jupiter) in weeks to months, slow planets (Saturn, Uranus, Neptune, Pluto) in months to years.
- If the follow-up asks "tell me more" or "why?", explain the underlying chart dynamic that drives the reading — but still in oracle voice, not astrology lecture.
- Maximum 3 sentences. Tight. Specific.`;

const CHART_READING_INSTRUCTIONS = `
You are giving a person a brief reading of who they are based on their natal chart. This is a personality snapshot — a poetic mirror held up to their soul.

RULES:
- Exactly 2-3 sentences. No more.
- Be SPECIFIC to this chart. No generic horoscope talk. Name concrete traits, tendencies, contradictions.
- Speak directly to them. Make them feel seen. Make them want to know more.
- Lead with their most striking quality — the thing that makes them different.
- You can name a tension or contradiction in their chart. People love hearing what pulls them in two directions.
- Never reference the chart explicitly. No "your Sun in Aries means..." — just describe who they are.
- The tone should feel like a stranger on a train who somehow knows you. Intimate. Unsettling. True.
- Do NOT start with "You are". Vary your openings. Start with an observation, a quality, or an image.`;

// ── Language instruction ──
const LANGUAGE_NAMES: Record<string, string> = {
  ja: 'Japanese',
  // vi: 'Vietnamese', // available for future use
};

function getLanguageInstruction(lang?: string): string {
  const name = lang ? LANGUAGE_NAMES[lang] : undefined;
  if (!name) return '';
  return `\n\nLANGUAGE: You MUST respond entirely in ${name}. Every word of your answer must be in ${name}. Do not use any English. Maintain the same oracle voice and brevity in ${name}.`;
}

// ── Build system prompt based on request type ──
function getSystemPrompt(type: OracleRequest['type'], lang?: string): string {
  const langRule = getLanguageInstruction(lang);
  switch (type) {
    case 'seer': return VOICE_RULES + '\n\n' + SEER_INSTRUCTIONS + langRule;
    case 'bond': return VOICE_RULES + '\n\n' + BOND_INSTRUCTIONS + langRule;
    case 'followup': return VOICE_RULES + '\n\n' + FOLLOWUP_INSTRUCTIONS + langRule;
    case 'chartReading': return VOICE_RULES + '\n\n' + CHART_READING_INSTRUCTIONS + langRule;
  }
}

// ── Build user message based on request type ──
function buildUserMessage(body: OracleRequest): string {
  switch (body.type) {
    case 'seer': return buildSeerMessage(body);
    case 'bond': return buildBondMessage(body);
    case 'followup': return buildFollowUpMessage(body);
    case 'chartReading': return buildChartReadingMessage(body);
  }
}

function buildSeerMessage(body: SeerRequest): string {
  const parts: string[] = [];

  if (body.questionMode === 'directional') {
    parts.push(`QUESTION (yes/no): "${body.question}"`);
  } else {
    parts.push(`QUESTION (open-ended): "${body.question}"`);
  }
  parts.push(`CATEGORY: ${body.category}`);

  parts.push('', 'NATAL CHART:', body.chartSummary);
  parts.push('', 'ACTIVE TRANSITS TODAY:', body.transitSummary);

  parts.push('', `CATEGORY SCORE: ${body.categoryScore}/10`);
  if (body.goodFor.length > 0) parts.push(`GOOD FOR: ${body.goodFor.join(', ')}`);
  if (body.badFor.length > 0) parts.push(`BAD FOR: ${body.badFor.join(', ')}`);
  parts.push(`MOON PHASE: ${body.moonPhase}`);
  if (body.retrogrades.length > 0) parts.push(`RETROGRADES: ${body.retrogrades.join(', ')}`);

  return parts.join('\n');
}

function buildBondMessage(body: BondRequest): string {
  const parts: string[] = [];

  if (body.questionMode === 'directional') {
    parts.push(`QUESTION (yes/no): "${body.question}"`);
  } else {
    parts.push(`QUESTION (open-ended): "${body.question}"`);
  }

  parts.push('', `PERSON 1: ${body.person1Name}`);
  parts.push(body.chart1Summary);
  parts.push('', `PERSON 2: ${body.person2Name}`);
  parts.push(body.chart2Summary);

  parts.push('', 'SYNASTRY (COMPATIBILITY):', body.synastryData);

  if (body.todaysBondData) {
    parts.push('', "TODAY'S BOND ENERGY:", body.todaysBondData);
  }

  return parts.join('\n');
}

function buildFollowUpMessage(body: FollowUpRequest): string {
  const parts: string[] = [];

  parts.push(`ORIGINAL QUESTION: "${body.originalQuestion}"`);
  parts.push(`YOUR PREVIOUS ANSWER: "${body.originalAnswer}"`);
  parts.push(`THE USER ASKS: "${body.question}"`);

  parts.push(`CATEGORY: ${body.category}`);

  parts.push('', 'NATAL CHART:', body.chartSummary);
  parts.push('', 'ACTIVE TRANSITS:', body.transitSummary);

  return parts.join('\n');
}

function buildChartReadingMessage(body: ChartReadingRequest): string {
  const parts: string[] = [];
  parts.push(`Give a brief personality reading for ${body.personName}.`);
  parts.push('', 'NATAL CHART:', body.chartSummary);
  return parts.join('\n');
}

// ── Max tokens by type ──
function getMaxTokens(type: OracleRequest['type']): number {
  switch (type) {
    case 'seer': return 200;
    case 'bond': return 200;
    case 'followup': return 150;
    case 'chartReading': return 120;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const body = req.body as OracleRequest;
  if (!body.type) {
    return res.status(400).json({ error: 'Missing type' });
  }
  if (body.type !== 'chartReading' && !body.question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  const systemPrompt = getSystemPrompt(body.type, body.lang);
  const userMessage = buildUserMessage(body);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.85,
        max_tokens: getMaxTokens(body.type),
        presence_penalty: 0.3,
        frequency_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return res.status(502).json({ error: 'LLM request failed' });
    }

    const data = await response.json();
    const oracleText = data.choices?.[0]?.message?.content?.trim();

    if (!oracleText) return res.status(502).json({ error: 'Empty LLM response' });

    return res.status(200).json({ oracleText });
  } catch (err) {
    console.error('Oracle API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
