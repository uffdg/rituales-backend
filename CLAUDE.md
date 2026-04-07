# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Development server with --watch (auto-restart)
npm start      # Production server
```

No lint or test commands configured.

## Architecture

Express API for the Rituales app. Deployed on Vercel at `https://rituales-backend.vercel.app`.

### Routes

- `GET  /health` — health check
- `POST /api/rituals/reframe-intention` — reframes raw voice input into a manifestation affirmation (Claude Haiku)
- `POST /api/rituals/create` — generates ritual text (Claude Haiku) + builds guided session plan, persists to Supabase
- `POST /api/rituals/:id/render-audio` — generates TTS via ElevenLabs, uploads to Supabase Storage, caches `audio_url`
- `GET  /api/rituals/:id` — fetch a single ritual
- `POST /api/events` — analytics event ingestion
- `GET  /api/me/dashboard` — authenticated user's own rituals + favorites + likes received
- `PATCH /api/me/profile` — update user's full name

### Auth

`src/lib/auth.js` exports two helpers:
- `getAuthenticatedUser(req)` — reads `Authorization: Bearer <token>`, validates via `supabase.auth.getUser()`, returns user or null
- `requireUser(req, res, next)` — middleware that 401s if no valid session, sets `req.user`

Routes that need auth use `requireUser` middleware. Routes like `rituals/create` use `getAuthenticatedUser` optionally (stores `user_id` if present, allows anonymous creation).

### AI Generation

`src/lib/claude.js`:
- `generateRitualWithClaude(input)` → ritual JSON (title, opening, symbolicAction, closing)
- `reframeIntention(rawText)` → single manifestation-style affirmation in rioplatense Spanish
- `applyPauseMarkers(script)` → converts `[P1]`/`[P2]`/`[P3]`/`[RESPIRA]` to `...` sequences for ElevenLabs pacing

`src/lib/session.js` — `buildGuidedSession(input, ritual)` builds the structured session plan with timed segments (intro, personalized, ambient, closing). The personalized script is the only segment sent to TTS.

### Audio

`src/lib/elevenlabs.js` — `generateSpeech({ text, voiceId })`. Script is processed through `applyPauseMarkers` before being sent. Voice: `El3gkPAhMU9R5biL3rtU`. Audio is uploaded to Supabase Storage bucket `audio` and the public URL is cached in `rituals.audio_url`.

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
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # Used for auth.admin calls and storage
PORT=3000
```

Note: uses **service role key**, not anon key — required for `supabase.auth.admin.updateUserById()` and storage uploads.
