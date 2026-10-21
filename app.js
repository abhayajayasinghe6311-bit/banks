'use strict';
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='spaw.study.garden.online.v1';const ABC='ABCDE';
const empty=()=>({format:'SPAW_ONLINE_PROGRESS_V1',version:1,banks:{},review:{},bookmarks:{},updated:Date.now()});
const load=()=>{try{const d=JSON.parse(localStorage.getItem(STORE)||'null');return d&&d.version===1?d:empty();}catch(e){return empty();}};
let state=load(),manifest=null,bankData={},route={},activeList=[],cursor=0,filter='all',domain='all',reviewFilter='pending',reviewBank='all',reviewOffset=0;
let channel;try{channel=new BroadcastChannel('spaw-garden-online');channel.onmessage=()=>syncUI();}catch(e){}
function save(){state.updated=Date.now();try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){showNotice('Browser storage is disabled or full. Export your progress backup to avoid losing answers.');}try{channel?.postMessage({updated:state.updated});}catch(e){}updateBadge();}
function syncUI(){state=load();updateBadge();if(route.review)renderReview();else if(route.bank)renderBank();else renderHome();}
window.addEventListener('storage',e=>{if(e.key===STORE)syncUI();});window.addEventListener('focus',()=>{const n=load();if(n.updated>state.updated){state=n;syncUI();}});
function idOf(b,n){return b+':'+n;}
function recs(){return Object.values(state.review||{});}function pending(){return recs().filter(r=>!r.mastered).length;}
function updateBadge(){if($('navWrong'))$('navWrong').textContent=pending();}
function updateProgress(bank,n,choice){
 const id=idOf(bank,n),q=bankData[bank]?.find(q=>q.n===n);if(!q)return;
 const b=state.banks[bank]||(state.banks[bank]={});if(b[n])return;
 b[n]={choice,correct:choice===q.key,at:Date.now()};
 if(choice!==q.key){
  const r=state.review[id]||{bank:Number(bank),n,firstChoice:choice,tries:0,lastChoice:null,mastered:false,firstWrongAt:Date.now()};
  r.mastered=false;state.review[id]=r;
 }
 save();
 // Update only the answered question, not the whole page. This prevents the
 // browser from rebuilding the document and jolting the reader's position.
 const answerButtons=$('choices'),questionCard=answerButtons?.closest('.quiz-question');
 const notes=document.querySelector('.learning-placeholder');
 if(!questionCard||!notes){renderBank();return;}
 answerButtons.innerHTML=optionHtml(q,choice);
 questionCard.querySelector('.answer-hint')?.remove();
 const nav=questionCard.querySelector('.navbox');
 const message=b[n].correct?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+q.key+'.';
 nav?.insertAdjacentHTML('beforebegin','<div class="feedback '+(b[n].correct?'yes':'no')+'">'+message+' Your first response is locked.</div>');
 notes.outerHTML=learningNotes(q);
 const layout=questionCard.closest('.learning-layout');
 layout?.classList.add('has-notes');
 const status=answeredStatus(bank),total=bankData[bank].length;
 if($('bankSummary'))$('bankSummary').textContent=status.attempted+'/'+total+' answered · '+status.correct+' correct · '+(status.attempted-status.correct)+' incorrect';
 if($('bankProgressBar'))$('bankProgressBar').style.width=Math.round(status.attempted*100/total)+'%';
 if($('bankPercent'))$('bankPercent').textContent=Math.round(status.attempted*100/total)+'%';
 if($('restartBank'))$('restartBank').disabled=false;
 if(status.attempted===total){
  const done=document.createElement('div');done.className='bank-finished-note';done.textContent='🌸 Bank completed! Your results are saved — review the explanations or return to the garden.';
  questionCard.append(done);
 }
}
function retryAnswer(bank,n,choice){const id=idOf(bank,n),q=bankData[bank]?.find(q=>q.n===n);if(!q)return;const r=state.review[id];if(!r||r.mastered)return;r.tries=(r.tries||0)+1;r.lastChoice=choice;r.lastAt=Date.now();if(choice===q.key){r.mastered=true;r.masteredAt=Date.now();}save();renderReview();}
function url(bank){return 'index.html?bank='+encodeURIComponent(bank);}function tile(b){const done=Object.keys(state.banks[b.id]||{}).length;const wrong=recs().filter(r=>r.bank===b.id&&!r.mastered).length;return `<a class="tile" target="_blank" rel="noopener" href="${url(b.id)}" title="Open Bank ${b.id} in a new tab"><span class="flower">${b.emoji}</span><h3>Bank ${b.id} · ${safe(b.name)}</h3><p>${safe(b.description)}</p><span class="pill">${done}/${b.count} answered</span>${wrong?`<span class="pill">${wrong} to review</span>`:''}<span class="pill">Open in new tab ↗</span></a>`;}
function section(title,right=''){return `<div class="section-head"><h2>${title}</h2>${right}</div>`;}
function overview(){const n=manifest.banks.reduce((s,b)=>s+b.count,0),done=Object.values(state.banks).reduce((s,b)=>s+Object.keys(b).length,0),correct=Object.values(state.banks).reduce((s,b)=>s+Object.values(b).filter(a=>a.correct).length,0),mastered=recs().filter(r=>r.mastered).length;return `<div class="stats"><div class="stat"><strong>${n}</strong><small>Original MCQs</small></div><div class="stat"><strong>${done}</strong><small>First attempts</small></div><div class="stat"><strong>${pending()}</strong><small>To review</small></div><div class="stat"><strong>${mastered}</strong><small>Mastered mistakes</small></div></div>`;}
let pendingImport=null;
function scopeMarkup(prefix, banks){
 const options=banks.map(b=>'<option value="'+b.id+'">Bank '+b.id+' · '+safe(b.name)+'</option>').join('');
 const checks=banks.map(b=>'<label class="backup-chip"><input type="checkbox" data-select-bank="'+b.id+'"><span>Bank '+b.id+'</span></label>').join('');
 return '<div class="backup-scope" id="'+prefix+'Scope" data-bankids="'+banks.map(b=>b.id).join(',')+'">'+
  '<div class="backup-modes" role="group" aria-label="'+(prefix==='export'?'Export':'Import')+' bank selection">'+
   '<label><input type="radio" name="'+prefix+'Mode" value="all" checked> All banks</label>'+
   '<label><input type="radio" name="'+prefix+'Mode" value="one"> One bank</label>'+
   '<label><input type="radio" name="'+prefix+'Mode" value="multiple"> Several banks</label>'+
  '</div>'+
  '<div class="backup-single" id="'+prefix+'Single" hidden><label>Choose a bank <select id="'+prefix+'One">'+options+'</select></label></div>'+
  '<div class="backup-check-grid" id="'+prefix+'Multiple" hidden>'+checks+'</div>'+
 '</div>';
}
function backupPanel(){
 return '<details class="backup-drawer" id="backupPanel">'+
 '<summary><span>💾 Progress backup & transfer</span><span class="backup-summary-hint">One · Several · All banks <span aria-hidden="true">⌄</span></span></summary>'+
 '<div class="backup-sections">'+
 '<section class="backup-block" aria-label="Export progress"><h3>↓ Export progress</h3><p class="small">Save your scores, bookmarks and wrong-answer history for selected banks.</p>'+
 scopeMarkup('export',manifest.banks)+
 '<button class="btn soft" type="button" id="exportBtn">Download selected progress ↓</button></section>'+
 '<section class="backup-block" aria-label="Import progress"><h3>↑ Import progress</h3><p class="small">Choose a backup first, then restore just one, several, or all banks included in it.</p>'+
 '<button class="btn soft" type="button" id="importBtn">Choose backup file ↑</button>'+
 '<div id="importPicker" class="backup-import-picker" hidden></div></section>'+
 '</div><p class="backup-fine">Saved only in this browser. Importing replaces progress for the selected banks, but leaves all other banks untouched. Keep a backup before changing devices.</p>'+
 '</details>';
}
function wireScope(prefix){
 const root=$(prefix+'Scope');
 if(!root)return;
 function refresh(){
  const mode=root.querySelector('input[name="'+prefix+'Mode"]:checked')?.value||'all';
  $(prefix+'Single').hidden=mode!=='one';
  $(prefix+'Multiple').hidden=mode!=='multiple';
 }
 root.querySelectorAll('input[name="'+prefix+'Mode"]').forEach(el=>el.addEventListener('change',refresh));
 refresh();
}
function scopedBankIds(prefix){
 const root=$(prefix+'Scope');if(!root)return[];
 const allowed=(root.dataset.bankids||'').split(',').map(Number).filter(Number.isInteger);
 const mode=root.querySelector('input[name="'+prefix+'Mode"]:checked')?.value||'all';
 if(mode==='all')return allowed;
 if(mode==='one'){const b=Number($(prefix+'One').value);return allowed.includes(b)?[b]:[];}
 return [...root.querySelectorAll('[data-select-bank]:checked')].map(el=>Number(el.dataset.selectBank)).filter(b=>allowed.includes(b));
}
function wireBackupPanel(){
 wireScope('export');
 if($('exportBtn'))$('exportBtn').onclick=exportProgress;
 if($('importBtn'))$('importBtn').onclick=()=>$('importFile').click();
}
function listAvailableBackupBanks(pack,data){
 const recognized=new Set(manifest.banks.map(b=>b.id));
 let ids=[];
 if(Array.isArray(pack.includedBanks)){
  ids=pack.includedBanks;
 }else if(pack.kind==='SPAW_STUDY_GARDEN_BACKUP'&&pack.banks){
  ids=Object.keys(pack.banks);
 }else{
  ids=[...Object.keys(data.banks||{}),...Object.keys(data.review||{}).map(id=>id.split(':')[0]),...Object.keys(data.bookmarks||{}).map(id=>id.split(':')[0])];
 }
 const available=new Set(ids.map(Number).filter(n=>Number.isInteger(n)&&recognized.has(n)));
 return manifest.banks.filter(b=>available.has(b.id));
}
function showImportPicker(){
 const panel=$('importPicker');
 if(!panel||!pendingImport)return;
 const available=pendingImport.banks;
 panel.hidden=false;
 panel.innerHTML='<p class="small"><b>'+safe(pendingImport.name)+'</b><br>'+available.length+' bank(s) available in this backup.</p>'+
  scopeMarkup('import',available)+
  '<div class="backup-actions"><button type="button" class="btn" id="applyImportBtn">Restore selected progress</button><button type="button" class="btn soft" id="cancelImportBtn">Cancel</button></div>';
 wireScope('import');
 $('applyImportBtn').onclick=applySelectedImport;
 $('cancelImportBtn').onclick=()=>{pendingImport=null;panel.hidden=true;panel.innerHTML='';};
}
function applySelectedImport(){
 if(!pendingImport)return;
 const ids=scopedBankIds('import');
 if(!ids.length){alert('Choose at least one bank to import.');return;}
 const names=ids.map(n=>'Bank '+n).join(', ');
 if(!confirm('Replace the saved answers, scores, review records and bookmarks in '+names+' using this backup?\\n\\nAll OTHER banks will stay unchanged. Export your current progress first if you want to keep the selected bank attempts.'))return;
 const incoming=pendingImport.data, chosen=new Set(ids);
 const next={...state,banks:{...state.banks},review:{...state.review},bookmarks:{...state.bookmarks}};
 for(const b of ids){
  const k=String(b);
  if(Object.prototype.hasOwnProperty.call(incoming.banks,k))next.banks[k]=incoming.banks[k];else delete next.banks[k];
 }
 for(const field of ['review','bookmarks']){
  for(const k of Object.keys(next[field]))if(chosen.has(Number(k.split(':')[0])))delete next[field][k];
  for(const [k,value] of Object.entries(incoming[field]||{}))if(chosen.has(Number(k.split(':')[0])))next[field][k]=value;
 }
 state=next;pendingImport=null;transientReview={};save();renderHome();
 alert('Progress restored for '+names+' 🌷\\nAll other banks are unchanged.');
}
function showNotice(msg){console.warn(msg);const app=$('app');let n=$('storageNotice');if(!n){n=document.createElement('div');n.id='storageNotice';n.className='notice';app.prepend(n);}n.textContent=msg;}
function renderHome(){route={};
 const nextBank=[...manifest.banks].sort((a,b)=>a.id-b.id).find(b=>{
  const answers=state.banks[b.id]||{};
  const validAttempts=Object.keys(answers).filter(n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=b.count).length;
  return validAttempts<b.count;
 });
 const nextAttempts=nextBank?Object.keys(state.banks[nextBank.id]||{}).length:0;
 const nextBankButton=nextBank
  ? `<a class="btn soft" href="${url(nextBank.id)}" target="_blank" rel="noopener">${nextBank.emoji} ${nextAttempts?'Continue':'Start'} Bank ${nextBank.id} ↗</a>`
  : `<a class="btn soft" href="?review=1">🎉 All banks attempted — Review mistakes ↗</a>`;
 $('app').innerHTML=`<section class="hero"><div class="eyebrow">YOUR LITTLE MED SCHOOL SANCTUARY ✿</div><h1>Grow your clinical confidence, one question at a time. 🌷</h1><p>${manifest.banks.length} banks of original Monash-inspired clinical scenarios, instant feedback, and explanations that teach you how to distinguish the tempting alternatives.</p><div class="flex"><a class="btn" href="?review=1">🌿 Open Wrong Answers Garden (${pending()})</a>${nextBankButton}</div></section>${overview()}${section('Choose your question garden','<span class="small">Each opens in a new browser tab ↗</span>')}<div class="tiles">${manifest.banks.map(tile).join('')}</div>${backupPanel()}<div class="notice">These are <b>unofficial, original educational questions</b>, not faculty questions. Clinical management should always follow local protocols and senior supervision.</div>`;wireBackupPanel();updateBadge();}
