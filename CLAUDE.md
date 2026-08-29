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
- `POST /api/events` — analytics event ingestion
- `GET  /api/me/dashboard` — authenticated user's own rituals + favorites + likes received
- `PATCH /api/me/profile` — update user's full name

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

`src/lib/session.js` — `buildGuidedSession(input, ritual)` builds the structured session plan with timed segments (intro, personalized, ambient, closing). The personalized script is the only segment sent to TTS.

`src/lib/gemini.js` exports `generateRitualWithGemini`, a Gemini-based equivalent of `generateRitualWithClaude`. It is currently unused by any route — `rituals/create` generates with Claude only, despite a stale comment in `src/routes/rituals.js` referencing Gemini.

`src/lib/rituals.js` — `mapRitualRow(row, options)` shapes a `rituals` DB row into the API response shape (nesting `ritual`, `guidedAudio` status, likes/favorites flags). Used by both `GET /api/rituals/:id` and the `/api/me/dashboard` route.

### Audio

`src/lib/elevenlabs.js` — `generateSpeech({ text, voiceId })` for plain TTS and `generateMeditationSpeech({ script, voiceId })` for guided rituals. Guided rituals are generated as PCM fragments and assembled into a WAV with deterministic silence between fragments, so meditation pacing does not depend only on ElevenLabs interpreting SSML pauses. Voice: `El3gkPAhMU9R5biL3rtU`. Audio is uploaded to Supabase Storage bucket `audio` and the public URL is cached in `rituals.audio_url`. `guided_session.speechScript` stores the exact meditation script used for TTS, and `guided_session.audioRenderVersion` marks which pacing system produced the cached audio; old versions are regenerated manually via admin token, then reused.

### Database

Schema in `supabase/schema.sql`. Key tables:
- `rituals` — main table, `user_id` nullable (anonymous rituals allowed)
- `ritual_favorites` / `ritual_likes` — junction tables with unique constraint per user+ritual
- `events` — analytics, `props` is JSONB

**RLS**: Not yet enabled — pending activation (see Supabase security alert).

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
