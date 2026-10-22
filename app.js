'use strict';
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='spaw.study.garden.online.v1';const ABC='ABCDE';
const empty=()=>({format:'SPAW_ONLINE_PROGRESS_V1',version:1,banks:{},review:{},bookmarks:{},updated:Date.now()});
const load=()=>{try{const d=JSON.parse(localStorage.getItem(STORE)||'null');return d&&d.version===1?d:empty();}catch(e){return empty();}};
let state=load(),manifest=null,bankData={},route={},activeList=[],cursor=0,filter='all',domain='all',reviewFilter='pending',reviewBank='all',reviewOffset=0;
let channel;try{channel=new BroadcastChannel('spaw-garden-online');channel.onmessage=()=>syncUI();}catch(e){}
function save(){state.updated=Date.now();try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){showNotice('Browser storage is disabled or full. Export your progress backup to avoid losing answers.');}try{channel?.postMessage({updated:state.updated});}catch(e){}updateBadge();}
function syncUI(){state=load();updateBadge();if(route.review)renderReview();else if(route.bank)renderBank();else if(route.results)renderBankResults(route.results);else if(route.practice)renderPractice();else if(route.practiceResults)renderPracticeResults();else renderHome();}
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
 const message=b[n].correct?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+visibleLetter(q,q.key)+'.';
 nav?.insertAdjacentHTML('beforebegin','<div class="feedback '+(b[n].correct?'yes':'no')+'">'+message+' Your first response is locked.</div>');
 notes.outerHTML=learningNotes(q,'learningNotes',choice);
 questionCard.parentElement?.insertAdjacentHTML('beforeend',managementMarkup(q));
 const layout=questionCard.closest('.learning-layout');
 layout?.classList.add('has-notes');
 const status=answeredStatus(bank),total=bankData[bank].length;
 if($('bankSummary'))$('bankSummary').textContent=status.attempted+'/'+total+' answered · '+status.correct+' correct · '+(status.attempted-status.correct)+' incorrect';
 if($('bankProgressBar'))$('bankProgressBar').style.width=Math.round(status.attempted*100/total)+'%';
 if($('bankPercent'))$('bankPercent').textContent=Math.round(status.attempted*100/total)+'%';
 if($('restartBank'))$('restartBank').disabled=false;
 if(status.attempted===total&&!$('bankFinishActions')){
  // Add the actions below the question: no reflow above the reader's position.
  nav?.insertAdjacentHTML('afterend',bankFinishActions(bank));
  const header=document.querySelector('.bank-title-area');
  if(header&&!document.querySelector('.bank-results-inline'))header.insertAdjacentHTML('afterend','<div class="bank-results-inline">🌷 Bank complete <a href="?results='+bank+'">View result analysis →</a></div>');
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
 if(ids.length===manifest.banks.length&&incoming.practice?.version===1)next.practice=incoming.practice;
 state=next;pendingImport=null;transientReview={};save();renderHome();
 alert('Progress restored for '+names+' 🌷\\nAll other banks are unchanged.');
}
function showNotice(msg){console.warn(msg);const app=$('app');let n=$('storageNotice');if(!n){n=document.createElement('div');n.id='storageNotice';n.className='notice';app.prepend(n);}n.textContent=msg;}
function practicePicker(){
 const s=state.practice;
 const existing=s&&Array.isArray(s.order)&&s.order.length;
 const count=existing?Object.keys(s.answers||{}).length:0;
 return `<section class="practice-builder" aria-label="Custom mixed-specialty practice">
  <div class="practice-title-row"><div><div class="eyebrow">A GARDEN MADE FOR YOU ✿</div><h2>🦋 Create your own practice mix</h2><p>Choose your specialties, then practise randomly selected clinical scenarios from every question bank.</p></div><span class="practice-sparkle" aria-hidden="true">🌷✨</span></div>
  ${existing?`<div class="practice-resume"><div><b>🌱 Your current practice</b><p>${count}/${s.order.length} answered · ${safe((s.selected||[]).map(studyGroupName).join(', '))}</p></div><div class="practice-resume-actions"><a class="btn soft" href="?practice=1">${count===s.order.length?'Revisit questions':'Continue session'} ↗</a>${count===s.order.length?'<a class="btn" href="?practiceResults=1">📊 View results</a>':''}</div></div>`:''}
  <div id="practiceBuilderBody" class="practice-builder-body"><p class="small">Gathering the specialties in your question garden… 🌼</p></div>
  <p class="practice-fine">Fresh practice attempts won't change your original bank scores. Incorrect answers still join your Wrong Answers Garden.</p>
 </section>`;
}

function practicePool(selected){
 const allow=new Set(selected),list=[];
 for(const bm of manifest.banks){
  for(const q of bankData[bm.id]||[]){
   if(practiceGroups(q.domain).some(x=>allow.has(x)))list.push(`${bm.id}:${q.n}`);
  }
 }
 return list;
}

async function hydratePracticePicker(){
 const root=$('practiceBuilderBody');if(!root)return;
 try{
  await ensureAllBanks();
  if($('practiceBuilderBody')!==root)return;
  const counts=Object.fromEntries(PRACTICE_TOPICS.map(g=>[g.id,practicePool([g.id]).length]));
  const boxes=PRACTICE_TOPICS.map(g=>`<label class="practice-topic"><input type="checkbox" value="${g.id}" data-practice-topic><span class="practice-topic-icon">${g.icon}</span><span class="practice-topic-copy"><strong>${safe(g.name)}</strong><small>${safe(g.help)}</small></span><span class="practice-topic-count">${counts[g.id]} Qs</span></label>`).join('');
  root.innerHTML=`<div class="practice-topic-top"><h3>Pick your specialties</h3><div><button type="button" id="practiceSelectAll" class="practice-link">Select all</button><button type="button" id="practiceClear" class="practice-link">Clear</button></div></div>
   <div class="practice-topic-grid">${boxes}</div>
   <div class="practice-setup-row"><label class="practice-length-label">Questions in this session <select id="practiceLength"><option value="20">20 questions</option><option value="40" selected>40 questions</option><option value="80">80 questions</option><option value="all">All matching questions</option></select></label><span class="practice-count" id="practiceAvailable">Select at least one specialty</span><button class="btn" type="button" id="practiceBegin" disabled>🎲 Shuffle & practise</button></div>`;
  const items=[...root.querySelectorAll('[data-practice-topic]')];
  const current=()=>items.filter(el=>el.checked).map(el=>el.value);
  const redraw=()=>{
   const pool=practicePool(current());
   $('practiceAvailable').textContent=pool.length?`${pool.length} matching questions available`:'Select at least one specialty';
   $('practiceBegin').disabled=!pool.length;
   items.forEach(el=>el.closest('.practice-topic')?.classList.toggle('selected',el.checked));
  };
  items.forEach(el=>el.onchange=redraw);
  $('practiceSelectAll').onclick=()=>{items.forEach(el=>el.checked=true);redraw()};
  $('practiceClear').onclick=()=>{items.forEach(el=>el.checked=false);redraw()};
  $('practiceBegin').onclick=()=>{
   const selection=current(),pool=practicePool(selection);
   if(!pool.length){alert('Please choose a specialty first. 🌷');return;}
   const old=state.practice;
   if(old?.order?.length&&Object.keys(old.answers||{}).length&&!confirm('Start a new specialty mix? This will replace the previous practice session and its results. Your original bank scores will remain safe. You can export an All Banks backup first if you want to preserve the previous session.'))return;
   for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
   const size=$('practiceLength').value;
   const order=size==='all'?pool:pool.slice(0,Math.min(Number(size),pool.length));
   state.practice={version:1,created:new Date().toISOString(),selected:selection,order,answers:{},cursor:0};
   save();
   location.href='?practice=1';
  };
  redraw();
 }catch(e){
  if($('practiceBuilderBody')===root)root.innerHTML=`<p class="small">Couldn't load the specialties right now. Please refresh the page to try again. ${safe(e.message)}</p>`;
 }
}

