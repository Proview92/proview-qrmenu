/* Proview QR Menu – sign-in, master login, businesses & locations, licences, users, per-location saving.
   Follows the Proview access model used by Bookings, Employee, Signage, Label and WiFi. */
(function(){
'use strict';
const CFG={url:'https://yblafwttmqaqvfvedaoc.supabase.co',key:'sb_publishable_mcs45XaG9XHMWbyXO_PyCw_NQaQ08MR',
  dash:'https://dashboard.proviewcrm.co.uk/',lic:'https://license.proviewcrm.co.uk/',phone:'020 8935 5495',app:'Proview QR Menu'};
const {$,$$,UI,modal,drawer,closeModal,closeDrawer}=App;
const pending=[];const toast=m=>{if(document.getElementById('toast'))App.toast(m);else pending.push(m)};const {ic,esc,initials}=UI;
const sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const ls={get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const CTX={email:'',master:false,who:null,org:null,role:null,member:null,sites:[],siteId:'all',orgs:[]};
window.PQ={sb,CTX,CFG};

/* ---------- features ---------- */
const FEATURES=[['menus','Menus & translations'],['website','AI Website Builder'],['brandkit','AI Brand Kit'],['media','AI Media Studio & Library'],['marketing','AI Marketing Hub'],['aireports','AI Reports'],['orders','Orders'],['reservations','Reservations'],['guests','Guests & Engagement'],['reports','Reports'],['marketplace','Marketplace'],['settings','Settings'],['users','Users']];
const DEFAULTS={owner:'*',admin:'*',manager:['menus','website','brandkit','media','marketing','aireports','orders','reservations','guests','reports','settings'],staff:['orders','reservations','guests']};
function can(f){if(CTX.master)return true;const r=CTX.role;if(!r)return false;const o=(CTX.member?.features||{})[f];if(o===true||o===false)return o;const d=DEFAULTS[r];return d==='*'||d.includes(f)}
function featureOf(key){if(key==='dashboard'||key==='locations')return null;if(key==='users')return'users';
  if(/^(menu-|translation-center|in-app-promotions)/.test(key))return'menus';if(key.startsWith('website-'))return'website';if(key.startsWith('brand-kit'))return'brandkit';
  if(key.startsWith('ai-media'))return'media';if(key.startsWith('ai-marketing'))return'marketing';if(key==='ai-reports')return'aireports';
  if(key.startsWith('orders'))return'orders';if(key.startsWith('reservations'))return'reservations';if(/^(engagement|feedback)/.test(key))return'guests';
  if(key.startsWith('reports'))return'reports';if(key.startsWith('marketplace'))return'marketplace';if(key.startsWith('settings'))return'settings';return null}
const isAdmin=()=>CTX.master||['owner','admin'].includes(CTX.role);

/* ---------- licence helpers ---------- */
const site=()=>CTX.sites.find(s=>s.id===CTX.siteId);
const fmtD=d=>new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
function lic(s){if(!s)return{k:'none',t:'No licence',c:'grey'};if(s.archived)return{k:'archived',t:'Archived',c:'grey'};if(!s.license_type)return{k:'none',t:'No licence',c:'bad'};
  if(s.license_type==='lifetime')return{k:'ok',t:'Lifetime',c:'ok'};const ms=new Date(s.expires_at)-Date.now(),days=Math.ceil(ms/864e5);
  if(ms<=0)return{k:'expired',t:(s.license_type.startsWith('trial')?'Trial ended ':'Expired ')+fmtD(s.expires_at),c:'bad'};
  if(s.license_type.startsWith('trial'))return{k:'trial',t:`Free trial · ${days} day${days>1?'s':''} left`,c:'warn',days};
  return{k:'ok',t:'Active until '+fmtD(s.expires_at),c:days<=14?'warn':'ok',days}}

/* ---------- styles ---------- */
document.head.insertAdjacentHTML('beforeend',`<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet"><style>
#pqLoad{position:fixed;inset:0;background:var(--page);display:grid;place-items:center;z-index:200}
#pqLoad .ico{width:72px;height:72px;border-radius:18px;background:var(--brand-700);color:#fff;display:grid;place-items:center;animation:pqPulse 1.2s ease-in-out infinite}
#pqLoad .ico svg{width:38px;height:38px}
@keyframes pqPulse{50%{transform:scale(.92);opacity:.7}}@media (prefers-reduced-motion:reduce){#pqLoad .ico{animation:none}}
#pqAuth{position:fixed;inset:0;background:var(--page);z-index:150;overflow:auto;display:none}
#pqAuth.show{display:grid;place-items:center;padding:24px}
.pq-card{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow);width:min(420px,100%);padding:32px}
.pq-card .logo{display:flex;align-items:center;gap:10px;margin-bottom:22px}.pq-card .logo .ico{width:44px;height:44px;border-radius:12px;background:var(--brand-700);color:#fff;display:grid;place-items:center}
.pq-card h1{font-size:24px;line-height:30px}.pq-card .btn{width:100%;height:46px}
.pq-or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;margin:18px 0}.pq-or::before,.pq-or::after{content:"";flex:1;border-top:1px solid var(--border)}
.pq-msg{border-radius:var(--r-md);padding:10px 12px;margin-bottom:14px;font-size:14px}.pq-msg.err{background:var(--bad-tint);color:var(--bad)}.pq-msg.ok{background:var(--ok-tint);color:var(--ok)}.pq-msg.info{background:var(--brand-tint);color:var(--brand-900)}
.pq-title{font-size:20px;line-height:28px;font-weight:700;color:var(--ink);margin:0 4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
#pqLoc{height:38px;border-radius:10px;border:1px solid #e4e2dc;background:#fff;color:#17171c;font:600 14px Inter,var(--font);padding:0 30px 0 12px;min-width:170px;max-width:320px;cursor:pointer}
#pqLoc.pulse{animation:pqLocPulse .5s ease-in-out 3}@keyframes pqLocPulse{50%{box-shadow:0 0 0 4px rgba(21,101,192,.35)}}
.hdr-cap{display:flex;align-items:center;gap:2px;background:#f3f2ee;border-radius:12px;padding:3px;flex:none}
.hdr-cap>button{width:34px;height:34px;min-width:34px;border-radius:9px;background:transparent;border:0;display:grid;place-items:center;position:relative;color:#17171c;cursor:pointer}
.hdr-cap>button:hover{background:#fff}.hdr-cap svg{width:18px;height:18px}
.hdr-dot{width:9px;height:9px;border-radius:50%;background:#12a150;margin:0 9px;flex:none}
.hdr-dot.saving{background:#4a6cd0;animation:pqPulse 1s infinite}.hdr-dot.offline{background:#d48a00}.hdr-dot.error{background:#d92d20}
.hdr-cap .cnt{position:absolute;top:0;right:0;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--brand-700);color:#fff;font-size:10.5px;font-weight:700;line-height:16px;text-align:center}
.hdr-cap .cnt:empty{display:none}
.pv-dash{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;border-radius:10px;border:1px solid #e4e2dc;background:#fff;color:#17171c;font-weight:600;font-size:14px;text-decoration:none;flex:none;white-space:nowrap;cursor:pointer}
.pv-dash:hover{background:#f3f2ee;text-decoration:none}.pv-dash svg{width:17px;height:17px}
.nav a.grey{opacity:.42}
.pq-banner{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:var(--r-md);margin-bottom:18px;font-weight:600}
.pq-banner.warn{background:var(--warn-tint);color:var(--warn)}.pq-banner.bad{background:var(--bad-tint);color:var(--bad)}.pq-banner .btn{margin-left:auto}
.pq-lock{max-width:560px;margin:40px auto;text-align:center}
.pq-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:18px 0}
.pq-feat{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}
@media (max-width:700px){.top{flex-wrap:wrap;height:auto;padding:8px 12px;gap:8px}#pqLoc{order:10;flex-basis:100%;height:36px;font-size:13px;max-width:none}.pq-title{font-size:17px;max-width:150px}.pv-dash{width:34px;height:34px;padding:0;justify-content:center}.pv-dash span{display:none}.hdr-cap>button{width:30px;min-width:30px;height:30px}}
</style>`);
const APPICON=ic('qr');
document.body.insertAdjacentHTML('afterbegin',`<div id="pqLoad" role="status" aria-label="Loading"><div class="ico"><img src="app-icon.svg" alt=""></div></div><div id="pqAuth"></div>`);
const loader=on=>{$('#pqLoad').style.display=on?'grid':'none'};

/* ---------- auth screens (auth2 layout shared by the Proview apps) ---------- */
const BRAND2=`<div class="auth2-fbrand"><img src="app-icon.svg" alt=""><div class="wordmark2">PROVIEW<span>QR MENU</span></div></div>`;
function art(){return `<div class="auth2-art"><div class="art-glow"></div>
  <div class="auth2-brand"><img src="app-icon.svg" alt=""><div class="wordmark">PROVIEW<span>QR MENU</span></div></div>
  <div><h2>Every menu, every order — in one place.</h2>
    <div class="art-cards">
      <div class="art-menu" style="left:0;top:10px;transform:rotate(-3deg)"><div class="h">Breakfast &amp; Brunch<small>LIVE</small></div>
        <div class="r"><b>Turkish Eggs</b><span>£12.95</span></div><div class="r"><b>Pistachio French Toast</b><span>£15.95</span></div><div class="r"><b>Flat White</b><span>£3.60</span></div></div>
      <div class="art-qr" style="left:280px;top:40px;transform:rotate(4deg)">${UI.qr('pv-art',92)}</div>
      <div class="art-pill" style="left:40px;top:205px"><i>✓</i><div><b>New order · Table 7</b><br><span style="color:#55555f;font-size:12px">3 items · £31.50 · just now</span></div></div>
    </div></div>
  <div class="auth2-sub">Digital QR menus, ordering, reservations and guest marketing for every location you run.</div></div>`}
function authShow(html){const a=$('#pqAuth');a.innerHTML=`<div class="auth2">${art()}<div class="auth2-form"><div><div class="box">${BRAND2}${html}</div></div></div></div>`;a.classList.add('show');loader(false);const f=a.querySelector('input');f&&f.focus()}
const msg=(t,k='err')=>t?`<div class="${k==='ok'?'lg-ok':k==='info'?'lg-info':'lg-err'}" role="alert">${esc(t)}</div>`:'';
const inp=(id,label,type='text',attrs='')=>`<label for="${id}">${label}</label><input class="inp" id="${id}" type="${type}" ${attrs}>`;
function signInScreen(note='',kind='err'){authShow(`<h1>Sign in</h1><p class="auth2-mut">Manage menus, orders, guests and marketing across your locations.</p>${msg(note,kind)}
  <form id="pqSignIn" style="display:flex;flex-direction:column;gap:14px;margin:0;padding:0;border:0;box-shadow:none" novalidate>${inp('pqEmail','Email','email','required autocomplete="username" placeholder="you@company.com"')}${inp('pqPass','Password','password','required autocomplete="current-password" placeholder="Password"')}
  <button class="go" type="submit">Sign in</button></form>
  <div class="or">or</div><a class="ghost2" href="${CFG.dash}?app=qrmenu&return=${encodeURIComponent(location.origin+'/')}">Sign in with Proview account</a>
  <div class="auth2-links"><a href="#" data-pq="signup">Start a free 3-day trial</a><a href="#" data-pq="forgot">Forgot password?</a></div>`);
  $('#pqSignIn').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='Signing in…';
    const {error}=await sb.auth.signInWithPassword({email:$('#pqEmail').value.trim(),password:$('#pqPass').value});
    if(error){signInScreen(/confirm/i.test(error.message)?'Confirm your email address first (check your inbox).':'Wrong email or password.');return}
    afterSignIn()}}
const FORM='style="display:flex;flex-direction:column;gap:14px;margin:0;padding:0;border:0;box-shadow:none" novalidate';
function signUpScreen(note=''){authShow(`<h1>Create your login</h1><p class="auth2-mut">Start your free 3-day trial. No card needed.</p>${msg(note)}
  <form id="pqSignUp" ${FORM}>${inp('pqEmail','Email','email','required autocomplete="email" placeholder="you@company.com"')}${inp('pqPass','Password','password','required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"')}
  <button class="go" type="submit">Create login</button></form><div class="auth2-links"><a href="#" data-pq="signin">I already have a login</a></div>`);
  $('#pqSignUp').onsubmit=async e=>{e.preventDefault();const em=$('#pqEmail').value.trim();if($('#pqPass').value.length<8)return signUpScreen('Use at least 8 characters.');
    const {data,error}=await sb.auth.signUp({email:em,password:$('#pqPass').value,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error)return signUpScreen(error.message);
    if(data.session)return afterSignIn();
    authShow(`<h1>Check your inbox</h1>${msg('We sent a confirmation link to '+em+'. Open it on this device to continue.','info')}<a class="ghost2" href="#" data-pq="signin">Back to sign in</a>`)}}
function forgotScreen(note='',kind='err'){authShow(`<h1>Reset your password</h1><p class="auth2-mut">We’ll email you a link to choose a new one.</p>${msg(note,kind)}
  <form id="pqForgot" ${FORM}>${inp('pqEmail','Email','email','required placeholder="you@company.com"')}<button class="go" type="submit">Send reset link</button></form>
  <div class="auth2-links"><a href="#" data-pq="signin">Back to sign in</a></div>`);
  $('#pqForgot').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.resetPasswordForEmail($('#pqEmail').value.trim(),{redirectTo:location.origin+location.pathname});
    forgotScreen(error?error.message:'If that email has a login, a reset link is on its way.',error?'err':'ok')}}
function newPasswordScreen(note=''){authShow(`<h1>Choose a new password</h1><p class="auth2-mut">At least 8 characters.</p>${msg(note)}<form id="pqNewPw" ${FORM}>${inp('pqPass','New password','password','required minlength="8" autocomplete="new-password"')}<button class="go" type="submit">Save password</button></form>`);
  $('#pqNewPw').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.updateUser({password:$('#pqPass').value});if(error)return newPasswordScreen(error.message);toast('Password updated');afterSignIn()}}
function trialSetupScreen(note=''){authShow(`<h1>Set up your business</h1><p class="auth2-mut">Start your free 3-day trial${CTX.email?' as '+esc(CTX.email):''}.</p>${msg(note)}
  <form id="pqTrial" ${FORM}>${inp('pqBiz','Business name','text','required maxlength="120" autocomplete="organization" placeholder="e.g. Alici\'s"')}${inp('pqLocName','First location','text','maxlength="120" placeholder="Same as the business name"')}${inp('pqPhone','Phone (optional)','tel','')}
  <button class="go" type="submit">Start free trial</button><button class="ghost2" type="button" data-pq="signout">Sign out</button>
  <p class="hint">After 3 days the location locks until you buy a licence at <a href="${CFG.lic}" target="_blank" rel="noopener">license.proviewcrm.co.uk</a>. Joining an existing business? Ask its owner to add your email, then sign in again.</p></form>`);
  $('#pqTrial').onsubmit=async e=>{e.preventDefault();const b=$('#pqBiz').value.trim();if(!b)return trialSetupScreen('Enter your business name.');
    const go=e.target.querySelector('.go');go.disabled=true;go.textContent='Setting up…';
    const {error}=await sb.rpc('pq_self_trial',{p_business:b,p_location:$('#pqLocName').value||null,p_phone:$('#pqPhone').value||null});
    if(error)return trialSetupScreen(error.message);toast('Your free trial has started');afterSignIn()}}
document.addEventListener('click',e=>{const a=e.target.closest('[data-pq]');if(!a)return;e.preventDefault();
  ({signin:()=>signInScreen(),signup:()=>signUpScreen(),forgot:()=>forgotScreen(),signout:()=>signOut()})[a.dataset.pq]?.()});

/* ---------- session flow ---------- */
let booted=false,fallback;
async function start(){
  loader(true);fallback=setTimeout(()=>{if(!booted)signInScreen('Taking longer than usual. Please sign in.','info')},8000);
  const m=location.hash.match(/pv_sso=([^&]+)/);
  if(m){history.replaceState(null,'',location.pathname+location.search);
    try{const r=await fetch(CFG.url+'/functions/v1/sso-login',{method:'POST',headers:{'content-type':'application/json',apikey:CFG.key},body:JSON.stringify({assertion:decodeURIComponent(m[1])})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Sign-in failed');
      const {error}=await sb.auth.verifyOtp({token_hash:j.token_hash,type:'magiclink'});if(error)throw error}
    catch(err){clearTimeout(fallback);return signInScreen(err.message)}}
  sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY'){clearTimeout(fallback);newPasswordScreen()}});
  const {data:{session}}=await sb.auth.getSession();
  if(!session){clearTimeout(fallback);return signInScreen()}
  afterSignIn()}
async function afterSignIn(){
  loader(true);const {data:who,error}=await sb.rpc('pq_whoami');clearTimeout(fallback);
  if(error||!who){return signInScreen(error?.message||'Could not load your account.')}
  if(!who.email){await sb.auth.signOut();return signInScreen()}
  CTX.email=who.email;CTX.master=who.master;CTX.who=who;
  // device cache: forget businesses this person can no longer open
  const saved=ls.get('pq_last_'+who.email)||{};
  const mems=who.memberships||[];
  if(!CTX.master&&!mems.length){if(!who.trial_used){CTX.email=who.email;return trialSetupScreen()}await sb.auth.signOut();purge();return signInScreen('Ask your owner or Proview to give you access.','info')}
  let orgId=null;
  if(CTX.master)orgId=saved.org||null;else orgId=(mems.find(x=>x.org_id===saved.org)||mems[0]).org_id;
  if(orgId){const ok=await openOrg(orgId,saved.site,true);if(!ok&&!CTX.master){await sb.auth.signOut();purge();return signInScreen('Ask your owner or Proview to give you access to a location.','info')}}
  $('#pqAuth').classList.remove('show');
  if(!booted){booted=true;App.boot();decorateShell();loadPlans();if(pending.length)setTimeout(()=>App.toast(pending.splice(0).pop()),300)}
  if(!CTX.org){App.go('locations');App.render()}
  else if(CTX.siteId==='all'){if(App.current()!=='locations')App.go('locations');else App.render()}
  else App.render();
  loader(false)}
function purge(){Object.keys(localStorage).filter(k=>k.startsWith('pq_')).forEach(k=>ls.del(k))}
async function signOut(){await flush();await sb.auth.signOut();purge();location.hash='';location.reload()}

/* ---------- business / location switching ---------- */
async function openOrg(orgId,siteId,quiet){
  await flush();
  const mem=(CTX.who.memberships||[]).find(m=>m.org_id===orgId);
  const {data:sites,error}=await sb.rpc('pq_sites_of',{p_org:orgId});if(error){toast(error.message);return false}
  const {data:org}=await sb.from('pq_orgs').select('*').eq('id',orgId).maybeSingle();if(!org)return false;
  CTX.org=org;CTX.member=mem||null;CTX.role=CTX.master?(mem?.role||'master'):mem.role;CTX.sites=(sites||[]).filter(s=>!s.archived||isAdmin());
  const live=CTX.sites.filter(s=>!s.archived);
  if(!CTX.master&&!live.length)return false;
  let target=siteId&&live.find(s=>s.id===siteId)?siteId:(live.length===1?live[0].id:'all');
  await openSite(target,true);
  if(!quiet){toast('Opened '+org.name)}
  return true}
async function openSite(id,quiet){
  await flush();CTX.siteId=id;remember();
  if(id==='all'){replaceState(window.PV_BLANK(CTX.org?.name||''));lastSaved=null}
  else{const s=site();const {data}=await sb.from('pq_state').select('data,updated_at').eq('site_id',id).maybeSingle();
    const blank=window.PV_BLANK(s.name);const d=data?.data&&Object.keys(data.data).length?{...blank,...data.data}:blank;
    d.venue={...blank.venue,...(d.venue||{}),id:id.slice(0,8).toUpperCase(),name:d.venue?.name||s.name};Object.keys(blank).forEach(k=>{if(d[k]===undefined||d[k]===null)d[k]=blank[k]});d.integrations=blank.integrations;
    replaceState(d);lastSaved=snapshot()}
  fillLoc();if(!quiet){toast(id==='all'?'All locations':'Switched to '+site().name)}}
function replaceState(d){const S=App.state;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,d);const n=$('#venueName');if(n)n.textContent=CTX.siteId==='all'?(CTX.org?.name||'Proview'):site()?.name||''}
function remember(){if(CTX.email)ls.set('pq_last_'+CTX.email,{org:CTX.org?.id||null,site:CTX.siteId})}

/* ---------- saving ---------- */
let lastSaved=null,saveT=null,saving=null;
const snapshot=()=>{const {integrations,...rest}=App.state;return JSON.stringify(rest)};
function dot(k){const d=$('#pqDot');if(!d)return;d.className='hdr-dot '+(k||'');d.title=d.ariaLabel={saving:'Saving…',offline:'Offline – changes will save when you reconnect',error:'Not saved'}[k]||'Online · all changes saved'}
function queueSave(){if(CTX.siteId==='all'||!CTX.org)return;clearTimeout(saveT);saveT=setTimeout(save,900)}
async function save(){if(CTX.siteId==='all'||!booted)return;const snap=snapshot();if(snap===lastSaved)return;
  if(!navigator.onLine){dot('offline');return}
  dot('saving');const sid=CTX.siteId;const {error}=await (saving=sb.rpc('pq_save_state',{p_site:sid,p_data:JSON.parse(snap)}));saving=null;
  if(error){dot('error');toast(error.message);return}if(sid===CTX.siteId)lastSaved=snap;dot()}
async function flush(){clearTimeout(saveT);if(saving)await saving;await save()}
['click','change','input','drop','keyup'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(queueSave,60),true));
addEventListener('online',()=>{dot();queueSave()});addEventListener('offline',()=>dot('offline'));
addEventListener('beforeunload',e=>{if(CTX.siteId!=='all'&&lastSaved!==null&&snapshot()!==lastSaved){save();e.preventDefault();e.returnValue=''}});
setInterval(queueSave,15000);

/* ---------- header (Proview standard) ---------- */
const TITLES={dashboard:'Dashboard',locations:'Locations',users:'Users','menu-management':'Menus','menu-editor':'Menu editor','menu-create':'Create a Menu','menu-builder':'Menu Builder','menu-modifiers':'Modifiers','translation-center':'Translation Center','in-app-promotions':'In-App Promotions','website-builder':'AI Website Builder','website-builder-build':'AI Website Builder','website-editor':'Website editor','brand-kit':'AI Brand Kit','brand-kit-scratch':'AI Brand Kit','ai-media-studio':'AI Media Studio','ai-marketing':'AI Marketing Hub','ai-marketing-create':'Create Post','ai-reports':'AI Reports','ai-media-library':'AI Media Library',orders:'Orders','orders-all':'All Orders','orders-settings':'Ordering Settings','orders-archived':'Archived Orders',reservations:'Reservations','reservations-list':'Reservations',engagement:'Guests & Engagement','engagement-customers':'Customers','engagement-customer':'Customer','engagement-promo-codes':'Promo Codes','engagement-settings':'Engagement Settings','engagement-reviews':'Reviews',feedbacks:'Feedbacks','feedback-form':'Feedback form',reports:'Reports',marketplace:'Marketplace',settings:'Settings'};
function title(key){if(TITLES[key])return TITLES[key];const k=Object.keys(TITLES).filter(t=>key.startsWith(t)).sort((a,b)=>b.length-a.length)[0];return TITLES[k]||'Proview QR Menu'}
function decorateShell(){
  const top=$('.top');
  top.innerHTML=`<button class="iconbtn" data-action="collapse" aria-label="Collapse sidebar">${ic('sidebar')}</button>
   <h1 class="pq-title" id="pqTitle">Dashboard</h1><select id="pqLoc" aria-label="Location"></select><div class="spacer"></div>
   <div class="hdr-cap"><span class="hdr-dot" id="pqDot" role="img" aria-label="Online" title="Online · all changes saved"></span>
     <button data-action="pq-search" aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)">${ic('search')}</button>
     <button data-action="pq-chat" aria-label="Chat" title="Chat">${ic('msg')}</button>
     <button data-action="pq-inbox" aria-label="Inbox" title="Inbox">${ic('mail')}<span class="cnt" id="pqMailCnt"></span></button>
     <button data-action="pq-bell" aria-label="Notifications" title="Notifications">${ic('bell')}<span class="cnt" id="pqBellCnt"></span></button></div>
   <a class="pv-dash" id="pqDash" href="${CFG.dash}" target="proview-dashboard" rel="noopener">${ic('grid')}<span>Dashboard</span></a>
   ${UI.dd(`<span class="me" id="pqAv">?</span>`,[],{cls:'iconbtn',aria:'Account menu'}).replace('class="iconbtn"','class="iconbtn" style="border:0;width:auto"').replace('<div class="dd-menu ">','<div class="dd-menu" id="pqAcct" style="width:270px">')}
   <button class="iconbtn" data-action="pq-signout" aria-label="Sign out" title="Sign out">${ic('logout')}</button>`;
  $('#pqLoc').addEventListener('change',e=>chooseLoc(e.target.value));
  // sidebar venue card → this business's locations
  const vb=$('.side .venue');if(vb)vb.parentElement.querySelector('.dd-menu').innerHTML=`<div id="venueList"></div>`;
  const brand=$('.side .brand');if(brand)brand.outerHTML=`<a class="brand" href="#${CTX.master&&!CTX.org?'locations':'dashboard'}" title="Proview QR Menu"><img class="brand-mark" src="app-icon.svg" alt=""><div class="wordmark">PROVIEW<span>QR MENU</span></div></a>`;
  fillLoc();fillAcct()}
function fillAcct(){const a=$('#pqAcct');if(!a)return;$('#pqAv').textContent=initials(CTX.email.split('@')[0]);
  const role=CTX.master?'Proview master':({owner:'Owner',admin:'Admin',manager:'Manager',staff:'Staff'})[CTX.role]||'';
  a.innerHTML=`<div style="display:flex;gap:10px;align-items:center;padding:8px 8px 12px;border-bottom:1px solid var(--border);margin-bottom:6px"><span class="avatar">${initials(CTX.email.split('@')[0])}</span><div style="min-width:0"><b style="color:var(--ink);display:block;overflow:hidden;text-overflow:ellipsis">${esc(CTX.email)}</b><small class="muted">${role}${CTX.org?' · '+esc(CTX.org.name):''}</small></div></div>
   <button data-action="account">${ic('user','sm')}<span>Account Settings</span></button>
   <button data-action="pq-change-pw">${ic('lock','sm')}<span>Change password</span></button>
   <button data-action="copy-menu-link">${ic('share','sm')}<span>Copy menu link</span></button>
   <button data-action="preview-qr">${ic('qr','sm')}<span>Preview QR Menu</span></button>
   <button data-action="whats-new">${ic('rocket','sm')}<span>What's New</span></button>
   <button data-action="support">${ic('help','sm')}<span>Help Center</span></button>
   <button data-action="live-chat">${ic('msg','sm')}<span>Start Live Chat</span></button>
   <button data-action="change-language">${ic('translate','sm')}<span>Change Language</span></button>
   <button data-action="theme">${ic('sun','sm')}<span>Change Theme</span></button>
   <hr><button data-action="pq-signout" class="danger">${ic('logout','sm')}<span>Sign Out</span></button>`;
  $('#pqDash').style.display=(CTX.master||['owner','admin'].includes(CTX.role))?'':'none'}
function fillLoc(){const sel=$('#pqLoc');if(!sel)return;
  if(!CTX.org){sel.innerHTML=`<option>All businesses</option>`;sel.disabled=true}
  else{sel.disabled=false;const live=CTX.sites.filter(s=>!s.archived);
    const allLbl=CTX.master?`${CTX.org.name} (all locations)`:CTX.role==='owner'?`All my locations (${live.length})`:`All locations (${live.length})`;
    sel.innerHTML=`<option value="all">${esc(allLbl)}</option>`+live.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');sel.value=CTX.siteId}
  const vl=$('#venueList');if(vl){vl.innerHTML=!CTX.org?'<p class="muted" style="padding:8px">Open a business from Locations.</p>':
    [{id:'all',name:'All locations'},...CTX.sites.filter(s=>!s.archived)].map(s=>`<button data-action="pq-pick-site" data-id="${s.id}" style="${s.id===CTX.siteId?'background:var(--brand-tint);color:var(--brand-900);font-weight:700':''}"><span class="avatar" style="width:28px;height:28px;font-size:12px">${s.id==='all'?ic('layers','sm'):initials(s.name)}</span><span>${esc(s.name)}</span></button>`).join('')}
  const n=$('#venueName');if(n)n.textContent=!CTX.org?'All businesses':CTX.siteId==='all'?CTX.org.name:site()?.name||'';const av=$('#venueAv');if(av)av.textContent=initials((n&&n.textContent)||'P')}
async function chooseLoc(v){await openSite(v);if(v==='all'){App.go('locations')}App.render()}
function pulseLoc(){const s=$('#pqLoc');if(!s)return;s.classList.remove('pulse');void s.offsetWidth;s.classList.add('pulse');s.focus()}

/* ---------- wrap the app's render: guard, nav, title, licence ---------- */
const baseRender=App.render;
App.render=function(){
  if(!booted)return;
  let key=App.current().split('--')[0];
  const f=featureOf(key);
  if(key!=='locations'&&(!CTX.org||CTX.siteId==='all')){if(App.current()!=='locations'){location.hash='locations';return}}
  if(f&&!can(f)){toast("You don't have access to that page");location.hash='dashboard';return}
  baseRender();
  // title
  const t=$('#pqTitle');if(t)t.textContent=title(key);document.title=title(key)+' · Proview QR Menu';
  decorateNav(key);
  // licence banner / lock
  if(key!=='locations'&&key!=='users'&&CTX.siteId!=='all'){const s=site(),L=lic(s),v=$('#view');
    if(CTX.org?.suspended)v.innerHTML=lockHTML('This business is paused','Please contact Proview to reactivate it.');
    else if(L.k==='expired'||L.k==='none'){if(CTX.master)v.insertAdjacentHTML('afterbegin',`<div class="pq-banner bad">${ic('lock','sm')}${esc(s.name)}: ${L.t}. You can still edit as Proview master.<a class="btn secondary sm" href="${CFG.lic}" target="_blank" rel="noopener">Licence portal</a></div>`);
      else v.innerHTML=lockHTML(L.k==='none'?'This location has no licence':'This location\'s licence has ended',`Renew to keep using ${esc(s.name)}. Your menus and data are safe.`)}
    else if(L.k==='trial'||(L.k==='ok'&&L.days<=14))v.insertAdjacentHTML('afterbegin',`<div class="pq-banner warn">${ic('clock','sm')}${esc(s.name)}: ${L.t}<button class="btn primary sm" data-action="pq-renew">${L.k==='trial'?'Buy a licence':'Renew'}</button></div>`)}
  updateCounts()};
function decorateNav(key){const nav=$('#nav');if(!nav)return;
  const allMode=!CTX.org||CTX.siteId==='all';
  // Locations first, Users under Setup
  nav.insertAdjacentHTML('afterbegin',`<div class="nav-group"><a href="#locations" class="${key==='locations'?'on':''}" title="Locations"><span class="tile">${ic('pin')}</span><span class="lbl">Locations</span></a></div>`);
  if(CTX.org&&(isAdmin()&&can('users'))){const setup=[...nav.querySelectorAll('.nav-group')].find(g=>g.querySelector('.eyebrow')?.textContent==='Setup');
    setup&&setup.insertAdjacentHTML('beforeend',`<a href="#users" class="${key==='users'?'on':''}" title="Users"><span class="tile">${ic('users')}</span><span class="lbl">Users</span></a>`)}
  nav.querySelectorAll('a[href^="#"]').forEach(a=>{const k=a.getAttribute('href').slice(1);if(k==='locations')return;
    const f=k==='dashboard'?null:featureOf(k==='menu-management'?'menu-management':k);
    if(allMode){a.classList.add('grey');a.classList.remove('on');a.dataset.grey='1'}
    else if(f&&!can(f))a.style.display='none'});
  nav.querySelectorAll('.nav-group').forEach(g=>{if(![...g.querySelectorAll('a')].some(a=>a.style.display!=='none'))g.style.display='none'})}
document.addEventListener('click',e=>{const a=e.target.closest('#nav a[data-grey]');if(a){e.preventDefault();e.stopPropagation();toast('Choose a location in the dropdown first');pulseLoc()}},true);
function lockHTML(h,t){const plans=Object.entries(PLANS||{});return `<div class="pq-lock card pad"><span class="itile" style="margin:0 auto 14px;width:56px;height:56px;background:var(--bad-tint);color:var(--bad)">${ic('lock')}</span><h1 style="font-size:24px">${h}</h1><p class="muted">${t}</p>
  ${plans.length?`<div class="pq-plans">${plans.map(([k,p])=>`<a class="select-card" style="text-decoration:none" href="${esc(p.link)}?client_reference_id=pvq__${CTX.siteId}__${k}&prefilled_email=${encodeURIComponent(CTX.email)}" target="_blank" rel="noopener"><strong style="color:var(--ink)">${esc(p.label)}</strong><div style="font-size:20px;font-weight:700;color:var(--ink);margin-top:4px">£${(p.amount/100).toFixed(2)}</div><small class="muted">Buy / renew online</small></a>`).join('')}</div>`:''}
  <p style="margin:16px 0 0">Or renew through the <a href="${CFG.lic}" target="_blank" rel="noopener">licence portal</a>, or call <strong>${CFG.phone}</strong>.</p>
  <div style="display:flex;gap:10px;justify-content:center;margin-top:18px"><button class="btn secondary" data-action="pq-recheck">${ic('refresh','sm')}Check again</button>${CTX.sites.filter(s=>!s.archived).length>1?`<a class="btn ghost" href="#locations">Other locations</a>`:''}</div></div>`}
let PLANS={};function loadPlans(){sb.rpc('pq_plans').then(r=>{PLANS=r.data||{}}).catch(()=>{})}
function updateCounts(){const w=(App.state.orders||[]).filter(o=>/Waiting/i.test(o.status||'')).length;const b=$('#pqBellCnt');if(b)b.textContent=w||'';
  const m=(App.state.feedbacks||[]).filter(f=>f.unread).length+(App.state.reviews||[]).filter(r=>r.status==='Waiting').length;const c=$('#pqMailCnt');if(c)c.textContent=m||''}

/* ---------- header actions ---------- */
const A=App.action;
A('pq-signout',()=>App.modal({title:'Sign out?',body:'<p style="margin:0">Changes are saved automatically.</p>',footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-signout-yes">Sign out</button>`}));
A('sign-out',()=>App.actions['pq-signout']());
A('pq-signout-yes',()=>signOut());
A('pq-pick-site',el=>chooseLoc(el.dataset.id));
A('switch-venue',el=>chooseLoc(el.dataset.id||'all'));
A('pq-recheck',async()=>{if(CTX.org){await openOrg(CTX.org.id,CTX.siteId,true);App.render();toast('Licence checked')}});
A('pq-renew',()=>App.modal({title:'Buy or renew a licence',wide:true,body:lockHTML(site()?.name||'Licence',`Choose a plan for ${esc(site()?.name||'this location')}.`).replace('pq-lock card pad','').replace(/<span class="itile"[^>]*>.*?<\/span>/,'')}));
A('pq-change-pw',()=>App.modal({title:'Change password',body:UI.field({label:'New password',help:'At least 8 characters.',control:UI.input({id:'pqNp',type:'password',attrs:'minlength="8" autocomplete="new-password"'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-change-pw-save">Save</button>`}));
A('pq-change-pw-save',async()=>{const v=$('#pqNp').value;if(v.length<8)return toast('At least 8 characters');const {error}=await sb.auth.updateUser({password:v});if(error)return toast(error.message);closeModal();toast('Password updated')});
A('account',()=>drawer({title:'Account Settings',body:UI.field({label:'Email',control:UI.input({value:CTX.email,attrs:'readonly'})})+UI.field({label:'Role',control:UI.input({value:CTX.master?'Proview master':CTX.role,attrs:'readonly'})})+UI.field({label:'Business',control:UI.input({value:CTX.org?.name||'—',attrs:'readonly'})})+`<button class="btn secondary" data-action="pq-change-pw">${ic('lock','sm')}Change password</button>`,footer:`<button class="btn primary" data-close>Done</button>`}));
A('pq-chat',()=>drawer({title:'Chat',width:400,body:UI.empty('msg','No messages yet','Team chat isn\'t part of Proview QR Menu. Use Help → Start Live Chat to talk to Proview.')}));
A('pq-inbox',()=>{const fb=(App.state.feedbacks||[]).filter(f=>f.unread),rv=(App.state.reviews||[]).filter(r=>r.status==='Waiting');
  drawer({title:'Inbox',width:440,body:(fb.length||rv.length)?`${fb.map(f=>`<a class="review" style="display:block;color:inherit;text-decoration:none" href="#feedbacks--results"><strong style="color:var(--ink)">New feedback · ${esc(f.id)}</strong><div class="help">${esc(f.date)}</div></a>`).join('')}${rv.map(r=>`<a class="review" style="display:block;color:inherit;text-decoration:none" href="#engagement-reviews--all"><strong style="color:var(--ink)">Review waiting · ${'★'.repeat(r.rate)}</strong><div class="help">${esc(r.text)}</div></a>`).join('')}`:UI.empty('mail','Inbox is empty','New feedback and reviews waiting for approval show here.')})});
A('pq-bell',()=>{const w=(App.state.orders||[]).filter(o=>/Waiting|In Progress|Ready/i.test(o.status||''));
  drawer({title:'Notifications',width:440,body:w.length?w.map(o=>`<a class="review" style="display:flex;gap:10px;color:inherit;text-decoration:none" href="#orders-all--live"><span class="itile" style="width:36px;height:36px">${ic('orders','sm')}</span><div><strong style="color:var(--ink)">${esc(o.id)} · ${esc(o.status)}</strong><div class="help">${esc(o.type||'')} · ${esc(o.table||o.customer||'')}</div></div></a>`).join(''):UI.empty('bell','No new notifications','New orders and status changes show here.')})});
A('pq-search',openPalette);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&booted){e.preventDefault();openPalette()}});
function openPalette(){App.modal({title:'Search',body:`<label class="search" style="max-width:none">${ic('search','sm')}<input id="pqQ" placeholder="Pages, menu items, orders, guests…" autocomplete="off"></label><div id="pqRes" style="margin-top:10px;max-height:50vh;overflow:auto"></div>`});
  const q=$('#pqQ'),box=$('#pqRes');const run=()=>{const v=q.value.trim().toLowerCase();if(!v){box.innerHTML='<p class="muted">Type to search.</p>';return}
    const pages=Object.entries(TITLES).filter(([k,t])=>t.toLowerCase().includes(v)&&(k==='locations'||can(featureOf(k)??'menus'))).slice(0,8).map(([k,t])=>row('#'+k,'chev',t,'Page'));
    const items=[];(App.state.menus||[]).forEach(m=>m.sections.forEach(s=>s.items.forEach(i=>{if(i.name.toLowerCase().includes(v)&&items.length<8)items.push(row('#menu-editor--'+m.id,'menu',i.name,m.name))})));
    const ords=(App.state.orders||[]).filter(o=>String(o.id).toLowerCase().includes(v)||String(o.customer||o.table||'').toLowerCase().includes(v)).slice(0,5).map(o=>row('#orders-all--live','orders',o.id,o.status));
    const gs=(App.state.customers||[]).filter(c=>c.name.toLowerCase().includes(v)).slice(0,5).map(c=>row('#engagement-customer--'+c.id,'user',c.name,'Guest'));
    const locs=CTX.sites.filter(s=>s.name.toLowerCase().includes(v)).map(s=>`<button class="dd-row" data-action="pq-pick-site" data-id="${s.id}" data-close style="display:flex;gap:10px;width:100%;padding:9px;border:0;background:none;cursor:pointer;border-radius:8px">${ic('pin','sm')}${esc(s.name)}<small class="muted" style="margin-left:auto">Location</small></button>`);
    box.innerHTML=[...locs,...pages,...items,...ords,...gs].join('')||'<p class="muted">No results.</p>'};
  function row(h,i,t,s){return `<a href="${h}" data-close style="display:flex;gap:10px;align-items:center;padding:9px;border-radius:8px;color:var(--ink-2);text-decoration:none">${ic(i,'sm')}${esc(t)}<small class="muted" style="margin-left:auto">${esc(s||'')}</small></a>`}
  q.addEventListener('input',run);run()}

/* ---------- Locations page ---------- */
let bizQ='';
App.route('locations',()=>{
  if(!CTX.org)return businessesHTML();
  const live=CTX.sites;const admin=isAdmin();
  return `${UI.pageHead({title:`${esc(CTX.org.name)}`,sub:CTX.master?'Proview master · one business at a time':'Your locations and their licences',back:'',
    actions:`${CTX.master?`<button class="btn secondary" data-action="pq-close-org">${ic('back','sm')}All businesses</button>`:''}${!CTX.master&&(CTX.who.memberships||[]).length>1?UI.select((CTX.who.memberships||[]).map(m=>({value:m.org_id,label:m.org_name})),CTX.org.id,'data-change="pq-switch-org" style="width:220px"'):''}${admin?`<button class="btn primary" data-action="pq-add-site">${ic('plus','sm')}Add location</button>`:''}`})}
  ${CTX.org.suspended?`<div class="pq-banner bad">${ic('lock','sm')}This business is paused.</div>`:''}
  <div class="card">${UI.table({cols:['Location','Licence','Ends','Last saved',{label:'',align:'right'}],
    rows:live.map(s=>{const L=lic(s);return [`<div style="display:flex;gap:10px;align-items:center"><span class="avatar">${initials(s.name)}</span><div><strong style="color:var(--ink)">${esc(s.name)}</strong>${s.id===CTX.siteId?' <span class="pill">Open</span>':''}<div class="help" style="margin:0">Added ${fmtD(s.created_at)}</div></div></div>`,
      UI.pill(L.t,L.c),s.license_type==='lifetime'?'Never':s.expires_at?fmtD(s.expires_at):'—',s.last_seen?fmtD(s.last_seen):'—',
      `<div style="display:flex;gap:6px;justify-content:flex-end">${s.archived?'':`<button class="btn primary sm" data-action="pq-pick-site" data-id="${s.id}">Open</button>`}${CTX.master?`<button class="btn secondary sm" data-action="pq-trial" data-id="${s.id}">Trial…</button>`:''}${admin?UI.more([{label:'Rename',icon:'edit',action:'pq-rename-site',data:`data-id="${s.id}"`},{label:s.archived?'Restore':'Archive',icon:'archive',action:'pq-archive-site',data:`data-id="${s.id}" data-v="${s.archived?0:1}"`},{label:'Licence portal',icon:'open',action:'pq-open-lic'}]):''}</div>`]}),
    empty:'No locations yet'})}</div>
  <p class="help" style="margin-top:12px">Licences are managed per location from the <a href="${CFG.lic}" target="_blank" rel="noopener">Proview licence portal</a>. New locations start with a free 3-day trial.</p>`});
function businessesHTML(){
  const list=CTX.orgs.filter(o=>!bizQ||o.name.toLowerCase().includes(bizQ)||(o.contact_email||'').includes(bizQ));
  const empty=`<div class="card">${UI.empty('store','No businesses yet','Add the first business, or check the licence portal.',`<div style="display:flex;gap:8px;justify-content:center"><button class="btn primary" data-action="pq-add-org">${ic('plus','sm')}Add business</button><a class="btn secondary" href="${CFG.lic}" target="_blank" rel="noopener">Licence portal</a><button class="btn ghost" data-action="pq-refresh-orgs">${ic('refresh','sm')}Refresh</button></div>`)}</div>`;
  return `${UI.pageHead({title:'Locations',sub:'Every business using Proview QR Menu. Open one to work in it.',actions:`<a class="btn ghost" href="${CFG.lic}" target="_blank" rel="noopener">${ic('open','sm')}Licence portal</a><button class="btn secondary" data-action="pq-refresh-orgs">${ic('refresh','sm')}Refresh</button><button class="btn primary" data-action="pq-add-org">${ic('plus','sm')}Add business</button>`})}
   <div class="toolbar">${UI.searchBox('Search businesses','data-input="pq-biz-q" value="'+esc(bizQ)+'"')}<span class="muted">${CTX.orgs.length} business${CTX.orgs.length===1?'':'es'}</span></div>
   ${CTX.orgs.length?`<div class="card">${UI.table({cols:['Business','Contact','Locations','Users','',{label:'',align:'right'}],rows:list.map(o=>[`<strong style="color:var(--ink)">${esc(o.name)}</strong><div class="help" style="margin:0">Since ${fmtD(o.created_at)}</div>`,esc(o.contact_email||'—'),o.sites,o.users,
     `${o.self_signup?UI.pill('Self sign-up','grey'):''} ${o.suspended?UI.pill('Paused','bad'):''}`,
     `<div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn primary sm" data-action="pq-open-org" data-id="${o.id}">Open</button>${UI.more([{label:o.suspended?'Unpause':'Pause',icon:'power',action:'pq-suspend-org',data:`data-id="${o.id}" data-v="${o.suspended?0:1}"`},{label:'Delete business',icon:'trash',action:'pq-del-org',danger:1,data:`data-id="${o.id}" data-name="${esc(o.name)}"`}])}</div>`]),empty:'No businesses match'})}</div>`:empty}`}
async function loadOrgs(){const {data,error}=await sb.rpc('pq_orgs_list');if(error)toast(error.message);CTX.orgs=data||[]}
App.after('locations',()=>{if(!CTX.org&&!CTX._orgsLoaded){CTX._orgsLoaded=true;loadOrgs().then(()=>App.render())}});
A('pq-biz-q',el=>{bizQ=el.value.trim().toLowerCase();const p=el.selectionStart;App.render();const n=$('[data-input="pq-biz-q"]');n.focus();n.setSelectionRange(p,p)});
A('pq-refresh-orgs',async()=>{await loadOrgs();App.render();toast('Refreshed')});
A('pq-open-org',async el=>{loader(true);await openOrg(el.dataset.id,null);loader(false);App.go('locations');App.render();fillAcct()});
A('pq-close-org',async()=>{await flush();CTX.org=null;CTX.sites=[];CTX.siteId='all';CTX.role=null;remember();replaceState(window.PV_BLANK(''));await loadOrgs();fillLoc();fillAcct();App.render()});
A('pq-switch-org',async el=>{loader(true);await openOrg(el.value,null);loader(false);App.render();fillAcct()});
A('pq-add-org',()=>modal({title:'Add business',body:`${UI.field({label:'Business name',required:true,control:UI.input({id:'pqNo'})})}${UI.field({label:'Owner email',help:'They sign in with this email (password or Proview account).',control:UI.input({id:'pqNe',type:'email'})})}${UI.field({label:'First location',control:UI.input({id:'pqNl',placeholder:'Main'})})}${UI.field({label:'Phone',control:UI.input({id:'pqNp2',type:'tel'})})}<p class="help">The first location starts on a free 3-day trial. Set its licence in the licence portal.</p>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-add-org-save">Add business</button>`}));
A('pq-add-org-save',async()=>{const {data,error}=await sb.rpc('pq_create_org',{p_name:$('#pqNo').value,p_owner_email:$('#pqNe').value,p_location:$('#pqNl').value,p_phone:$('#pqNp2').value||null});if(error)return toast(error.message);closeModal();await loadOrgs();toast('Business added');await openOrg(data,null);App.render();fillAcct()});
A('pq-suspend-org',async el=>{const {error}=await sb.rpc('pq_update_org',{p_org:el.dataset.id,p_name:null,p_suspended:el.dataset.v==='1'});if(error)return toast(error.message);await loadOrgs();App.render();toast(el.dataset.v==='1'?'Business paused':'Business unpaused')});
A('pq-del-org',el=>modal({title:'Delete '+esc(el.dataset.name)+'?',body:`<p style="margin-top:0">This permanently deletes the business, all its locations, menus, orders and users. It can't be undone.</p>${UI.field({label:'Type the business name to confirm',control:UI.input({id:'pqDelName'})})}`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="pq-del-org-yes" data-id="${el.dataset.id}" data-name="${esc(el.dataset.name)}">Delete permanently</button>`}));
A('pq-del-org-yes',async el=>{if($('#pqDelName').value.trim()!==el.dataset.name)return toast('Type the exact business name');const {error}=await sb.rpc('pq_delete_org',{p_org:el.dataset.id});if(error)return toast(error.message);closeModal();await loadOrgs();App.render();toast('Business deleted')});
A('pq-add-site',()=>modal({title:'Add location',body:UI.field({label:'Location name',required:true,control:UI.input({id:'pqSn',placeholder:'e.g. Soho'})})+'<p class="help">New locations start with a free 3-day trial.</p>',footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-add-site-save">Add location</button>`}));
A('pq-add-site-save',async()=>{const {data,error}=await sb.rpc('pq_add_site',{p_org:CTX.org.id,p_name:$('#pqSn').value});if(error)return toast(error.message);closeModal();await openOrg(CTX.org.id,data,true);App.render();toast('Location added')});
A('pq-rename-site',el=>{const s=CTX.sites.find(x=>x.id===el.dataset.id);modal({title:'Rename location',body:UI.field({label:'Location name',control:UI.input({id:'pqRn',value:s.name})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-rename-save" data-id="${s.id}">Save</button>`})});
A('pq-rename-save',async el=>{const {error}=await sb.rpc('pq_update_site',{p_site:el.dataset.id,p_name:$('#pqRn').value,p_archived:null});if(error)return toast(error.message);closeModal();await openOrg(CTX.org.id,CTX.siteId,true);App.render();toast('Location renamed')});
A('pq-archive-site',async el=>{const {error}=await sb.rpc('pq_update_site',{p_site:el.dataset.id,p_name:null,p_archived:el.dataset.v==='1'});if(error)return toast(error.message);await openOrg(CTX.org.id,CTX.siteId===el.dataset.id?'all':CTX.siteId,true);App.render();toast(el.dataset.v==='1'?'Location archived':'Location restored')});
A('pq-open-lic',()=>window.open(CFG.lic,'_blank','noopener'));
A('pq-trial',el=>{const s=CTX.sites.find(x=>x.id===el.dataset.id);modal({title:'Trial · '+esc(s.name),body:`<p style="margin-top:0">${UI.pill(lic(s).t,lic(s).c)}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${[3,7,30].map(d=>`<button class="btn secondary" data-action="pq-trial-set" data-id="${s.id}" data-days="${d}">+${d} days</button>`).join('')}</div>${UI.field({label:'Or end on a date',control:`<input class="input" type="date" id="pqTd">`})}`,footer:`<button class="btn danger" style="margin-right:auto" data-action="pq-trial-set" data-id="${s.id}" data-clear="1">Clear licence</button><button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-trial-set" data-id="${s.id}" data-date="1">Set date</button>`})});
A('pq-trial-set',async el=>{const args={p_site:el.dataset.id,p_days:el.dataset.days?+el.dataset.days:null,p_until:null,p_clear:!!el.dataset.clear};
  if(el.dataset.date){const v=$('#pqTd').value;if(!v)return toast('Pick a date');args.p_until=new Date(v+'T23:59:00').toISOString()}
  const {error}=await sb.rpc('pq_set_trial',args);if(error)return toast(error.message);closeModal();await openOrg(CTX.org.id,CTX.siteId,true);App.render();toast('Trial updated')});

/* ---------- Users page ---------- */
let members=[];
App.route('users',()=>`${UI.pageHead({title:'Users',sub:`Who can use Proview QR Menu at ${esc(CTX.org?.name||'')}`,actions:`<button class="btn primary" data-action="pq-user" data-email="">${ic('plus','sm')}Add user</button>`})}
  <div class="card">${UI.table({cols:['User','Role','Locations','Features',{label:'',align:'right'}],rows:members.map(m=>{const self=m.email===CTX.email;
    const locs=['owner','admin'].includes(m.role)?'All locations':(m.site_ids||[]).map(id=>CTX.sites.find(s=>s.id===id)?.name).filter(Boolean).join(', ')||'<span style="color:var(--bad)">None</span>';
    const ov=Object.entries(m.features||{});
    return [`<div style="display:flex;gap:10px;align-items:center"><span class="avatar">${initials(m.name||m.email)}</span><div><strong style="color:var(--ink)">${esc(m.name||m.email.split('@')[0])}</strong>${self?' <span class="pill">You</span>':''}<div class="help" style="margin:0">${esc(m.email)}</div></div></div>`,
      UI.pill({owner:'Owner',admin:'Admin',manager:'Manager',staff:'Staff'}[m.role],m.role==='owner'?'':'grey'),locs,ov.length?`${ov.length} custom`:'Role default',
      self?'<span class="help">You can\'t change your own access</span>':`<div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn secondary sm" data-action="pq-user" data-email="${esc(m.email)}">Edit</button><button class="btn ghost sm" data-action="pq-user-del" data-email="${esc(m.email)}" style="color:var(--bad)">Remove</button></div>`]}),empty:'No users yet'})}</div>
  <p class="help" style="margin-top:12px">People sign in at this address with the email you add here, using their own password (“Start your free trial” creates one) or their Proview account. Owners and Admins always see every location. Managers and Staff see only the locations you tick.</p>`,{nav:'users'});
App.after('users',()=>{if(!CTX._mLoaded){CTX._mLoaded=true;loadMembers()}});
async function loadMembers(){const {data,error}=await sb.from('pq_members').select('*').eq('org_id',CTX.org.id).order('created_at');if(error)return toast(error.message);members=data||[];App.render();CTX._mLoaded=false}
A('pq-user',el=>{const m=members.find(x=>x.email===el.dataset.email)||{email:'',role:'staff',site_ids:[],features:{}};const canOwner=CTX.master||CTX.role==='owner';
  const live=CTX.sites.filter(s=>!s.archived);
  drawer({title:m.email?'Edit user':'Add user',body:`${UI.field({label:'Email',required:true,control:UI.input({id:'pqUe',type:'email',value:m.email,attrs:m.email?'readonly':''})})}${UI.field({label:'Name',control:UI.input({id:'pqUn',value:m.name||''})})}
    ${UI.field({label:'Role',control:UI.select([...(canOwner?[{value:'owner',label:'Owner – everything, manages users and owners'}]:[]),{value:'admin',label:'Admin – everything, manages users'},{value:'manager',label:'Manager – ticked locations only'},{value:'staff',label:'Staff – ticked locations, front-of-house'}],m.role,'id="pqUr" data-change="pq-user-role"')})}
    <div id="pqUsites">${UI.field({label:'Locations',control:live.map(s=>`<div style="padding:4px 0">${UI.check(esc(s.name),(m.site_ids||[]).includes(s.id),`data-site="${s.id}"`)}</div>`).join('')||'<p class="muted">No locations yet.</p>'})}</div>
    <h3 style="margin:18px 0 6px">Features</h3><p class="help" style="margin-top:0">“Role default” follows the role. Switch on or off to override.</p>
    ${FEATURES.map(([k,l])=>{const v=m.features?.[k];return `<div class="pq-feat"><span>${l}</span>${UI.select([{value:'',label:'Role default'},{value:'on',label:'On'},{value:'off',label:'Off'}],v===true?'on':v===false?'off':'','data-feat="'+k+'"')}</div>`}).join('')}`,
    footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-user-save">Save</button>`});
  roleSites()});
function roleSites(){const r=$('#pqUr')?.value;const b=$('#pqUsites');if(b)b.style.display=['owner','admin'].includes(r)?'none':''}
A('pq-user-role',roleSites);
A('pq-user-save',async()=>{const role=$('#pqUr').value;const sites=['owner','admin'].includes(role)?[]:$$('#drawer [data-site]').filter(c=>c.checked).map(c=>c.dataset.site);
  if(!['owner','admin'].includes(role)&&!sites.length)return toast('Tick at least one location');
  const feats={};$$('#drawer [data-feat]').forEach(s=>{if(s.value)feats[s.dataset.feat]=s.value==='on'});
  const {error}=await sb.rpc('pq_set_member',{p_org:CTX.org.id,p_email:$('#pqUe').value,p_role:role,p_site_ids:sites,p_features:feats,p_name:$('#pqUn').value||null});
  if(error)return toast(error.message);closeDrawer();toast('User saved');loadMembers()});
A('pq-user-del',el=>modal({title:'Remove '+esc(el.dataset.email)+'?',body:'<p style="margin:0">They will lose access to this business straight away.</p>',footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="pq-user-del-yes" data-email="${esc(el.dataset.email)}">Remove</button>`}));
A('pq-user-del-yes',async el=>{const {error}=await sb.rpc('pq_remove_member',{p_org:CTX.org.id,p_email:el.dataset.email});if(error)return toast(error.message);closeModal();toast('User removed');loadMembers()});

/* refresh access every 5 minutes (removed users / ended licences take effect) */
setInterval(async()=>{if(!booted||!CTX.email)return;const {data}=await sb.rpc('pq_whoami');if(!data)return;CTX.who=data;
  if(!CTX.master&&CTX.org&&!(data.memberships||[]).some(m=>m.org_id===CTX.org.id)){await sb.auth.signOut();purge();location.reload();return}
  if(CTX.org){const {data:s}=await sb.rpc('pq_sites_of',{p_org:CTX.org.id});if(s){CTX.sites=s;fillLoc()}}},300000);

window.PQ.start=start;
})();
