// scripts/seed-meera.mjs
//
// Seeds the "Meera Nair" demo patient so the hospital demo always looks full,
// even with no live upload. Run with:  node scripts/seed-meera.mjs
//
// It signs in (or signs up) meera@bloomos.demo using the PUBLIC anon key — no
// service-role key is ever needed locally. Everything it writes (profile, facts,
// records, files) is owner-scoped, exactly like the real app. Idempotent: safe
// to run more than once.
//
// If the account still needs email confirmation, the script prints
// "NEEDS_CONFIRM <userId>" and exits 2 — confirm that user, then run it again.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── Demo credentials (fine to commit — this is a throwaway demo account) ──────
// Plus-addressed Gmail: passes Supabase email validation and routes to V's inbox
// (a made-up TLD like .demo is rejected by GoTrue).
const DEMO_EMAIL = 'vaibhavvarunmr+meera@gmail.com';
const DEMO_PASSWORD = 'BloomDemo2026!';

// ── Load the two public env values from .env ──────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Demo content ──────────────────────────────────────────────────────────────
const FACTS = [
  { type: 'condition', label: 'Type 2 Diabetes', detail: 'Diagnosed 2021' },
  { type: 'medication', label: 'Metformin 500mg', detail: 'Twice daily' },
  { type: 'allergy', label: 'Penicillin', detail: 'Rash' },
];

const REPORTS = [
  {
    title: 'HbA1c Panel',
    fileType: 'pdf',
    recordedAt: '2026-06-20',
    aiSummary:
      'Your HbA1c is 7.8%, a little above the ~7% goal often used when managing diabetes (HbA1c is your average blood sugar over the past ~3 months). It is reassuring that it is not far from target, and small changes often bring it down. This is one snapshot — your doctor reads it alongside your full picture.',
    doctorQuestions: [
      'What HbA1c target is right for me?',
      'Should my medication change?',
      'When should I retest?',
    ],
  },
  {
    title: 'Lipid Profile',
    fileType: 'pdf',
    recordedAt: '2026-05-10',
    aiSummary:
      'This is a cholesterol panel. Your LDL (often called "bad" cholesterol) is mildly elevated, while HDL (the "good" kind) is in a healthy range. Cholesterol numbers are read together with your other risk factors, so this is best discussed with your doctor rather than read on its own.',
    doctorQuestions: [
      'Is my LDL level a concern given my diabetes?',
      'Do I need any change to diet or medication?',
      'How often should I check my cholesterol?',
    ],
  },
  {
    title: 'Thyroid (TSH)',
    fileType: 'image',
    recordedAt: '2026-04-02',
    aiSummary:
      'TSH (thyroid-stimulating hormone) is a check of how your thyroid gland is working. Your value sits within the typical reference range shown on the report, which is generally reassuring. As always, your doctor interprets this with your symptoms and history.',
    doctorQuestions: [
      'Is my thyroid function normal for me?',
      'Could my medication affect this result?',
      'Should this be monitored regularly?',
    ],
  },
];

// Minimal-but-valid placeholder files (so "View file" opens something real).
function makePdf(title) {
  const body =
    `%PDF-1.1\n` +
    `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n` +
    `2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
    `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
    `4 0 obj<</Length 70>>stream\nBT /F1 14 Tf 30 120 Td (${title} - demo report) Tj ET\nendstream endobj\n` +
    `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
    `trailer<</Root 1 0 R>>\n%%EOF`;
  return Buffer.from(body, 'utf8');
}
// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function ensureSignedIn() {
  let { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (data?.user) return data.user;

  // Not signed in — try to create the account.
  const signUp = await supabase.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (signUp.error) {
    console.error('Sign-up failed:', signUp.error.message);
    process.exit(1);
  }
  if (signUp.data.session?.user) return signUp.data.session.user;

  // Account created but email confirmation is required.
  console.log(`NEEDS_CONFIRM ${signUp.data.user?.id ?? '(unknown id)'}`);
  process.exit(2);
}

async function main() {
  const user = await ensureSignedIn();
  const userId = user.id;
  console.log('Signed in as', DEMO_EMAIL, userId);

  // 1. Profile
  const { error: pErr } = await supabase
    .from('profiles')
    .update({ full_name: 'Meera Nair', dob: '1989-03-14', blood_type: 'B+' })
    .eq('id', userId);
  if (pErr) throw pErr;
  console.log('Profile set.');

  // 2. Facts (reset to avoid duplicates on re-run)
  await supabase.from('health_facts').delete().eq('user_id', userId);
  const { error: fErr } = await supabase
    .from('health_facts')
    .insert(FACTS.map((f) => ({ user_id: userId, ...f })));
  if (fErr) throw fErr;
  console.log('Facts seeded:', FACTS.length);

  // 3. Records (skip if already seeded)
  const { count } = await supabase
    .from('health_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if ((count ?? 0) > 0) {
    console.log('Records already present, skipping upload.');
  } else {
    for (const r of REPORTS) {
      const isPdf = r.fileType === 'pdf';
      const fileName = `${r.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.${isPdf ? 'pdf' : 'png'}`;
      const path = `${userId}/${Date.now()}_${fileName}`;
      const bytes = isPdf ? makePdf(r.title) : PNG_1x1;
      const { error: upErr } = await supabase.storage
        .from('health-docs')
        .upload(path, bytes, { contentType: isPdf ? 'application/pdf' : 'image/png', upsert: true });
      if (upErr) throw upErr;

      const { error: rErr } = await supabase.from('health_records').insert({
        user_id: userId,
        title: r.title,
        notes: null,
        file_path: path,
        file_type: r.fileType,
        file_name: fileName,
        file_size: bytes.length,
        recorded_at: r.recordedAt,
        ai_summary: r.aiSummary,
        ai_questions: r.doctorQuestions,
        ai_status: 'done',
      });
      if (rErr) throw rErr;
      console.log('Seeded report:', r.title);
    }
  }

  console.log('\n✅ Done. Demo login:');
  console.log('   email:   ', DEMO_EMAIL);
  console.log('   password:', DEMO_PASSWORD);
}

main().catch((e) => {
  console.error('Seed failed:', e.message ?? e);
  process.exit(1);
});
