import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── clinic-record ─────────────────────────────────────────────────────────────
// PUBLIC function (verify_jwt = FALSE). The share TOKEN is the auth. We validate
// it server-side with the service role, log every view to access_log, then return
// the patient's unified record. The client is NEVER trusted: no token, no data.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid' });
  }

  const token = body.token?.trim();
  if (!token) return jsonResponse({ error: 'invalid' });

  // ── Validate the token (service role bypasses RLS) ───────────────────────────
  const { data: share, error: shareErr } = await admin
    .from('shares')
    .select('id, user_id, created_at, expires_at, revoked')
    .eq('token', token)
    .maybeSingle();

  if (shareErr || !share) return jsonResponse({ error: 'invalid' });
  if (share.revoked) return jsonResponse({ error: 'revoked' });
  if (new Date(share.expires_at).getTime() <= Date.now()) return jsonResponse({ error: 'expired' });

  // ── Log this view ────────────────────────────────────────────────────────────
  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '';
  const viewerIp = fwd.split(',')[0].trim() || null;
  await admin.from('access_log').insert({ share_id: share.id, viewer_ip: viewerIp });

  // ── Load the unified record ──────────────────────────────────────────────────
  const [{ data: profile }, { data: facts }, { data: records }, { count: viewedCount }] =
    await Promise.all([
      admin.from('profiles').select('full_name, dob, blood_type').eq('id', share.user_id).maybeSingle(),
      admin.from('health_facts').select('type, label, detail').eq('user_id', share.user_id)
        .order('created_at', { ascending: true }),
      admin.from('health_records')
        .select('title, file_type, recorded_at, ai_summary, ai_questions, file_path')
        .eq('user_id', share.user_id)
        .order('recorded_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      admin.from('access_log').select('*', { count: 'exact', head: true }).eq('share_id', share.id),
    ]);

  // ── Signed URLs (1 hour) for each report file ────────────────────────────────
  const reports = await Promise.all(
    (records ?? []).map(async (r) => {
      let signedUrl: string | null = null;
      const { data: signed } = await admin.storage
        .from('health-docs')
        .createSignedUrl(r.file_path, 3600);
      if (signed?.signedUrl) signedUrl = signed.signedUrl;
      return {
        title: r.title,
        fileType: r.file_type,
        recordedAt: r.recorded_at,
        aiSummary: r.ai_summary,
        doctorQuestions: r.ai_questions ?? [],
        signedUrl,
      };
    }),
  );

  return jsonResponse({
    patient: {
      fullName: profile?.full_name ?? null,
      dob: profile?.dob ?? null,
      bloodType: profile?.blood_type ?? null,
    },
    facts: (facts ?? []).map((f) => ({ type: f.type, label: f.label, detail: f.detail })),
    reports,
    sharedAt: share.created_at,
    expiresAt: share.expires_at,
    viewedCount: viewedCount ?? 0,
  });
});
