export class AIRound {
 constructor(now,duration=12000){this.end=now+duration;this.phase='open';this.owner=null;this.used=new Set();this.answerEnd=0;}
 buzz(actor,now){if(!['me','bot'].includes(actor)||this.phase==='finished')return false;if(now>=this.end){this.phase='finished';return false;}if(this.owner||this.used.has(actor))return false;this.owner=actor;this.used.add(actor);this.answerEnd=Math.min(this.end,now+5000);this.phase='answering';return true;}
 answer(actor,correct,now){if(this.phase==='finished'||this.owner!==actor)return null;const success=correct&&now<=this.answerEnd;this.owner=null;this.phase=success||this.used.size===2||now>=this.end?'finished':'open';return {actor,correct:success,delta:success?100:-50};}
}
export function shuffleQuestion(q,random=Math.random){const order=q.choices.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return {...q,choices:order.map(i=>q.choices[i]),answerIndex:order.indexOf(q.answerIndex)};}