async function getBank(b){if(!bankData[b]){const resp=await fetch('bank'+b+'.json',{cache:'no-cache'});if(!resp.ok)throw new Error('Could not fetch Bank '+b);bankData[b]=await resp.json();}return bankData[b];}
function answeredStatus(b){const a=state.banks[b]||{};return {attempted:Object.keys(a).length,correct:Object.values(a).filter(x=>x.correct).length};}
function filteredQuestions(b){const all=bankData[b]||[];return all.filter(q=>{if(domain!=='all'&&q.domain!==domain)return false;const answer=(state.banks[b]||{})[q.n];const rid=idOf(b,q.n);if(filter==='unanswered')return !answer;if(filter==='wrong')return answer&&!answer.correct;if(filter==='bookmarks')return !!state.bookmarks[rid];return true;});}
function optionHtml(q,selected,review=false){return q.options.map((option,i)=>{const letter=ABC[i],correct=letter===q.key,isSelected=letter===selected;let cls='choice';if(selected){if(correct)cls+=' true';if(isSelected)cls+=correct?' selected correct':' selected incorrect';}return `<button type="button" class="${cls}" data-choice="${letter}" ${selected?'disabled':''}><span class="letter">${letter}</span><span>${safe(option)}</span></button>`;}).join('');}
function explHtml(q){return `<details class="answer" ${''}><summary>📖 Reveal teaching explanation and exam pearls</summary><div class="answer-body"><p><b>Correct answer: ${safe(q.key)} — ${safe(q.options[ABC.indexOf(q.key)])}</b></p>${q.options.map((o,i)=>`<div class="explainline ${ABC[i]===q.key?'is-correct':''}"><b>${ABC[i]}. ${ABC[i]===q.key?'✓ Correct':'Why not'}:</b> ${safe(q.explanations?.[i]||'Review this option against the key features.')}</div>`).join('')}${q.pearl?`<div class="pearl">💡 <b>Exam pearl:</b> ${safe(q.pearl)}</div>`:''}${q.pivot?`<div class="pivot">🔄 <b>What would change the answer?</b> ${safe(q.pivot)}</div>`:''}</div></details>`;}
function learningNotes(q,anchorId='learningNotes'){
 const keyIndex=ABC.indexOf(q.key);
 const options=q.options||[];
 const good=options[keyIndex]||'';
 const rationale=q.explanations?.[keyIndex]||'The decisive clue favours this single best answer.';
 const others=options.map((option,i)=>{
  if(i===keyIndex)return '';
  return `<div class="learning-alternative"><div class="learning-option-head"><span class="learning-letter">${ABC[i]}</span><strong>${safe(option)}</strong></div><p>${safe(q.explanations?.[i]||'This alternative does not best fit the decisive clinical finding.')}</p></div>`;
 }).join('');
 return `<aside class="learning-card" id="${safe(anchorId)}" aria-label="Clinical reasoning notes">
 <div class="learning-header"><span aria-hidden="true">🌷</span><div><div class="learning-eyebrow">YOUR LEARNING NOTES</div><h2>Understand the <em>why</em></h2></div></div>
 <div class="learning-section learning-correct"><div class="learning-tag">✓ The best answer</div><h3>${safe(q.key)}. ${safe(good)}</h3><p>${safe(rationale)}</p></div>
 <div class="learning-section"><h3 class="learning-section-title">🔎 Why the other answers lose</h3><div class="learning-alternatives">${others}</div></div>
 ${q.pearl?`<div class="learning-section learning-pearl"><h3>💡 Remember this principle</h3><p>${safe(q.pearl)}</p></div>`:''}
 ${q.pivot?`<div class="learning-section learning-pivot"><h3>🔄 If the scenario changed…</h3><p>${safe(q.pivot)}</p></div>`:''}
 <p class="learning-footer">Read the reasoning, then try explaining the answer aloud before moving on. ♡</p>
 </aside>`;
}
function renderBank(){const b=route.bank;const bm=manifest.banks.find(x=>x.id===b);if(!bm)return;const qset=bankData[b];if(!qset){$('app').innerHTML='<div class="loading">Opening your questions… 🌷</div>';return;}activeList=filteredQuestions(b);cursor=Math.max(0,Math.min(cursor,activeList.length-1));const q=activeList[cursor],tot=answeredStatus(b);const pct=qset.length?Math.round(tot.attempted*100/qset.length):0;const cats=[...new Set(qset.map(q=>q.domain))].sort();const summary=`${tot.attempted}/${qset.length} answered · ${tot.correct} correct · ${tot.attempted-tot.correct} incorrect`;
 const finished=tot.attempted===qset.length;
 const specialtySummary=[...new Set(qset.map(x=>x.domain))].map(d=>{const subset=qset.filter(x=>x.domain===d);const count=subset.filter(x=>(state.banks[b]||{})[x.n]?.correct).length;return `<div class="flex between"><span>${safe(d)}</span><b>${count}/${subset.length} · ${Math.round(count/subset.length*100)}%</b></div>`;}).join('');
 const finalSummary=finished?`<div class="panel"><div class="eyebrow">BANK ${b} COMPLETED 🎉</div><h2>Final score: ${tot.correct}/${qset.length} (${Math.round(100*tot.correct/qset.length)}%)</h2><p class="small">Your original answers are locked. Review mistakes separately to build mastery without changing this score.</p><div style="display:grid;gap:8px">${specialtySummary}</div><div class="flex" style="margin-top:16px"><a href="?review=1" class="btn rose">🌿 Review your mistakes</a></div></div>`:'';
 $('app').innerHTML=`<section class="bank-intro" aria-label="Bank overview">
 <div class="bank-intro-nav">
  <a class="bank-back-link" href="./">← All banks</a>
  <div class="bank-intro-actions">
   <a href="?review=1" class="bank-text-link" target="_blank" rel="noopener">🌿 Review mistakes <span>(${pending()})</span> ↗</a>
   <button type="button" class="bank-text-link bank-reset-link" id="restartBank" ${tot.attempted===0?'disabled':''} title="Reset this bank only">↻ Restart bank</button>
  </div>
 </div>
 <div class="bank-title-area">
  <div class="eyebrow">BANK ${b} · CLINICAL PRACTICE</div>
  <h1 class="page-title">${bm.emoji} ${safe(bm.name)}</h1>
  <p class="small bank-description">${safe(bm.description)} · ${qset.length} questions</p>
 </div>
 <div class="bank-progress-details">
  <span class="small bank-summary" id="bankSummary">${summary}</span>
  <span class="small bank-progress-percent"><span id="bankPercent">${pct}%</span> complete</span>
 </div>
 <div class="progress bank-progress"><span id="bankProgressBar" style="width:${pct}%"></span></div>
 </section>${finalSummary}<div class="toolbar bank-toolbar"><div class="flex"><label class="small">Show <select id="filter"><option value="all">All questions</option><option value="unanswered">Unanswered</option><option value="wrong">Original mistakes</option><option value="bookmarks">Bookmarked</option></select></label><label class="small">Specialty <select id="domain"><option value="all">All specialties</option>${cats.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('')}</select></label></div><div class="small">${activeList.length?`${cursor+1} / ${activeList.length} shown`:'No matches'}</div></div>${q?`<div class="learning-layout ${(state.banks[b]||{})[q.n]?'has-notes':''}"><div class="quizbox quiz-question"><div class="meta"><b>Domain:</b> ${safe(q.domain)} &nbsp; · &nbsp; <b>Skillset:</b> ${safe(q.skill||'Clinical reasoning')} &nbsp; · &nbsp; <b>Context:</b> ${safe(q.context||'Clinical')}</div><div class="question-label">EMQ ${q.n}</div><div class="stem">${safe(q.stem)}</div><p class="ask">${safe(q.ask||'Which of the following is the single BEST answer?')}</p><div class="choices" id="choices">${optionHtml(q,(state.banks[b]||{})[q.n]?.choice)}</div>${(state.banks[b]||{})[q.n]?`<div class="feedback ${(state.banks[b][q.n].correct?'yes':'no')}">${state.banks[b][q.n].correct?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+q.key+'.'} Your first response is locked.</div>`:``}<div class="navbox"><button class="btn soft" id="prev" ${cursor===0?'disabled':''}>← Previous</button><button class="btn rose" id="bookmark">${state.bookmarks[idOf(b,q.n)]?'★ Bookmarked':'☆ Bookmark'}</button><button class="btn" id="next" ${cursor===activeList.length-1?'disabled':''}>Next →</button></div></div>${(state.banks[b]||{})[q.n]?learningNotes(q):`<aside class="learning-card learning-placeholder" aria-label="Learning notes preview"><div class="learning-placeholder-emoji" aria-hidden="true">🌷</div><h2>Learning notes will bloom here</h2><p>Choose your answer and explore the <b>clinical reasoning</b>, why the alternatives lose, and the principles worth remembering.</p></aside>`}</div>`:`<div class="empty">No questions here 🌷 Try another filter.</div>`}`;
 $('filter').value=filter;$('domain').value=domain;$('filter').onchange=e=>{filter=e.target.value;cursor=0;renderBank()};$('domain').onchange=e=>{domain=e.target.value;cursor=0;renderBank()};
 $('restartBank').onclick=()=>{
   if(!confirm('Restart Bank '+b+'? This will erase all '+tot.attempted+' saved first attempts and reset this bank score to 0. Other banks, bookmarks and your Wrong Answers Garden will remain unchanged. Export a progress backup first if you want to keep this attempt.'))return;
   delete state.banks[b];filter='all';domain='all';cursor=0;save();renderBank();
   window.scrollTo({top:0,behavior:'smooth'});
 };
 if(!q)return;$('choices').onclick=e=>{const choice=e.target.closest('[data-choice]');if(choice)updateProgress(b,q.n,choice.dataset.choice)};$('prev').onclick=()=>{cursor--;renderBank();window.scrollTo({top:120,behavior:'smooth'})};$('next').onclick=()=>{cursor++;renderBank();window.scrollTo({top:120,behavior:'smooth'})};$('bookmark').onclick=()=>{let k=idOf(b,q.n);state.bookmarks[k]=!state.bookmarks[k];save();renderBank()};}
