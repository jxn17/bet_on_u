-- ===========================================================================
-- Bet It — virtual-money schema, security, and game engine
-- ===========================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Design:
--   * Virtual coins only. Every new user is granted 1000 coins.
--   * Wallet = balance (available) + locked (escrowed in active goals).
--   * A room is a "season". Staking a goal locks coins; settling the season
--     forfeits failed stakes into the room jackpot and splits that jackpot
--     among the members who SUCCEEDED — so judging a peer never pays.
--   * Voting integrity (enforced here, not in the client):
--       - approve = simple majority of eligible voters
--       - reject  = 2/3 supermajority
--       - you cannot vote on your own check-in; rejecting requires a reason
--       - past the voting deadline with no quorum => auto-approve
--       - one appeal, re-voted by members who didn't vote round 1
-- ===========================================================================

-- ------------------------------------------------------------------ tables --
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  balance    int  not null default 1000,   -- available coins
  locked     int  not null default 0,      -- escrowed in active goals
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     int  not null,                -- signed change to available balance
  kind       text not null,                -- grant|stake_lock|stake_return|jackpot_win
  ref_type   text,
  ref_id     uuid,
  memo       text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  invite_code text not null unique,
  created_by  uuid not null references public.profiles(id),
  status      text not null default 'active',   -- active|archived
  jackpot     int  not null default 0,          -- forfeited stakes pool here
  round       int  not null default 1,          -- current season number
  created_at  timestamptz not null default now()
);

create table if not exists public.room_members (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  user_name  text,
  user_email text,
  role       text not null default 'member',     -- creator|member
  joined_at  timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.goals (
  id                      uuid primary key default gen_random_uuid(),
  room_id                 uuid not null references public.rooms(id) on delete cascade,
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  user_name               text,
  round                   int  not null default 1,
  title                   text not null,
  description             text,
  stake_amount            int  not null check (stake_amount > 0),
  deadline                date not null,
  checkin_frequency       text not null default 'weekly',
  total_checkins_required int  not null default 1,
  approved_checkins       int  not null default 0,
  status                  text not null default 'active',  -- active|succeeded|failed
  success_rate            int  not null default 0,
  created_at              timestamptz not null default now()
);

create table if not exists public.checkins (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references public.goals(id) on delete cascade,
  room_id          uuid not null references public.rooms(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  user_name        text,
  proof_image_url  text,
  note             text,
  status           text not null default 'pending',   -- pending|approved|rejected
  approvals        int  not null default 0,
  rejections       int  not null default 0,
  vote_round       int  not null default 1,           -- 1 initial, 2 appeal
  appealed         boolean not null default false,
  voting_deadline  timestamptz not null default now() + interval '48 hours',
  created_at       timestamptz not null default now()
);

create table if not exists public.checkin_votes (
  id          uuid primary key default gen_random_uuid(),
  checkin_id  uuid not null references public.checkins(id) on delete cascade,
  voter_id    uuid not null references public.profiles(id) on delete cascade,
  vote        text not null check (vote in ('approve','reject')),
  reason      text,
  vote_round  int  not null default 1,
  created_at  timestamptz not null default now(),
  unique (checkin_id, voter_id, vote_round)
);

create table if not exists public.payouts (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  goal_id      uuid references public.goals(id) on delete set null,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  to_user_name text,
  amount       int  not null,
  kind         text not null default 'jackpot',   -- jackpot
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_room_members_user on public.room_members(user_id);
create index if not exists idx_room_members_room on public.room_members(room_id);
create index if not exists idx_goals_room  on public.goals(room_id);
create index if not exists idx_goals_user  on public.goals(user_id);
create index if not exists idx_checkins_room on public.checkins(room_id);
create index if not exists idx_checkins_goal on public.checkins(goal_id);
create index if not exists idx_votes_checkin on public.checkin_votes(checkin_id);
create index if not exists idx_payouts_room on public.payouts(room_id);
create index if not exists idx_payouts_to   on public.payouts(to_user_id);
create index if not exists idx_ledger_user  on public.wallet_ledger(user_id);

-- ----------------------------------------------------------------- helpers --
create or replace function public.is_member(p_room uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = p_user
  );
$$;

create or replace function public.display_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(full_name), ''), email, 'Member')
  from public.profiles where id = p_user;
$$;

create or replace function public.gen_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text;
  i     int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where invite_code = code);
  end loop;
  return code;
end $$;

