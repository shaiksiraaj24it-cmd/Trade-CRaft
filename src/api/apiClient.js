// ============================================================================
// Supabase API used by the application pages.
//
// This module centralizes authentication, entity CRUD, and user operations on
// top of Supabase so page components do not need to repeat query details.
//
// See supabase/migrations/0001_init.sql for the table/RLS definitions this
// relies on, and README.supabase.md for setup instructions.
// ============================================================================
import { supabase } from '@/api/supabaseClient';

// Application entity name -> Postgres table name.
const TABLES = {
  Course: 'courses',
  Lesson: 'lessons',
  LessonProgress: 'lesson_progress',
  Quiz: 'quizzes',
  QuizAttempt: 'quiz_attempts',
  Stock: 'stocks',
  User: 'profiles',
};

// Sort strings use a leading "-" for descending order.
function parseSort(sort) {
  if (!sort) return null;
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  return { column, ascending: !descending };
}

function toApiError(error, fallbackMessage) {
  const err = new Error(error?.message || fallbackMessage);
  err.status = error?.status || error?.code;
  err.data = error;
  return err;
}

function makeEntity(name) {
  const table = TABLES[name];
  if (!table) throw new Error(`Unknown entity: ${name}`);

  async function runQuery(query, sort, limit) {
    const s = parseSort(sort);
    if (s) query = query.order(s.column, { ascending: s.ascending });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw toApiError(error, `Failed to load ${name}`);
    return data;
  }

  return {
    // entities.X.list(sort?, limit?)
    list(sort, limit) {
      return runQuery(supabase.from(table).select('*'), sort, limit);
    },

    // entities.X.filter({ field: value, ... }, sort?, limit?)
    filter(query = {}, sort, limit) {
      let q = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(query)) {
        q = q.eq(key, value);
      }
      return runQuery(q, sort, limit);
    },

    // entities.X.get(id)
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw toApiError(error, `${name} not found`);
      return data;
    },

    // entities.X.create(payload)
    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw toApiError(error, `Failed to create ${name}`);
      return data;
    },

    // entities.X.update(id, payload)
    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw toApiError(error, `Failed to update ${name}`);
      return data;
    },

    // entities.X.delete(id)
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw toApiError(error, `Failed to delete ${name}`);
      return { success: true };
    },
  };
}

const entities = Object.fromEntries(Object.keys(TABLES).map((name) => [name, makeEntity(name)]));

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw toApiError(error, 'Failed to load profile');
  return data;
}

const auth = {
  // auth.me() -> merged auth user + profile row (has .role, used for admin gating)
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const profile = await fetchProfile(user.id);
    return { id: user.id, email: user.email, ...profile };
  },

  // auth.login({ email, password })
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw toApiError(error, 'Login failed');
    return data;
  },

  // auth.register({ email, password }) — sends a 6-digit signup code by
  // email (requires the Supabase email template to use {{ .Token }} — see
  // README.supabase.md).
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw toApiError(error, 'Registration failed');
    return data;
  },

  // auth.verifyOtp({ email, otpCode })
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw toApiError(error, 'Invalid verification code');
    return { access_token: data?.session?.access_token };
  },

  // auth.resendOtp(email)
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw toApiError(error, 'Failed to resend code');
    return { success: true };
  },

  // No-op: Supabase manages its own session/token storage. Kept so call
  // sites (e.g. Register.jsx) don't need to change.
  setToken() {},

  // auth.logout(redirectUrl?)
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  // auth.redirectToLogin(returnTo?)
  redirectToLogin(returnTo) {
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    window.location.href = `/login${qs}`;
  },

  // auth.resetPasswordRequest(email)
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw toApiError(error, 'Failed to send reset email');
    return { success: true };
  },

  // auth.resetPassword({ newPassword }) — relies on the recovery session
  // Supabase already established client-side from the emailed link
  // (detectSessionInUrl: true), not on a resetToken query param.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw toApiError(error, 'Failed to reset password');
    return { success: true };
  },

  // auth.loginWithProvider('google', returnTo)
  async loginWithProvider(provider, returnTo) {
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${qs}` },
    });
    if (error) throw toApiError(error, `${provider} login failed`);
  },
};

const app = {
  // The app has no public settings beyond this stable local response.
  async getPublicSettings() {
    return { id: 'local', public_settings: {} };
  },
};

const users = {
  // users.inviteUser(email, role) — needs the service-role key, so it's
  // implemented as a Supabase Edge Function (supabase/functions/invite-user).
  // Deploy it with `supabase functions deploy invite-user` before using this.
  async inviteUser(email, role) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role },
    });
    if (error) throw toApiError(error, 'Failed to send invite');
    return data;
  },
};

export const api = { auth, entities, users, app };