async function ensureAllBanks(){await Promise.all(manifest.banks.map(x=>getBank(x.id)));}
function reviewChoice(card,r,q){const answer=r.currentAnswer;return `<div class="choices">${q.options.map((o,i)=>{const letter=ABC[i];let cls='choice';if(answer){if(letter===q.key)cls+=' true';if(letter===answer)cls+=answer===q.key?' selected correct':' selected incorrect';}return `<button class="${cls}" data-review-choice="${letter}" data-review-id="${idOf(r.bank,r.n)}" ${answer||r.mastered?'disabled':''}><span class="letter">${letter}</span><span>${safe(o)}</span></button>`;}).join('')}</div>${answer?`<div class="feedback ${answer===q.key?'yes':'no'}">${answer===q.key?'✓ Correct! Added to Mastered.':'✗ Still learning — retry after reviewing the explanation.'}</div>${learningNotes(q,`review-notes-${r.bank}-${r.n}`)}`:''}`;}
let transientReview={};
function reviewCards(rows){return rows.map(r=>{const q=bankData[r.bank]?.find(x=>x.n===r.n);if(!q)return '';const id=idOf(r.bank,r.n);return `<article class="reviewitem" id="review-${r.bank}-${r.n}"><div class="flex between"><span class="pill">Bank ${r.bank} · EMQ ${r.n}</span><strong class="${r.mastered?'status-mastered':'status-pending'}">${r.mastered?'✓ Mastered':'↻ Needs review'}</strong></div><div class="small">${safe(q.domain)} · ${r.tries||0} review attempt(s)</div><h3>${safe(q.stem)}</h3><p><b>${safe(q.ask||'Choose the single best answer.')}</b></p>${reviewChoice(null,{...r,currentAnswer:transientReview[id]},q)}${!r.mastered?`<div class="flex" style="margin-top:10px"><button class="btn soft" data-retry="${safe(id)}">↻ Clear review selection to try again</button></div>`:''}</article>`;}).join('');}
function renderReview(){route={review:true};if(!Object.keys(bankData).length){$('app').innerHTML='<p>Loading review data…</p>';return;}const records=recs().sort((a,b)=>(b.firstWrongAt||0)-(a.firstWrongAt||0));const all=records.filter(r=>(reviewFilter==='all'||(reviewFilter==='mastered'?r.mastered:(!r.mastered||!!transientReview[idOf(r.bank,r.n)])))&&(reviewBank==='all'||String(r.bank)===reviewBank));const shown=all.slice(reviewOffset,reviewOffset+8);const mastery=records.filter(r=>r.mastered).length;
 $('app').innerHTML=`<div class="topline"><a class="btn soft" href="./">← Back to gardens</a></div><div class="eyebrow">REVIEW · PRACTISE · MASTER</div><h1 class="page-title">🌿 Wrong Answers Garden</h1><p class="small">Mistakes from every bank gather here automatically. Retrying does not change your original bank score; a correct review moves a question into Mastered.</p><div class="stats"><div class="stat"><strong>${records.length}</strong><small>Ever missed</small></div><div class="stat"><strong>${records.length-mastery}</strong><small>Still practising</small></div><div class="stat"><strong>${mastery}</strong><small>Mastered</small></div><div class="stat"><strong>${records.reduce((s,r)=>s+(r.tries||0),0)}</strong><small>Review attempts</small></div></div><div class="toolbar"><div class="flex"><label class="small">Status <select id="reviewStatus"><option value="pending">Needs review</option><option value="mastered">Mastered</option><option value="all">All missed</option></select></label><label class="small">Bank <select id="reviewBank"><option value="all">All banks</option>${manifest.banks.map(b=>`<option value="${b.id}">Bank ${b.id}</option>`).join('')}</select></label></div><div class="small">${all.length} matched</div></div>${shown.length?reviewCards(shown):'<div class="empty">Nothing in this section yet 🌸 Keep growing!</div>'}<div class="navbox"><button class="btn soft" id="reviewPrev" ${reviewOffset===0?'disabled':''}>← Previous set</button><span class="small">${all.length?reviewOffset+1:0}–${Math.min(reviewOffset+8,all.length)} of ${all.length}</span><button class="btn" id="reviewNext" ${reviewOffset+8>=all.length?'disabled':''}>Next set →</button></div>`;
 $('reviewStatus').value=reviewFilter;$('reviewBank').value=reviewBank;$('reviewStatus').onchange=e=>{reviewFilter=e.target.value;reviewOffset=0;renderReview()};$('reviewBank').onchange=e=>{reviewBank=e.target.value;reviewOffset=0;renderReview()};$('reviewPrev').onclick=()=>{reviewOffset=Math.max(0,reviewOffset-8);renderReview()};$('reviewNext').onclick=()=>{reviewOffset+=8;renderReview()};
 $('app').querySelectorAll('[data-review-choice]').forEach(el=>el.onclick=()=>{const id=el.dataset.reviewId;const [b,n]=id.split(':').map(Number);const choice=el.dataset.reviewChoice;transientReview[id]=choice;retryAnswer(b,n,choice);});$('app').querySelectorAll('[data-retry]').forEach(el=>el.onclick=()=>{delete transientReview[el.dataset.retry];renderReview();});}
