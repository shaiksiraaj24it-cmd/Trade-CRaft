-- ============================================================================
-- StockScholar schema: tables and RLS policies in plain
-- Postgres tables + Row Level Security on Supabase.
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run: every statement is guarded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Helper: keep `updated_date` current on every UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_date()
returns trigger as $$
begin
  new.updated_date = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Helper: is the current JWT holder an admin?
-- Reads public.profiles instead of auth.users so it works from RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================================
-- profiles (user profile entity)
-- One row per authenticated user, keyed to auth.users. Created automatically
-- by the handle_new_user trigger below whenever someone signs up.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_date();

-- Auto-create a profile row whenever a new auth user is created (signup,
-- OAuth, or admin invite).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (public.is_admin());

-- No insert policy: rows are created only by the handle_new_user trigger
-- (which runs as security definer), never directly by clients.

-- ============================================================================
-- courses (course entity)
-- read: anyone signed in · write: admin only
-- ============================================================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  duration text,
  icon text not null default '📚',
  "order" numeric not null default 0,
  youtube_link text,
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_courses_updated on public.courses;
create trigger trg_courses_updated before update on public.courses
  for each row execute function public.set_updated_date();

alter table public.courses enable row level security;

drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses for select using (auth.role() = 'authenticated');

drop policy if exists "courses_insert" on public.courses;
create policy "courses_insert" on public.courses for insert with check (public.is_admin());

drop policy if exists "courses_update" on public.courses;
create policy "courses_update" on public.courses for update using (public.is_admin());

drop policy if exists "courses_delete" on public.courses;
create policy "courses_delete" on public.courses for delete using (public.is_admin());

-- ============================================================================
-- lessons (lesson entity)
-- read: anyone signed in · write: admin only
-- ============================================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  duration text,
  sections jsonb not null default '[]'::jsonb, -- [{ heading, content, points: [] }]
  key_points jsonb not null default '[]'::jsonb, -- string[]
  "order" numeric not null default 0,
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_lessons_updated on public.lessons;
create trigger trg_lessons_updated before update on public.lessons
  for each row execute function public.set_updated_date();

alter table public.lessons enable row level security;

drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons for select using (auth.role() = 'authenticated');

drop policy if exists "lessons_insert" on public.lessons;
create policy "lessons_insert" on public.lessons for insert with check (public.is_admin());

drop policy if exists "lessons_update" on public.lessons;
create policy "lessons_update" on public.lessons for update using (public.is_admin());

drop policy if exists "lessons_delete" on public.lessons;
create policy "lessons_delete" on public.lessons for delete using (public.is_admin());

-- ============================================================================
-- lesson_progress (lesson progress entity)
-- read/write: only your own rows
-- ============================================================================
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_date timestamptz,
  created_by_id uuid not null references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_lesson_progress_updated on public.lesson_progress;
create trigger trg_lesson_progress_updated before update on public.lesson_progress
  for each row execute function public.set_updated_date();

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_select" on public.lesson_progress;
create policy "lesson_progress_select" on public.lesson_progress for select using (created_by_id = auth.uid());

drop policy if exists "lesson_progress_insert" on public.lesson_progress;
create policy "lesson_progress_insert" on public.lesson_progress for insert with check (created_by_id = auth.uid());

drop policy if exists "lesson_progress_update" on public.lesson_progress;
create policy "lesson_progress_update" on public.lesson_progress for update using (created_by_id = auth.uid());

drop policy if exists "lesson_progress_delete" on public.lesson_progress;
create policy "lesson_progress_delete" on public.lesson_progress for delete using (created_by_id = auth.uid());

-- ============================================================================
-- quizzes (quiz entity)
-- read: anyone signed in · write: admin only
-- ============================================================================
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb, -- string[]
  answer text not null,
  explanation text,
  "order" numeric not null default 0,
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_quizzes_updated on public.quizzes;
create trigger trg_quizzes_updated before update on public.quizzes
  for each row execute function public.set_updated_date();

alter table public.quizzes enable row level security;

drop policy if exists "quizzes_select" on public.quizzes;
create policy "quizzes_select" on public.quizzes for select using (auth.role() = 'authenticated');

drop policy if exists "quizzes_insert" on public.quizzes;
create policy "quizzes_insert" on public.quizzes for insert with check (public.is_admin());

drop policy if exists "quizzes_update" on public.quizzes;
create policy "quizzes_update" on public.quizzes for update using (public.is_admin());

drop policy if exists "quizzes_delete" on public.quizzes;
create policy "quizzes_delete" on public.quizzes for delete using (public.is_admin());

-- ============================================================================
-- quiz_attempts (quiz attempt entity)
-- read/write: only your own rows
-- ============================================================================
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  score numeric,
  total numeric,
  created_by_id uuid not null references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_quiz_attempts_updated on public.quiz_attempts;
create trigger trg_quiz_attempts_updated before update on public.quiz_attempts
  for each row execute function public.set_updated_date();

alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts_select" on public.quiz_attempts;
create policy "quiz_attempts_select" on public.quiz_attempts for select using (created_by_id = auth.uid());

drop policy if exists "quiz_attempts_insert" on public.quiz_attempts;
create policy "quiz_attempts_insert" on public.quiz_attempts for insert with check (created_by_id = auth.uid());

drop policy if exists "quiz_attempts_update" on public.quiz_attempts;
create policy "quiz_attempts_update" on public.quiz_attempts for update using (created_by_id = auth.uid());

drop policy if exists "quiz_attempts_delete" on public.quiz_attempts;
create policy "quiz_attempts_delete" on public.quiz_attempts for delete using (created_by_id = auth.uid());

-- ============================================================================
-- stocks (stock entity)
-- read: anyone signed in · write: admin only
-- ============================================================================
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  sector text,
  price numeric,
  previous_price numeric,
  market_cap text,
  pe numeric,
  dividend text,
  description text,
  created_by_id uuid references auth.users(id) default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

drop trigger if exists trg_stocks_updated on public.stocks;
create trigger trg_stocks_updated before update on public.stocks
  for each row execute function public.set_updated_date();

alter table public.stocks enable row level security;

drop policy if exists "stocks_select" on public.stocks;
create policy "stocks_select" on public.stocks for select using (auth.role() = 'authenticated');

drop policy if exists "stocks_insert" on public.stocks;
create policy "stocks_insert" on public.stocks for insert with check (public.is_admin());

drop policy if exists "stocks_update" on public.stocks;
create policy "stocks_update" on public.stocks for update using (public.is_admin());

drop policy if exists "stocks_delete" on public.stocks;
create policy "stocks_delete" on public.stocks for delete using (public.is_admin());

-- ============================================================================
-- One-time setup: promote your first user to admin.
-- Run this manually AFTER you've registered your own account:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================================
