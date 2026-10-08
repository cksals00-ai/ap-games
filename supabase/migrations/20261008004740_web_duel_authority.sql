-- Browser authority is reachable only through the verified Edge gateway.
create table public.web_duel_rooms(room_id uuid primary key references public.rooms(id) on delete cascade);
create table public.web_duel_answers(match_id uuid references public.matches(id) on delete cascade, question_index int check(question_index>=0), state jsonb not null default '{"records":{},"solved":false}', primary key(match_id,question_index));
create table public.web_duel_settlements(match_id uuid references public.matches(id) on delete cascade, player_id uuid, claimed_at timestamptz not null default now(), response jsonb, primary key(match_id,player_id));
alter table public.web_duel_rooms enable row level security;
alter table public.web_duel_answers enable row level security;
alter table public.web_duel_settlements enable row level security;
revoke all on public.web_duel_rooms,public.web_duel_answers,public.web_duel_settlements from public,anon,authenticated;
grant all on public.web_duel_rooms,public.web_duel_answers,public.web_duel_settlements to service_role;
create function public.web_duel_join(p_user uuid,p_subject text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rid uuid; cnt int; departure timestamptz;
begin
 if not exists(select 1 from public.profiles where id=p_user and not coalesce(is_minor_under14,false)) then raise exception 'Eligible profile required'; end if;
 if p_subject not in ('','idol','general','nonsense','elementary','middle','high','certification','language','vocabulary','koreanHistory') then raise exception 'Invalid subject'; end if;
 perform pg_advisory_xact_lock(hashtext('web-duel-'||p_subject));
 select r.id into rid from public.rooms r join public.web_duel_rooms w on w.room_id=r.id join public.room_members m on m.room_id=r.id
 where r.subject=p_subject and m.player_id=p_user and m.last_seen>now()-interval '15 seconds' and not exists(select 1 from public.matches x where x.room_id=r.id) limit 1;
 if rid is null then
  select r.id into rid from public.rooms r join public.web_duel_rooms w on w.room_id=r.id
  where r.subject=p_subject and r.created_at>now()-interval '10 minutes' and not exists(select 1 from public.matches x where x.room_id=r.id)
  and (select count(*) from public.room_members m where m.room_id=r.id and m.last_seen>now()-interval '15 seconds')=1 order by r.created_at limit 1;
 end if;
 if rid is null then
  insert into public.rooms(category,subject,capacity,is_open,departs_at) values('duel',p_subject,2,false,now()+interval '1 day') returning id into rid;
  insert into public.web_duel_rooms values(rid);
 end if;
 delete from public.room_members where room_id=rid and last_seen<now()-interval '15 seconds';
 insert into public.room_members(room_id,player_id,last_seen) values(rid,p_user,now()) on conflict(room_id,player_id) do update set last_seen=now();
 select count(*) into cnt from public.room_members where room_id=rid;
 if cnt>=2 then update public.rooms set departs_at=least(departs_at,now()+interval '5 seconds') where id=rid;end if;
 select departs_at into departure from public.rooms where id=rid;
 return jsonb_build_object('roomID',rid,'humanCount',cnt,'capacity',2,'departsAtEpochMs',extract(epoch from departure)*1000,'serverNowEpochMs',extract(epoch from clock_timestamp())*1000);
end $$;
create function public.web_duel_step(p_user uuid,p_match uuid,p_index int,p_action text,p_start bigint,p_end bigint,p_limit int,p_choice int default null,p_correct bool default false) returns jsonb language plpgsql security invoker set search_path='' as $$
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
revoke all on function public.web_duel_join(uuid,text),public.web_duel_step(uuid,uuid,int,text,bigint,bigint,int,int,bool) from public,anon,authenticated;
grant execute on function public.web_duel_join(uuid,text),public.web_duel_step(uuid,uuid,int,text,bigint,bigint,int,int,bool) to service_role;