function exportProgress(){
 const ids=scopedBankIds('export');
 if(!ids.length){alert('Select at least one bank to export.');return;}
 const subset=empty();
 for(const b of ids){const key=String(b);if(Object.prototype.hasOwnProperty.call(state.banks,key))subset.banks[key]=state.banks[key];}
 const chosen=new Set(ids);
 for(const [id,item] of Object.entries(state.review||{}))if(chosen.has(Number(id.split(':')[0])))subset.review[id]=item;
 for(const [id,item] of Object.entries(state.bookmarks||{}))if(chosen.has(Number(id.split(':')[0])))subset.bookmarks[id]=item;
 const content=JSON.stringify({kind:'SPAW_ONLINE_PROGRESS_BACKUP',created:new Date().toISOString(),includedBanks:ids,state:subset},null,2);
 const blob=new Blob([content],{type:'application/json'}),uri=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=uri;
 const label=ids.length===manifest.banks.length?'All_Banks':ids.length<=3?'Banks_'+ids.join('-'):'Selected_'+ids.length+'_Banks';
 a.download='SPAW_Study_Garden_'+label+'_Progress_'+new Date().toISOString().slice(0,10)+'.json';
 a.click();setTimeout(()=>URL.revokeObjectURL(uri),3000);
}
function importPack(pack){if(pack?.kind==='SPAW_ONLINE_PROGRESS_BACKUP'&&pack.state?.version===1){const data=pack.state;if(!data.banks||!data.review||!data.bookmarks)throw Error('Invalid online backup.');return data;}
 if(pack?.kind==='SPAW_STUDY_GARDEN_BACKUP'&&pack.banks){const next=empty();for(const [bank,old] of Object.entries(pack.banks)){const answers=(Number(bank)<=2?old.answers:old.selected)||{};const dataset=bankData[bank]||[];for(const [n,ch] of Object.entries(answers)){const q=dataset.find(x=>String(x.n)===String(n));if(!q||!ABC.includes(ch))continue;(next.banks[bank] ||= {})[n]={choice:ch,correct:ch===q.key,at:Date.now()};}}
 for(const [id,r] of Object.entries(pack.mistakes?.records||{})){if(!/^\d+:\d+$/.test(id))continue;next.review[id]={bank:Number(r.bank),n:Number(r.n),firstChoice:r.firstChoice||r.sourceChoice,mastered:!!r.mastered,tries:r.reviewAttempts||0,firstWrongAt:r.firstWrongAt||Date.now()};}
 for(const [bank,answers] of Object.entries(next.banks))for(const [n,ans] of Object.entries(answers)){const id=idOf(bank,n);if(!ans.correct&&!next.review[id])next.review[id]={bank:Number(bank),n:Number(n),firstChoice:ans.choice,tries:0,mastered:false,firstWrongAt:Date.now()};}return next;}
 // Also accept the raw old Wrong Answers Garden store as a convenience
 if(pack?.version===1&&pack.records){const next=empty();for(const [id,r] of Object.entries(pack.records)){if(!/^\d+:\d+$/.test(id))continue;next.review[id]={bank:Number(r.bank),n:Number(r.n),firstChoice:r.firstChoice||r.sourceChoice,mastered:!!r.mastered,tries:r.reviewAttempts||0,firstWrongAt:r.firstWrongAt||Date.now()};}return next;}
 throw Error('Unrecognised backup format. Export from your old Study Garden first.');}
