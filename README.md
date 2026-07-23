# Bet on U

A **virtual-money** accountability game for friend groups. Create a room (a
"season"), stake coins on your goals, check in with photo proof, and let the
group vote. Hit your goals and you win a share of the jackpot; flake and your
stake funds everyone who succeeded.

**No real money, ever** — every account starts with 1000 virtual coins.

Built with **React + Vite + Tailwind** on **Supabase** (Postgres + Auth + Storage).

## How the game works

- **Rooms are seasons.** Staking a goal locks coins from your wallet into escrow.
- **Settling a season** (room creator) forfeits *failed* stakes into the room
  **jackpot** and splits it among everyone who **succeeded** — so voting a friend
  down never pays you. The only way to earn is to hit your own goals.
- **Voting integrity is enforced server-side** (Postgres, not the browser):
  - approve = simple majority · **reject = ⅔ supermajority**
  - you can't vote on your own check-in; **rejecting requires a public reason**
  - past the 48h voting deadline with no quorum → **auto-approve**
  - **one appeal**, re-voted by members who didn't vote the first round

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Without Supabase values the app still builds and boots to the login screen; it
just can't sign in or read data until you connect a project.

## Supabase setup (one time)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** → copy the **Project URL** and **anon public** key
   into `.env.local`:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. **SQL Editor** → paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates every table, RLS policy, the game-engine RPCs, and a trigger that
   grants each new user a wallet with 1000 coins.
4. **Storage** → create a **public** bucket named `proofs` (for check-in photos).
   Add an insert policy so authenticated users can upload.
5. **Authentication → Providers**: keep **Email** on. For the OTP sign-up screen,
   enable "Confirm email"; to skip it, turn confirmation off and sign-up logs the
   user straight in. To enable **Google**, add credentials under Providers and add
   your dev/prod URLs to **URL Configuration → Redirect URLs**.

## Build & deploy (Vercel)

```bash
npm run build     # -> dist/
npm run preview   # serve the build locally
```

1. Push to GitHub and **Import** the repo in Vercel (auto-detects Vite: build
   `npm run build`, output `dist`).
2. Add the two `VITE_SUPABASE_*` env vars in the Vercel project settings.
3. Add your Vercel URL to Supabase **Redirect URLs**.
4. Deploy. `vercel.json` handles SPA routing for deep links like `/room/:id`.

## Architecture

- **`src/api/db.js`** — the only backend seam. `db.auth.*` (Supabase Auth),
  `db.entities.*` (RLS-protected reads), and RPC-backed writes
  (`db.rooms` / `db.goals` / `db.checkins` / `db.wallet`).
- **`supabase/migrations/0001_init.sql`** — schema, RLS, and the game engine
  (`create_room`, `join_room`, `place_goal`, `submit_checkin`, `cast_vote`,
  `appeal_checkin`, `resolve_due_checkins`, `settle_room`).
- **`src/pages/`**, **`src/components/`** — the React UI.

## Roadmap

- **Peer-to-peer loans** — borrow coins from the group when you're short, with
  due dates and escalating warnings (schema is ready for it; UI is phase 2).
- **Fair-Judge trust score** — reward voting with consensus, penalize lone
  griefers (the "Core + trust score" option).
