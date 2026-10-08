-- Only the verified gateway can supply this server-calculated summary.
-- Rewards, RP, mastery, result and receipt either all commit or all roll back.
create function public.web_duel_finalize(p_match uuid,p_user uuid,p_summary jsonb,p_records jsonb,p_expected_rp int) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prof public.profiles%rowtype; receipt jsonb; entry jsonb; plays jsonb; result jsonb:=p_summary; before_rp int; after_rp int;
begin
 if not exists(select 1 from public.matches x join public.web_duel_rooms w on w.room_id=x.room_id join public.room_members m on m.room_id=x.room_id where x.id=p_match and m.player_id=p_user) then raise exception 'Not a participant';end if;
 select response into receipt from public.web_duel_settlements where match_id=p_match and player_id=p_user for update;
 if not found then raise exception 'Settlement lease required';end if;
 if receipt is not null then return receipt;end if;
 select * into prof from public.profiles where id=p_user for update;
 if prof.rp<>p_expected_rp then
  update public.web_duel_settlements set claimed_at=clock_timestamp()-interval '31 seconds' where match_id=p_match and player_id=p_user;
  return '{"retry":true}'::jsonb;
 end if;
 if exists(select 1 from public.match_results where match_id=p_match and player_id=p_user) then raise exception 'Legacy partial result requires reconciliation';end if;
 perform public.grant_rewards(p_user,(p_summary->>'goldEarned')::int,(p_summary->>'xpEarned')::int);
 select rp_before,rp_after into before_rp,after_rp from public.apply_rank_points(p_user,(p_summary->>'rpDelta')::int);
 if p_summary->'tierReward' is not null and p_summary->'tierReward'<>'null'::jsonb then
  if not public.grant_tier_rewards(p_user,prof.best_tier,(p_summary->'tierReward'->>'toTier')::int,(p_summary->'tierReward'->>'gold')::int,(p_summary->'tierReward'->>'credit')::int) then raise exception 'Tier reward conflict';end if;
 end if;
 plays:=public.bump_character_play(p_user,prof.appearance->>'kind');
 for entry in select value from jsonb_array_elements(p_records) loop
  insert into public.match_answers(match_id,player_id,question_id,round_index,choice_index,elapsed_ms,wager)
  values(p_match,p_user,(entry->>'questionID')::uuid,(entry->>'roundIndex')::int,(entry->>'choiceIndex')::int,(entry->>'elapsedMs')::int,0)
  on conflict(match_id,player_id,question_id) do update set choice_index=excluded.choice_index,elapsed_ms=excluded.elapsed_ms;
  perform public.bump_question_stats(entry->>'questionID',(entry->>'correct')::bool);
 end loop;
 insert into public.match_results(match_id,player_id,final_score,rank,correct_count,gold_earned,xp_earned,score_mismatch,total_questions,forfeited,rp_delta,rp_before,rp_after,player_count)
 values(p_match,p_user,(p_summary->>'finalScore')::int,(p_summary->>'rank')::int,(p_summary->>'correctCount')::int,(p_summary->>'goldEarned')::int,(p_summary->>'xpEarned')::int,false,(p_summary->>'totalQuestions')::int,false,(p_summary->>'rpDelta')::int,before_rp,after_rp,2);
 result:=result||jsonb_build_object('rpBefore',before_rp,'rpAfter',after_rp,'characterPlays',plays);
 update public.web_duel_settlements set response=result where match_id=p_match and player_id=p_user;
 return result;
end $$;
revoke all on function public.web_duel_finalize(uuid,uuid,jsonb,jsonb,int) from public,anon,authenticated;
grant execute on function public.web_duel_finalize(uuid,uuid,jsonb,jsonb,int) to service_role;