function practiceEntry(id){
 const [bank,n]=String(id).split(':').map(Number);
 const q=bankData[bank]?.find(item=>item.n===n);
 return q?{id,bank,n,q}:null;
}

function practiceStats(){
 const session=state.practice;
 if(!session?.order?.length)return {attempted:0,correct:0,total:0};
 const records=Object.values(session.answers||{});
 return {attempted:records.length,correct:records.filter(x=>x.correct).length,total:session.order.length};
}

function practiceFinishActions(){
 return `<section class="bank-finish-actions" id="practiceFinishActions">
  <div class="bank-finish-copy"><span class="bank-finish-flower">🦋</span><div><strong>You've finished your specialty mix!</strong><p>Take a moment to celebrate what you learned.</p></div></div>
  <div class="bank-finish-buttons"><a href="./" class="btn soft">⌂ Return Home</a><a href="?practiceResults=1" class="btn">📊 View Result Analysis →</a></div>
 </section>`;
}

function answerPractice(bank,n,choice){
 const session=state.practice,id=idOf(bank,n),q=bankData[bank]?.find(x=>x.n===n);
 if(!session||!q||session.answers[id])return;
 session.answers[id]={choice,correct:choice===q.key,at:Date.now()};
 if(choice!==q.key){
  const r=state.review[id]||{bank:Number(bank),n,firstChoice:choice,tries:0,lastChoice:null,mastered:false,firstWrongAt:Date.now()};
  r.mastered=false;state.review[id]=r;
 }
 save();
 const buttons=$('choices'),card=buttons?.closest('.quiz-question'),placeholder=document.querySelector('.learning-placeholder');
 if(!card||!placeholder){renderPractice();return;}
 buttons.innerHTML=optionHtml(q,choice);
 const nav=card.querySelector('.navbox');
 const ok=choice===q.key;
 nav?.insertAdjacentHTML('beforebegin',`<div class="feedback ${ok?'yes':'no'}">${ok?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+visibleLetter(q,q.key)+'.'} Your practice response is saved.</div>`);
 placeholder.outerHTML=learningNotes(q,'learningNotes',choice);
 card.parentElement?.insertAdjacentHTML('beforeend',managementMarkup(q));
 card.closest('.learning-layout')?.classList.add('has-notes');
 const stats=practiceStats();
 if($('practiceSummary'))$('practiceSummary').textContent=`${stats.attempted}/${stats.total} answered · ${stats.correct} correct · ${stats.attempted-stats.correct} incorrect`;
 if($('practiceProgressBar'))$('practiceProgressBar').style.width=(stats.attempted/stats.total*100)+'%';
 if($('practicePercent'))$('practicePercent').textContent=Math.round(stats.attempted/stats.total*100)+'%';
 if(stats.attempted===stats.total&&!$('practiceFinishActions'))nav?.insertAdjacentHTML('afterend',practiceFinishActions());
}

function renderPractice(){
 route={practice:true};
 const sess=state.practice;
 if(!sess?.order?.length){$('app').innerHTML='<div class="empty"><h2>No practice session yet 🌷</h2><p>Choose your specialties on the homepage to begin.</p><a class="btn" href="./">Create a practice mix</a></div>';return;}
 const idx=Math.max(0,Math.min(sess.cursor||0,sess.order.length-1));
 const e=practiceEntry(sess.order[idx]);
 if(!e){$('app').innerHTML='<div class="empty">This session refers to questions that could not be loaded. <a href="./">Return home</a></div>';return;}
 sess.cursor=idx;const {q,bank,n,id}=e,stats=practiceStats(),answered=sess.answers[id],finished=stats.attempted===stats.total;
 const pct=Math.round(stats.attempted/stats.total*100);
 const summary=`${stats.attempted}/${stats.total} answered · ${stats.correct} correct · ${stats.attempted-stats.correct} incorrect`;
 $('app').innerHTML=`<section class="bank-intro practice-intro">
   <div class="bank-intro-nav"><a class="bank-back-link" href="./">← All banks</a><span class="small">🦋 Randomised specialty practice</span></div>
   <div class="bank-title-area"><div class="eyebrow">YOUR PERSONALISED PRACTICE ✿</div><h1 class="page-title">🌸 Specialty Mix</h1>
     <p class="small bank-description">${safe((sess.selected||[]).map(studyGroupName).join(' · '))} · ${stats.total} questions shuffled from across your banks</p></div>
   <div class="bank-progress-details"><span class="small" id="practiceSummary">${summary}</span><span class="small"><span id="practicePercent">${pct}%</span> complete</span></div>
   <div class="progress bank-progress"><span id="practiceProgressBar" style="width:${pct}%"></span></div>
   </section>
   ${finished?'<div class="bank-results-inline">🦋 Practice completed <a href="?practiceResults=1">View result analysis →</a></div>':''}
   <div class="practice-position"><span>Question ${idx+1} of ${stats.total}</span><span>From Bank ${bank} · ${safe(q.domain)}</span></div>
   <div class="learning-layout ${answered?'has-notes':''}">
    <div class="question-stack">
    <div class="quizbox quiz-question">
      <div class="meta"><b>Domain:</b> ${safe(q.domain)} &nbsp; · &nbsp; <b>Skillset:</b> ${safe(q.skill||'Clinical reasoning')} &nbsp; · &nbsp; <b>Source:</b> Bank ${bank}</div>
      <div class="question-label">EMQ ${n}</div><div class="stem">${safe(q.stem)}</div>
      <p class="ask">${safe(q.ask||'Which of the following is the single BEST answer?')}</p>
      <div class="choices" id="choices">${optionHtml(q,answered?.choice)}</div>
      ${answered?`<div class="feedback ${answered.correct?'yes':'no'}">${answered.correct?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+visibleLetter(q,q.key)+'.'} Your practice response is saved.</div>`:''}
      <div class="navbox"><button class="btn soft" id="prev" ${idx===0?'disabled':''}>← Previous</button>
       <button class="btn rose" id="bookmark">${state.bookmarks[id]?'★ Bookmarked':'☆ Bookmark'}</button>
       <button class="btn" id="next" ${idx===stats.total-1&&finished?'disabled':''}>${idx===stats.total-1&&!finished?'Find unanswered →':'Next →'}</button></div>
      ${finished&&idx===stats.total-1?practiceFinishActions():''}
    </div>
    ${answered?managementMarkup(q):''}
    </div>
    ${answered?learningNotes(q,'learningNotes',answered.choice):`<aside class="learning-card learning-placeholder" aria-label="Learning notes preview"><div class="learning-placeholder-emoji">🌷</div><h2>Your learning notes</h2><p>The explanations and clinical pearls will appear after you answer.</p></aside>`}
   </div>`;
 $('choices').onclick=ev=>{const btn=ev.target.closest('[data-choice]');if(btn)answerPractice(bank,n,btn.dataset.choice)};
 const move=(delta)=>{sess.cursor=Math.max(0,Math.min(idx+delta,stats.total-1));save();renderPractice();window.scrollTo({top:130,behavior:'instant'});};
 $('prev').onclick=()=>move(-1);$('next').onclick=()=>{if(idx===stats.total-1&&!finished){sess.cursor=sess.order.findIndex(id=>!sess.answers[id]);save();renderPractice();window.scrollTo({top:130,behavior:'instant'});}else move(1);};
 $('bookmark').onclick=()=>{state.bookmarks[id]=!state.bookmarks[id];save();renderPractice();};
}