-- Approve a pending check-in and credit its goal. No-op if not pending.
create or replace function public.approve_checkin_internal(p_checkin uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_goal uuid;
begin
  update public.checkins set status = 'approved'
   where id = p_checkin and status = 'pending'
  returning goal_id into v_goal;

  if v_goal is null then return; end if;

  update public.goals
     set approved_checkins = approved_checkins + 1,
         success_rate = least(100, round(
           ((approved_checkins + 1)::numeric / greatest(total_checkins_required, 1)) * 100))
   where id = v_goal;
end $$;

-- --------------------------------------------------------- new-user trigger --
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance) values (new.id, 1000)
  on conflict (user_id) do nothing;

  insert into public.wallet_ledger (user_id, amount, kind, memo)
  values (new.id, 1000, 'grant', 'Welcome bonus');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================================================================== RPCs ===
create or replace function public.create_room(p_name text, p_description text default null)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Room name is required'; end if;

  insert into public.rooms (name, description, invite_code, created_by)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
          public.gen_invite_code(), auth.uid())
  returning * into v_room;

  insert into public.room_members (room_id, user_id, user_name, user_email, role)
  values (v_room.id, auth.uid(), public.display_name(auth.uid()),
          (select email from public.profiles where id = auth.uid()), 'creator');

  return v_room;
end $$;

create or replace function public.join_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms where invite_code = upper(trim(p_code));
  if v_room is null then raise exception 'Room not found'; end if;

  insert into public.room_members (room_id, user_id, user_name, user_email, role)
  values (v_room.id, auth.uid(), public.display_name(auth.uid()),
          (select email from public.profiles where id = auth.uid()), 'member')
  on conflict (room_id, user_id) do nothing;

  return v_room;
end $$;

create or replace function public.place_goal(
  p_room uuid, p_title text, p_description text, p_stake int,
  p_deadline date, p_frequency text, p_total_checkins int
) returns public.goals language plpgsql security definer set search_path = public as $$
declare v_goal public.goals; v_round int; v_bal int;
begin
  if not public.is_member(p_room, auth.uid()) then raise exception 'Not a member of this room'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Goal title is required'; end if;
  if p_stake is null or p_stake <= 0 then raise exception 'Stake must be positive'; end if;

  select balance into v_bal from public.wallets where user_id = auth.uid();
  if coalesce(v_bal, 0) < p_stake then
    raise exception 'Not enough coins (need %, have %)', p_stake, coalesce(v_bal, 0);
  end if;

  select round into v_round from public.rooms where id = p_room;

  insert into public.goals (room_id, user_id, user_name, round, title, description,
                            stake_amount, deadline, checkin_frequency, total_checkins_required)
  values (p_room, auth.uid(), public.display_name(auth.uid()), v_round, trim(p_title),
          nullif(trim(coalesce(p_description, '')), ''), p_stake, p_deadline,
          coalesce(p_frequency, 'weekly'), greatest(1, coalesce(p_total_checkins, 1)))
  returning * into v_goal;

  update public.wallets
     set balance = balance - p_stake, locked = locked + p_stake, updated_at = now()
   where user_id = auth.uid();

  insert into public.wallet_ledger (user_id, amount, kind, ref_type, ref_id, memo)
  values (auth.uid(), -p_stake, 'stake_lock', 'goal', v_goal.id, 'Staked on: ' || v_goal.title);

  return v_goal;
end $$;

create or replace function public.submit_checkin(p_goal uuid, p_proof text, p_note text)
returns public.checkins language plpgsql security definer set search_path = public as $$
declare v_goal public.goals; v_check public.checkins; v_eligible int;
begin
  select * into v_goal from public.goals where id = p_goal;
  if v_goal is null then raise exception 'Goal not found'; end if;
  if v_goal.user_id <> auth.uid() then raise exception 'You can only check in on your own goal'; end if;
  if v_goal.status <> 'active' then raise exception 'This goal is no longer active'; end if;

  insert into public.checkins (goal_id, room_id, user_id, user_name, proof_image_url, note, voting_deadline)
  values (p_goal, v_goal.room_id, auth.uid(), public.display_name(auth.uid()),
          nullif(trim(coalesce(p_proof, '')), ''), nullif(trim(coalesce(p_note, '')), ''),
          now() + interval '48 hours')
  returning * into v_check;

  select count(*) into v_eligible
    from public.room_members m
   where m.room_id = v_goal.room_id and m.user_id <> auth.uid();

  if v_eligible = 0 then
    perform public.approve_checkin_internal(v_check.id);
    select * into v_check from public.checkins where id = v_check.id;
  end if;

  return v_check;
end $$;

create or replace function public.cast_vote(p_checkin uuid, p_vote text, p_reason text default null)
returns public.checkins language plpgsql security definer set search_path = public as $$
declare
  v_check public.checkins; v_owner uuid; v_room uuid; v_round int;
  v_eligible int; v_appr int; v_rej int; v_need_appr int; v_need_rej int;
