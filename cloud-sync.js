/* SPA-W Study Garden: optional Firebase Authentication + private real-time progress.
   No provider config => fully functional guest/local mode. */
const $ = id => document.getElementById(id);
const bridge = window.SPAWCloudBridge;
const config = window.SPAW_FIREBASE_CONFIG;
const configured = Boolean(config && config.apiKey && config.authDomain && config.projectId && config.appId);
const COLLECTIONS = ['banks','review','bookmarks'];
const clone = value => JSON.parse(JSON.stringify(value));
const blank = () => ({format:'SPAW_ONLINE_PROGRESS_V1',version:1,banks:{},review:{},bookmarks:{},updated:0});
const keyFor = uid => 'spaw.study.garden.cloud.queue.v1.'+uid;
let auth, firestore, fAuth, fStore, user=null, unsubscribe=null, queue=[], busy=false, connected=false, retryTimer=null, flushTimer=null;
const status = msg => {if($('cloudStatus'))$('cloudStatus').textContent=msg;};
const feedback = msg => {if($('accountFeedback'))$('accountFeedback').textContent=msg;};
const nChanges = s => Object.values(s?.banks||{}).reduce((n,v)=>n+Object.keys(v||{}).length,0)+Object.keys(s?.bookmarks||{}).length+Object.keys(s?.review||{}).length;
function activeControls(enabled){
 for(const id of ['googleSignIn','emailSignIn','emailRegister','resetPassword'])if($(id))$(id).disabled=!enabled;
}
function draw(){
 const uid=user?.uid;
 if($('accountSignedIn'))$('accountSignedIn').hidden=!uid;
 if($('accountSignedOut'))$('accountSignedOut').hidden=!!uid;
 if($('accountIdentity'))$('accountIdentity').textContent=user?.displayName||user?.email||'your account';
 if($('accountButtonText'))$('accountButtonText').textContent=uid?(queue.length?'Sync pending':'My account'):'Sign in / Sync';
 if($('accountImportGuest'))$('accountImportGuest').disabled=!uid||nChanges(bridge.getGuestState())===0;
 if(!configured)status('Cloud syncing is not connected yet. Your current progress is safe on this browser.');
 else if(!uid)status('Guest mode · Stored on this browser only. Sign in to sync.');
 else if(queue.length)status('☁️ '+queue.length+' change'+(queue.length===1?'':'s')+' waiting to sync. Your answers are saved on this device.');
 else if(!connected)status('☁️ Signed in. Connecting to your private cloud progress…');
 else status('✓ Cloud synced · Changes appear on your other signed-in devices.');
}
function showDialog(){
 const d=$('accountDialog');if(d&&!d.open)d.showModal();
 draw();
}
$('accountButton')?.addEventListener('click',showDialog);
$('accountClose')?.addEventListener('click',()=>$('accountDialog')?.close());
$('accountDialog')?.addEventListener('click',event=>{if(event.target===$('accountDialog'))$('accountDialog').close();});
function different(a,b){return JSON.stringify(a)!==JSON.stringify(b);}
// Firestore server timestamps change on every write. Ignore timestamp-only snapshots:
// redrawing a whole question while someone is reading makes the UI feel laggy.
function sameProgress(a,b){return ['banks','review','bookmarks','practice'].every(k=>!different(a?.[k],b?.[k]));}
function makePatch(before,after){
 const patch={banks:{},review:{},bookmarks:{}};
 for(const b of new Set([...Object.keys(before?.banks||{}),...Object.keys(after?.banks||{})])){
  const oldBank=before?.banks?.[b]||{},newBank=after?.banks?.[b]||{};
  for(const n of new Set([...Object.keys(oldBank),...Object.keys(newBank)])){
   if(different(oldBank[n],newBank[n]))(patch.banks[b]||(patch.banks[b]={}))[n]=newBank[n]===undefined?null:clone(newBank[n]);
  }
 }
 for(const collection of ['review','bookmarks']){
  const oldMap=before?.[collection]||{},newMap=after?.[collection]||{};
  for(const id of new Set([...Object.keys(oldMap),...Object.keys(newMap)])){
   if(different(oldMap[id],newMap[id]))patch[collection][id]=newMap[id]===undefined?null:clone(newMap[id]);
  }
 }
 if(different(before?.practice,after?.practice))patch.practice=after?.practice===undefined?null:clone(after.practice);
 return patch;
}
function isEmpty(p){return !Object.keys(p.banks).length&&!Object.keys(p.review).length&&!Object.keys(p.bookmarks).length&&!('practice' in p);}
function applyPatch(source,p){
 const v=clone(source?.version===1?source:blank());
 for(const [b,entries] of Object.entries(p.banks||{})){
  const bank=v.banks[b]||(v.banks[b]={});
  for(const [n,rec] of Object.entries(entries)){
   if(rec===null)delete bank[n];
   else if(!bank[n])bank[n]=clone(rec);
  }
  if(!Object.keys(bank).length)delete v.banks[b];
 }
 for(const collection of ['review','bookmarks']){
  const map=v[collection]||(v[collection]={});
  for(const [id,rec] of Object.entries(p[collection]||{})){if(rec===null)delete map[id];else map[id]=clone(rec);}
 }
 if('practice' in p){if(p.practice===null)delete v.practice;else if(v.practice?.created&&v.practice.created===p.practice.created){const oldAnswers=v.practice.answers||{};v.practice={...clone(v.practice),...clone(p.practice),answers:{...(p.practice.answers||{}),...oldAnswers}};}else v.practice=clone(p.practice);}
 v.updated=Date.now();return v;
}
function currentPending(){return user?queue:[];}
function readQueue(uid){try{const q=JSON.parse(localStorage.getItem(keyFor(uid))||'[]');return Array.isArray(q)?q.filter(x=>x?.patch):[];}catch(e){return [];}}
function persistQueue(){if(!user)return;try{localStorage.setItem(keyFor(user.uid),JSON.stringify(queue));}catch(e){feedback('Device storage is full. Export a progress backup before leaving this page.');}}
function displayRemote(remote){
 if(!user||!bridge||!remote)return;
 let merged=remote;
 for(const job of currentPending())merged=applyPatch(merged,job.patch);
 if(!sameProgress(bridge.getState(),merged))bridge.applyRemote(user.uid,merged);
 draw();
}
function scheduleFlush(delay=450){
 if(flushTimer)clearTimeout(flushTimer);
 flushTimer=setTimeout(()=>{flushTimer=null;flushQueue();},delay);
}
async function flushQueue(){
 if(busy||!user||!configured||!queue.length)return;
 if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}
 busy=true;draw();
 const uid=user.uid;
 try{
  while(user?.uid===uid&&queue.length){
   // Merge rapid answer/bookmark changes into one atomic Firestore transaction.
   // Keep the durable local queue until the whole batch has committed.
   const batch=queue.slice(),ids=new Set(batch.map(job=>job.id));
   const docRef=fStore.doc(firestore,'users',uid,'progress','main');
   await fStore.runTransaction(firestore,async tx=>{
    const snap=await tx.get(docRef);
    let merged=snap.exists()?snap.data()?.payload:blank();
    for(const job of batch)merged=applyPatch(merged,job.patch);
    tx.set(docRef,{schemaVersion:1,payload:merged,updatedAt:fStore.serverTimestamp()});
   });
   if(user?.uid!==uid)return;
   queue=queue.filter(job=>!ids.has(job.id));
   persistQueue();draw();
  }
 }catch(e){feedback('Cloud sync is waiting: '+friendlyError(e));scheduleRetry();}
 finally{busy=false;draw();}
}
function scheduleRetry(){
 if(retryTimer)clearTimeout(retryTimer);
 retryTimer=setTimeout(()=>{retryTimer=null;flushQueue();},12000);
}
function friendlyError(error){
 const code=String(error?.code||'');
 const known={
 'auth/invalid-email':'Please enter a valid email address.',
 'auth/invalid-credential':'Email or password not recognised.',
 'auth/email-already-in-use':'That email already has an account. Choose Sign in.',
 'auth/weak-password':'Choose a password with at least 6 characters.',
 'auth/popup-closed-by-user':'The Google sign-in window was closed.',
 'auth/operation-not-allowed':'That sign-in method is not enabled in Firebase yet.',
 'auth/unauthorized-domain':'The website domain has not been authorised in Firebase yet.',
 'permission-denied':'Cloud security rules blocked access. The site owner needs to check Firestore rules.',
 'unavailable':'You may be offline. We will retry when connected.'
 };
 return known[code]||known[code.replace('firestore/','')]||'Please try again shortly ('+(code||'connection error')+').';
}
function takeSnapshot(snap,uid){
 if(user?.uid!==uid)return;
 if(snap.metadata.fromCache){connected=false;draw();return;}
 connected=true;
 const remote=snap.exists()?snap.data()?.payload:blank();
 displayRemote(remote?.version===1?remote:blank());
 if(queue.length)flushQueue();
}
function changeUser(nextUser){
 if(unsubscribe){unsubscribe();unsubscribe=null;}
 if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}
 user=nextUser;connected=false;queue=nextUser?readQueue(nextUser.uid):[];
 bridge.switchAccount(nextUser?.uid||null);feedback('');draw();
 if(!nextUser)return;
 const uid=nextUser.uid;
 const docRef=fStore.doc(firestore,'users',uid,'progress','main');
 unsubscribe=fStore.onSnapshot(docRef,{includeMetadataChanges:true},snap=>takeSnapshot(snap,uid),e=>{connected=false;feedback('Could not read cloud progress: '+friendlyError(e));draw();});
 if(queue.length)flushQueue();
}
window.addEventListener('spaw:local-save',event=>{
 if(!user||event.detail?.uid!==user.uid)return;
 const patch=makePatch(event.detail.before,event.detail.after);
 if(isEmpty(patch))return;
 queue.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),patch});
 persistQueue();draw();scheduleFlush();
});
window.addEventListener('online',()=>{if(user)flushQueue();});
async function operation(work){
 if(!configured)return feedback('Accounts are not enabled yet. Ask the site owner to connect Firebase.');
 feedback('');
 try{await work();}
 catch(e){feedback(friendlyError(e));}
}
$('googleSignIn')?.addEventListener('click',()=>operation(async()=>{
 const provider=new fAuth.GoogleAuthProvider();
 await fAuth.signInWithPopup(auth,provider);
 $('accountPassword').value='';
}));
$('emailSignIn')?.addEventListener('click',()=>operation(async()=>{
 const email=$('accountEmail').value.trim(),pass=$('accountPassword').value;
 if(!email||!pass)throw {code:'auth/invalid-credential'};
 await fAuth.signInWithEmailAndPassword(auth,email,pass);$('accountPassword').value='';
}));
$('emailRegister')?.addEventListener('click',()=>operation(async()=>{
 const email=$('accountEmail').value.trim(),pass=$('accountPassword').value;
 if(!email||!pass)throw {code:'auth/invalid-credential'};
 await fAuth.createUserWithEmailAndPassword(auth,email,pass);$('accountPassword').value='';
}));
$('resetPassword')?.addEventListener('click',()=>operation(async()=>{
 const email=$('accountEmail').value.trim();if(!email)throw {code:'auth/invalid-email'};
 await fAuth.sendPasswordResetEmail(auth,email);
 feedback('If the address has an account, a password reset email will arrive.');
}));
$('accountSignOut')?.addEventListener('click',()=>operation(async()=>{await fAuth.signOut(auth);feedback('You are in guest mode on this device.');}));
$('accountImportGuest')?.addEventListener('click',()=>{
 if(!user)return;
 if(!confirm('Bring the saved guest answers on this device into '+(user.email||'this account')+'? Existing cloud answers will stay intact.'))return;
 const done=bridge.importGuest();
 feedback(done?'Guest progress added to this account and queued to sync.':'No guest progress found on this browser.');
 draw();
});
async function start(){
 if(!bridge){status('Waiting for the study app…');return;}
 if(!configured){activeControls(false);draw();return;}
 try{
  const [fa,fs,authModule]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
  ]);
  fAuth=authModule;fStore=fs;
  const app=fa.initializeApp(config);auth=authModule.getAuth(app);firestore=fs.getFirestore(app);
  authModule.onAuthStateChanged(auth,changeUser,e=>{feedback(friendlyError(e));draw();});
  activeControls(true);draw();
 }catch(e){activeControls(false);status('Cloud connection could not start. You can still study in guest mode.');feedback(friendlyError(e));}
}
start();