function renderPracticeResults(){
 route={practiceResults:true};
 const sess=state.practice;
 if(!sess?.order?.length){renderPractice();return;}
 const entries=sess.order.map(id=>practiceEntry(id)).filter(Boolean).map(item=>({q:item.q,bank:item.bank,answer:sess.answers?.[item.id]}));
 $('app').innerHTML=buildResultMarkup({title:'Specialty Mix · Results',subtitle:`${entries.length} randomised questions · ${safe((sess.selected||[]).map(studyGroupName).join(', '))}`,entries,backHref:'?practice=1',backText:'Back to practice',reviewHref:'?review=1',mode:'practice'});
}

function searchPanel(bank=null){
 const bankMode=Number.isInteger(bank);
 return `<section class="garden-search" aria-label="Search answered questions">
 <div class="garden-search-heading"><span aria-hidden="true">🔎</span><div><strong>Find something you've learned</strong><p>Search questions, answers, explanations and clinical pearls you've already attempted.</p></div></div>
 <div class="garden-search-controls"><label class="sr-only" for="studySearchInput">Search answered questions and explanations</label>
  <input id="studySearchInput" type="search" autocomplete="off" maxlength="120" placeholder="e.g. hyperkalaemia, pre-eclampsia, shock…">
  ${bankMode?`<label class="sr-only" for="studySearchScope">Search scope</label><select id="studySearchScope"><option value="bank" selected>Within this bank</option><option value="all">All banks</option></select>`:''}
  <button type="button" class="garden-search-clear" id="studySearchClear">Clear</button>
 </div><div class="garden-search-results" id="studySearchResults" aria-live="polite" hidden></div>
 </section>`;
}

function searchPreview(value,word){
 const raw=String(value??''),low=raw.toLocaleLowerCase(),idx=low.indexOf(word);
 if(idx<0)return safe(raw.slice(0,156))+(raw.length>156?'…':'');
 const start=Math.max(0,idx-59),end=Math.min(raw.length,idx+word.length+100);
 return (start?'…':'')+safe(raw.slice(start,idx))+'<mark>'+safe(raw.slice(idx,idx+word.length))+'</mark>'+safe(raw.slice(idx+word.length,end))+(end<raw.length?'…':'');
}

function searchAttempted(term,scopeBank=null){
 const query=String(term||'').trim().toLocaleLowerCase();
 if(!query)return[];
 const attempted=new Set();
 for(const [bank,answers] of Object.entries(state.banks||{})){
  for(const [n,answer] of Object.entries(answers||{}))if(answer)attempted.add(idOf(bank,n));
 }
 for(const [id,answer] of Object.entries(state.practice?.answers||{}))if(answer)attempted.add(id);
 const results=[];
 for(const bm of manifest.banks){
  if(scopeBank!==null&&bm.id!==scopeBank)continue;
  for(const q of bankData[bm.id]||[]){
   const id=idOf(bm.id,q.n);if(!attempted.has(id))continue;
   const fields=[
    {label:'Clinical scenario',value:q.stem},
    {label:'Question',value:q.ask},
    {label:'Specialty',value:q.domain},
    ...q.options.map((v,i)=>({label:'Answer option '+ABC[i],value:v})),
    ...(q.explanations||[]).map((v,i)=>({label:'Explanation '+ABC[i],value:v})),
    {label:'Exam pearl',value:q.pearl},{label:'Scenario change',value:q.pivot}
   ];
   const hits=fields.filter(x=>String(x.value||'').toLocaleLowerCase().includes(query));
   if(!hits.length)continue;
   const best=hits.find(x=>x.label==='Clinical scenario')||hits.find(x=>x.label==='Question')||hits[0];
   results.push({bank:bm.id,n:q.n,title:q.stem,where:best.label,excerpt:best.value,matchCount:hits.length});
  }
 }
 return results;
}

function renderSearchMatches(root,items,query,limit=20){
 if(!root)return;
 root.hidden=false;
 if(!items.length){root.innerHTML='<p class="garden-search-empty">No matches in your attempted questions yet. 🌱 Try another keyword.</p>';return;}
 const shown=items.slice(0,limit);
 root.innerHTML=`<p class="garden-search-count">${items.length} matching question${items.length===1?'':'s'} from your attempted work</p><div class="garden-search-matches">${shown.map(item=>`<a class="garden-search-match" href="?bank=${item.bank}&question=${item.n}">
 <span class="garden-search-match-top"><b>Bank ${item.bank} · Q${item.n}</b><span>${safe(item.where)}</span></span>
 <span class="garden-search-match-stem">${safe(String(item.title||'Clinical scenario').slice(0,140))}${String(item.title||'').length>140?'…':''}</span>
 <span class="garden-search-excerpt">${searchPreview(item.excerpt,query)}</span></a>`).join('')}</div>${items.length>limit?`<button type="button" class="garden-show-more" id="searchShowMore">Show ${Math.min(20,items.length-limit)} more results ↓</button>`:''}`;
 if(items.length>limit)$('searchShowMore').onclick=()=>renderSearchMatches(root,items,query,limit+20);
}

