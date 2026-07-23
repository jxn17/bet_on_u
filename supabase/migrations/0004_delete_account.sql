-- ===========================================================================
-- Bet It — 0004: self-serve account deletion
-- ===========================================================================
-- Run in the Supabase SQL editor after 0003. Lets a signed-in user delete
-- their OWN account from the client (the anon key can't touch auth.users, but
-- a security-definer function owned by postgres can). Deletes only auth.uid().
-- ===========================================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- rooms.created_by has no cascade, so remove this user's rooms first
  -- (their members / goals / check-ins / votes / payouts cascade away).
  delete from public.rooms where created_by = auth.uid();

  -- delete the auth user; the profile + wallet + this user's remaining rows
  -- in other people's rooms cascade from the profile FK.
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from anon;
grant execute on function public.delete_account() to authenticated;
