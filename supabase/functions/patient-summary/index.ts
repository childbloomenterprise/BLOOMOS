import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── patient-summary ────────────────────────────────────────────────────────
// AUTHED function (verify_jwt = TRUE). Generates an "at-a-glance" clinical
// handoff: 3–5 calm sentences synthesizing the user's health_facts + the
// already-PERSISTED ai_summary fields on health_records. It NEVER re-reads files
// or re-calls explain-report — it reads persisted data only. The result is saved
// onto profiles(summary, summary_updated_at) so the app + clinic view load it
// instantly. Same never-diagnose guardrail as explain-report.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// ─── System prompt — the SAME guardrail as explain-report ───────────────────
// Identical strict rules (never diagnose, never prescribe, define terms, never
// alarm). Only the task framing + output shape differ: a calm at-a-glance handoff.
const SYSTEM_PROMPT = `You are a compassionate health literacy assistant inside the Bloom app.
Your role is to help people understand their own health in plain, calm, simple language.

You are writing a short "at-a-glance" summary of one person's health, so they (and a
doctor they choose to share it with) can see the whole picture at a glance. You are NOT
making clinical judgements — you are calmly restating what this person's own records and
saved facts already say.

STRICT RULES — you must NEVER break these:
1. You NEVER diagnose. Do not say "you have [condition]", "this means you have [condition]", or "this indicates [condition]". You may restate a condition the person has already recorded about themselves.
2. You NEVER recommend treatments, medications, supplements, or lifestyle changes as prescriptions.
3. You NEVER interpret a result as definitive. Results must always be read in the context of the full clinical picture, which only the doctor has.
4. You NEVER alarm the user. If a value looks outside a typical range, note it calmly and recommend discussing it with their doctor.
5. You define every medical term you use, in parentheses, in plain English.
6. You ONLY use the facts and report summaries given to you below. Do not invent values, dates, or findings.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "summary": "3 to 5 short, calm sentences giving an at-a-glance picture of this person's health: their recorded conditions, medications and allergies, and what their most recent report summaries broadly say. End by reminding gently that this is a plain-language explanation of their own records, not a diagnosis, and that their doctor reads it alongside the full picture."
}`;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

  // User-scoped client — RLS makes every read owner-only, so this user can only
  // ever summarize their OWN facts and records.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // Admin client — used ONLY to persist the result back onto the caller's row.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Identify the caller (also confirms the JWT resolves to a user).
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401);

  // ── Read PERSISTED data only (no files, no Claude re-calls) ────────────────
  const [{ data: facts }, { data: records }] = await Promise.all([
    userClient
      .from('health_facts')
      .select('type, label, detail')
      .order('created_at', { ascending: true }),
    userClient
      .from('health_records')
      .select('title, recorded_at, ai_summary')
      .eq('ai_status', 'done')
      .not('ai_summary', 'is', null)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ]);

  const factList = facts ?? [];
  const recordList = records ?? [];

  // Nothing to summarize yet — persist null and tell the app gently.
  if (factList.length === 0 && recordList.length === 0) {
    await adminClient
      .from('profiles')
      .update({ summary: null, summary_updated_at: null })
      .eq('id', user.id);
    return jsonResponse({ summary: null, summaryUpdatedAt: null });
  }

  // ── Build the prompt from persisted data ───────────────────────────────────
  const factLines = factList.length
    ? factList
        .map((f) => `- ${f.type}: ${f.label}${f.detail ? ` (${f.detail})` : ''}`)
        .join('\n')
    : '(none recorded)';

  const reportLines = recordList.length
    ? recordList
        .map(
          (r) =>
            `- "${r.title}"${r.recorded_at ? ` (${r.recorded_at})` : ''}: ${r.ai_summary}`,
        )
        .join('\n\n')
    : '(no report summaries yet)';

  const userContent =
    `Recorded health facts:\n${factLines}\n\n` +
    `Plain-language summaries of this person's recent reports (already written for them, ` +
    `most recent first):\n${reportLines}\n\n` +
    `Write the at-a-glance summary described in your instructions.`;

  // ── Call Claude (same model + guardrail as explain-report) ─────────────────
  let aiResp: Response;
  try {
    aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
  } catch (err) {
    console.error('Anthropic fetch error:', err);
    return jsonResponse({ error: "Couldn't reach the AI service. Please try again in a moment." }, 502);
  }

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error('Anthropic API error:', aiResp.status, errText);
    return jsonResponse({ error: "Couldn't generate a summary right now. Please try again." }, 502);
  }

  const aiData = await aiResp.json();
  const rawText: string = aiData?.content?.[0]?.text ?? '';

  let parsed: { summary: string };
  try {
    parsed = JSON.parse(rawText);
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      throw new Error('Missing summary field');
    }
  } catch {
    console.error('Failed to parse Claude response:', rawText);
    return jsonResponse({ error: 'Something went wrong processing the response. Please try again.' }, 502);
  }

  // ── Persist onto the caller's profile (admin client, like explain-report) ──
  const summaryUpdatedAt = new Date().toISOString();
  const { error: persistError } = await adminClient
    .from('profiles')
    .update({ summary: parsed.summary, summary_updated_at: summaryUpdatedAt })
    .eq('id', user.id);

  if (persistError) {
    // Non-fatal: still return the summary even if the save failed.
    console.error('Failed to persist summary:', persistError.message);
  }

  return jsonResponse({ summary: parsed.summary, summaryUpdatedAt });
});
