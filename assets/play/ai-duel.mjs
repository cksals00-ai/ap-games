import {AIRound} from './ai-round.mjs';
export function mountAI({root,questions,kind='pencil',onExit}){
 document.body.classList.add('ai-playing');
 let index=0,scores={me:0,bot:0},disposed=false,handles=[];
 const make=(tag,text,cls)=>{let e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn,cls)=>{let e=make('button',text,cls);e.type='button';e.onclick=fn;return e;};
 const later=(fn,ms)=>{let id=setTimeout(()=>{if(!disposed)fn();},ms);handles.push(id);return id;};
 const clear=()=>{handles.forEach(clearTimeout);handles=[];};
 const leave=()=>{disposed=true;clear();document.body.classList.remove('ai-playing');};
 function next(){clear();if(disposed)return;
 const view=make('div',null,'panel ai-arena');root.replaceChildren(view);
 if(index>=questions.length){view.append(make('h2',scores.me===scores.bot?'무승부!':scores.me>scores.bot?'내가 이겼어요!':'AI가 이겼어요!'),make('p',`나 ${scores.me}점 · AI ${scores.bot}점`),make('p','AI 봇과의 연습 결과입니다. 공식 RP·순위·포인트에는 반영되지 않습니다.','muted'),button('다시 대전',()=>{index=0;scores={me:0,bot:0};next();}),button('게임 선택',()=>{leave();onExit();}));return;}
 const q=questions[index],round=new AIRound(performance.now());
 view.append(make('p',`AI 봇 대전 · ${index+1} / ${questions.length}문제`,'round-label'));
 const players=make('div',null,'duel-players');
 for(const actor of ['me','bot']){const tile=make('div',null,'duel-player '+(actor==='me'?'mine':''));tile.dataset.actor=actor;let img=make('img');img.src='/assets/play/hero_'+(actor==='me'?kind:'book')+'.png';img.alt=actor==='me'?'내 동물 캐릭터':'AI 부엉이';tile.append(img,make('strong',actor==='me'?'나':'부엉이 · AI'),make('span',`${scores[actor]}점`));players.append(tile);}
 const prompt=make('h2','','quiz-prompt'),state=make('p','아는 순간 부저! 먼저 누른 사람만 답할 수 있어요.','turn-state'),clock=make('p','','round-clock'),choices=make('div',null,'choices');
 const buzz=button('부저!',()=>claim('me'),'duel-buzzer');
 view.append(players,prompt,clock,buzz,state,choices,button('대전 종료',()=>{leave();onExit();},'exit-duel'));
 let revealed=0,ended=false;
 function updateScores(){for(const actor of ['me','bot'])players.querySelector(`[data-actor="${actor}"] span`).textContent=scores[actor]+'점';}
 function complete(){if(ended)return;ended=true;clear();round.phase='finished';clock.textContent='문제 종료';buzz.disabled=true;choices.replaceChildren();prompt.textContent=q.prompt;state.textContent='정답: '+q.choices[q.answerIndex]+' '+(q.explanation||'');view.append(button(index===questions.length-1?'결과 보기':'다음 문제',()=>{index++;next();},'next-question'));}
 function answer(actor,correct){const result=round.answer(actor,correct,performance.now());if(!result)return;scores[actor]+=result.delta;updateScores();players.querySelectorAll('.buzzing').forEach(e=>e.classList.remove('buzzing'));choices.replaceChildren();state.textContent=(actor==='me'?'나':'AI')+(result.correct?' 정답! +100점':' 오답 또는 시간 초과! −50점');if(round.phase==='finished')complete();else{buzz.disabled=round.used.has('me');state.textContent+=' 상대에게 부저 기회가 넘어갑니다.';}}
 function claim(actor){if(ended||!round.buzz(actor,performance.now()))return;buzz.disabled=true;players.querySelector(`[data-actor="${actor}"]`).classList.add('buzzing');state.textContent=actor==='me'?'내 차례! 5초 안에 선택하세요.':'AI가 부저를 눌렀어요. 답을 고르는 중…';
 if(actor==='me'){q.choices.forEach((value,i)=>choices.append(button(value,()=>answer('me',i===q.answerIndex))));}
 else later(()=>answer('bot',Math.random()<.65),900+Math.random()*1000);
 }
 function tick(){if(ended||disposed)return;const now=performance.now();if(round.owner&&now>round.answerEnd)answer(round.owner,false);if(now>=round.end){complete();return;}revealed=Math.min(q.prompt.length,revealed+2);prompt.textContent=q.prompt.slice(0,revealed);clock.textContent=round.owner?`답변 ${Math.max(0,Math.ceil((round.answerEnd-now)/1000))}초`:`남은 시간 ${Math.ceil((round.end-now)/1000)}초`;later(tick,90);}
 function aiTry(){if(ended)return;if(!round.used.has('bot')){if(round.owner)later(aiTry,150);else claim('bot');}}
 later(aiTry,2400+Math.random()*3600);tick();
 }
 next();return leave;
}