begin
  select * into v_check from public.checkins where id = p_checkin;
  if v_check is null then raise exception 'Check-in not found'; end if;
  if v_check.status <> 'pending' then raise exception 'Voting is already closed for this check-in'; end if;

  v_owner := v_check.user_id; v_room := v_check.room_id; v_round := v_check.vote_round;

  if not public.is_member(v_room, auth.uid()) then raise exception 'Not a member of this room'; end if;
  if auth.uid() = v_owner then raise exception 'You cannot vote on your own check-in'; end if;
  if p_vote not in ('approve', 'reject') then raise exception 'Invalid vote'; end if;
  if p_vote = 'reject' and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to reject a check-in';
  end if;

  begin
    insert into public.checkin_votes (checkin_id, voter_id, vote, reason, vote_round)
    values (p_checkin, auth.uid(), p_vote, nullif(trim(coalesce(p_reason, '')), ''), v_round);
  exception when unique_violation then
    raise exception 'You have already voted on this check-in';
  end;

  select count(*) filter (where vote = 'approve'),
         count(*) filter (where vote = 'reject')
    into v_appr, v_rej
    from public.checkin_votes where checkin_id = p_checkin and vote_round = v_round;

  if v_round = 1 then
    select count(*) into v_eligible
      from public.room_members m where m.room_id = v_room and m.user_id <> v_owner;
  else
    select count(*) into v_eligible
      from public.room_members m
     where m.room_id = v_room and m.user_id <> v_owner
       and not exists (select 1 from public.checkin_votes cv
                       where cv.checkin_id = p_checkin and cv.vote_round = 1 and cv.voter_id = m.user_id);
  end if;
  v_eligible  := greatest(v_eligible, 1);
  v_need_appr := floor(v_eligible / 2) + 1;                -- simple majority
  v_need_rej  := ceil(v_eligible * 2.0 / 3.0);             -- 2/3 supermajority

  update public.checkins set approvals = v_appr, rejections = v_rej where id = p_checkin;

  if v_appr >= v_need_appr then
    perform public.approve_checkin_internal(p_checkin);
  elsif v_rej >= v_need_rej then
    update public.checkins set status = 'rejected' where id = p_checkin;
  end if;

  select * into v_check from public.checkins where id = p_checkin;
  return v_check;
end $$;

create or replace function public.appeal_checkin(p_checkin uuid)
returns public.checkins language plpgsql security definer set search_path = public as $$
declare v_check public.checkins;
begin
  select * into v_check from public.checkins where id = p_checkin;
  if v_check is null then raise exception 'Check-in not found'; end if;
  if v_check.user_id <> auth.uid() then raise exception 'Only the owner can appeal'; end if;
  if v_check.status <> 'rejected' then raise exception 'Only a rejected check-in can be appealed'; end if;
  if v_check.appealed then raise exception 'This check-in was already appealed'; end if;

  update public.checkins
     set appealed = true, vote_round = 2, status = 'pending',
         approvals = 0, rejections = 0, voting_deadline = now() + interval '48 hours'
   where id = p_checkin
  returning * into v_check;

  return v_check;
end $$;

