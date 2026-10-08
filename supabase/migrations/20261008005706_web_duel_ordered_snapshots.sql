create or replace function public.web_duel_step(p_user uuid,p_match uuid,p_index int,p_action text,p_start bigint,p_end bigint,p_limit int,p_choice int default null,p_correct bool default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s jsonb; t bigint:=floor(extract(epoch from clock_timestamp())*1000); owner text; claimed bigint; rec jsonb; deadline bigint;
begin
 if not exists(select 1 from public.matches x join public.web_duel_rooms w on w.room_id=x.room_id join public.room_members m on m.room_id=x.room_id where x.id=p_match and m.player_id=p_user) then raise exception 'Not a participant';end if;
 insert into public.web_duel_answers(match_id,question_index) values(p_match,p_index) on conflict do nothing;
 select state into s from public.web_duel_answers where match_id=p_match and question_index=p_index for update;
 t:=floor(extract(epoch from clock_timestamp())*1000);
 owner:=s->>'owner';claimed:=(s->>'claimedAt')::bigint;deadline:=least(claimed+p_limit,p_end);
 if owner is not null and t>=deadline then
  rec:=jsonb_build_object('choice',-1,'elapsedMs',p_limit,'correct',false);
  s:=jsonb_set(s,array['records',owner],rec,true)-'owner'-'claimedAt';owner:=null;
 end if;
 if p_action='claim' and t>=p_start and t<p_end and owner is null and not (s->>'solved')::bool and not (s->'records'?p_user::text) then
  s:=s||jsonb_build_object('owner',p_user,'claimedAt',t);owner:=p_user::text;
 elsif p_action='answer' and owner=p_user::text and t<deadline and p_choice between 0 and 3 then
  rec:=jsonb_build_object('choice',p_choice,'elapsedMs',greatest(0,t-claimed),'correct',p_correct);
  s:=jsonb_set(s,array['records',p_user::text],rec,true)-'owner'-'claimedAt';
  if p_correct then s:=s||'{"solved":true}'::jsonb;end if;
 end if;
 s:=s||jsonb_build_object('version',coalesce((s->>'version')::bigint,0)+1);
 update public.web_duel_answers set state=s where match_id=p_match and question_index=p_index;
 return s||jsonb_build_object('serverNowEpochMs',t);
end $$;
