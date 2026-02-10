/**
 * /api/oracle — Vercel Serverless Function
 *
 * Receives the user's natal chart data, current transits, and question,
 * then returns a Seer-voiced response powered by an LLM.
 *
 * The astrology math stays client-side (Swiss Ephemeris).
 * The LLM provides the voice.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Types mirrored from frontend (kept minimal) ──
interface OracleRequest {
  question: string;
  questionMode: 'directional' | 'guidance';
  category: string;
  verdict?: string; // only for directional mode
  chartSummary: string; // pre-serialized natal chart description
  transitSummary: string; // pre-serialized current transits
  categoryScore: number; // 1-10
  goodFor: string[];
  badFor: string[];
  moonPhase: string;
  retrogrades: string[];
}

// ── The Seer's system prompt ──
const SEER_SYSTEM_PROMPT = `You are The Seer — an ancient oracle who reads the stars. You speak with a particular voice:

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
- Maximum 4 sentences. Fewer is better.

RESPONSE RULES FOR DIRECTIONAL (YES/NO) QUESTIONS:
- You MUST open with a clear stance. The verdict is provided to you — honor it.
- HARD_YES: Absolute certainty. "Yes." or equivalent. Then briefly why.
- SOFT_YES: Cautious encouragement. The path opens but watch your step.
- NEUTRAL: Genuine ambiguity. The sky holds still. Say so honestly.
- SOFT_NO: Gentle warning. Not the moment. Patience.
- HARD_NO: Unflinching. "No." Then briefly why.
- After the stance, give ONE specific insight grounded in their chart. Not a list.
- Close with practical direction — what to do, not what to feel.

RESPONSE RULES FOR GUIDANCE (OPEN-ENDED) QUESTIONS:
- No verdict needed. The user asked "what" or "where" or "how" — answer that specifically.
- If they ask about places, describe SPECIFIC kinds of places.
- If they ask about what to focus on, name SPECIFIC things.
- If they ask what's blocking them, name the block concretely.
- Ground your answer in their chart data — their houses, planets, and transits shape the specifics.
- Do NOT say "your chart says" or "the stars indicate". Just answer the question directly, as if you already know.

YOU WILL RECEIVE:
- The user's question
- Their natal chart placements (sun, moon, rising, planets in signs/houses)
- Today's active transits to their chart
- Category score (1-10), good-for list, bad-for list
- Moon phase and retrogrades

Use this data to inform your answer but NEVER recite it back. Let it shape your insight the way bones tell a story to someone who can read them.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const body = req.body as OracleRequest;
  if (!body.question || !body.chartSummary) {
    return res.status(400).json({ error: 'Missing question or chart data' });
  }

  // ── Build the user message with all chart context ──
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
          { role: 'system', content: SEER_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.85,
        max_tokens: 200,
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

    if (!oracleText) {
      return res.status(502).json({ error: 'Empty LLM response' });
    }

    return res.status(200).json({ oracleText });
  } catch (err) {
    console.error('Oracle API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildUserMessage(body: OracleRequest): string {
  const parts: string[] = [];

  // Question + mode
  if (body.questionMode === 'directional') {
    parts.push(`QUESTION (yes/no): "${body.question}"`);
    parts.push(`VERDICT: ${body.verdict}`);
  } else {
    parts.push(`QUESTION (open-ended): "${body.question}"`);
  }

  parts.push(`CATEGORY: ${body.category}`);

  // Chart data
  parts.push('');
  parts.push('NATAL CHART:');
  parts.push(body.chartSummary);

  // Transits
  parts.push('');
  parts.push('ACTIVE TRANSITS TODAY:');
  parts.push(body.transitSummary);

  // Category score
  parts.push('');
  parts.push(`CATEGORY SCORE: ${body.categoryScore}/10`);
  if (body.goodFor.length > 0) {
    parts.push(`GOOD FOR: ${body.goodFor.join(', ')}`);
  }
  if (body.badFor.length > 0) {
    parts.push(`BAD FOR: ${body.badFor.join(', ')}`);
  }

  // Moon + retrogrades
  parts.push(`MOON PHASE: ${body.moonPhase}`);
  if (body.retrogrades.length > 0) {
    parts.push(`RETROGRADES: ${body.retrogrades.join(', ')}`);
  }

  return parts.join('\n');
}
