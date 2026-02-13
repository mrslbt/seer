/**
 * /api/oracle — Cloudflare Pages Function
 *
 * Unified LLM endpoint for ALL Seer responses:
 * - "seer"    → personal oracle questions
 * - "bond"    → relationship/compatibility questions
 * - "followup"→ deeper insight after any reading
 * - "chartReading" → personality snapshot
 * - "chartQuestion" → natal chart questions
 * - "cosmosQuestion" → daily transit questions
 */

// ── Cloudflare Pages Function types ──
interface Env {
  OPENAI_API_KEY: string;
}

// ── Request types ──
interface BaseRequest {
  type: 'seer' | 'bond' | 'followup' | 'chartReading' | 'chartQuestion' | 'cosmosQuestion';
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
  synastryData: string;
  todaysBondData?: string;
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

interface ChartQuestionRequest extends BaseRequest {
  type: 'chartQuestion';
  chartSummary: string;
  personName: string;
  transitSummary?: string;
}

interface CosmosQuestionRequest extends BaseRequest {
  type: 'cosmosQuestion';
  chartSummary: string;
  transitSummary: string;
  categoryScores: string;
  moonPhase: string;
  retrogrades: string[];
}

type OracleRequest = SeerRequest | BondRequest | FollowUpRequest | ChartReadingRequest | ChartQuestionRequest | CosmosQuestionRequest;

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

CRITICAL CONSTRAINT — QUESTIONS ABOUT OTHER PEOPLE:
You can ONLY see THIS person's chart. You have NO data on any partner, crush, ex, or other person. You CANNOT evaluate someone else.
- "Is this person my soulmate?" → Do NOT say yes or no about a specific person you cannot see. Instead, describe what kind of soul would match them based on their Venus, Moon, 7th house, and Descendant.
- "Does he love me?" / "Does she think about me?" → You cannot see them. Instead, describe what this person needs to feel loved and what patterns they create in relationships.
- "Will we get back together?" → You cannot see the other person. Instead, describe what this person's chart says about their relationship cycles and timing.
- Love questions are valid. But answer about what YOU CAN SEE in the asker's chart — their love nature, what they attract, what they need — not about someone whose chart you do not have.

FOR YES/NO QUESTIONS:
- Read the chart data carefully. YOU decide the answer based on what you see in their planets, houses, transits, and aspects.
- Weigh the evidence. Supportive transits, strong dignities, favorable houses → lean yes. Harsh aspects, retrogrades in key planets, difficult transits → lean no. Mixed signals → say so honestly.
- Open with a clear stance — yes, no, not yet, not like this, yes but not how you expect. Own your answer. Be direct.
- If the question requires knowledge of another person you cannot see, redirect to what you CAN see in the asker's chart. Do not pretend to know the other person.
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

const CHART_QUESTION_INSTRUCTIONS = `
You are answering a question about who this person IS — based on their natal chart (birth sky). This is about their permanent nature, not what is happening now.

CRITICAL CONSTRAINT: You can ONLY see THIS person's chart. You have NO information about any other person, partner, ex, crush, or friend. You do not know who they are asking about.

FOR QUESTIONS ABOUT OTHER PEOPLE (soulmate, partner, crush, ex):
- You CANNOT evaluate the other person. You do not have their chart.
- Instead, answer about what THIS person needs, seeks, attracts, and struggles with in relationships — based on their own Venus, Moon, 7th house, Descendant.
- "Is this my soulmate?" → Answer what kind of person would be their soulmate based on their chart. Do NOT say yes or no about a specific person you cannot see.
- "Does he love me?" → You cannot see him. Instead, describe what this person needs to feel loved, and what patterns they fall into.

FOR YES/NO QUESTIONS:
- Read the chart carefully. Answer based on their planets, houses, and aspects — their inborn wiring.
- If the question requires knowing another person, redirect to what you CAN see about the asker.
- Open with a clear stance. Own your answer.
- Give ONE specific, personal insight grounded in their chart.
- Close with practical direction.

FOR OPEN-ENDED QUESTIONS:
- Answer directly and specifically about who they are.
- If they ask about strengths, name SPECIFIC strengths from their chart.
- If they ask about love style, describe HOW they love based on Venus, Moon, 7th house.
- If they ask about career, describe what suits them based on 10th house, Saturn, Midheaven.
- If they ask about challenges, name the specific tension or blind spot.
- If they ask about purpose, describe what their North Node and chart ruler point toward.

IF TRANSIT DATA IS PROVIDED:
- The user asked about timing or current circumstances. Use the transits to inform WHEN and HOW, but still ground the answer in who they are.

IF NO TRANSIT DATA:
- Answer purely about their nature. Do not speculate about timing. Never say "current energies" or "right now" without transit data.

CRITICAL: Do NOT reference the chart explicitly. No "your Venus in Pisces means..." — just describe who they are and answer the question. You see them. You know them.`;

const COSMOS_QUESTION_INSTRUCTIONS = `
You are answering a question about TODAY — what this person's sky looks like right now. You have their natal chart and all active transits.

This is about the CURRENT MOMENT. Unlike chart questions (which are about who they are), cosmos questions are about what is happening NOW and in the coming days.

FOR YES/NO QUESTIONS:
- Read the transit data carefully. Decide based on today's planetary weather for this person.
- Supportive transits → yes. Harsh transits → not today. Mixed → say when it shifts.
- Open with a clear stance about today specifically.
- Give ONE concrete reason tied to what you see right now.
- If the timing is bad, say when it gets better (use transit speed to estimate).

FOR OPEN-ENDED QUESTIONS:
- Answer about RIGHT NOW, today, this week.
- If they ask what to focus on, name the specific area of life the transits are activating.
- If they ask why they feel a certain way, name the transit causing it — but in oracle voice, not astrology lecture.
- If they ask about love today, career today, etc. — answer based on the transiting planets hitting those houses.
- Use the category scores to know which areas are hot and which are cold.
- Moon phase matters. New moon = beginning. Full moon = clarity. Waning = release.

RETROGRADES:
- If relevant retrogrades are active, weave them into the answer naturally.
- Mercury retrograde affects communication and plans. Venus retrograde affects relationships and values. Mars retrograde affects drive and conflict.

CRITICAL: Do NOT list transits or scores. Do NOT say "your transits show" or "today's score is". Just answer as someone who can see what is happening around them right now.`;

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
    case 'chartQuestion': return VOICE_RULES + '\n\n' + CHART_QUESTION_INSTRUCTIONS + langRule;
    case 'cosmosQuestion': return VOICE_RULES + '\n\n' + COSMOS_QUESTION_INSTRUCTIONS + langRule;
  }
}