function wireStudySearch(bank=null){
 const input=$('studySearchInput'),results=$('studySearchResults');
 if(!input||!results)return;
 let requestId=0;
 const run=async()=>{
  const request=++requestId,word=input.value.trim().toLocaleLowerCase();
  if(!word){results.hidden=true;results.innerHTML='';return;}
  if(word.length<2){results.hidden=false;results.innerHTML='<p class="garden-search-empty">Type at least two characters to search. 🌷</p>';return;}
  results.hidden=false;results.innerHTML='<p class="garden-search-empty">Searching your attempted questions…</p>';
  try{
   const scope=bank!==null&&$('studySearchScope')?.value==='bank'?bank:null;
   if(scope===null)await ensureAllBanks();
   if(request!==requestId||$('studySearchInput')!==input)return;
   renderSearchMatches(results,searchAttempted(word,scope),word);
  }catch(e){
   if(request===requestId)results.innerHTML='<p class="garden-search-empty">Search is unavailable right now. Please try again.</p>';
  }
 };
 input.oninput=run;
 const selector=$('studySearchScope');if(selector)selector.onchange=run;
 $('studySearchClear').onclick=()=>{input.value='';run();input.focus();};
}

function bookmarksPanel(){
 const count=Object.values(state.bookmarks||{}).filter(Boolean).length;
 return `<section class="bookmark-garden" aria-label="Your bookmarked questions"><div class="bookmark-heading"><div><div class="eyebrow">SAVED FOR LATER ✿</div><h2>⭐ Your bookmarked questions</h2><p>Keep tricky or important clinical scenarios close at hand.</p></div><span class="bookmark-total">${count} saved</span></div>
 <div id="bookmarkGardenList"><p class="small">Gathering your saved flowers… 🌷</p></div></section>`;
}

async function hydrateBookmarks(){
 const root=$('bookmarkGardenList');if(!root)return;
 try{
  await ensureAllBanks();
  if(root!==$('bookmarkGardenList'))return;
  const entries=Object.entries(state.bookmarks||{}).filter(([,v])=>!!v).map(([id])=>{
   const [bank,n]=id.split(':').map(Number);
   if(!Number.isInteger(bank)||!Number.isInteger(n))return null;
   const q=bankData[bank]?.find(q=>q.n===n);
   return q?{bank,n,q,attempted:!!(state.banks[bank]||{})[n]||!!state.practice?.answers?.[id]}:null;
  }).filter(Boolean).sort((a,b)=>a.bank-b.bank||a.n-b.n);
  if(!entries.length){root.innerHTML='<div class="bookmark-empty">🌼 No bookmarks yet. Tap <b>☆ Bookmark</b> beside any question to collect it here.</div>';return;}
  const show=(all=false)=>{
   const limit=all?entries.length:Math.min(8,entries.length);
   root.innerHTML=`<div class="bookmark-rows">${entries.slice(0,limit).map(e=>`<a class="bookmark-row" href="?bank=${e.bank}&question=${e.n}">
    <span class="bookmark-row-label">⭐ Bank ${e.bank} · Q${e.n}</span><span class="bookmark-row-text">${safe(String(e.q.stem).slice(0,124))}${e.q.stem.length>124?'…':''}</span>
    <span class="bookmark-row-right">${e.attempted?'Answered':'Not answered'} <span aria-hidden="true">↗</span></span>
   </a>`).join('')}</div>${entries.length>8?`<button type="button" class="bookmark-more" id="bookmarkExpand">${all?'Show fewer':'Show all '+entries.length+' bookmarks'} ↓</button>`:''}`;
   if(entries.length>8)$('bookmarkExpand').onclick=()=>show(!all);
  };
  show();
 }catch(e){if(root===$('bookmarkGardenList'))root.innerHTML='<p class="small">Could not load bookmarks right now. Please refresh to try again.</p>';}
}

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
 $('app').innerHTML=`<section class="hero"><div class="eyebrow">YOUR LITTLE MED SCHOOL SANCTUARY ✿</div><h1>Grow your clinical confidence, one question at a time. 🌷</h1><p>${manifest.banks.length} banks of original Monash-inspired clinical scenarios, instant feedback, and explanations that teach you how to distinguish the tempting alternatives.</p><div class="flex"><a class="btn" href="?review=1">🌿 Open Wrong Answers Garden (${pending()})</a>${nextBankButton}</div></section>${searchPanel()}${overview()}${section('Choose your question garden','<span class="small">Each opens in a new browser tab ↗</span>')}<div class="tiles">${manifest.banks.map(tile).join('')}</div>${practicePicker()}${bookmarksPanel()}${backupPanel()}<div class="notice">These are <b>unofficial, original educational questions</b>, not faculty questions. Clinical management should always follow local protocols and senior supervision.</div>`;wireBackupPanel();updateBadge();wireStudySearch();hydrateBookmarks();hydratePracticePicker();}
