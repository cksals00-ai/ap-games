import {rankDelta} from './rank_points.ts';
import {tierIndex,rewardsBetween} from './tier_rewards.ts';
import {passActiveForEnvironment} from './reward-policy.ts';
import {questionWindow,publicScript} from './duel-rules.ts';
import {signature} from './web-gate.ts';
import {settleRecords} from './scoring.ts';
import {traitFor} from './traits.ts';
type Deps={env:(k:string)=>string|undefined;fetch:typeof fetch};
const actions=new Set(['join-room','room-pulse','start-match','state','claim','answer','settle-match','leave-room']);
export async function handle(req:Request,deps?:Deps):Promise<Response>{
 const env=deps?.env??((k:string)=>Deno.env.get(k)),f=deps?.fetch??fetch,origin=req.headers.get('Origin');
 const cors:Record<string,string>={'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'};
 if(origin==='https://games.apholdings.kr')cors['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,data:any)=>Response.json(data,{status,headers:cors});
 if(origin&&origin!=='https://games.apholdings.kr')return reply(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return reply(405,{error:'POST required'});
 const auth=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]+$/.test(auth))return reply(401,{error:'Sign in required'});
 try{
  const url=env('SUPABASE_URL')!,key=env('SUPABASE_ANON_KEY')!,secret=env('SUPABASE_SERVICE_ROLE_KEY')!;
  const verified=await f(url+'/auth/v1/user',{headers:{Authorization:auth,apikey:key}});if(!verified.ok)return reply(401,{error:'Invalid session'});const user=await verified.json();if(!user.id||user.is_anonymous)return reply(401,{error:'Registered account required'});
  const text=await req.text();if(text.length>200000)return reply(413,{error:'Request too large'});const {action,body:b}=JSON.parse(text);
  if(!actions.has(action)||!b||typeof b!=='object'||Array.isArray(b))return reply(400,{error:'Invalid action or body'});
  if((b.player_id&&b.player_id!==user.id)||(b.playerID&&b.playerID!==user.id))return reply(403,{error:'Caller mismatch'});
  async function db(path:string,method='GET',body?:any){const r=await f(url+'/rest/v1/'+path,{method,headers:{Authorization:'Bearer '+secret,apikey:secret,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error('Database request failed');return r.status===204?null:await r.json();}
  const rpc=(name:string,p:any)=>db('rpc/'+name,'POST',p);
  async function native(name:string,body:any,room:string){const r=await f(url+'/functions/v1/'+name,{method:'POST',headers:{Authorization:auth,apikey:key,'Content-Type':'application/json','x-web-duel-signature':await signature(secret,user.id,room)},body:JSON.stringify(body)});if(!r.ok)throw Error((await r.text()).slice(0,160));return r.json();}
  const uuid=(v:any)=>{if(typeof v!=='string'||! /^[0-9a-f-]{36}$/i.test(v))throw Error('Invalid room or match');return v;};
  if(action==='join-room')return reply(200,await rpc('web_duel_join',{p_user:user.id,p_subject:String(b.subject||'')}));
  if(['room-pulse','start-match','leave-room'].includes(action)){
   const room=uuid(b.room_id),marker=await db('web_duel_rooms?room_id=eq.'+room+'&select=room_id'),members=await db('room_members?room_id=eq.'+room+'&select=player_id,last_seen');
   if(!marker.length||!members.some((m:any)=>m.player_id===user.id))return reply(403,{error:'Not in this room'});
   if(action==='leave-room'){const matches=await db('matches?room_id=eq.'+room+'&select=id');if(matches.length)return reply(409,{error:'Match already started'});await db('room_members?room_id=eq.'+room+'&player_id=eq.'+user.id,'DELETE');return reply(200,{ok:true});}
   await db('room_members?room_id=eq.'+room+'&player_id=eq.'+user.id,'PATCH',{last_seen:new Date().toISOString()});
   const rooms=await db('rooms?id=eq.'+room+'&select=departs_at');const count=members.filter((m:any)=>m.player_id===user.id||Date.parse(m.last_seen)>Date.now()-15000).length;
   const running=await db('matches?room_id=eq.'+room+'&select=id');
   if(action==='room-pulse')return reply(200,{roomID:room,started:running.length>0,humanCount:count,capacity:2,departsAtEpochMs:Date.parse(rooms[0].departs_at),serverNowEpochMs:Date.now()});
   if(count!==2&&!running.length)return reply(200,{waiting:true,humanCount:count});
   return reply(200,publicScript(await native('start-match',{room_id:room},room)));
  }
  const id=uuid(b.matchID),matches=await db('matches?id=eq.'+id+'&select=id,room_id,script,answer_keys');const match=matches[0];
  if(!match)return reply(404,{error:'Match not found'});
  const marker=await db('web_duel_rooms?room_id=eq.'+match.room_id+'&select=room_id');const s=match.script;
  if(!marker.length||!s.players.some((p:any)=>p.id===user.id&&!p.isBot))return reply(403,{error:'Not a participant'});
  const index=b.questionIndex;
  const step=async(i:number,a:string,choice?:number)=>{const w=questionWindow(s,i);return rpc('web_duel_step',{p_user:user.id,p_match:id,p_index:i,p_action:a,p_start:w.start,p_end:w.answerEnd,p_limit:w.limit,p_choice:choice??null,p_correct:choice===match.answer_keys[s.questions[i].id]});};
  if(['state','claim','answer'].includes(action)){
   const w=questionWindow(s,index);if(action==='answer'&&(!Number.isInteger(b.choice)||b.choice<0||b.choice>3))return reply(400,{error:'Invalid choice'});
   const state=await step(index,action,b.choice);const mine=state.owner===user.id;
   // Choices are private to the active buzzer owner; answer keys appear only during reveal.
   const q=s.questions[index];const safe={id:q.id,prompt:q.prompt,category:q.category};
   const reveal=Date.now()>=w.answerEnd||state.solved;
   const rows=await db('web_duel_answers?match_id=eq.'+id+'&select=question_index,state');
   const standings=s.players.map((p:any)=>{const records=s.questions.map((q:any,i:number)=>{const r=rows.find((x:any)=>x.question_index===i)?.state.records[p.id];return {questionID:q.id,roundIndex:questionWindow(s,i).roundIndex,choiceIndex:r?.choice??null,elapsedMs:r?.elapsedMs??0,wager:0};});
    const score=settleRecords({records,rounds:s.rounds,trait:traitFor(p.appearance?.kind),characterKind:p.appearance?.kind,characterPlays:0,answerOf:(qid:string)=>match.answer_keys[qid],difficultyOf:(qid:string)=>s.questions.find((q:any)=>q.id===qid)?.difficulty??.5,categoryOf:(qid:string)=>s.questions.find((q:any)=>q.id===qid)?.category}).score;
    return {playerID:p.id,score};}).sort((a:any,b:any)=>b.score-a.score);
   return reply(200,{...state,questionIndex:index,standings,question:{...safe,...(mine||reveal?{choices:q.choices}:{}),...(reveal?{answerIndex:q.answerIndex,explanation:q.explanation}: {})},window:w});
  }
  const end=questionWindow(s,s.questions.length-1).end;if(Date.now()<end)return reply(409,{error:'Match still in progress'});
  for(let i=0;i<s.questions.length;i++)await step(i,'state');
  const rows=await db('web_duel_answers?match_id=eq.'+id+'&select=question_index,state');
  const profiles=await db('profiles?id=in.('+s.players.map((p:any)=>p.id).join(',')+')&select=id,appearance,character_plays,rp,best_tier,pass_until,pass_environment');
  const logs=s.players.map((p:any)=>{const records=s.questions.map((q:any,i:number)=>{const r=rows.find((x:any)=>x.question_index===i)?.state.records[p.id];return {questionID:q.id,roundIndex:questionWindow(s,i).roundIndex,choiceIndex:r?.choice??null,elapsedMs:r?.elapsedMs??0,wager:0};});const prof=profiles.find((x:any)=>x.id===p.id),kind=prof?.appearance?.kind;
   const scored=settleRecords({records,rounds:s.rounds,trait:traitFor(kind),characterKind:kind,characterPlays:prof?.character_plays?.[kind]||0,answerOf:(qid:string)=>match.answer_keys[qid],difficultyOf:(qid:string)=>s.questions.find((q:any)=>q.id===qid)?.difficulty??.5,categoryOf:(qid:string)=>s.questions.find((q:any)=>q.id===qid)?.category});return {playerID:p.id,records,score:scored.score,correct:scored.correct};});
  const mine=logs.find((p:any)=>p.playerID===user.id)!;
  const existing=await db('web_duel_settlements?match_id=eq.'+id+'&player_id=eq.'+user.id+'&select=response');if(existing[0]?.response)return reply(200,existing[0].response);
  const acquired=await rpc('web_duel_acquire_settlement',{p_match:id,p_user:user.id});
  if(!acquired)return reply(409,{error:'Settlement pending. Please retry shortly.'});
  const prof=profiles.find((p:any)=>p.id===user.id),rank=1+logs.filter((p:any)=>p.score>mine.score).length,total=s.questions.length,accuracy=mine.correct/total,rankBonus=rank===1?200:120;
  const pass=passActiveForEnvironment(prof,env('IAP_ENVIRONMENT')||'Production');
  const baseGold=40+rankBonus+Math.round(accuracy*150),passBonusGold=pass?Math.round(baseGold*.5):0;
  const delta=rankDelta(rank,2,accuracy,prof.rp,mine.correct),after=prof.rp+delta,best=prof.best_tier,to=tierIndex(after);
  const tierReward=to>best?{fromTier:best,toTier:to,...rewardsBetween(best,to)}:undefined;
  const summary={matchID:id,finalScore:mine.score,rank,playerCount:2,correctCount:mine.correct,totalQuestions:total,goldEarned:baseGold+passBonusGold,xpEarned:30+Math.round(rankBonus/2)+mine.correct*3,scoreMismatch:false,rpDelta:delta,rpBefore:prof.rp,rpAfter:after,tierReward,passBonusGold};
  const records=mine.records.map((r:any)=>({...r,correct:r.choiceIndex===match.answer_keys[r.questionID]}));
  const result=await rpc('web_duel_finalize',{p_match:id,p_user:user.id,p_summary:summary,p_records:records,p_expected_rp:prof.rp});
  if(result.retry)return reply(409,{error:'Tier changed during settlement. Please retry.'});
  return reply(200,result);
 }catch(e){return reply(400,{error:e instanceof Error?e.message:'Unable to process match request'});}
}
if(typeof Deno!=='undefined')Deno.serve((req:Request)=>handle(req));
