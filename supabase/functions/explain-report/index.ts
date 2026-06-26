import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── Environment (auto-injected by Supabase + your secret) ──────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

// ─── System prompt ───────────────────────────────────────────────────────────
// This prompt is the guardrail. It defines who we are and what we must never do.
const SYSTEM_PROMPT = `You are a compassionate health literacy assistant inside the Bloom app.
Your role is to help people understand their own medical reports in plain, calm, simple language.

You are speaking to a person who may be anxious or frightened about a result they do not understand.
Speak warmly and clearly, like a knowledgeable friend — not a clinician writing a report.

STRICT RULES — you must NEVER break these:
1. You NEVER diagnose. Do not say "you have [condition]", "this means you have [condition]", or "this indicates [condition]".
2. You NEVER recommend treatments, medications, supplements, or lifestyle changes as prescriptions.
3. You NEVER interpret a result as definitive. Results must always be read in the context of the full clinical picture, which only the doctor has.
4. You NEVER alarm the user. If a value looks outside a typical range, note it calmly and recommend discussing it with their doctor.
5. You define every medical term you use, in parentheses, in plain English.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "explanation": "2 to 4 short paragraphs. What does this test or report measure? What do the values or findings shown here generally mean in a medical context? Keep paragraphs short, warm, and reassuring.",
  "doctor_questions": [
    "Question one to ask their doctor (start with a verb: What, Can you explain, Should I, How, Is this...)",
    "Question two",
    "Question three"
  ]
}

The doctor_questions array must have between 3 and 6 items — specific, empowering questions the person can bring to their next appointment.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Safe base64 encoder for binary data (avoids call-stack overflow on large files)
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS pre-flight
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

  // User-scoped client — all queries run under the caller's JWT, so Postgres
  // RLS automatically blocks access to records that don't belong to them.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client — used only to download the file from private storage.
  // The file never leaves the server; we read it here and send it to the AI.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { record_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { record_id } = body;
  if (!record_id || typeof record_id !== 'string') {
    return jsonResponse({ error: 'record_id is required' }, 400);
  }

  // ── Load record (ownership enforced by RLS) ───────────────────────────────
  const { data: record, error: recordError } = await userClient
    .from('health_records')
    .select('id, user_id, title, notes, file_path, file_type, file_name, file_size')
    .eq('id', record_id)
    .single();

  if (recordError || !record) {
    return jsonResponse({ error: 'Record not found or you do not have permission to access it.' }, 404);
  }

  // ── Download the file from private storage ────────────────────────────────
  // Cap at ~8 MB raw (≈10.6 MB base64) to stay inside Claude's image/PDF limits.
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const fileSize = record.file_size ?? 0;

  let claudeContent: unknown[];

  if (fileSize > MAX_FILE_BYTES) {
    claudeContent = buildTextFallback(record);
  } else {
    const { data: fileBlob, error: storageError } = await adminClient.storage
      .from('health-docs')
      .download(record.file_path);

    if (storageError || !fileBlob) {
      console.error('Storage download error:', storageError?.message);
      claudeContent = buildTextFallback(record);
    } else {
      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      const base64 = uint8ToBase64(bytes);

      if (record.file_type === 'image') {
        const ext = record.file_name.split('.').pop()?.toLowerCase() ?? 'jpeg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        claudeContent = [
          { type: 'text', text: `Health record titled "${record.title}". Please explain what you see to the patient.` },
          { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
        ];
      } else if (record.file_type === 'pdf') {
        claudeContent = [
          { type: 'text', text: `Health record titled "${record.title}". Please explain what you see to the patient.` },
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        ];
      } else {
        // Other document types (Word, text, etc.) — fall back to metadata
        claudeContent = buildTextFallback(record);
      }
    }
  }

  // ── Call Claude ───────────────────────────────────────────────────────────
  // claude-sonnet-4-6 handles vision (images + PDFs) and text well.
  const anthropicHeaders: Record<string, string> = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };

  // PDF document blocks require the beta header
  if (record.file_type === 'pdf') {
    anthropicHeaders['anthropic-beta'] = 'pdfs-2024-09-25';
  }

  let aiResp: Response;
  try {
    aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: claudeContent }],
      }),
    });
  } catch (err) {
    console.error('Anthropic fetch error:', err);
    return jsonResponse({ error: "Couldn't reach the AI service. Please try again in a moment." }, 502);
  }

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error('Anthropic API error:', aiResp.status, errText);
    await adminClient
      .from('health_records')
      .update({ ai_status: 'error' })
      .eq('id', record.id);
    return jsonResponse({ error: "Couldn't read this one — try a clearer photo or PDF." }, 502);
  }

  const aiData = await aiResp.json();
  const rawText: string = aiData?.content?.[0]?.text ?? '';

  let parsed: { explanation: string; doctor_questions: string[] };
  try {
    parsed = JSON.parse(rawText);
    if (!parsed.explanation || !Array.isArray(parsed.doctor_questions)) {
      throw new Error('Missing required fields');
    }
  } catch {
    console.error('Failed to parse Claude response:', rawText);
    // Best-effort: mark the row so the app can show a retry instead of spinning.
    await adminClient
      .from('health_records')
      .update({ ai_status: 'error' })
      .eq('id', record.id);
    return jsonResponse({ error: 'Something went wrong processing the response. Please try again.' }, 502);
  }

  // ── Persist the explanation onto the row ──────────────────────────────────
  // The admin client writes past RLS so the result is saved for the timeline and
  // for the clinic view — they read it instantly without re-calling Claude.
  const { error: persistError } = await adminClient
    .from('health_records')
    .update({
      ai_summary: parsed.explanation,
      ai_questions: parsed.doctor_questions,
      ai_status: 'done',
    })
    .eq('id', record.id);

  if (persistError) {
    // Non-fatal: still return the explanation to the user even if the save fails.
    console.error('Failed to persist AI result:', persistError.message);
  }

  return jsonResponse({
    explanation: parsed.explanation,
    doctor_questions: parsed.doctor_questions,
  });
});

// ── Text-only fallback when we cannot process the file itself ───────────────
function buildTextFallback(record: {
  title: string;
  notes: string | null;
  file_name: string;
  file_type: string;
}): unknown[] {
  const parts = [
    `Health record titled: "${record.title}"`,
    `File name: ${record.file_name}`,
    `File type: ${record.file_type}`,
  ];
  if (record.notes) {
    parts.push(`Patient notes: ${record.notes}`);
  } else {
    parts.push('No additional notes were provided.');
  }
  parts.push(
    'Note: the actual file could not be read, so please base your explanation on the title and notes above.'
  );
  return [{ type: 'text', text: parts.join('\n') }];
}
