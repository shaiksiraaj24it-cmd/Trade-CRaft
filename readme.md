# StockScholar

A React + Vite app (courses, lessons, quizzes, a stocks reference list, and an
admin panel), running on [Supabase](https://supabase.com) for auth, database
and row-level security — with no third-party platform dependency.

`src/api/apiClient.js` provides the shared application API for auth, entities,
user invites, and public settings on top of [Supabase](https://supabase.com).
The database schema and RLS policies live in the plain Postgres migration
`supabase/migrations/0001_init.sql`. It creates the tables
  (`courses`, `lessons`, `lesson_progress`, `quizzes`, `quiz_attempts`,
  `stocks`, `profiles`) with Row Level Security policies that match the
  original rules (e.g. only admins can write courses/lessons/quizzes/stocks;
  everyone can read them; progress/quiz-attempts are private per user).
- `src/pages/Login.jsx` was empty in the source project — it's now
  implemented (email/password + "Continue with Google").
- `src/pages/ResetPassword.jsx` now reads Supabase's recovery **session**
  (established automatically from the emailed link) instead of a `?token=`
  query param, since that's how Supabase's reset flow works.
- Inviting a user (`AdminUsers.jsx`) needs Supabase's service-role key, which
  must never ship to the browser — it's implemented as a Supabase Edge
  Function: `supabase/functions/invite-user`.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (the free tier
   is enough to run this).
2. In **Project Settings → API**, copy the **Project URL** and the
   **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Create the database schema

Open the Supabase dashboard → **SQL Editor** → paste the contents of
`supabase/migrations/0001_init.sql` → Run.

(If you use the Supabase CLI instead: `supabase link` then `supabase db push`.)

This creates all tables, the `is_admin()` helper, the trigger that
auto-creates a `profiles` row for every new signup, and all RLS policies.

## 4. Enable email OTP signup (matches the app's "enter the 6-digit code" flow)

Registration in this app expects a 6-digit code by email, not a magic link.
In the Supabase dashboard:

1. **Authentication → Email Templates → Confirm signup** — make sure the
   template includes `{{ .Token }}` (Supabase's default template already
   does; if you customized it, add the token back).
2. **Authentication → Providers → Email** — leave "Confirm email" **on**.

If you'd rather skip email confirmation entirely for local testing, turn
"Confirm email" **off** — `verifyOtp`/OTP screens just won't be reached.

## 5. (Optional) Enable Google login

**Authentication → Providers → Google** in the Supabase dashboard — follow
Supabase's prompts to add your Google OAuth client ID/secret. Skip this if
you don't need "Continue with Google."

## 6. Promote your first user to admin

Register a normal account in the running app, then in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

That account can now see `/admin/*`.

## 7. (Optional) Deploy the invite-user Edge Function

Only needed for the "Invite user" button in `/admin/users`:

```bash
supabase functions deploy invite-user
```

It runs with the project's service-role key (kept server-side) to send
invite emails and set the invited user's role.

> **Known limitation:** deleting a user from `/admin/users` removes their
> `profiles` row (app access, no more admin/user permissions) but not the
> underlying Supabase auth account — full account deletion needs the same
> service-role access as inviting, and isn't wired up yet. Add a
> `delete-user` Edge Function analogous to `invite-user` if you need it.

## 8. Run it

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Any static host (Vercel, Netlify, Cloudflare Pages, etc.) works — it's a
plain Vite build with no server-side code beyond the two Supabase Edge
Functions.