-- Approve any pending check-ins whose voting deadline has passed. Client calls
-- this on room load so no cron is required. Returns how many were swept.
create or replace function public.resolve_due_checkins(p_room uuid)
returns int language plpgsql security definer set search_path = public as $$
declare c record; n int := 0;
begin
  for c in select id from public.checkins
           where room_id = p_room and status = 'pending' and voting_deadline < now() loop
    perform public.approve_checkin_internal(c.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Settle the current season: resolve every active goal, forfeit failed stakes
-- into the jackpot, return succeeded stakes, split the jackpot among achievers,
-- then advance to the next round. Creator only.
create or replace function public.settle_room(p_room uuid)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare
  v_room public.rooms; v_round int; g record; s record;
  v_rate int; v_jackpot int; v_succ int; v_share int;
begin
  select * into v_room from public.rooms where id = p_room;
  if v_room is null then raise exception 'Room not found'; end if;
  if v_room.created_by <> auth.uid() then raise exception 'Only the room creator can settle the season'; end if;

  v_round := v_room.round;

  -- Benefit of the doubt: approve any check-ins still pending at settle time.
  for s in select c.id from public.checkins c
             join public.goals gg on gg.id = c.goal_id
            where gg.room_id = p_room and gg.round = v_round and c.status = 'pending' loop
    perform public.approve_checkin_internal(s.id);
  end loop;

  -- Resolve each active goal for this round.
  for g in select * from public.goals
           where room_id = p_room and round = v_round and status = 'active' loop
    v_rate := least(100, round((g.approved_checkins::numeric / greatest(g.total_checkins_required, 1)) * 100));
    if v_rate >= 70 then
      update public.goals set status = 'succeeded', success_rate = v_rate where id = g.id;
      update public.wallets
         set balance = balance + g.stake_amount,
             locked  = greatest(0, locked - g.stake_amount), updated_at = now()
       where user_id = g.user_id;
      insert into public.wallet_ledger (user_id, amount, kind, ref_type, ref_id, memo)
      values (g.user_id, g.stake_amount, 'stake_return', 'goal', g.id, 'Stake returned: ' || g.title);
    else
      update public.goals set status = 'failed', success_rate = v_rate where id = g.id;
      update public.wallets
         set locked = greatest(0, locked - g.stake_amount), updated_at = now()
       where user_id = g.user_id;
      update public.rooms set jackpot = jackpot + g.stake_amount where id = p_room;
    end if;
  end loop;

  -- Split the jackpot equally among this round's achievers.
  select jackpot into v_jackpot from public.rooms where id = p_room;
  select count(distinct user_id) into v_succ
    from public.goals where room_id = p_room and round = v_round and status = 'succeeded';

  if v_succ > 0 and v_jackpot > 0 then
    v_share := floor(v_jackpot / v_succ);
    if v_share > 0 then
      for s in select distinct user_id from public.goals
               where room_id = p_room and round = v_round and status = 'succeeded' loop
        update public.wallets set balance = balance + v_share, updated_at = now()
         where user_id = s.user_id;
        insert into public.wallet_ledger (user_id, amount, kind, ref_type, ref_id, memo)
        values (s.user_id, v_share, 'jackpot_win', 'room', p_room, 'Jackpot share (season ' || v_round || ')');
        insert into public.payouts (room_id, to_user_id, to_user_name, amount, kind, reason)
        values (p_room, s.user_id, public.display_name(s.user_id), v_share, 'jackpot',
                'Season ' || v_round || ' jackpot share');
      end loop;
      update public.rooms set jackpot = jackpot - (v_share * v_succ) where id = p_room;
    end if;
  end if;

  update public.rooms set round = round + 1 where id = p_room returning * into v_room;
  return v_room;
end $$;

-- =================================================================== RLS ====
alter table public.profiles       enable row level security;
alter table public.wallets        enable row level security;
alter table public.wallet_ledger  enable row level security;
alter table public.rooms          enable row level security;
alter table public.room_members   enable row level security;
alter table public.goals          enable row level security;
alter table public.checkins       enable row level security;
alter table public.checkin_votes  enable row level security;
alter table public.payouts        enable row level security;

-- profiles: any signed-in user can read (to show member names); write own row.
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid());

-- wallet + ledger: strictly private to the owner.
create policy wallets_read on public.wallets      for select to authenticated using (user_id = auth.uid());
create policy ledger_read  on public.wallet_ledger for select to authenticated using (user_id = auth.uid());

-- everything room-scoped: readable only by members (writes happen via RPCs).
create policy rooms_read    on public.rooms         for select to authenticated using (public.is_member(id, auth.uid()));
create policy members_read  on public.room_members  for select to authenticated using (public.is_member(room_id, auth.uid()));
create policy goals_read    on public.goals         for select to authenticated using (public.is_member(room_id, auth.uid()));
create policy checkins_read on public.checkins      for select to authenticated using (public.is_member(room_id, auth.uid()));
create policy payouts_read  on public.payouts       for select to authenticated using (public.is_member(room_id, auth.uid()));
create policy votes_read    on public.checkin_votes for select to authenticated
  using (public.is_member((select room_id from public.checkins c where c.id = checkin_id), auth.uid()));

-- ================================================================= grants ===
grant usage on schema public to authenticated;
grant select on public.profiles, public.wallets, public.wallet_ledger, public.rooms,
                public.room_members, public.goals, public.checkins, public.checkin_votes,
                public.payouts to authenticated;

grant execute on function public.create_room(text, text)                    to authenticated;
grant execute on function public.join_room(text)                            to authenticated;
grant execute on function public.place_goal(uuid, text, text, int, date, text, int) to authenticated;
grant execute on function public.submit_checkin(uuid, text, text)           to authenticated;
grant execute on function public.cast_vote(uuid, text, text)                to authenticated;
grant execute on function public.appeal_checkin(uuid)                       to authenticated;
grant execute on function public.resolve_due_checkins(uuid)                 to authenticated;
grant execute on function public.settle_room(uuid)                          to authenticated;