const bankLoading={};
async function getBank(b){
 if(bankData[b])return bankData[b];
 if(!bankLoading[b])bankLoading[b]=(async()=>{
  const resp=await fetch('bank'+b+'.json',{cache:'no-cache'});
  if(!resp.ok)throw new Error('Could not fetch Bank '+b);
  const data=await resp.json();
  if(!Array.isArray(data))throw new Error('Invalid question data in Bank '+b);
  // Keep published keys and stored answers unchanged; only presentation order changes.
  for(const q of data)q._bank=Number(b);
  bankData[b]=data;return data;
 })().catch(error=>{delete bankLoading[b];throw error;});
 return bankLoading[b];
}
function answeredStatus(b){const a=state.banks[b]||{};return {attempted:Object.keys(a).length,correct:Object.values(a).filter(x=>x.correct).length};}
function filteredQuestions(b){const all=bankData[b]||[];return all.filter(q=>{if(domain!=='all'&&q.domain!==domain)return false;const answer=(state.banks[b]||{})[q.n];const rid=idOf(b,q.n);if(filter==='unanswered')return !answer;if(filter==='wrong')return answer&&!answer.correct;if(filter==='bookmarks')return !!state.bookmarks[rid];return true;});}
// Stable per-question shuffle removes predictable answer letters without changing saved answers.
function displayOrder(q){
 const order=q.options.map((_,i)=>i);
 let seed=(0x811c9dc5 ^ Math.imul(Number(q._bank)||0,0x01000193) ^ Math.imul(Number(q.n)||0,0x9e3779b1))>>>0;
 for(let i=order.length-1;i>0;i--){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const j=(seed>>>0)%(i+1);
  [order[i],order[j]]=[order[j],order[i]];
 }
 return order;
}
function visibleLetter(q,canonical){const pos=displayOrder(q).indexOf(ABC.indexOf(canonical));return pos<0?'?':ABC[pos];}
function displayIndexLetter(q,index){return visibleLetter(q,ABC[index]);}
function optionHtml(q,selected,review=false){return displayOrder(q).map((i,pos)=>{const option=q.options[i],letter=ABC[i],label=ABC[pos],correct=letter===q.key,isSelected=letter===selected;let cls='choice';if(selected){if(correct)cls+=' true';if(isSelected)cls+=correct?' selected correct':' selected incorrect';}return `<button type="button" class="${cls}" data-choice="${letter}" ${selected?'disabled':''}><span class="letter">${label}</span><span>${safe(option)}</span></button>`;}).join('');}
function explHtml(q){return `<details class="answer"><summary>📖 Reveal teaching explanation and exam pearls</summary><div class="answer-body"><p><b>Correct answer: ${safe(visibleLetter(q,q.key))} — ${safe(q.options[ABC.indexOf(q.key)])}</b></p>${displayOrder(q).map((i,pos)=>`<div class="explainline ${ABC[i]===q.key?'is-correct':''}"><b>${ABC[pos]}. ${ABC[i]===q.key?'✓ Correct':'Why not'}:</b> ${safe(q.explanations?.[i]||'Review this option against the key features.')}</div>`).join('')}${q.pearl?`<div class="pearl">💡 <b>Exam pearl:</b> ${safe(q.pearl)}</div>`:''}${q.pivot?`<div class="pivot">🔄 <b>What would change the answer?</b> ${safe(q.pivot)}</div>`:''}</div></details>`;}
function managementMarkup(q){
 const m=q.management;
 if(!m?.steps?.length)return '';
 const generic=m.steps.length===3 && /^(best next decision|preferred clinical decision|best decision in this scenario|clinical reasoning|preferred clinical action)/i.test(String(m.steps[0][0]));
 const steps=generic?[m.steps[0],m.steps[2]]:m.steps;
 const safety=m.safety && String(m.safety).trim()!==String(q.pearl||'').trim() ? `<div class="management-safety"><b>⚠ Safety / escalation</b><p>${safe(m.safety)}</p></div>` : '';
 return `<section class="management-guide management-under-question" aria-label="Practical management"><div class="management-heading"><span aria-hidden="true">🩺</span><div><h3>Practical management</h3><p>What to do clinically</p></div></div><ol>${steps.map(step=>`<li><strong>${safe(step[0])}</strong><span>${safe(step[1])}</span></li>`).join('')}</ol>${safety}<p class="management-local">Study guide · Follow current local clinical protocols.</p></section>`;
}
function conciseOptionReason(q,index){
 const raw=String(q.explanations?.[index]||'Compare this option with the defining clinical findings.');
 if(index===ABC.indexOf(q.key))return raw;
 // Remove mechanically repeated answer summaries; preserve option-specific rationale.
 const repeated=[
  ' In this scenario, the preferred approach is ',
  ' In this clinical situation, the preferred decision is ',
  ' In this clinical situation, the preferred approach is ',
  ' The case favours '
 ];
 const first=repeated.map(phrase=>raw.indexOf(phrase)).filter(pos=>pos>=35).sort((a,b)=>a-b)[0];
 return first===undefined?raw:raw.slice(0,first).trim();
}
function learningNotes(q,anchorId='learningNotes',selected=null){
 const keyIndex=ABC.indexOf(q.key),selectedIndex=ABC.indexOf(selected);
 const options=q.options||[];
 const good=options[keyIndex]||'';
 const rationale=q.explanations?.[keyIndex]||'Review the decisive clinical clue that supports this answer.';
 const wrong=selectedIndex>=0&&selectedIndex!==keyIndex;
 const otherOptions=displayOrder(q).map(i=>{
  const option=options[i];
  if(i===keyIndex||(wrong&&i===selectedIndex))return '';
  return `<div class="learning-alternative learning-alternative-visible"><div class="learning-option-head"><span class="learning-letter">${displayIndexLetter(q,i)}</span><strong>${safe(option)}</strong></div><p>${safe(conciseOptionReason(q,i))}</p></div>`;
 }).join('');
 return `<aside class="learning-card" id="${safe(anchorId)}" aria-label="Clinical reasoning notes">
  <div class="learning-header"><span aria-hidden="true">🌷</span><div><div class="learning-eyebrow">YOUR LEARNING NOTES</div><h2>Understand the <em>why</em></h2></div></div>
  ${wrong?`<div class="learning-missed-choice">
   <div class="learning-missed-heading">↻ Let's unpack your answer</div>
   <h3>You chose ${safe(visibleLetter(q,selected))}. ${safe(options[selectedIndex])}</h3>
   <div class="learning-missed-details"><b>Why this wasn't the best choice</b><p>${safe(conciseOptionReason(q,selectedIndex))}</p></div>
   
   ${q.pearl?`<div class="learning-missed-takeaway"><b>💡 The distinction to remember</b><p>${safe(q.pearl)}</p></div>`:''}
   </div>`:''}
  <div class="learning-section learning-correct"><div class="learning-tag">✓ The best answer</div><h3>${safe(visibleLetter(q,q.key))}. ${safe(good)}</h3><p>${safe(rationale)}</p></div>
  ${otherOptions?`<div class="learning-section"><h3 class="learning-section-title">🔎 Why the other options are less suitable</h3><div class="learning-alternatives">${otherOptions}</div></div>`:''}
  ${q.pearl&&!wrong?`<div class="learning-section learning-pearl"><h3>💡 Remember this principle</h3><p>${safe(q.pearl)}</p></div>`:''}
  ${q.pivot?`<div class="learning-section learning-pivot"><h3>🔄 When would the answer change?</h3><p>${safe(q.pivot)}</p></div>`:''}
  <p class="learning-footer">${wrong?'Review the distinction, then try explaining it in your own words. ♡':'Understand the principle, then move on when you are ready. ♡'}</p>
 </aside>
`;
}
const PRACTICE_TOPICS=[{"id":"medicine","name":"Medicine","icon":"🫀","help":"Cardiac, respiratory, renal, endocrine & infection"},{"id":"surgery","name":"Surgery","icon":"🩺","help":"GI, general surgery & perioperative care"},{"id":"obgyn","name":"O&G","icon":"🌸","help":"Pregnancy, childbirth & gynaecology"},{"id":"paeds","name":"Paediatrics","icon":"🧸","help":"Children and newborns"},{"id":"psychiatry","name":"Psychiatry","icon":"🧠","help":"Mental health & addictions"},{"id":"gp","name":"GP & Ethics","icon":"🌿","help":"Primary care, prescribing, screening & ethics"},{"id":"emergency","name":"Emergency","icon":"🚑","help":"Urgent decisions & resuscitation"},{"id":"neurology","name":"Neurology","icon":"🧬","help":"Brain, spine, stroke & nervous system"},{"id":"msk","name":"Eyes, ENT & MSK","icon":"👁️","help":"Eye, ear, orthopaedics & anatomy"},{"id":"integrated","name":"Mixed clinical","icon":"✨","help":"Interdisciplinary reasoning"}];
function practiceGroups(domain){
 const d=String(domain||'').toLowerCase();
 const found=new Set();
 if(/medicine|cardio|respir|renal|endocrin|electrolyte|infect|haemat|oncolog|vascular/.test(d))found.add('medicine');
 if(/surg|gastro|perioperative/.test(d))found.add('surgery');
 if(/obstetric|gynae/.test(d))found.add('obgyn');
 if(/paediatr|neonat|developmental/.test(d))found.add('paeds');
 if(/psychiatr|substance|addiction/.test(d))found.add('psychiatry');
 if(/general practice|\bgp\b|ethic|palliative|primary care|public health|screening|prescribing|safety systems/.test(d))found.add('gp');
 if(/emergency|resuscitat|critical care|intern preparedness|patient safety/.test(d))found.add('emergency');
 if(/neurol|neurosurg|stroke/.test(d))found.add('neurology');
 if(/ophthalm|eye|orthop|msk|ent\b|anatomy/.test(d))found.add('msk');
 if(!found.size)found.add('integrated');
 return [...found];
}
function primaryStudyGroup(domain){
 const groups=practiceGroups(domain);
 const order=['obgyn','paeds','psychiatry','surgery','gp','emergency','neurology','msk','medicine','integrated'];
 return order.find(id=>groups.includes(id))||'integrated';
}
function studyGroupName(id){return PRACTICE_TOPICS.find(g=>g.id===id)?.name||id;}
function bankFinishActions(bank){
 return `<section class="bank-finish-actions" id="bankFinishActions" aria-label="Bank finished">
  <div class="bank-finish-copy"><span class="bank-finish-flower">🎉</span><div><strong>Last question answered — Bank ${bank} complete!</strong><p>Your score and specialty-by-specialty analysis are ready on the next page. 🌷</p></div></div>
  <div class="bank-finish-buttons"><a class="btn soft" href="./">⌂ Return Home</a><a class="btn bank-analysis-primary" href="?results=${bank}">📊 View Analysis →</a></div>
 </section>`;
}
function buildResultMarkup({title,subtitle,entries,backHref,backText,reviewHref,mode}){
 const n=entries.length,answered=entries.filter(e=>e.answer).length,correct=entries.filter(e=>e.answer?.correct).length;
 const missed=answered-correct,pct=answered?Math.round(correct*100/answered):0,complete=answered===n;
 const byGroup=new Map();
 for(const e of entries){
  const name=studyGroupName(primaryStudyGroup(e.q.domain));
  if(!byGroup.has(name))byGroup.set(name,{name,count:0,attempted:0,correct:0,wrong:0});
  const group=byGroup.get(name);group.count++;
  if(e.answer){group.attempted++;if(e.answer.correct)group.correct++;else group.wrong++;}
 }
 const groups=[...byGroup.values()].sort((a,b)=>b.attempted-a.attempted||a.name.localeCompare(b.name));
 const rated=groups.filter(g=>g.attempted>=2);
 const strongest=[...rated].sort((a,b)=>b.correct/b.attempted-a.correct/a.attempted||b.attempted-a.attempted)[0];
 const focus=[...rated].filter(g=>g.wrong>0).sort((a,b)=>a.correct/a.attempted-b.correct/b.attempted||b.wrong-a.wrong)[0];
 const wrongEntries=entries.filter(e=>e.answer&&!e.answer.correct);
 const groupRows=groups.map(g=>{
  const percent=g.attempted?Math.round(g.correct/g.attempted*100):0;
  return `<div class="analysis-domain">
    <div class="analysis-domain-main"><span>${safe(g.name)} <small>${g.attempted} attempted${g.count>g.attempted?` / ${g.count} available`:''}</small></span>
    <strong>${g.attempted?`${g.correct}/${g.attempted} · ${percent}%`:'Not attempted'}</strong></div>
    <div class="result-domain-track"><span style="width:${percent}%"></span></div>
  </div>`;
 }).join('');
 const wrongCards=wrongEntries.slice(0,6).map(e=>{
  const q=e.q,answer=e.answer,link=Number.isInteger(e.bank)?`?bank=${e.bank}&question=${q.n}`:backHref;
  const chosen=q.options?.[ABC.indexOf(answer.choice)]||'';
  return `<a class="analysis-review-item" href="${link}">
   <div class="analysis-review-top"><span>Bank ${safe(e.bank??'—')} · Q${safe(q.n)}</span><span>${safe(studyGroupName(primaryStudyGroup(q.domain)))}</span></div>
   <strong>${safe(String(q.stem||'').slice(0,150))}${String(q.stem||'').length>150?'…':''}</strong>
   <span class="analysis-review-choice">Your choice: ${safe(answer.choice||'?')}${chosen?' · '+safe(String(chosen).slice(0,65)):''}</span>
   <span class="analysis-review-open">Review explanation ↗</span>
  </a>`;
 }).join('');
 const advice=focus?`<p><b>First priority:</b> ${safe(focus.name)} — ${focus.correct}/${focus.attempted} correct from your attempted questions. Revisit the clinical clues that distinguish the best answer.</p>`
   :`<p>${missed?'Review your incorrect answers to strengthen the clinical reasoning.':'No incorrect answers recorded in this session. Keep challenging yourself with unfamiliar scenarios.'}</p>`;
 return `<div class="results-page">
   <nav class="results-breadcrumb" aria-label="Results navigation"><a href="${backHref}">← ${safe(backText)}</a><a href="./">⌂ Home</a></nav>
   <section class="results-hero" aria-label="Results summary">
    <div class="results-overline">YOUR STUDY GARDEN · ${complete?'SESSION COMPLETE':'PROGRESS SO FAR'} ✿</div>
    <h1>🌷 ${safe(title)}</h1><p>${safe(subtitle)}</p>
    <div class="results-hero-core"><div class="results-ring" style="--score-angle:${pct*3.6}deg"><div><strong>${pct}%</strong><small>First-attempt accuracy</small></div></div>
     <div class="results-overview"><strong>${correct} of ${answered} correct</strong><p>${complete?'A lovely milestone — keep understanding the why behind each answer.':'Results are calculated only from the questions you have answered.'}</p>
      <div class="results-pills"><span>✓ ${correct} correct</span><span>↻ ${missed} incorrect</span><span>${answered}/${n} attempted</span></div></div>
    </div>
   </section>
   <nav class="analysis-sections" aria-label="Analysis sections">
    <a href="#specialtyBreakdown">📊 By specialty</a><a href="#revisionPlan">🎯 Revision priorities</a><a href="#missedQuestions">🌿 Missed questions</a>
   </nav>
   <section id="specialtyBreakdown" class="results-breakdown"><div class="results-section-heading"><h2>📊 Performance by specialty</h2><p>Scores reflect attempted questions only; unattempted questions never count as incorrect.</p></div><div class="results-domains">${groupRows}</div></section>
   <section id="revisionPlan" class="results-insights"><div class="results-section-heading"><h2>🎯 Your next revision steps</h2><p>Use these to decide what to practise next, rather than just chasing a percentage.</p></div>
    <div class="analysis-insight-grid">
     <div class="analysis-insight"><span class="analysis-insight-icon">💪</span><h3>What is going well</h3><p>${strongest?`${safe(strongest.name)} — ${strongest.correct}/${strongest.attempted} correct (${Math.round(strongest.correct/strongest.attempted*100)}%).`:'Finish at least two questions in a specialty to identify a meaningful trend.'}</p></div>
     <div class="analysis-insight"><span class="analysis-insight-icon">🌱</span><h3>Where to focus</h3>${advice}</div>
    </div>
    <p class="analysis-sample-note">Small sample sizes can make specialty percentages swing considerably. Review why you missed individual scenarios as well as the score.</p>
   </section>
   <section id="missedQuestions" class="results-breakdown analysis-mistakes"><div class="results-section-heading"><h2>🌿 Questions worth revisiting</h2>
    <p>${wrongEntries.length?`${wrongEntries.length} incorrect first attempt${wrongEntries.length===1?'':'s'}. Tap any card to revisit its teaching notes.`:'No incorrect answers in this set so far.'}</p></div>
    ${wrongEntries.length?`<div class="analysis-review-list">${wrongCards}</div>${wrongEntries.length>6?`<p class="analysis-more-notice">Showing 6 of ${wrongEntries.length}. Open Wrong Answers Garden for your full review list.</p>`:''}`:'<div class="bookmark-empty">🌼 Keep practising — the trickiest cases often teach us the most.</div>'}
   </section>
   <div class="results-actions"><a class="btn" href="${backHref}">${mode==='practice'?'↻ Back to practice':'← Back to bank'}</a><a class="btn soft" href="${reviewHref}">🌿 Wrong Answers Garden</a><a class="btn soft" href="./">⌂ Return Home</a></div>
 </div>`;
}
function renderBankResults(bank){
 const bm=manifest.banks.find(x=>x.id===bank),qs=bankData[bank];
 if(!bm||!qs){$('app').innerHTML='<div class="empty">Bank not found.</div>';return;}
 route={results:bank};
 $('app').innerHTML=buildResultMarkup({title:`Bank ${bank} · ${bm.name}`,subtitle:`${qs.length} questions · First-attempt results and study priorities`,entries:qs.map(q=>({q,bank,answer:(state.banks[bank]||{})[q.n]})),backHref:url(bank),backText:`Back to Bank ${bank}`,reviewHref:`?review=1&bank=${bank}`,mode:'bank'});
}
function jumpToBankQuestion(bank,number){
 const set=bankData[bank]||[],n=Number(number),index=set.findIndex(q=>q.n===n);
 if(!Number.isInteger(n)||index<0)return false;
 // A direct jump always reveals the requested question, even if a filter hides it.
 filter='all';domain='all';cursor=index;
 renderBank();
 window.scrollTo({top:120,behavior:'instant'});
 return true;
}
function renderBank(){const b=route.bank;const bm=manifest.banks.find(x=>x.id===b);if(!bm)return;const qset=bankData[b];if(!qset){$('app').innerHTML='<div class="loading">Opening your questions… 🌷</div>';return;}activeList=filteredQuestions(b);cursor=Math.max(0,Math.min(cursor,activeList.length-1));const q=activeList[cursor],tot=answeredStatus(b);const pct=qset.length?Math.round(tot.attempted*100/qset.length):0;const cats=[...new Set(qset.map(q=>q.domain))].sort();const summary=`${tot.attempted}/${qset.length} answered · ${tot.correct} correct · ${tot.attempted-tot.correct} incorrect`;
 const finished=tot.attempted===qset.length;
 const canJumpToUnanswered=!finished&&cursor===activeList.length-1&&qset.some(x=>!(state.banks[b]||{})[x.n]);
 const specialtySummary=[...new Set(qset.map(x=>x.domain))].map(d=>{const subset=qset.filter(x=>x.domain===d);const count=subset.filter(x=>(state.banks[b]||{})[x.n]?.correct).length;return `<div class="flex between"><span>${safe(d)}</span><b>${count}/${subset.length} · ${Math.round(count/subset.length*100)}%</b></div>`;}).join('');
 const finalSummary=finished?`<div class="bank-results-inline">🌷 Bank complete <a href="?results=${b}">View result analysis →</a></div>`:'';
 $('app').innerHTML=`<section class="bank-intro" aria-label="Bank overview">
 <div class="bank-intro-nav">
  <a class="bank-back-link" href="./">← All banks</a>
  <div class="bank-intro-actions">
   <button type="button" class="bank-search-trigger" id="bankSearchToggle" aria-expanded="false" aria-controls="bankSearchDrawer" aria-label="Search attempted questions" title="Search attempted questions">🔎 <span class="sr-only">Search answered questions</span></button>
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
 </section>${finalSummary}<div id="bankSearchDrawer" class="bank-search-drawer" hidden>${searchPanel(b)}</div><div class="toolbar bank-toolbar"><div class="flex"><label class="small">Show <select id="filter"><option value="all">All questions</option><option value="unanswered">Unanswered</option><option value="wrong">Original mistakes</option><option value="bookmarks">Bookmarked</option></select></label><label class="small">Specialty <select id="domain"><option value="all">All specialties</option>${cats.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('')}</select></label></div><div class="bank-jumper"><label for="jumpNumber">Jump to Q</label><input id="jumpNumber" type="number" inputmode="numeric" min="1" max="${qset.length}" value="${q?.n||''}" aria-label="Question number in this bank"><span>/ ${qset.length}</span><button type="button" id="jumpGo" class="bank-jump-btn">Go →</button></div></div>${q?`<div class="learning-layout ${(state.banks[b]||{})[q.n]?'has-notes':''}"><div class="question-stack"><div class="quizbox quiz-question"><div class="meta"><b>Domain:</b> ${safe(q.domain)} &nbsp; · &nbsp; <b>Skillset:</b> ${safe(q.skill||'Clinical reasoning')} &nbsp; · &nbsp; <b>Context:</b> ${safe(q.context||'Clinical')}</div><div class="question-label">EMQ ${q.n}</div><div class="stem">${safe(q.stem)}</div><p class="ask">${safe(q.ask||'Which of the following is the single BEST answer?')}</p><div class="choices" id="choices">${optionHtml(q,(state.banks[b]||{})[q.n]?.choice)}</div>${(state.banks[b]||{})[q.n]?`<div class="feedback ${(state.banks[b][q.n].correct?'yes':'no')}">${state.banks[b][q.n].correct?'✓ Correct — nicely reasoned!':'✗ Not quite. Correct answer: '+visibleLetter(q,q.key)+'.'} Your first response is locked.</div>`:``}<div class="navbox"><button class="btn soft" id="prev" ${cursor===0?'disabled':''}>← Previous</button><button class="btn rose" id="bookmark">${state.bookmarks[idOf(b,q.n)]?'★ Bookmarked':'☆ Bookmark'}</button><button class="btn" id="next" ${cursor===activeList.length-1&&!canJumpToUnanswered?'disabled':''}>${canJumpToUnanswered?'Find unanswered →':'Next →'}</button></div>${finished&&cursor===activeList.length-1?bankFinishActions(b):''}</div>${(state.banks[b]||{})[q.n]?managementMarkup(q):''}</div>${(state.banks[b]||{})[q.n]?learningNotes(q,'learningNotes',(state.banks[b]||{})[q.n].choice):`<aside class="learning-card learning-placeholder" aria-label="Learning notes preview"><div class="learning-placeholder-emoji" aria-hidden="true">🌷</div><h2>Learning notes will bloom here</h2><p>Choose your answer and explore the <b>clinical reasoning</b>, why the alternatives lose, and the principles worth remembering.</p></aside>`}</div>`:`<div class="empty">No questions here 🌷 Try another filter.</div>`}`;
 $('filter').value=filter;$('domain').value=domain;$('filter').onchange=e=>{filter=e.target.value;cursor=0;renderBank()};$('domain').onchange=e=>{domain=e.target.value;cursor=0;renderBank()};
 wireStudySearch(b);
 const bankSearchButton=$('bankSearchToggle'),bankSearchDrawer=$('bankSearchDrawer');
 if(bankSearchButton&&bankSearchDrawer){
  bankSearchButton.onclick=()=>{
   const willOpen=bankSearchDrawer.hidden;
   bankSearchDrawer.hidden=!willOpen;
   bankSearchButton.setAttribute('aria-expanded',String(willOpen));
   bankSearchButton.classList.toggle('active',willOpen);
   if(willOpen)$('studySearchInput')?.focus();
  };
  bankSearchDrawer.onkeydown=e=>{if(e.key==='Escape'){bankSearchDrawer.hidden=true;bankSearchButton.setAttribute('aria-expanded','false');bankSearchButton.classList.remove('active');bankSearchButton.focus();}};
 }
 const jumpInput=$('jumpNumber'),jumpAction=()=>{if(!jumpToBankQuestion(b,jumpInput.value)){jumpInput.setCustomValidity('Choose an available question number.');jumpInput.reportValidity();jumpInput.setCustomValidity('');}};
 if($('jumpGo'))$('jumpGo').onclick=jumpAction;
 if(jumpInput){jumpInput.oninput=()=>jumpInput.setCustomValidity('');jumpInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpAction();}};}

 $('restartBank').onclick=()=>{
   if(!confirm('Restart Bank '+b+'? This will erase all '+tot.attempted+' saved first attempts and reset this bank score to 0. Other banks, bookmarks and your Wrong Answers Garden will remain unchanged. Export a progress backup first if you want to keep this attempt.'))return;
   delete state.banks[b];filter='all';domain='all';cursor=0;save();renderBank();
   window.scrollTo({top:0,behavior:'smooth'});
 };
 if(!q)return;$('choices').onclick=e=>{const choice=e.target.closest('[data-choice]');if(choice)updateProgress(b,q.n,choice.dataset.choice)};$('prev').onclick=()=>{cursor--;renderBank();window.scrollTo({top:120,behavior:'smooth'})};$('next').onclick=()=>{if(canJumpToUnanswered){filter='all';domain='all';cursor=qset.findIndex(x=>!(state.banks[b]||{})[x.n]);}else cursor++;renderBank();window.scrollTo({top:120,behavior:'smooth'})};$('bookmark').onclick=()=>{let k=idOf(b,q.n);state.bookmarks[k]=!state.bookmarks[k];save();renderBank()};}
