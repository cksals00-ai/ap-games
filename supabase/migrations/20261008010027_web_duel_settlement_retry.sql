create function public.web_duel_acquire_settlement(p_match uuid,p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare acquired boolean;
begin
 if not exists(select 1 from public.matches x join public.web_duel_rooms w on w.room_id=x.room_id join public.room_members m on m.room_id=x.room_id where x.id=p_match and m.player_id=p_user) then raise exception 'Not a participant';end if;
 insert into public.web_duel_settlements(match_id,player_id) values(p_match,p_user)
 on conflict(match_id,player_id) do update set claimed_at=clock_timestamp()
 where public.web_duel_settlements.response is null and public.web_duel_settlements.claimed_at<clock_timestamp()-interval '30 seconds'
 returning true into acquired;
 return coalesce(acquired,false);
end $$;
revoke all on function public.web_duel_acquire_settlement(uuid,uuid) from public,anon,authenticated;
grant execute on function public.web_duel_acquire_settlement(uuid,uuid) to service_role;
