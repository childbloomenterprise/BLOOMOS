# Bloom OS — Cube Contract (API)

The shape both agents build against. **Patient app (Claude Code)** owns the `shares`
insert, `explain-report`, and `clinic-record`. **Clinic web view (Codex)** is read-only
and consumes `clinic-record` (or the fixture). Never invent fields — match this doc.

Live Supabase project: `yhvqjquztsqnunajcvgo` · private bucket `health-docs` (signed URLs only).

---

## Tables (see `supabase/migrations/0003–0008`)

- `health_records` gains `ai_summary text`, `ai_questions jsonb` (string[]), `ai_status text` in `('pending','done','error')` default `'pending'`.
- `health_facts(id, user_id, type ∈ condition|medication|allergy, label, detail, created_at)` — owner-only RLS.
- `shares(id, token unique [url-safe, DB-generated], user_id, created_at, expires_at, revoked, status, requested_at, approved_at, requester_label)` — owner insert/select/update. **No anon read.** `status ∈ ('pending','requested','approved','denied')` default `'pending'` (migration `0010`, the **consent gate**). Realtime is enabled on `shares` so the owner's signed-in session gets a live event when `status → 'requested'` (RLS-scoped to their own rows).
- `access_log(id, share_id, accessed_at, viewer_ip)` — RLS on, **no policies**: service role only.
- `profiles` gains `summary text`, `summary_updated_at timestamptz` (migration `0006`) — the persisted at-a-glance handoff produced by `patient-summary`. Owner reads via existing profile RLS.

---

## Edge Function: `explain-report` (`verify_jwt: true`)

The patient's app calls this with the user's JWT. RLS enforces ownership.

**Request** `{ "record_id": "<uuid>" }`
**Response** `{ "explanation": "<plain-English text>", "doctor_questions": ["...", "..."] }`
**Errors** `{ "error": "<message>" }` with a non-200 status.

**Side effect (persistence):** on success the function writes back onto the row using
the service-role admin client:
`ai_summary = explanation`, `ai_questions = doctor_questions`, `ai_status = 'done'`.
So the app + clinic view show the summary instantly without re-calling Claude.

AI **explains, never diagnoses**. Every AI surface shows the disclaimer:
**"Explanation, not medical advice — discuss with your doctor."**

---

## Edge Function: `patient-summary` (`verify_jwt: true`)

The patient's app calls this with the user's JWT. Generates an **at-a-glance clinical
handoff**: 3–5 calm sentences synthesizing the user's `health_facts` + the already-
**persisted** `ai_summary` fields on `health_records` (`ai_status = 'done'`). It does
**not** re-read any files or re-call `explain-report` — it reads persisted data only.

Same never-diagnose guardrail system prompt as `explain-report`.

**Request** `{}` (no body needed — the JWT identifies the user).
**Response (HTTP 200)** — matches `patient-summary.fixture.json`:

```json
{ "summary": "<3–5 calm sentences>", "summaryUpdatedAt": "<ISO timestamp>" }
```

When the user has no facts and no completed AI summaries, returns
`{ "summary": null, "summaryUpdatedAt": null }` (nothing to summarize).
**Errors** `{ "error": "<message>" }` with a non-200 status.

**Side effect (persistence):** on success the function writes back onto the caller's
`profiles` row using the service-role admin client: `summary = <text>`,
`summary_updated_at = now()`. So the app + clinic view load it instantly without
re-calling Claude. AI **explains, never diagnoses**; the disclaimer shows everywhere.

---

## Client-side share creation (no function)

The app inserts a `shares` row directly (RLS allows owner insert):

```ts
await supabase.from('shares')
  .insert({ user_id: uid, expires_at: <now + 60 min> })
  .select()
  .single(); // token comes from the DB default (url-safe random)
```

The QR encodes `https://<clinic-web-domain>/clinic?token=<token>`. A new share starts
`status = 'pending'` — **consent-gated**: it returns no data until the owner approves.
Revoke = `update shares set revoked = true where id = <id>` (owner).

**Consent handshake (migration `0010`):**
1. Owner (laptop, signed in) creates the share (`pending`) and shows the QR. Their session
   subscribes to Realtime on `shares` (RLS-scoped to their rows).
2. A device scans → `clinic-record` flips the row to `requested` (service role) and stamps a
   non-PII `requester_label` (from User-Agent). The owner's session hears this live and shows
   an Accept/Deny prompt.
3. Owner accepts → `update shares set status='approved', approved_at=now() where id=<id>`
   (owner RLS) via `approveShare(id)`; deny → `status='denied'` via `denyShare(id)`.
4. Only an `approved` share returns the record. The scanning device polls `clinic-record`
   (every ~2.5s) and gets `{ "status": "pending" }` until approval, then the record.

Wrappers: `src/lib/shares.ts → approveShare() / denyShare() / subscribeToShare()`.

---

## Edge Function: `clinic-record` (`verify_jwt: FALSE` — the token IS the auth)

Public. Validates the token **server-side** with the service role, enforces the
**consent gate**, logs the view, returns the unified record. Never trust the client.

**Request** `{ "token": "<share token>" }`

