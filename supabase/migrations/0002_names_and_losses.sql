-- ===========================================================================
-- Bet It — 0002: display names + loss records
-- ===========================================================================
-- Run in the Supabase SQL editor after 0001_init.sql.
--   1. update_profile(name): let users set a display name (no more raw emails),
--      and backfill the denormalized name on their existing rows.
--   2. settle_room v2: also record a 'forfeit' payout for each failed goal, so
--      the payouts view shows LOST as well as WON.
-- ===========================================================================

-- 1. Set / change your display name -----------------------------------------
create or replace function public.update_profile(p_name text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v_name text; v_profile public.profiles;
begin
  v_name := nullif(trim(p_name), '');
  if v_name is null then raise exception 'Name cannot be empty'; end if;
  if length(v_name) > 40 then raise exception 'Name must be 40 characters or less'; end if;

  update public.profiles set full_name = v_name where id = auth.uid()
  returning * into v_profile;

  -- keep denormalized display names in sync on this user's existing rows
  update public.room_members set user_name = v_name where user_id = auth.uid();
  update public.goals        set user_name = v_name where user_id = auth.uid();
  update public.checkins     set user_name = v_name where user_id = auth.uid();
  update public.payouts      set to_user_name = v_name where to_user_id = auth.uid();

  return v_profile;
end $$;

grant execute on function public.update_profile(text) to authenticated;

-- 2. settle_room v2 — record forfeits as payouts too ------------------------
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
      -- record the loss so it shows up in payouts
      insert into public.payouts (room_id, goal_id, to_user_id, to_user_name, amount, kind, reason)
      values (p_room, g.id, g.user_id, public.display_name(g.user_id), g.stake_amount, 'forfeit',
              'Lost stake: ' || g.title);
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
