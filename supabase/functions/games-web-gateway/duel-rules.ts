export function questionWindow(script:any,index:number){
 if(!Number.isInteger(index)||index<0)throw Error('Invalid question');
 let count=0,at=Number(script.startsAtEpochMs);
 for(const [ri,r] of script.rounds.entries()){
  at+=Number(r.introSeconds||0)*1000;
  if(index<count+r.questionCount){const start=at+(index-count)*r.secondsPerQuestion*1000;return {start,end:start+r.secondsPerQuestion*1000,answerEnd:start+(r.secondsPerQuestion-7)*1000,limit:r.kind==='betting'?3000:2500,roundIndex:ri};}
  at+=r.questionCount*r.secondsPerQuestion*1000;count+=r.questionCount;
 }throw Error('Invalid question');
}
export function publicScript(script:any){return {...script,questions:script.questions.map(({answerIndex,explanation,choices,...q}:any)=>q)};}