**Consent-gate response (HTTP 200), before approval:**
`{ "status": "pending" }` — the owner has not approved yet. First contact also flips the
share `pending → requested` (surfacing the owner's Accept/Deny prompt). The client should
poll until it gets the record or a terminal error. **Polling does not log a view or count
against the rate limit** — only the approved branch does.

**Success (HTTP 200)** — camelCase, matches `clinic-record.fixture.json`:

```json
{
  "patient": { "fullName": "string", "dob": "YYYY-MM-DD", "bloodType": "string" },
  "facts":   [ { "type": "condition|medication|allergy", "label": "string", "detail": "string|null" } ],
  "reports": [ {
    "title": "string",
    "fileType": "image|pdf|document",
    "recordedAt": "YYYY-MM-DD|null",
    "aiSummary": "string|null",
    "doctorQuestions": ["string"],
    "signedUrl": "string (5-minute signed URL)"
  } ],
  "summary": "string|null",
  "viewerEvents": ["ISO timestamp"],
  "sharedAt": "ISO timestamp",
  "expiresAt": "ISO timestamp",
  "viewedCount": 1
}
```

- `summary` — the patient's persisted at-a-glance handoff (`profiles.summary`, produced
  by `patient-summary`); `null` if never generated. Read-only; never re-generated here.
- `viewerEvents` — every `access_log.accessed_at` for this share, **newest first**, so
  patient and doctor both see the view history. `viewedCount === viewerEvents.length`.

**Error (HTTP 200, so the client always parses the body):**
`{ "error": "invalid" | "expired" | "revoked" | "rate_limited" | "denied" }`
- `invalid` — token not found
- `expired` — `expires_at <= now()`
- `revoked` — `revoked = true`
- `rate_limited` — too many views for this token+IP in a short window (per-token+IP throttle)
- `denied` — the owner declined the request (`status = 'denied'`); terminal for this token

**Revoke takes effect fast:** the function checks `revoked`/`expired` **before** minting
any signed URL, and signed URLs now live only **5 minutes** (down from 1 hour) — so a
revoke closes the window almost immediately even for an already-open clinic tab.

The function inserts one `access_log` row per successful view; `viewedCount` is the
count of `access_log` rows for that share (first view → 1).

---

## Privacy endpoints — "your data is yours" (Full DoD)

Two owner-only functions make the privacy promise real. Both verify the caller from
their JWT (`auth.uid()`) and **never** accept a user id from the client.

### Edge Function: `export-data` (`verify_jwt: true`)
**Request** `{}` · **Response (HTTP 200)**:
```json
{
  "exportedAt": "ISO timestamp",
  "account": { "id": "uuid", "email": "string|null" },
  "profile": { "full_name": "...", "dob": "...", "blood_type": "...", "summary": "...", "summary_updated_at": "...", "created_at": "..." },
  "facts":   [ { "type": "...", "label": "...", "detail": "string|null", "created_at": "..." } ],
  "records": [ { "title": "...", "notes": "...", "file_type": "...", "file_name": "...", "file_size": 0, "recorded_at": "...", "ai_summary": "...", "ai_questions": ["..."], "ai_status": "...", "created_at": "...", "signedUrl": "5-min signed URL|null" } ]
}
```
Reads run under the caller's JWT (RLS owner-only); signed URLs live 5 minutes.
Wrapper: `src/lib/privacy.ts → exportData()`.

### Edge Function: `delete-account` (`verify_jwt: true`)
Destructive + irreversible. **Request** `{ "confirm": true }` (the flag is required;
without it → `{ "error": "Confirmation required" }`, HTTP 400). **Response** `{ "ok": true }`.
Removes the caller's storage objects under `${uid}/`, then deletes the auth user; the FK
`on delete cascade` wipes profile/records/facts/shares/access_log. A caller can only ever
delete **their own** account. Wrapper: `src/lib/privacy.ts → deleteAccount()`.

---

## Security hardening (from the Supabase advisors)

- `revoke execute on function public.handle_new_user() from anon, authenticated;` — the
  signup trigger function must not be a callable RPC. Migration `0008`. Clears the
  `anon/authenticated_security_definer_function_executable` advisor warnings.
- **Leaked-password protection** — enabled in **Auth → Sign In / Providers → Password →
  "Leaked password protection" (HaveIBeenPwned)**. This is an Auth config toggle (not SQL);
  set it in the dashboard. Clears the `auth_leaked_password_protection` advisor.
- `my_share_access_log()` is a `SECURITY DEFINER` RPC, so it will still appear in the
  advisor list as authenticated-executable — that is **intentional**: it is the only way
  to expose per-owner `access_log` rows, and it is safe because it filters on
  `auth.uid()` and pins `search_path = public`.
- `clinic-record` applies a per-token+IP rate limit (counts recent `access_log` rows for
  the same share+IP); over the threshold it returns `{ "error": "rate_limited" }` without
  minting URLs or logging a view.

---

## Patient trust view: `my_share_access_log()` RPC (SECURITY DEFINER)

Lets a signed-in patient see **who viewed each of their shares and when** — their own
`access_log` only. `access_log` has RLS on with no policies (service-role only), so this
is exposed through a `SECURITY DEFINER` SQL function scoped strictly to the caller's
shares (`where shares.user_id = auth.uid()`), with `search_path` pinned and `execute`
granted to `authenticated` only (revoked from `anon`). Migration `0007`.

```ts
const { data } = await supabase.rpc('my_share_access_log');
// rows, newest first:
// { share_id, token, created_at, expires_at, revoked, accessed_at, viewer_ip }[]
```
