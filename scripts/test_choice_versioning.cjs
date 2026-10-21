/* Automated regression for old answer text vs new balanced options.
   This deliberately uses no network or browser state. */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8');
const first=app.indexOf('function useLegacyChoiceSet(q){');
const end=app.indexOf('function optionHtml(',first);
assert(first>=0&&end>first,'choice versioning helper must exist in app.js');
const helpers=app.slice(first,end);
const q={bankId:9,n:3,legacyOptions:['Old A','Old B','Old C'],legacyExplanations:['Old A reason','Old B reason','Old C reason'],options:['New A','New B','New C'],explanations:['New A reason','New B reason','New C reason']};
const create=(banks={},answers={})=>{
 const c={state:{banks,practice:{answers}},idOf:(b,n)=>b+':'+n,q};
 vm.createContext(c);
 vm.runInContext(helpers+'; globalThis.result={useLegacyChoiceSet,optionsForDisplay,explanationsForDisplay}',c);
 return c.result;
};
let api=create({9:{3:{choice:'B',correct:false,at:1}}});
assert.equal(api.useLegacyChoiceSet(q),true);
assert.equal(api.optionsForDisplay(q)[1],'Old B','old bank attempt preserves former label');
assert.equal(api.explanationsForDisplay(q)[1],'Old B reason');
api=create({9:{3:{choice:'B',optionRevision:2,choiceText:'New B'}}});
assert.equal(api.useLegacyChoiceSet(q),false);
assert.equal(api.optionsForDisplay(q)[1],'New B','new bank attempt uses updated label');
api=create({}, {'9:3':{choice:'B',at:1}});
assert.equal(api.optionsForDisplay(q)[1],'Old B','legacy practice attempt must be preserved');
api=create({}, {'9:3':{choice:'B',optionRevision:2}});
assert.equal(api.optionsForDisplay(q)[1],'New B','new practice attempt sees revised labels');
api=create();
assert.equal(api.optionsForDisplay(q)[1],'New B','unanswered questions see revised labels');
const unmodified={bankId:9,n:4,options:['A','B'],explanations:['a','b']};
assert.equal(api.useLegacyChoiceSet(unmodified),false);
assert.equal(api.optionsForDisplay(unmodified)[1],'B');
for(const needle of [
 "data.forEach(q=>{q.bankId=Number(b)})",
 "optionRevision:useLegacyChoiceSet(q)?1:2",
 "choiceText:optionsForDisplay(q)[ABC.indexOf(choice)]",
 "function reviewChoice(card,r,q){const answer=r.currentAnswer;return `<div class=\"choices\">${optionsForDisplay(q).map(",
])assert(app.includes(needle),'missing integration: '+needle);
console.log('Choice-version tests passed: legacy/current bank and practice attempts, new answers, review rendering');
