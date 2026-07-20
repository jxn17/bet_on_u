// ---------------------------------------------------------------------------
// Bet It data layer — Supabase.
//
// The whole app talks to the backend through the `db` object exported here.
//   - db.auth.*        : Supabase Auth (email/password, Google, OTP, reset)
//   - db.entities.*    : RLS-protected reads (list / filter / get)
//   - db.rooms / goals / checkins : RPC-backed writes (server-enforced rules)
//   - db.wallet.get()  : the signed-in user's virtual wallet
//   - db.integrations.Core.UploadFile : proof uploads to Supabase Storage
//
// Trust-critical writes (staking, voting, appeals, settlement) go through
// Postgres RPCs (see supabase/migrations/0001_init.sql) so the client can't
// forge tallies or balances.
//
// If the Supabase env vars are missing the app still builds and boots to the
// login screen; reads return empty and writes surface a clear message.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured ? createClient(url, anonKey) : null;

const NOT_CONFIGURED =
  'Supabase is not connected yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.';

const requireConfig = () => {
  if (!supabase) throw new Error(NOT_CONFIGURED);
};

// Postgres RAISE messages arrive on error.message — surface them to the UI.
const rpc = async (fn, args) => {
  requireConfig();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

// Entity name -> table. Reads keep the legacy `db.entities.<Name>` shape.
const TABLES = {
  Room: 'rooms',
  RoomMember: 'room_members',
  Goal: 'goals',
  CheckIn: 'checkins',
  CheckinVote: 'checkin_votes',
  Payout: 'payouts',
  User: 'profiles',
};

// UI reads `created_date`; the DB stores `created_at`. Bridge them.
const withDate = (row) =>
  row ? { ...row, created_date: row.created_at ?? row.created_date } : row;
const many = (rows) => (rows || []).map(withDate);

const makeEntity = (name) => {
  const table = TABLES[name] || name.toLowerCase();
  return {
    async list() {
      if (!supabase) return [];
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(error.message);
      return many(data);
    },
    async filter(query = {}) {
      if (!supabase) return [];
      const { data, error } = await supabase.from(table).select('*').match(query);
      if (error) throw new Error(error.message);
      return many(data);
    },
    async get(id) {
      if (!supabase) return null;
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return withDate(data);
    },
  };
};

const entities = new Proxy({}, { get: (_t, name) => makeEntity(String(name)) });

const auth = {
  async isAuthenticated() {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session);
  },

  async me() {
    requireConfig();
    const { data: { user } = {}, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    return {
      ...(profile || {}),
      id: user.id,
      email: user.email ?? profile?.email ?? null,
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    };
  },

  async loginViaEmailPassword(email, password) {
    requireConfig();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  loginWithProvider(provider, redirectPath = '/') {
    requireConfig();
    const redirectTo = `${window.location.origin}${redirectPath}`;
    return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  },

  // Returns { session } — caller shows the OTP step when session is null
  // (i.e. the project requires email confirmation).
  async register({ email, password, full_name }) {
    requireConfig();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: full_name ? { full_name } : undefined },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    requireConfig();
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw new Error(error.message);
    return { access_token: data?.session?.access_token };
  },

  async resendOtp(email) {
    requireConfig();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
  },

  setToken() {
    // No-op: Supabase manages the session itself.
  },

  async resetPasswordRequest(email) {
    requireConfig();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  // The recovery link establishes a session; we just set the new password.
  async resetPassword({ newPassword }) {
    requireConfig();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async logout(redirectUrl) {
    if (supabase) await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

const wallet = {
  async get() {
    if (!supabase) return { balance: 0, locked: 0 };
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return { balance: 0, locked: 0 };
    const { data } = await supabase.from('wallets').select('balance, locked').eq('user_id', user.id).maybeSingle();
    return { balance: data?.balance ?? 0, locked: data?.locked ?? 0 };
  },
};

// RPC-backed writes.
const rooms = {
  create: ({ name, description }) => rpc('create_room', { p_name: name, p_description: description ?? null }).then(withDate),
  join: (code) => rpc('join_room', { p_code: code }).then(withDate),
  settle: (roomId) => rpc('settle_room', { p_room: roomId }).then(withDate),
};

const goals = {
  place: ({ room_id, title, description, stake_amount, deadline, checkin_frequency, total_checkins_required }) =>
    rpc('place_goal', {
      p_room: room_id,
      p_title: title,
      p_description: description ?? null,
      p_stake: stake_amount,
      p_deadline: deadline,
      p_frequency: checkin_frequency ?? 'weekly',
      p_total_checkins: total_checkins_required ?? 1,
    }).then(withDate),
};

const checkins = {
  submit: ({ goal_id, proof_image_url, note }) =>
    rpc('submit_checkin', { p_goal: goal_id, p_proof: proof_image_url ?? null, p_note: note ?? null }).then(withDate),
  vote: ({ checkin_id, vote, reason }) =>
    rpc('cast_vote', { p_checkin: checkin_id, p_vote: vote, p_reason: reason ?? null }).then(withDate),
  appeal: (checkin_id) => rpc('appeal_checkin', { p_checkin: checkin_id }).then(withDate),
  resolveDue: (roomId) => rpc('resolve_due_checkins', { p_room: roomId }),
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      requireConfig();
      const { data: { user } = {} } = await supabase.auth.getUser();
      const safeName = (file?.name || 'proof').replace(/[^\w.\-]+/g, '_');
      const path = `${user?.id ?? 'anon'}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('proofs').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('proofs').getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
  },
};

export const db = { auth, entities, wallet, rooms, goals, checkins, integrations, supabase, isConfigured };
export default db;
