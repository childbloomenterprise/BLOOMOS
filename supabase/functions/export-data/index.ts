import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── export-data ────────────────────────────────────────────────────────────
// AUTHED function (verify_jwt = TRUE). "Export all my data": returns the caller's
// OWN profile + health facts + health-record metadata + short-lived signed file
// URLs as a single JSON document. Privacy IS the product — the user owns and can
// take everything with them.
//
// Security: we act ONLY on the authenticated caller (auth.uid()), never a
// body-provided id. Every read runs under the caller's JWT so Postgres RLS
// guarantees owner-only access (defense in depth even though we also filter by id).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// File links live only 5 minutes — long enough to download, short enough to be safe.
const SIGNED_URL_TTL_SECONDS = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

  // User-scoped client — RLS makes every read owner-only.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // Admin client — used ONLY to mint signed URLs for the caller's own files.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Identify the caller from the JWT (never trust a body id).
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401);

  // ── Gather everything the user owns (reads run under their RLS) ─────────────
  const [{ data: profile }, { data: facts }, { data: records }] = await Promise.all([
    userClient
      .from('profiles')
      .select('full_name, dob, blood_type, summary, summary_updated_at, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    userClient
      .from('health_facts')
      .select('type, label, detail, created_at')
      .order('created_at', { ascending: true }),
    userClient
      .from('health_records')
      .select(
        'title, notes, file_type, file_name, file_size, recorded_at, ai_summary, ai_questions, ai_status, created_at, file_path',
      )
      .order('created_at', { ascending: false }),
  ]);

  // Attach a short-lived signed URL to each record; drop the raw storage path.
  const recordsOut = await Promise.all(
    (records ?? []).map(async (r) => {
      let signedUrl: string | null = null;
      const { data: signed } = await admin.storage
        .from('health-docs')
        .createSignedUrl(r.file_path, SIGNED_URL_TTL_SECONDS);
      if (signed?.signedUrl) signedUrl = signed.signedUrl;
      const { file_path: _omit, ...meta } = r;
      return { ...meta, signedUrl };
    }),
  );

  return jsonResponse({
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
    facts: facts ?? [],
    records: recordsOut,
  });
});