async function onImportFileChange(e){
 const file=e.target.files?.[0];if(!file)return;
 try{
  const pack=JSON.parse(await file.text());
  if(pack?.kind==='SPAW_STUDY_GARDEN_BACKUP')await ensureAllBanks();
  const imported=importPack(pack);
  const banks=listAvailableBackupBanks(pack,imported);
  if(!banks.length)throw Error('No compatible bank progress was found in this file.');
  pendingImport={data:imported,banks,name:file.name};
  const drawer=$('backupPanel');
  if(drawer)drawer.open=true;
  showImportPicker();
 }catch(err){pendingImport=null;alert('Could not read this progress backup: '+err.message);}
 finally{e.target.value='';}
}
$('importFile').addEventListener('change',onImportFileChange);
function applyTheme(mode){
 const theme=['light','dark','contrast'].includes(mode)?mode:'light';
 document.body.classList.toggle('dark',theme==='dark');
 document.body.classList.toggle('contrast',theme==='contrast');
 if($('themeSelect'))$('themeSelect').value=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#181923':'#fdf6fc');
 try{localStorage.setItem('spaw.theme',theme)}catch(e){}
}
let initialTheme='light';
try{initialTheme=localStorage.getItem('spaw.theme')||(localStorage.getItem('spaw-highcontrast')==='1'?'contrast':'light')}catch(e){}
applyTheme(initialTheme);
$('themeSelect').onchange=e=>applyTheme(e.target.value);
async function boot(){try{const resp=await fetch('manifest.json',{cache:'no-cache'});if(!resp.ok)throw Error('Cannot load question manifest.');manifest=await resp.json();const params=new URLSearchParams(location.search);if(params.has('review')){route={review:true};await ensureAllBanks();renderReview();}else if(params.has('bank')){const b=Number(params.get('bank'));if(!manifest.banks.some(x=>x.id===b))throw Error('That bank is not published yet.');route={bank:b};await getBank(b);
 // Resume from the earliest unanswered EMQ when reopening a bank.
 // Keep the complete bank visible so Previous/Next and old answers remain reviewable.
 filter='all';domain='all';
 const firstUnanswered=bankData[b].findIndex(q=>!(state.banks[b]||{})[q.n]);
 cursor=firstUnanswered>=0?firstUnanswered:0;
 renderBank();}else renderHome();updateBadge();}catch(e){$('app').innerHTML='<div class="load-error"><h2>Could not load the Study Garden 😢</h2><p>'+safe(e.message)+'</p><p>If you are opening the site from a downloaded ZIP, this online-ready version needs a web server. Publish it using GitHub Pages or run a local preview server.</p></div>';}}
boot();
