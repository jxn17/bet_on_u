# AGENTS.md

## Project context

Bet on U is a React + Vite + Tailwind single-page app backed by **Supabase**
(Postgres + Auth + Storage). It's a **virtual-money** accountability game for
friend groups — no real money is ever involved. See `README.md` for setup, the
game rules, and deploy steps.

Treat it as user-owned application code; keep changes focused and preserve
existing conventions.

## Key files

- `src/api/db.js` — the single backend seam. Everything goes through the exported
  `db`: `db.auth.*` (Supabase Auth), `db.entities.<Name>.{list,filter,get}`
  (RLS-protected reads), and RPC-backed writes (`db.rooms`, `db.goals`,
  `db.checkins`, `db.wallet`, `db.integrations.Core.UploadFile`).
- `supabase/migrations/0001_init.sql` — schema, RLS policies, and the game-engine
  RPCs. **Trust-critical logic lives here, not in the client** — staking, voting
  thresholds, appeals, and season settlement are all `security definer` functions
  so the browser can't forge tallies or balances. Change game rules here.
- `src/lib/AuthContext.jsx` — auth state, backed by `db.auth`.
- `vite.config.js` — defines the `@` → `src` alias.
- `vercel.json` — SPA rewrite for client-side routes.

## Economy & integrity invariants (don't break these)

- Wallet = `balance` (available) + `locked` (escrow). Coins are integers.
- Failed stakes go to the room **jackpot**, split among that season's achievers —
  never to voters. Judging a peer must never be profitable.
- Voting: approve = majority, reject = ⅔ supermajority; no self-votes; reject
  needs a reason; no-quorum-at-deadline auto-approves; one appeal.

## Working notes

- `npm run dev` / `npm run build` (→ `dist/`) / `npm run lint`.
- Add trust-critical writes as Postgres RPCs + a thin wrapper in `src/api/db.js`;
  don't do privileged writes directly from components.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local` (see
  `.env.example`). The app builds without them but can't reach the backend.
- Run the relevant `package.json` checks before finishing changes.
