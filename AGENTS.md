# AGENTS.md

## Project Context

This is a React + Vite app running on Supabase (auth, Postgres, row-level
security). Treat it as user-owned application code, keep changes focused on
the user's request, and preserve existing project conventions.

Start with `readme.md` for local setup, environment variables, and the
Supabase project setup steps.

## Key Files

- `src/`: frontend application source.
- `src/api/supabaseClient.js`: the Supabase client (reads `VITE_SUPABASE_URL`
  / `VITE_SUPABASE_ANON_KEY` from `.env`).
- `src/api/apiClient.js`: the shared application API for auth, entities, user
  invites, and public settings, implemented on top of `supabaseClient.js`.
  New code can import `supabase` directly instead when that is clearer.
- `supabase/migrations/0001_init.sql`: table definitions + RLS policies for
  every entity (courses, lessons, lesson_progress, quizzes, quiz_attempts,
  stocks, profiles).
- `supabase/functions/invite-user`: Edge Function for admin user invites
  (needs the service-role key, so it can't run client-side).
- `vite.config.js`: plain Vite + React config, no platform-specific plugin.

## Working Notes

- Local dev is just `npm install && npm run dev` — no CLI login/link step,
  no separate local backend process. The backend is whatever Supabase
  project `.env` points at.
- If you add a new entity/table, add it to both
  `supabase/migrations/000N_*.sql` (with RLS policies) and the `TABLES` map
  in `src/api/apiClient.js` (or just query `supabase` directly from the
  page).
