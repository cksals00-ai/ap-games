// Local-only two-client UI fixture. No real accounts, rewards, or production calls.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),users=['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],roomID='cccccccc-cccc-cccc-cccc-cccccccccccc';let start=0,joined=new Set(),states={},claims=0;
const script=()=>({matchID:'dddddddd-dddd-dddd-dddd-dddddddddddd',startsAtEpochMs:start,rounds:[{kind:'main',questionCount:2,secondsPerQuestion:18,introSeconds:1}],questions:[{id:'q1'},{id:'q2'}],players:users.map((id,i)=>({id,nickname:i?'여우 테스트':'토끼 테스트',appearance:{kind:i?'question':'pencil'},isBot:false}))});
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/functions/v1/games-web-gateway'){let body='';for await(const c of req)body+=c;const {action,body:b}=JSON.parse(body),user=req.headers.authorization.split(' ').at(-1);let d={};
 if(action==='join-room'){joined.add(user);if(joined.size===2&&!start)start=Date.now()+1500;d={roomID};}
 if(action==='room-pulse'&&!joined.has(user)){res.statusCode=403;res.end(JSON.stringify({error:'Not in room'}));return;}
 if(action==='room-pulse')d={roomID,humanCount:joined.size,capacity:2,departsAtEpochMs:start,serverNowEpochMs:Date.now()};
 if(action==='start-match')d=script();
 if(['state','claim','answer'].includes(action)){const i=b.questionIndex,t=Date.now(),begin=start+1000+i*18000,end=begin+11000,s=states[i]??={records:{},solved:false};if(s.owner&&t>=s.claimedAt+2500){s.records[s.owner]={choice:-1,correct:false};delete s.owner;}
 if(action==='claim'&&!s.owner&&!s.solved&&!s.records[user]&&t>=begin&&t<end){s.owner=user;s.claimedAt=t;claims++;}
 if(action==='answer'&&s.owner===user){s.records[user]={choice:b.choice,correct:b.choice===1};delete s.owner;s.solved=b.choice===1;}
 const reveal=s.solved||t>=end;
 d={...s,serverNowEpochMs:t,standings:users.map(playerID=>({playerID,score:Object.values(states).filter(s=>s.records[playerID]?.correct).length*100})),window:{start:begin,end:begin+18000,answerEnd:end,limit:2500},question:{id:'q'+i,prompt:'테스트: 정답은 두 번째 선택지입니다.',...(s.owner===user||reveal?{choices:['오답','정답','오답 2','오답 3']}:{}) ,...(reveal?{answerIndex:1,explanation:'로컬 UI 테스트입니다.'}:{})}};
 }
 if(action==='settle-match'){const score=id=>Object.values(states).filter(s=>s.records[id]?.correct).length*100;d={rank:1+users.filter(id=>score(id)>score(user)).length,finalScore:score(user),correctCount:score(user)/100,totalQuestions:2,rpDelta:0,rpAfter:0};}
 if(action==='leave-room'){joined.delete(user);d={ok:true};}
 res.end(JSON.stringify(d));return;
 }
 if(url.pathname==='/fixture'){res.setHeader('Content-Type','text/html');const id=users[url.searchParams.get('player')==='b'?1:0];res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/assets/play/play.css"><h1>LOCAL TEST · 실제 점수 반영 없음</h1><p id="status"></p><section id="game"></section><script type="module">import {mountDuel} from '/assets/play/duel.js';const user={id:'${id}'};const sb={auth:{getSession:async()=>({data:{session:{access_token:user.id}}})},channel:()=>({on(){return this},subscribe(){},send(){}}),removeChannel(){}};await mountDuel({sb,cfg:{url:location.origin,anon:'fixture'},user,root:document.getElementById('game'),onExit:()=>location.reload(),status:t=>document.getElementById('status').textContent=t});</script></html>`);return;}
 const file=path.join(root,url.pathname);if(!file.startsWith(root)||!fs.existsSync(file)){res.statusCode=404;res.end('{}');return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));
}).listen(8095,'127.0.0.1',()=>console.log('Local two-player UI fixture 8095'));