// ── Build user message based on request type ──
function buildUserMessage(body: OracleRequest): string {
  switch (body.type) {
    case 'seer': return buildSeerMessage(body);
    case 'bond': return buildBondMessage(body);
    case 'followup': return buildFollowUpMessage(body);
    case 'chartReading': return buildChartReadingMessage(body);
    case 'chartQuestion': return buildChartQuestionMessage(body);
    case 'cosmosQuestion': return buildCosmosQuestionMessage(body);
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

function buildChartQuestionMessage(body: ChartQuestionRequest): string {
  const parts: string[] = [];

  if (body.questionMode === 'directional') {
    parts.push(`QUESTION (yes/no): "${body.question}"`);
  } else {
    parts.push(`QUESTION (open-ended): "${body.question}"`);
  }

  parts.push(`PERSON: ${body.personName}`);
  parts.push('', 'NATAL CHART:', body.chartSummary);

  if (body.transitSummary) {
    parts.push('', 'CURRENT TRANSITS (user asked about timing):', body.transitSummary);
  }

  return parts.join('\n');
}

function buildCosmosQuestionMessage(body: CosmosQuestionRequest): string {
  const parts: string[] = [];

  if (body.questionMode === 'directional') {
    parts.push(`QUESTION (yes/no): "${body.question}"`);
  } else {
    parts.push(`QUESTION (open-ended): "${body.question}"`);
  }

  parts.push('', 'NATAL CHART:', body.chartSummary);
  parts.push('', 'ACTIVE TRANSITS TODAY:', body.transitSummary);

  parts.push('', 'DAILY CATEGORY SCORES:', body.categoryScores);
  parts.push(`MOON PHASE: ${body.moonPhase}`);
  if (body.retrogrades.length > 0) parts.push(`RETROGRADES: ${body.retrogrades.join(', ')}`);

  return parts.join('\n');
}

// ── Max tokens by type ──
function getMaxTokens(type: OracleRequest['type']): number {
  switch (type) {
    case 'seer': return 200;
    case 'bond': return 200;
    case 'followup': return 150;
    case 'chartReading': return 120;
    case 'chartQuestion': return 200;
    case 'cosmosQuestion': return 200;
  }
}

// ── CORS headers ──
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Cloudflare Pages Function handler ──
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: OracleRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.type) {
    return new Response(JSON.stringify({ error: 'Missing type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (body.type !== 'chartReading' && !body.question) {
    return new Response(JSON.stringify({ error: 'Missing question' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
      return new Response(JSON.stringify({ error: 'LLM request failed', detail: errorText, status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const oracleText = data.choices?.[0]?.message?.content?.trim();

    if (!oracleText) {
      return new Response(JSON.stringify({ error: 'Empty LLM response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ oracleText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Oracle API error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
