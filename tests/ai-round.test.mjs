import test from 'node:test';
import assert from 'node:assert/strict';
import {AIRound,shuffleQuestion} from '../assets/play/ai-round.mjs';
test('first buzzer owns choices; incorrect answer lets the other actor try',()=>{let r=new AIRound(0);assert.equal(r.buzz('me',100),true);assert.equal(r.buzz('bot',200),false);assert.equal(r.answer('me',false,300).delta,-50);assert.equal(r.buzz('me',400),false);assert.equal(r.buzz('bot',400),true);assert.equal(r.answer('bot',true,500).delta,100);assert.equal(r.phase,'finished');});
test('duplicate answer cannot award twice and late correct answers lose',()=>{let r=new AIRound(0);r.buzz('me',100);assert.equal(r.answer('me',true,5101).delta,-50);assert.equal(r.answer('me',true,5102),null);r.buzz('bot',5200);r.answer('bot',false,5300);assert.equal(r.phase,'finished');});
test('deadline and unknown actor cannot claim the buzzer',()=>{let r=new AIRound(0);assert.equal(r.buzz('someone',0),false);assert.equal(r.buzz('me',12000),false);assert.equal(r.phase,'finished');});

test('choice shuffle preserves correct answer and original question',()=>{const q={prompt:'Q',choices:['correct','b','c','d'],answerIndex:0};const shuffled=shuffleQuestion(q,()=>0);assert.equal(shuffled.answerIndex,3);assert.equal(shuffled.choices[shuffled.answerIndex],'correct');assert.deepEqual(q.choices,['correct','b','c','d']);});
