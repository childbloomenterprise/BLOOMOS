import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── delete-account ─────────────────────────────────────────────────────────
// AUTHED function (verify_jwt = TRUE). "Delete my account & data." Destructive
// and IRREVERSIBLE. Privacy IS the product — the user can erase everything they own.
//
// Security: we resolve the caller from the JWT (auth.uid()) and NEVER accept a
// user id from the body — a caller can only ever delete THEIR OWN account. A
// `{ confirm: true }` body flag guards against accidental/stray invocations.
//
// Order: (1) remove the caller's storage objects under `${uid}/`, then
// (2) delete the auth user. The FK `on delete cascade` from auth.users removes
// the profile, health_records, health_facts, and shares; access_log cascades from
// shares — so the single deleteUser call wipes every owned row.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

  // Require explicit confirmation so a stray call can never wipe an account.
  let body: { confirm?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.confirm !== true) {
    return jsonResponse({ error: 'Confirmation required' }, 400);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Identify the caller from the JWT — the ONLY account this call can ever delete.
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return jsonResponse({ error: 'Not authenticated' }, 401);
  const uid = user.id;

  // 1. Remove the caller's storage objects (everything under `${uid}/`).
  try {
    const { data: objects } = await admin.storage.from('health-docs').list(uid, { limit: 1000 });
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${uid}/${o.name}`);
      await admin.storage.from('health-docs').remove(paths);
    }
  } catch (err) {
    // Non-fatal: deleting the auth user below still removes all DB rows. Log only.
    console.error('Storage cleanup error during account deletion:', err);
  }

  // 2. Delete the auth user → cascades to profile, records, facts, shares, access_log.
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    console.error('deleteUser failed:', delErr.message);
    return jsonResponse({ error: 'Could not delete account. Please try again.' }, 500);
  }

  return jsonResponse({ ok: true });
});
