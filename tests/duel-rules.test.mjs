import assert from 'node:assert/strict';
import {questionWindow,publicScript} from '../supabase/functions/games-web-gateway/duel-rules.ts';
const s={startsAtEpochMs:1000,rounds:[{kind:'main',questionCount:2,secondsPerQuestion:18,introSeconds:3},{kind:'betting',questionCount:1,secondsPerQuestion:24,introSeconds:4}],questions:[{id:'a',answerIndex:2,explanation:'secret',choices:['1','2','3','4']}]};
assert.deepEqual(questionWindow(s,0),{start:4000,end:22000,answerEnd:15000,limit:2500,roundIndex:0});
assert.equal(questionWindow(s,2).start,44000);assert.equal(questionWindow(s,2).limit,3000);
assert.throws(()=>questionWindow(s,-1));assert.throws(()=>questionWindow(s,3));
const view=publicScript(s);assert.equal(view.questions[0].choices,undefined);assert.equal(view.questions[0].answerIndex,undefined);assert.equal(view.questions[0].explanation,undefined);assert.equal(s.questions[0].answerIndex,2);
console.log('Question schedule and answer-key redaction passed');