async function ensureAllBanks(){await Promise.all(manifest.banks.map(x=>getBank(x.id)));}
function reviewChoice(card,r,q){const answer=r.currentAnswer;return `<div class="choices">${displayOrder(q).map((i,pos)=>{const o=q.options[i],letter=ABC[i];let cls='choice';if(answer){if(letter===q.key)cls+=' true';if(letter===answer)cls+=answer===q.key?' selected correct':' selected incorrect';}return `<button class="${cls}" data-review-choice="${letter}" data-review-id="${idOf(r.bank,r.n)}" ${answer||r.mastered?'disabled':''}><span class="letter">${ABC[pos]}</span><span>${safe(o)}</span></button>`;}).join('')}</div>${answer?`<div class="feedback ${answer===q.key?'yes':'no'}">${answer===q.key?'✓ Correct! Added to Mastered.':'✗ Still learning — retry after reviewing the explanation.'}</div>${learningNotes(q,`review-notes-${r.bank}-${r.n}`,answer)}${managementMarkup(q)}`:''}`;}
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
 if(ids.length===manifest.banks.length&&state.practice?.version===1)subset.practice=state.practice;
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
 const theme=['light','dark','contrast','berry-bloom','midnight-sage'].includes(mode)?mode:'light';
 document.body.classList.toggle('dark',['dark','berry-bloom','midnight-sage'].includes(theme));
 document.body.classList.toggle('contrast',theme==='contrast');
 document.body.classList.toggle('berry-bloom',theme==='berry-bloom');
 document.body.classList.toggle('midnight-sage',theme==='midnight-sage');
 document.body.classList.toggle('palette-theme',['berry-bloom','midnight-sage'].includes(theme));
 if($('themeSelect'))$('themeSelect').value=theme;
 const themeColour={'light':'#fdf6fc','dark':'#181923','contrast':'#ffffff','berry-bloom':'#3A0519','midnight-sage':'#040D12'}[theme];
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',themeColour);
 try{localStorage.setItem('spaw.theme',theme)}catch(e){}
}
let initialTheme='light';
try{initialTheme=localStorage.getItem('spaw.theme')||(localStorage.getItem('spaw-highcontrast')==='1'?'contrast':'light')}catch(e){}
applyTheme(initialTheme);
$('themeSelect').onchange=e=>applyTheme(e.target.value);
async function boot(){try{const resp=await fetch('manifest.json',{cache:'no-cache'});if(!resp.ok)throw Error('Cannot load question manifest.');manifest=await resp.json();const params=new URLSearchParams(location.search);if(params.has('practiceResults')){await ensureAllBanks();renderPracticeResults();}else if(params.has('practice')){await ensureAllBanks();renderPractice();}else if(params.has('review')){route={review:true};reviewBank=params.get('bank')||'all';await ensureAllBanks();renderReview();}else if(params.has('results')){const b=Number(params.get('results'));if(!manifest.banks.some(x=>x.id===b))throw Error('Unknown bank.');await getBank(b);renderBankResults(b);}else if(params.has('bank')){const b=Number(params.get('bank'));if(!manifest.banks.some(x=>x.id===b))throw Error('That bank is not published yet.');route={bank:b};await getBank(b);
 // Resume from the earliest unanswered EMQ when reopening a bank.
 // Keep the complete bank visible so Previous/Next and old answers remain reviewable.
 filter='all';domain='all';
 const explicitNumber=Number(params.get('question'));
 const requested=Number.isInteger(explicitNumber)&&explicitNumber>0?bankData[b].findIndex(q=>q.n===explicitNumber):-1;
 const firstUnanswered=bankData[b].findIndex(q=>!(state.banks[b]||{})[q.n]);
 cursor=requested>=0?requested:firstUnanswered>=0?firstUnanswered:0;
 renderBank();}else renderHome();updateBadge();}catch(e){$('app').innerHTML='<div class="load-error"><h2>Could not load the Study Garden 😢</h2><p>'+safe(e.message)+'</p><p>If you are opening the site from a downloaded ZIP, this online-ready version needs a web server. Publish it using GitHub Pages or run a local preview server.</p></div>';}}
boot();
