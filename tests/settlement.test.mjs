import assert from 'node:assert/strict';import {handle} from '../supabase/functions/games-web-gateway/index.ts';
const a='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',room='cccccccc-cccc-cccc-cccc-cccccccccccc',id='dddddddd-dddd-dddd-dddd-dddddddddddd',q='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const script={matchID:id,startsAtEpochMs:Date.now()-60000,rounds:[{kind:'main',questionCount:1,secondsPerQuestion:18,introSeconds:3}],questions:[{id:q,difficulty:.5,category:'general',prompt:'fixture',choices:['wrong','right','wrong','wrong'],answerIndex:1}],players:[{id:a,appearance:{kind:'book'}},{id:b,appearance:{kind:'pencil'}}]};
let receipt=null,finalizations=0,acquires=0;
const deps={env:k=>({SUPABASE_URL:'https://backend.test',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'})[k],fetch:async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:a});const p=url.split('/rest/v1/')[1];assert.equal(init.headers.apikey,'private');
 if(p.startsWith('matches?'))return Response.json([{id,room_id:room,script,answer_keys:{[q]:1}}]);
 if(p.startsWith('web_duel_rooms?'))return Response.json([{room_id:room}]);
 if(p==='rpc/web_duel_step')return Response.json({records:{[a]:{choice:0,elapsedMs:100,correct:false},[b]:{choice:1,elapsedMs:100,correct:true}}});
 if(p.startsWith('web_duel_answers?'))return Response.json([{question_index:0,state:{records:{[a]:{choice:0,elapsedMs:100,correct:false},[b]:{choice:1,elapsedMs:100,correct:true}}}}]);
 if(p.startsWith('profiles?'))return Response.json([{id:a,appearance:{kind:'book'},rp:100,best_tier:0,character_plays:{}},{id:b,appearance:{kind:'pencil'},rp:100,best_tier:0,character_plays:{}}]);
 if(p.startsWith('web_duel_settlements?'))return Response.json(receipt?[{response:receipt}]:[]);
 if(p==='rpc/web_duel_acquire_settlement'){acquires++;return Response.json(true);}
 if(p==='rpc/web_duel_finalize'){finalizations++;const x=JSON.parse(init.body);assert.equal(x.p_summary.finalScore,-150);assert.equal(x.p_summary.rank,2);assert.equal(x.p_summary.rpDelta,0);assert.equal(x.p_summary.goldEarned,160);assert.equal(x.p_records[0].choiceIndex,0);assert.equal(x.p_user,a);receipt=x.p_summary;return Response.json(receipt);}
 throw Error('Unexpected mocked route '+p);
}};
const req=()=>new Request('https://gateway.test',{method:'POST',headers:{Origin:'https://games.apholdings.kr',Authorization:'Bearer valid.jwt.token'},body:JSON.stringify({action:'settle-match',body:{matchID:id,playerID:a,clientClaimedScore:999999,rpDelta:99999,claimedStandings:[{playerID:a,score:999999}],records:[{questionID:q,choiceIndex:1,elapsedMs:0}]}})});
const first=await handle(req(),deps);assert.equal(first.status,200);assert.equal((await first.json()).finalScore,-150);
const again=await handle(req(),deps);assert.equal(again.status,200);assert.equal((await again.json()).finalScore,-150);assert.equal(finalizations,1);assert.equal(acquires,1);
console.log('Forged client score/answer/RP ignored; server records and native policy used; durable replay does not finalize again.');
