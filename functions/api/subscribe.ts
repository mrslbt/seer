/**
 * /api/subscribe — Cloudflare Pages Function
 *
 * Collects email + basic profile data at onboarding.
 * Stores in D1 (subscribers table) for future marketing/comms.
 * Fire-and-forget from client — never blocks onboarding.
 */

interface Env {
  DB: D1Database;
}

interface SubscribeRequest {
  email: string;
  name?: string;
  birthDate?: string;
  birthCity?: string;
  birthCountry?: string;
  emailConsent?: number;
  language?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 200, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: SubscribeRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO subscribers (id, email, name, birth_date, birth_city, birth_country, email_consent, language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           name = excluded.name,
           birth_date = excluded.birth_date,
           birth_city = excluded.birth_city,
           birth_country = excluded.birth_country,
           email_consent = excluded.email_consent,
           language = excluded.language,
           updated_at = excluded.updated_at`
      )
      .bind(
        id,
        body.email.toLowerCase().trim(),
        body.name || null,
        body.birthDate || null,
        body.birthCity || null,
        body.birthCountry || null,
        body.emailConsent ?? 0,
        body.language || 'en',
        now,
        now
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
