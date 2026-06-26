# Bloom OS — Cube Contract (API)

The shape both agents build against. **Patient app (Claude Code)** owns the `shares`
insert, `explain-report`, and `clinic-record`. **Clinic web view (Codex)** is read-only
and consumes `clinic-record` (or the fixture). Never invent fields — match this doc.

Live Supabase project: `yhvqjquztsqnunajcvgo` · private bucket `health-docs` (signed URLs only).

---

## Tables (see `supabase/migrations/0003–0005`)

- `health_records` gains `ai_summary text`, `ai_questions jsonb` (string[]), `ai_status text` in `('pending','done','error')` default `'pending'`.
- `health_facts(id, user_id, type ∈ condition|medication|allergy, label, detail, created_at)` — owner-only RLS.
- `shares(id, token unique [url-safe, DB-generated], user_id, created_at, expires_at, revoked)` — owner insert/select/update. **No anon read.**
- `access_log(id, share_id, accessed_at, viewer_ip)` — RLS on, **no policies**: service role only.

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

## Client-side share creation (no function)

The app inserts a `shares` row directly (RLS allows owner insert):

```ts
await supabase.from('shares')
  .insert({ user_id: uid, expires_at: <now + 60 min> })
  .select()
  .single(); // token comes from the DB default (url-safe random)
```

The QR encodes `https://<clinic-web-domain>/clinic?token=<token>`.
Revoke = `update shares set revoked = true where id = <id>` (owner).

---

## Edge Function: `clinic-record` (`verify_jwt: FALSE` — the token IS the auth)

Public. Validates the token **server-side** with the service role, logs the view,
returns the unified record. Never trust the client.

**Request** `{ "token": "<share token>" }`

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
    "signedUrl": "string (1-hour signed URL)"
  } ],
  "sharedAt": "ISO timestamp",
  "expiresAt": "ISO timestamp",
  "viewedCount": 1
}
```

**Error (HTTP 200, so the client always parses the body):**
`{ "error": "invalid" | "expired" | "revoked" }`
- `invalid` — token not found
- `expired` — `expires_at <= now()`
- `revoked` — `revoked = true`

The function inserts one `access_log` row per successful view; `viewedCount` is the
count of `access_log` rows for that share (first view → 1).
