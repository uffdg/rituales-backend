# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Development server with --watch (auto-restart)
npm start      # Production server
```

No lint or test commands configured.

## Architecture

Express API for the Rituales app, ESM throughout (`"type": "module"`). Deployed on Vercel at `https://rituales-backend.vercel.app` (see `vercel.json`); a `railway.json` is also present as an alternate deploy target but Vercel is the one currently referenced by the app.

### Routes

- `GET  /health` — health check
- `POST /api/rituals/reframe-intention` — reframes raw voice input into a manifestation affirmation (Claude Haiku)
- `POST /api/rituals/create` — generates ritual text (Claude Haiku) + builds guided session plan, persists to Supabase
- `POST /api/rituals/:id/render-audio` — generates TTS via ElevenLabs, uploads to Supabase Storage, caches `audio_url`
- `GET  /api/rituals/:id` — fetch a single ritual, including viewer-relative `likesCount`/`likedByViewer`/`favoritedByViewer`
- `POST /DELETE /api/rituals/:id/favorite` — toggle the authenticated user's favorite (requires auth)
- `POST /DELETE /api/rituals/:id/like` — toggle the authenticated user's like; a ritual's own author can't like it (requires auth)
- `PATCH /api/rituals/:id/complete` — record post-session closure (`audioCompleted`, `anchorConfirmed`, `reflectionText`); author-only, requires auth
- `POST /api/events` — analytics event ingestion
- `GET  /api/me/dashboard` — authenticated user's own rituals + favorites + likes received
- `PATCH /api/me/profile` — update user's full name
- `GET /POST /api/me/daily-intention` — "Intención del día": `POST` takes what the user wishes for today (`inputText`) and stores the `reframeIntention` output; one per user per day; requires auth
- `GET /POST /api/me/daily-oracle` — "Oráculo del día": `POST` draws a card from the curated deck (no input, no AI); one per user per day; requires auth

All routes funnel through a single error-handling middleware in `src/index.js` that logs and returns `{ error }` as JSON — route handlers just call `next(err)`.

### Auth

`src/lib/auth.js` exports two helpers:
- `getAuthenticatedUser(req)` — reads `Authorization: Bearer <token>`, validates via `supabase.auth.getUser()`, returns user or null
- `requireUser(req, res, next)` — middleware that 401s if no valid session, sets `req.user`

Routes that need auth use `requireUser` middleware. Routes like `rituals/create` use `getAuthenticatedUser` optionally (stores `user_id` if present, allows anonymous creation).

### AI Generation

`src/lib/claude.js`:
- `generateRitualWithClaude(input)` → ritual JSON (title, opening, symbolicAction, closing)
- `reframeIntention(rawText)` → single manifestation-style affirmation in rioplatense Spanish
- `src/lib/speech.js`:
  - `applyPauseMarkers(script)` → converts `[P1]`/`[P2]`/`[P3]`/`[RESPIRA]` and `[PAUSA_*]` markers to ElevenLabs SSML `<break time="..." />` tags for meditation pacing

`src/lib/oracle-deck.js` — the curated Oráculo del día deck (team-written name, message, gesture, symbol). `drawOracleCard` weights cards matching the client-sent moon phase 3x and skips the user's last 7 cards. Card content lives only here; the DB stores just `card_id`, and `mapDailyOracleRow` in `src/lib/daily.js` joins it back.

`src/lib/session.js` — `buildGuidedSession(input, ritual)` builds the structured session plan with timed segments (intro, personalized, ambient, closing). The personalized script is the only segment sent to TTS.

`src/lib/gemini.js` exports `generateRitualWithGemini`, a Gemini-based equivalent of `generateRitualWithClaude`. It is currently unused by any route — `rituals/create` generates with Claude only, despite a stale comment in `src/routes/rituals.js` referencing Gemini.

`src/lib/rituals.js` — `mapRitualRow(row, options)` shapes a `rituals` DB row into the API response shape (nesting `ritual`, `guidedAudio` status, likes/favorites flags, and the `audioCompletedAt`/`anchorConfirmedAt`/`reflectionText` closure fields written by `PATCH /:id/complete`). Used by `GET /api/rituals/:id`, `/api/me/dashboard`, and `PATCH /:id/complete`.

### Audio

`src/lib/elevenlabs.js` — `generateSpeech({ text, voiceId })` for plain TTS and `generateMeditationSpeech({ script, voiceId })` for guided rituals. Guided rituals are generated as PCM fragments and assembled into a WAV with deterministic silence between fragments, so meditation pacing does not depend only on ElevenLabs interpreting SSML pauses. Voice: `El3gkPAhMU9R5biL3rtU`. Audio is uploaded to Supabase Storage bucket `audio` and the public URL is cached in `rituals.audio_url`. `guided_session.speechScript` stores the exact meditation script used for TTS, and `guided_session.audioRenderVersion` marks which pacing system produced the cached audio; old versions are regenerated manually via admin token, then reused.

`MEDITATION_AUDIO_RENDER_VERSION` is duplicated as a local constant in both `src/routes/rituals.js` and `src/lib/rituals.js` — bump both together when the pacing system changes, or cached audio and the `guidedAudio.status` shown by `mapRitualRow` will disagree about what's stale.

### Database

Schema in `supabase/schema.sql`. Key tables:
- `rituals` — main table, `user_id` nullable (anonymous rituals allowed)
- `ritual_favorites` / `ritual_likes` — junction tables with unique constraint per user+ritual
- `events` — analytics, `props` is JSONB
- `daily_intentions` / `daily_oracle_cards` — one row per `(user_id, date_key)` each (unique). `date_key` is a `YYYY-MM-DD` string supplied by the client (the user's local day), not derived server-side. Both `POST` routes are idempotent: if a row exists for that date they return it with `created: false`. Rows are shaped by `mapDailyIntentionRow` / `mapDailyOracleRow` in `src/lib/daily.js`.

**RLS**: Enabled only on `daily_intentions` and `daily_oracle_cards`; still pending on the other tables (see Supabase security alert). The backend uses the service role key, so RLS policies don't constrain these routes — ownership is enforced in the handlers by filtering on `req.user.id`.

### Docs

`docs/` holds product/UX specs (e.g. `docs/ux-wtp-voz-guiada-bloqueante.md`, a willingness-to-pay experiment spec for guided-audio; `docs/carta-del-dia-diario-intenciones-plan.md`, the original daily-card plan, superseded by `rituales-app/docs/oraculo-del-dia-propuesta.md` (Intención del día + Oráculo del día)) — not API reference, but useful context for why a route or field exists.

## Environment Variables

```
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...         # optional, falls back to a hardcoded voice id
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # Used for auth.admin calls and storage
PORT=3000
```

Note: uses **service role key**, not anon key — required for `supabase.auth.admin.updateUserById()` and storage uploads.

`ANTHROPIC_API_KEY` is checked at runtime in `rituals/create` — if unset, ritual generation silently falls back to whatever template the frontend sent. `ELEVENLABS_API_KEY` is required for `/api/rituals/:id/render-audio`; keep it only in the backend deploy environment, never as a `VITE_*` frontend variable. A `GEMINI_API_KEY` would also be needed to exercise `src/lib/gemini.js`, but nothing currently calls it.

`AUDIO_RENDER_ADMIN_TOKEN` optionally enables manual one-off audio regeneration for a cached ritual. Send `force: true` with header `x-audio-render-admin-token`; otherwise cached `audio_url` is always reused.
