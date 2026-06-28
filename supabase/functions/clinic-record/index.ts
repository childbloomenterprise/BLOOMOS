import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── clinic-record ─────────────────────────────────────────────────────────────
// PUBLIC function (verify_jwt = FALSE). The share TOKEN is the auth. We validate
// it server-side with the service role, then enforce the CONSENT GATE before any
// data leaves: a token is not readable until its owner approves the request.
//
//   pending   first contact  -> flip to 'requested', return { status: 'pending' }
//   requested still waiting   -> return { status: 'pending' } (the phone polls)
//   denied                    -> return { error: 'denied' }
//   approved                  -> log the view + return the unified record
//
// Only the approved branch logs a view or mints signed URLs, so a doctor's phone
// polling for approval costs nothing and never trips the rate limit. The client is
// NEVER trusted: no token, no approval, no data.

// A short, non-PII hint for the owner's Accept/Deny popup, derived from the
// requester's User-Agent. Best-effort only — it is display text, never a check.
function describeRequester(ua: string | null): string {
  if (!ua) return 'A device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'A browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'a device';
  return `${browser} on ${os}`;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Signed URLs live only 5 minutes. Combined with the revoked/expired checks below
// (done BEFORE any URL is minted), a revoke closes the window almost immediately —
// even for a clinic tab that is already open.
const SIGNED_URL_TTL_SECONDS = 300;

// Per-token+IP throttle: at most RATE_LIMIT successful views for the same share
// from the same IP within RATE_WINDOW_SECONDS. Over that → rate_limited, and we
// neither log a view nor mint any URL.
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60;

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
    .select('id, user_id, created_at, expires_at, revoked, status')
    .eq('token', token)
    .maybeSingle();

  if (shareErr || !share) return jsonResponse({ error: 'invalid' });

  // Revoke/expiry are checked BEFORE the consent gate (and before any signed URL or
  // view log), so a revoked or expired share never yields data or a fresh link.
  if (share.revoked) return jsonResponse({ error: 'revoked' });
  if (new Date(share.expires_at).getTime() <= Date.now()) return jsonResponse({ error: 'expired' });

  // ── Consent gate ─────────────────────────────────────────────────────────────
  // The owner must approve before any data leaves. Until then we expose only a
  // coarse { status: 'pending' } that the doctor's phone polls on.
  if (share.status === 'denied') return jsonResponse({ error: 'denied' });

  if (share.status === 'pending' || share.status === 'requested') {
    // First contact flips pending -> requested and stamps a non-PII requester hint,
    // which is what surfaces the live Accept/Deny popup on the owner's laptop. Later
    // polls stay 'requested' and never overwrite the original request.
    if (share.status === 'pending') {
      await admin
        .from('shares')
        .update({
          status: 'requested',
          requested_at: new Date().toISOString(),
          requester_label: describeRequester(req.headers.get('user-agent')),
        })
        .eq('id', share.id)
        .eq('status', 'pending'); // guard: don't clobber a concurrent request
    }
    return jsonResponse({ status: 'pending' });
  }

  // status === 'approved' — fall through to logging + returning the record.

  // ── Per-token + IP rate limit ────────────────────────────────────────────────
  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '';
  const viewerIp = fwd.split(',')[0].trim() || null;

  const windowStart = new Date(Date.now() - RATE_WINDOW_SECONDS * 1000).toISOString();
  let recentQuery = admin
    .from('access_log')
    .select('id', { count: 'exact', head: true })
    .eq('share_id', share.id)
    .gt('accessed_at', windowStart);
  recentQuery = viewerIp ? recentQuery.eq('viewer_ip', viewerIp) : recentQuery.is('viewer_ip', null);
  const { count: recentCount } = await recentQuery;

  if ((recentCount ?? 0) >= RATE_LIMIT) {
    return jsonResponse({ error: 'rate_limited' });
  }

  // ── Log this view ────────────────────────────────────────────────────────────
  await admin.from('access_log').insert({ share_id: share.id, viewer_ip: viewerIp });

  // ── Load the unified record (persisted data only) ────────────────────────────
  const [{ data: profile }, { data: facts }, { data: records }, { data: viewRows }] =
    await Promise.all([
      admin.from('profiles').select('full_name, dob, blood_type, summary').eq('id', share.user_id).maybeSingle(),
      admin.from('health_facts').select('type, label, detail').eq('user_id', share.user_id)
        .order('created_at', { ascending: true }),
      admin.from('health_records')
        .select('title, file_type, recorded_at, ai_summary, ai_questions, file_path')
        .eq('user_id', share.user_id)
        .order('recorded_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      admin.from('access_log').select('accessed_at').eq('share_id', share.id)
        .order('accessed_at', { ascending: false }),
    ]);

  // View history: every accessed_at for this share, newest first. The current view
  // is already included (we inserted it above), so viewedCount === viewerEvents.length.
  const viewerEvents = (viewRows ?? []).map((v) => v.accessed_at);

  // ── Signed URLs (5 min) for each report file ─────────────────────────────────
  const reports = await Promise.all(
    (records ?? []).map(async (r) => {
      let signedUrl: string | null = null;
      const { data: signed } = await admin.storage
        .from('health-docs')
        .createSignedUrl(r.file_path, SIGNED_URL_TTL_SECONDS);
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
    summary: profile?.summary ?? null,
    viewerEvents,
    sharedAt: share.created_at,
    expiresAt: share.expires_at,
    viewedCount: viewerEvents.length,
  });
});
