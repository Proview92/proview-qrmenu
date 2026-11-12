/* Proview QR Menu – sign-in, master login, the business dropdown, licences, users, per-location saving.
   Follows the Proview access model used by Bookings, Employee, Signage, Label and WiFi. */
(function(){
'use strict';
const CFG={url:'https://yblafwttmqaqvfvedaoc.supabase.co',key:'sb_publishable_mcs45XaG9XHMWbyXO_PyCw_NQaQ08MR',
  dash:'https://dashboard.proviewcrm.co.uk/',lic:'https://license.proviewcrm.co.uk/'/* licence portal: master-only links */,phone:'020 8935 5495',app:'Proview QR Menu'};
const {$,$$,UI,modal,drawer,closeModal,closeDrawer}=App;
const pending=[];const toast=m=>{if(document.getElementById('toast'))App.toast(m);else pending.push(m)};const {ic,esc,initials}=UI;
// a password-reset / Add business invite link (#...type=recovery): read before the client clears the URL, so start()
// shows "Choose a new password" instead of opening the app with the recovery session
let pqRecovery=/(^|[#&])type=recovery(&|$)/.test(location.hash);
// The master's database requests name the business this tab opened from the licence portal (x-pq-org header, read by
// pq_master_in, migration 011): the database gives the master that business only. Nobody else has it set.
const pqFetch=(url,init)=>{let o=null;try{o=sessionStorage.getItem('pv_master_open')}catch(e){}
  if(!o||!/\/rest\/v1\//.test(String(url)))return fetch(url,init);const h=new Headers((init&&init.headers)||{});h.set('x-pq-org',o);return fetch(url,{...(init||{}),headers:h})};
const sb=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{fetch:pqFetch}});
const ls={get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const CTX={email:'',master:false,who:null,org:null,role:null,member:null,sites:[],siteId:'all',orgs:[]};
// The master has no view of their own (MASTER_OPEN_SPEC.md / MASTER_OPEN_PROTOCOL.md): they open ONE location from the
// licence portal (Open in Proview QR Menu). sso-login checks the signed biz claim and replies open=<business id>; it is kept
// for this tab only (sessionStorage pv_master_open), so a reload stays in that business. Signed in any other way the master
// only sees "Open a business from the licence portal". An open= in the address is never trusted, only removed.
const OPEN_KEY='pv_master_open';
const openGet=()=>{try{return sessionStorage.getItem(OPEN_KEY)||null}catch(e){return null}};
const openSet=v=>{try{if(v)sessionStorage.setItem(OPEN_KEY,v);else sessionStorage.removeItem(OPEN_KEY)}catch(e){}};
function cleanOpenParam(){const L=location;if(!/[?&#]open=/.test(L.search+L.hash))return;
  const q=L.search.replace(/^\?/,'').split('&').filter(x=>x&&!/^open=/.test(x)).join('&'),h=L.hash.replace(/^#/,'').split('&').filter(x=>x&&!/^open=/.test(x)).join('&');
  history.replaceState(null,'',L.pathname+(q?'?'+q:'')+(h?'#'+h:''))}
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
  if(s.license_type.startsWith('trial'))return{k:'trial',t:`Trial · ${days} day${days>1?'s':''} left`,c:'warn',days};
  return{k:'ok',t:'Active until '+fmtD(s.expires_at),c:days<=14?'warn':'ok',days}}

/* ---------- styles ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>
#pqAuth{position:fixed;inset:0;background:var(--page);z-index:150;overflow:auto;display:none}
#pqAuth.show{display:grid;place-items:center;padding:24px}
.pq-card{background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow);width:min(420px,100%);padding:32px}
.pq-card .logo{display:flex;align-items:center;gap:10px;margin-bottom:22px}.pq-card .logo .ico{width:44px;height:44px;border-radius:12px;background:var(--brand-700);color:#fff;display:grid;place-items:center}
.pq-card h1{font-size:24px;line-height:30px}.pq-card .btn{width:100%;height:46px}
.pq-or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px;margin:18px 0}.pq-or::before,.pq-or::after{content:"";flex:1;border-top:1px solid var(--border)}
.pq-msg{border-radius:var(--r-md);padding:10px 12px;margin-bottom:14px;font-size:14px}.pq-msg.err{background:var(--bad-tint);color:var(--bad)}.pq-msg.ok{background:var(--ok-tint);color:var(--ok)}.pq-msg.info{background:var(--brand-tint);color:var(--brand-900)}
.nav a.grey{opacity:.42}
.pq-banner{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:var(--r-md);margin-bottom:18px;font-weight:600}
.pq-banner.warn{background:var(--warn-tint);color:var(--warn)}.pq-banner.bad{background:var(--bad-tint);color:var(--bad)}.pq-banner .btn{margin-left:auto}
.pq-lock{max-width:560px;margin:40px auto;text-align:center}
.pq-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:18px 0}
.pq-feat{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}
.pq-master-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:9px 14px;margin-bottom:16px;border-radius:var(--r-md);background:var(--brand-tint);color:var(--ink);font-size:14px}
.pq-master-bar>span{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}.pq-master-bar svg{width:16px;height:16px;color:var(--brand-700);flex:none}
.pq-portal{max-width:560px;margin:48px auto;text-align:center}
.pq-locpick{display:flex;align-items:center;gap:10px;margin:0 0 16px;font-weight:600}.pq-locpick select{width:auto;min-width:200px;height:38px}
.pq-thisloc .row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--border)}.pq-thisloc .row:first-of-type{border-top:0}.pq-thisloc .row .grow{flex:1;min-width:200px}
</style>`);
const APPICON=ic('qr');
// the splash (#pqLoad) is in index.html, so it shows before any script runs
if(!document.getElementById('pqLoad'))document.body.insertAdjacentHTML('afterbegin','<div id="pqLoad" role="status" aria-label="Loading Proview QR Menu"><div class="pv-splash-icon"></div></div>');
document.body.insertAdjacentHTML('afterbegin',`<div id="pqAuth"></div>`);
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
  <div class="auth2-links"><a href="#" data-pq="signup">New here? Create a login</a><a href="#" data-pq="forgot">Forgot password?</a></div>`);
  $('#pqSignIn').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='Signing in…';
    const {error}=await sb.auth.signInWithPassword({email:$('#pqEmail').value.trim(),password:$('#pqPass').value});
    if(error){signInScreen(/confirm/i.test(error.message)?'Confirm your email address first (check your inbox).':'Wrong email or password.');return}
    openSet(null);afterSignIn()}}
const FORM='style="display:flex;flex-direction:column;gap:14px;margin:0;padding:0;border:0;box-shadow:none" novalidate';
function signUpScreen(note=''){authShow(`<h1>Create your login</h1><p class="auth2-mut">Then set up your business and buy a licence to start using Proview QR Menu.</p>${msg(note)}
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
  $('#pqNewPw').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.updateUser({password:$('#pqPass').value});if(error)return newPasswordScreen(error.message);pqRecovery=false;toast('Password updated');afterSignIn()}}
function trialSetupScreen(note=''){authShow(`<h1>Set up your business</h1><p class="auth2-mut">Add your business and first location${CTX.email?' as '+esc(CTX.email):''}. Then buy a licence to start using Proview QR Menu.</p>${msg(note)}
  <form id="pqTrial" ${FORM}>${inp('pqBiz','Business name','text','required maxlength="120" autocomplete="organization" placeholder="e.g. Alici\'s"')}${inp('pqLocName','First location','text','maxlength="120" placeholder="Same as the business name"')}${inp('pqPhone','Phone (optional)','tel','')}
  <button class="go" type="submit">Set up my business</button><button class="ghost2" type="button" data-pq="signout">Sign out</button>
  <p class="hint">The location stays locked until you buy a licence (online straight after this, paid securely with Stripe, or call Proview on ${CFG.phone}). Joining an existing business? Ask its owner to add your email, then sign in again.</p></form>`);
  $('#pqTrial').onsubmit=async e=>{e.preventDefault();const b=$('#pqBiz').value.trim();if(!b)return trialSetupScreen('Enter your business name.');
    const go=e.target.querySelector('.go');go.disabled=true;go.textContent='Setting up…';
    const {error}=await sb.rpc('pq_self_trial',{p_business:b,p_location:$('#pqLocName').value||null,p_phone:$('#pqPhone').value||null});
    if(error)return trialSetupScreen(error.message);toast('Your business is set up. Buy a licence to start using Proview QR Menu.');afterSignIn()}}
document.addEventListener('click',e=>{const a=e.target.closest('[data-pq]');if(!a)return;e.preventDefault();
  ({signin:()=>signInScreen(),signup:()=>signUpScreen(),forgot:()=>forgotScreen(),signout:()=>signOut()})[a.dataset.pq]?.()});

/* ---------- session flow ---------- */
let booted=false,fallback;
// a new hand-off arriving in this tab (e.g. the licence portal reusing it): start again so it is read like a fresh one
addEventListener('hashchange',()=>{if(/pv_sso=/.test(location.hash))location.reload()});
async function start(){
  window.PQ.started=true;loader(true);fallback=setTimeout(()=>{if(!booted)signInScreen('Taking longer than usual. Please sign in.','info')},8000);
  const m=location.hash.match(/pv_sso=([^&]+)/);cleanOpenParam();
  if(m){history.replaceState(null,'',location.pathname+location.search);
    try{const r=await fetch(CFG.url+'/functions/v1/sso-login',{method:'POST',headers:{'content-type':'application/json',apikey:CFG.key},body:JSON.stringify({assertion:decodeURIComponent(m[1])})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||'Sign-in failed');
      const {error}=await sb.auth.verifyOtp({token_hash:j.token_hash,type:'magiclink'});if(error)throw error;
      openSet(typeof j.open==='string'&&j.open?j.open:null)}   // the business the master opened in the licence portal (none: the portal page)
    catch(err){clearTimeout(fallback);return signInScreen(err.message)}}
  sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY'){pqRecovery=true;clearTimeout(fallback);newPasswordScreen()}});
  const {data:{session}}=await sb.auth.getSession();
  if(!session){clearTimeout(fallback);return signInScreen()}
  if(pqRecovery){clearTimeout(fallback);return newPasswordScreen()}   // signed in by the link: choose a password first
  afterSignIn()}
async function afterSignIn(){
  loader(true);const {data:who,error}=await sb.rpc('pq_whoami');clearTimeout(fallback);
  if(error||!who){return signInScreen(error?.message||'Could not load your account.')}
  if(!who.email){await sb.auth.signOut();return signInScreen()}
  CTX.email=who.email;CTX.master=who.master;CTX.who=who;
  // device cache: forget businesses this person can no longer open
  const saved=ls.get('pq_last_'+who.email)||{};
  const mems=who.memberships||[];
  if(!CTX.master&&!mems.length){CTX.email=who.email;return trialSetupScreen()}   // no free trials (007): anyone without a business can set one up; it starts with no licence
  CTX.biz=[];
  if(CTX.master){const orgId=openGet();
    if(orgId){const ok=await openOrg(orgId,(ls.get(lastKey())||{}).site,true);
      if(!ok){CTX.org=null;CTX.sites=[];CTX.siteId='all';pending.push('That business is no longer in Proview QR Menu. Open a business from the licence portal.')}}}
  else{
    // MULTI_BUSINESS_PICKER_STANDARD.md: the business used last (per email); if it is paused, has no working licence or no
    // location for this person, the next usable one by name. No "choose a business" page. Signed out only when none can be opened.
    const infos=await Promise.all(mems.map(m=>bizInfo(m.org_id)));
    CTX.biz=mems.map((m,i)=>({id:m.org_id,name:m.org_name||infos[i].org?.name||'',live:infos[i].sites.filter(x=>!x.archived).length,usable:usable(infos[i])})).filter(x=>x.live).sort(byName);
    if(!CTX.biz.length){await sb.auth.signOut();purge();return signInScreen('Ask your owner or Proview to give you access to a location.','info')}
    const i=Math.max(-1,CTX.biz.findIndex(x=>x.id===saved.org)),order=[...CTX.biz.slice(i<0?0:i),...CTX.biz.slice(0,i<0?0:i)];
    const pick=order.find(x=>x.usable)||(CTX.biz.find(x=>x.id===saved.org)||CTX.biz[0]);   // none usable: the last used (its lock and Buy online show)
    const ok=await openOrg(pick.id,ls.get(siteKey(pick.id))||(pick.id===saved.org?saved.site:null),true);
    if(!ok){await sb.auth.signOut();purge();return signInScreen('Ask your owner or Proview to give you access to a location.','info')}
    if(saved.org&&pick.id!==saved.org&&CTX.biz.some(x=>x.id===saved.org))ls.set(lastKey(),saved);   // a fallback is not saved over the last used
    fillLoc()}
  CTX.orgs=CTX.org?[CTX.org]:[];   // never a list of every business
  $('#pqAuth').classList.remove('show');
  if(!booted){booted=true;App.boot();decorateShell();loadPlans();if(pending.length)setTimeout(()=>App.toast(pending.splice(0).pop()),300)}
  if(CTX.master&&!CTX.org){App.go('portal');App.render()}
  else if(CTX.siteId==='all'){App.go('noloc');App.render()}
  else{if(['portal','locations','noloc',''].includes(App.current().split('--')[0]))App.go('dashboard');App.render()}
  loader(false)}
function purge(){Object.keys(localStorage).filter(k=>k.startsWith('pq_')).forEach(k=>ls.del(k))}
async function signOut(){await flush();await sb.auth.signOut();purge();openSet(null);location.hash='';location.reload()}

/* ---------- business / location switching ---------- */
async function openOrg(orgId,siteId,quiet){
  await flush();
  const mem=(CTX.who.memberships||[]).find(m=>m.org_id===orgId);
  const {data:sites,error}=await sb.rpc('pq_sites_of',{p_org:orgId});if(error){toast(error.message);return false}
  const {data:org}=await sb.from('pq_orgs').select('*').eq('id',orgId).maybeSingle();if(!org)return false;
  CTX.org=org;CTX.member=mem||null;CTX.role=CTX.master?(mem?.role||'master'):mem.role;CTX.sites=(sites||[]).filter(s=>!s.archived||isAdmin());
  const live=CTX.sites.filter(s=>!s.archived);
  if(!CTX.master&&!live.length)return false;
  const first=live.slice().sort(byName)[0];
  let target=siteId&&live.find(s=>s.id===siteId)?siteId:(first?first.id:'all');   // no "All locations" view: every page is one location
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
// the last location, per person (the master: per business opened, so the open business never changes)
const lastKey=()=>'pq_last_'+CTX.email+(CTX.master?':'+(CTX.org?.id||openGet()||''):'');
function remember(){if(!CTX.email)return;ls.set(lastKey(),{org:CTX.org?.id||null,site:CTX.siteId});if(CTX.org&&CTX.siteId!=='all')ls.set(siteKey(CTX.org.id),CTX.siteId)}
// the location used last in each business (the header picks businesses; a page's location select picks the location)
const siteKey=org=>'pq_site_'+CTX.email+':'+org;
const byName=(a,b)=>String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'});
async function bizInfo(orgId){const [a,b]=await Promise.all([sb.rpc('pq_sites_of',{p_org:orgId}),sb.from('pq_orgs').select('*').eq('id',orgId).maybeSingle()]);return {org:b.data||null,sites:Array.isArray(a.data)?a.data:[]}}
// usable = not paused, and at least one location this person can open with a working licence
const usable=i=>!!i.org&&!i.org.suspended&&i.sites.some(x=>!x.archived&&['ok','trial'].includes(lic(x).k));

/* ---------- saving ---------- */
let lastSaved=null,saveT=null,saving=null;
const snapshot=()=>{const {integrations,...rest}=App.state;return JSON.stringify(rest)};
function dot(k){const d=$('#pqDot');if(!d)return;d.className='hdr-dot '+(k||'');d.title=d.ariaLabel={saving:'Saving…',offline:'Offline – changes will save when you reconnect',error:'Not saved'}[k]||'Online · all changes saved'}
function queueSave(){if(CTX.siteId==='all'||!CTX.org)return;clearTimeout(saveT);saveT=setTimeout(save,900)}
async function save(){if(CTX.siteId==='all'||!booted)return;const snap=snapshot();if(snap===lastSaved)return;
  if(!navigator.onLine){dot('offline');return}
  dot('saving');const sid=CTX.siteId;const {error}=await (saving=sb.rpc('pq_save_state',{p_site:sid,p_data:JSON.parse(snap)}));saving=null;
  if(error){dot('error');toast(String(error.message||'').replace(/Renew at license\.proviewcrm\.co\.uk or call/i,'Buy or renew online, or call Proview on'));return}if(sid===CTX.siteId)lastSaved=snap;dot()}
async function flush(){clearTimeout(saveT);if(saving)await saving;await save()}
['click','change','input','drop','keyup'].forEach(ev=>document.addEventListener(ev,()=>setTimeout(queueSave,60),true));
addEventListener('online',()=>{dot();queueSave()});addEventListener('offline',()=>dot('offline'));
addEventListener('beforeunload',e=>{if(CTX.siteId!=='all'&&lastSaved!==null&&snapshot()!==lastSaved){save();e.preventDefault();e.returnValue=''}});
setInterval(queueSave,15000);

/* ---------- header (Proview standard) ---------- */
const TITLES={dashboard:'Dashboard',noloc:'Proview QR Menu',users:'Users','menu-management':'Menus','menu-editor':'Menu editor','menu-create':'Create a Menu','menu-builder':'Menu Builder','menu-modifiers':'Modifiers','translation-center':'Translation Center','in-app-promotions':'In-App Promotions','website-builder':'AI Website Builder','website-builder-build':'AI Website Builder','website-editor':'Website editor','brand-kit':'AI Brand Kit','brand-kit-scratch':'AI Brand Kit','ai-media-studio':'AI Media Studio','ai-marketing':'AI Marketing Hub','ai-marketing-create':'Create Post','ai-reports':'AI Reports','ai-media-library':'AI Media Library',orders:'Orders','orders-all':'All Orders','orders-settings':'Ordering Settings','orders-archived':'Archived Orders',reservations:'Reservations','reservations-list':'Reservations',engagement:'Guests & Engagement','engagement-customers':'Customers','engagement-customer':'Customer','engagement-promo-codes':'Promo Codes','engagement-settings':'Engagement Settings','engagement-reviews':'Reviews',feedbacks:'Feedbacks','feedback-form':'Feedback form',reports:'Reports',marketplace:'Marketplace',settings:'Settings'};
function title(key){if(TITLES[key])return TITLES[key];const k=Object.keys(TITLES).filter(t=>key.startsWith(t)).sort((a,b)=>b.length-a.length)[0];return TITLES[k]||'Proview QR Menu'}
// Signage's header icons (24px line icons, 1.8 stroke): HEADER_REFERENCE.md §4
const SV=(d,cls='')=>`<svg ${cls?`class="${cls}" `:''}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const HI={search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  building:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/>'};
App.SV=SV;App.HI=HI;
function decorateShell(){
  const top=$('.top');
  // the Proview header, exactly as Signage's shell(): title, business picker, grey tray, Dashboard, avatar, red sign-out
  top.innerHTML=`<h2 id="pqTitle">Dashboard</h2>
   <div class="hdr-pick"><label class="sr" for="hdr-site">Business</label><select id="hdr-site" aria-label="Business"></select></div>
   <div class="sp"></div>
   <div class="hdr-cap"><span class="hdr-dot" id="pqDot" role="img" aria-label="Online" title="Online"></span>
     <button type="button" class="hub-search" data-action="pq-search" title="Search (Ctrl+K)" aria-label="Search (Ctrl+K)">${SV(HI.search)}</button>
     <button type="button" class="hub-chat" data-action="pq-chat" title="Team chat" aria-label="Team chat">${SV(HI.chat)}<span class="hub-badge"></span></button>
     <button type="button" class="hub-inbox" data-action="pq-inbox" title="Inbox" aria-label="Inbox">${SV(HI.mail)}<span class="hub-badge" id="pqMailCnt"></span></button>
     <button type="button" class="bell" data-action="pq-bell" title="Notifications" aria-label="Notifications">${SV(HI.bell)}<span class="bell-dot hidden" id="pqBellCnt"></span></button></div>
   <a class="pv-dash" id="pqDash" href="${CFG.dash}" title="Proview dashboard: all your Proview apps" aria-label="Proview dashboard">${SV(HI.grid)}<span>Dashboard</span></a>
   <div class="top-me"><button type="button" class="top-av" id="pqAv" aria-label="My account" aria-haspopup="menu" aria-expanded="false">?</button>
     <button type="button" class="icon-btn top-out" data-action="pq-signout" title="Sign out" aria-label="Sign out">${SV(HI.logout)}</button></div>`;
  $('#hdr-site').addEventListener('change',e=>chooseBiz(e.target.value));
  $('#pqAv').addEventListener('click',e=>{e.stopPropagation();acctMenu(e.detail===0)});
  // Proview shell: the business picker lives in the header only; the menu ends with COLLAPSE (as Label, Signage, Bookings)
  const vb=$('.side .venue');if(vb)vb.closest('.dd').remove();
  const cr=$('.side .credits');if(cr)cr.remove();
  const col=localStorage.getItem('pq.sideCollapsed')==='1';App._userCollapsed=col;$('#app').classList.toggle('collapsed',col);
  $('.side').insertAdjacentHTML('beforeend',`<div class="side-foot"><button class="sf-link" id="sfCollapse" data-action="collapse" title="${col?'Expand menu':'Collapse menu'}" aria-label="${col?'Expand menu':'Collapse menu'}">${SV('<path d="m15 18-6-6 6-6"/>')}<span class="lbl">COLLAPSE</span></button></div>`);
  const brand=$('.side .brand');if(brand)brand.outerHTML=`<a class="brand" href="#dashboard" title="Proview QR Menu"><span class="brand-mark" role="img" aria-label=""></span><span class="wordmark">PROVIEW<span>QR MENU</span></span></a>`;
  fillLoc();fillAcct()}
const roleName=()=>CTX.master?'Proview master':({owner:'Owner',admin:'Admin',manager:'Manager',staff:'Staff'})[CTX.role]||'';
// avatar initials from the email's first part, exactly as Signage ("A" for altun@)
const avInit=()=>initials(CTX.email.split('@')[0].replace(/[._-]+/g,' '));
function fillAcct(){const av=$('#pqAv');if(!av)return;av.textContent=avInit();
  av.title=[CTX.email.split('@')[0],[roleName(),CTX.org?.name].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');
  $('#pqDash').style.display=(CTX.master||['owner','admin'].includes(CTX.role))?'':'none'}
// the account menu under the avatar (Signage's PVHub.accountMenu look): who you are, then the account actions
function acctMenu(kbd){let m=$('#pqAcct');const av=$('#pqAv');if(m){closeAcct();return}
  const it=(act,icon,label,cls='')=>`<button type="button" class="pv-acct-i ${cls}" role="menuitem" data-action="${act}">${icon}<span>${label}</span></button>`;
  m=document.createElement('div');m.id='pqAcct';m.className='pv-acct';m.setAttribute('role','menu');
  m.innerHTML=`<div class="pv-acct-h"><span class="hub-av">${esc(avInit())}</span><div class="ct"><b>${esc(CTX.email.split('@')[0])}</b><small>${esc(CTX.email)}</small><small>${esc([roleName(),CTX.org?.name].filter(Boolean).join(' · '))}</small></div></div>
   ${CTX.org&&isAdmin()&&can('users')?it('pq-users',SV(HI.users),'Users &amp; access'):''}
   ${it('account',ic('user','sm'),'Account settings')}${it('pq-change-pw',ic('lock','sm'),'Change password')}
   ${CTX.org&&CTX.siteId!=='all'?it('copy-menu-link',ic('share','sm'),'Copy menu link')+it('preview-qr',ic('qr','sm'),'Preview QR Menu'):''}
   ${it('whats-new',ic('rocket','sm'),"What's new")}${it('support',SV(HI.help),'Help')}${it('live-chat',ic('msg','sm'),'Start live chat')}
   ${it('change-language',ic('translate','sm'),'Change language')}${it('theme',ic('sun','sm'),'Change theme')}
   <div class="pv-acct-sep"></div>${it('pq-signout',SV(HI.logout),'Sign out')}`;
  document.body.appendChild(m);const r=av.getBoundingClientRect();m.style.top=(r.bottom+8)+'px';m.style.right=Math.max(8,innerWidth-r.right)+'px';
  av.setAttribute('aria-expanded','true');const items=[...m.querySelectorAll('.pv-acct-i')];if(kbd&&items[0])items[0].focus();
  m.addEventListener('keydown',e=>{const i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();items[(i+1)%items.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();items[(i-1+items.length)%items.length].focus()}});
  m.addEventListener('click',e=>{if(e.target.closest('.pv-acct-i'))setTimeout(closeAcct,0)})}
function closeAcct(focus){const m=$('#pqAcct');if(!m)return;m.remove();const av=$('#pqAv');if(av){av.setAttribute('aria-expanded','false');if(focus)av.focus()}}
document.addEventListener('click',e=>{if(!e.target.closest('#pqAcct')&&!e.target.closest('#pqAv'))closeAcct()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#pqAcct'))closeAcct(true)});
addEventListener('hashchange',()=>closeAcct());
App.action('pq-users',()=>App.go('users'));
// the header dropdown (MULTI_BUSINESS_PICKER_STANDARD.md, OWNER UPDATE 07:47): business names only, by name. Picking one
// opens it (the location used last there). One business, and the master inside the business opened from the licence
// portal: its name in a disabled box. Locations are picked with the select at the top of each page (locPickHTML).
function fillLoc(){const sel=$('#hdr-site');if(!sel)return;
  const o=(v,t,on)=>`<option value="${esc(v)}" title="${esc(t)}"${on?' selected':''}>${esc(t)}</option>`;
  const w=sel.closest('.hdr-pick');if(w)w.hidden=!CTX.org;   // the master before a business is opened: no dropdown
  if(!CTX.org){sel.innerHTML='';sel.disabled=true;return}
  const list=CTX.master?[]:(CTX.biz||[]);
  if(list.length<2){sel.innerHTML=o(CTX.org.id,CTX.org.name,true);sel.disabled=true}
  else{sel.disabled=false;sel.innerHTML=list.map(x=>o(x.id,x.name,x.id===CTX.org.id)).join('')}
  sel.title=CTX.org.name}
async function chooseBiz(v){
  if(CTX.master||!CTX.org||v===CTX.org.id||!(CTX.biz||[]).some(x=>x.id===v))return;   // only this person's own businesses
  loader(true);const ok=await openOrg(v,ls.get(siteKey(v)),true);loader(false);
  if(!ok){toast('There is no location for you in that business.');fillLoc();return}
  CTX.orgs=[CTX.org];fillAcct();toast('Opened '+CTX.org.name);
  if(CTX.siteId==='all')App.go('noloc');else if(['noloc','users'].includes(App.current().split('--')[0])||CTX.role==='staff')App.go('dashboard');App.render()}
// the location select at the top of a page, only when the open business has more than one location
function locPickHTML(){const live=CTX.org?CTX.sites.filter(s=>!s.archived).slice().sort(byName):[];if(live.length<2)return '';
  return `<div class="pq-locpick"><label for="pqLoc">Location</label><select id="pqLoc" class="input" data-change="pq-loc">${live.map(s=>`<option value="${esc(s.id)}"${s.id===CTX.siteId?' selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`}
async function chooseLoc(v){
  if(!CTX.org||v===CTX.siteId||!CTX.sites.some(s=>s.id===v&&!s.archived))return;   // only the open business's locations
  await openSite(v);App.render()}

/* ---------- wrap the app's render: guard, nav, title, licence ---------- */
const baseRender=App.render;
App.render=function(){
  if(!booted)return;
  let key=App.current().split('--')[0];
  const f=featureOf(key);
  if(CTX.master&&!CTX.org){if(key!=='portal'){location.hash='portal';return}}
  else if(key==='portal'||key==='locations'){location.hash=CTX.siteId==='all'?'noloc':'dashboard';return}   // no Locations page (owner, 12 Nov): old links go home
  else if(key!=='noloc'&&key!=='users'&&(!CTX.org||CTX.siteId==='all')){location.hash='noloc';return}
  else if(key==='noloc'&&CTX.siteId!=='all'){location.hash='dashboard';return}
  if(f&&!can(f)){toast("You don't have access to that page");location.hash='dashboard';return}
  baseRender();
  // title
  // the page title is shown only in the top bar (no H1 in the page). Pages about one thing (a guest, a form…) show its name.
  const pt=App.pageTitle?(()=>{const d=document.createElement('div');d.innerHTML=App.pageTitle;return d.textContent.trim()})():'';
  const T=(App.current().includes('--')&&pt)||title(key)||pt;
  const t=$('#pqTitle');if(t){t.textContent=T;t.title=T}document.title=T+' · Proview QR Menu';
  decorateNav(key);
  // Proview IQ answers questions about one location's data: not on the Locations page
  const fab=$('.fab');if(fab)fab.style.display=key==='noloc'||key==='portal'?'none':'';
  // the master inside a location's business: a small, clear bar on every page, with the way back to the portal
  if(CTX.master&&CTX.org){const v=$('#view');if(v)v.insertAdjacentHTML('afterbegin',`<div class="pq-master-bar" role="status"><span>${SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}<b>Viewing ${esc(CTX.org.name)} as Proview</b><span class="muted"> · you’re acting as its Owner</span></span><a class="btn secondary sm" href="${CFG.lic}" rel="noopener">Back to licence portal</a></div>`)}
  // licence banner / lock
  if(key!=='noloc'&&key!=='users'&&key!=='portal'&&CTX.org&&CTX.siteId!=='all'){const s=site(),L=lic(s),v=$('#view');
    if(CTX.org?.suspended)v.innerHTML=lockHTML('This business is paused','Please contact Proview to reactivate it.');
    else if(L.k==='expired'||L.k==='none'){if(CTX.master)v.insertAdjacentHTML('afterbegin',`<div class="pq-banner bad">${ic('lock','sm')}${esc(s.name)}: ${L.t}. You can still edit as Proview master.<a class="btn secondary sm" href="${CFG.lic}" target="_blank" rel="noopener">Licence portal</a></div>`);
      else v.innerHTML=L.k==='none'?lockHTML('No licence yet',`${esc(s.name)}: buy a licence to start using Proview QR Menu.`,true):lockHTML('This business’s licence has ended',`Renew to keep using ${esc(s.name)}. Your menus and data are safe.`)}
    else if(L.k==='trial'||(L.k==='ok'&&L.days<=14))v.insertAdjacentHTML('afterbegin',`<div class="pq-banner warn">${ic('clock','sm')}${esc(s.name)}: ${L.t}<button class="btn primary sm" data-action="pq-renew">${L.k==='trial'?'Buy a licence':'Renew'}</button></div>`)}
  // Settings → This location (it replaces the Locations page)
  if(key==='settings'&&App.current()==='settings'&&CTX.org&&CTX.siteId!=='all'){const v=$('#view');if(v&&!v.querySelector('.pq-lock'))v.insertAdjacentHTML('beforeend',thisLocHTML())}
  // a page about one location: its location select at the top when the business has several (also above a lock)
  if(key!=='users'&&key!=='portal'&&key!=='noloc'&&CTX.org&&CTX.siteId!=='all'){const v=$('#view'),lp=locPickHTML();if(v&&lp)v.insertAdjacentHTML('afterbegin',lp)}
  updateCounts()};
function decorateNav(key){const nav=$('#nav');if(!nav)return;
  const allMode=!CTX.org||CTX.siteId==='all';
  // Users under Setup (no Locations page; the master before a business is opened: every page greyed)
  if(CTX.org&&(isAdmin()&&can('users'))){const setup=[...nav.querySelectorAll('.nav-group')].find(g=>g.querySelector('.eyebrow')?.textContent==='Setup');
    setup&&setup.insertAdjacentHTML('beforeend',`<a href="#users" class="${key==='users'?'on':''}" title="Users"><span class="tile">${ic('users')}</span><span class="lbl">Users</span></a>`)}
  nav.querySelectorAll('a[href^="#"]').forEach(a=>{const k=a.getAttribute('href').slice(1);if(k==='locations')return;
    const f=k==='dashboard'?null:featureOf(k==='menu-management'?'menu-management':k);
    if(allMode){a.classList.add('grey');a.classList.remove('on');a.dataset.grey='1'}
    else if(f&&!can(f))a.style.display='none'});
  nav.querySelectorAll('.nav-group').forEach(g=>{if(![...g.querySelectorAll('a')].some(a=>a.style.display!=='none'))g.style.display='none'});
  flattenNav(nav)}
// same markup as the other Proview back offices: section labels, then links (icon, label, short rail label, badge)
const SHORT={'dashboard':'Home','menu-management':'Menus','website-builder':'Website','brand-kit':'Brand','ai-media-studio':'Media','ai-marketing':'Marketing','ai-reports':'AI Reports','orders':'Orders','reservations':'Bookings','engagement':'Guests','reports':'Reports','marketplace':'Market','settings':'Settings','ai-media-library':'Library','users':'Users'};
function flattenNav(nav){let h='';
  nav.querySelectorAll('.nav-group').forEach(g=>{if(g.style.display==='none')return;const vis=[...g.querySelectorAll('a')].filter(a=>a.style.display!=='none');if(!vis.length)return;
    const sep=g.querySelector('.eyebrow');if(sep)h+=`<div class="nav-sep">${esc(sep.textContent)}</div>`;
    vis.forEach(a=>{const k=a.getAttribute('href').slice(1),l=a.title||a.textContent.trim(),svg=SV(a.querySelector('svg')?.innerHTML||''),isNew=!!a.querySelector('.new'),grey=a.dataset.grey;
      const why=CTX.org?'this business has no locations yet':'open a business from the licence portal first';
      h+=grey?`<a href="#${k}" class="off" data-grey="1" role="link" aria-disabled="true" title="${esc(l)} – ${why}" aria-label="${esc(l)} – ${why}">${svg}<span class="lbl">${esc(l)}</span><span class="slbl">${esc(SHORT[k]||l)}</span>${isNew?'<span class="cnt">New</span>':''}</a>`
        :`<a href="#${k}" class="${a.classList.contains('on')?'active':''}" title="${esc(l)}" aria-label="${esc(l)}"${a.classList.contains('on')?' aria-current="page"':''}>${svg}<span class="lbl">${esc(l)}</span><span class="slbl">${esc(SHORT[k]||l)}</span>${isNew?'<span class="cnt">New</span>':''}</a>`})});
  nav.innerHTML=h}
document.addEventListener('click',e=>{const a=e.target.closest('#nav a[data-grey]');if(a){e.preventDefault();e.stopPropagation();if(!CTX.org)return toast('Open a business from the licence portal first');toast('This business has no locations yet. Businesses are set up by Proview.')}},true);
function lockHTML(h,t,buy=false,sid=CTX.siteId){const plans=Object.entries(PLANS||{});return `<div class="pq-lock card pad"><span class="itile" style="margin:0 auto 14px;width:56px;height:56px;background:var(--bad-tint);color:var(--bad)">${ic('lock')}</span><h1 style="font-size:24px">${h}</h1><p class="muted">${t}</p>
  ${plans.length?`<div class="pq-plans">${plans.map(([k,p])=>`<a class="select-card" style="text-decoration:none" href="${esc(p.link)}?client_reference_id=pvq__${sid}__${k}&prefilled_email=${encodeURIComponent(CTX.email)}" target="_blank" rel="noopener"><strong style="color:var(--ink)">${esc(p.label)}</strong><div style="font-size:20px;font-weight:700;color:var(--ink);margin-top:4px">£${(p.amount/100).toFixed(2)}</div><small class="muted">${buy?'Buy online':'Buy / renew online'}</small></a>`).join('')}</div>`:''}
  <p style="margin:16px 0 0">${CTX.master?`Or ${buy?'buy':'renew'} through the <a href="${CFG.lic}" target="_blank" rel="noopener">licence portal</a>, or call <strong>${CFG.phone}</strong>.`:plans.length?`Or call Proview on <strong>${CFG.phone}</strong>.`:`Online payment isn’t available yet. Call Proview on <strong>${CFG.phone}</strong>.`}</p>
  <div style="display:flex;gap:10px;justify-content:center;margin-top:18px"><button class="btn secondary" data-action="pq-recheck">${ic('refresh','sm')}Check again</button></div></div>`}
let PLANS={};function loadPlans(){sb.rpc('pq_plans').then(r=>{PLANS=r.data||{};if(Object.keys(PLANS).length&&document.querySelector('#view .pq-lock'))App.render()}).catch(()=>{})}   // the lock shows the buy buttons as soon as the plans arrive
function updateCounts(){const w=(App.state.orders||[]).filter(o=>/Waiting/i.test(o.status||'')).length+(App.state.services||[]).filter(x=>!x.done).length;const b=$('#pqBellCnt');if(b){b.textContent=w>9?'9+':w||'';b.classList.toggle('hidden',!w)}
  const m=(App.state.feedbacks||[]).filter(f=>f.unread).length+(App.state.reviews||[]).filter(r=>r.status==='Waiting').length;const c=$('#pqMailCnt');if(c)c.textContent=m||''}

/* ---------- header actions ---------- */
const A=App.action;
A('pq-signout',()=>App.modal({title:'Sign out?',body:'<p style="margin:0">Changes are saved automatically.</p>',footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-signout-yes">Sign out</button>`}));
A('sign-out',()=>App.actions['pq-signout']());
A('pq-signout-yes',()=>signOut());
A('pq-loc',el=>chooseLoc(el.value));
A('pq-recheck',async()=>{if(CTX.org){await openOrg(CTX.org.id,CTX.siteId,true);App.render();toast('Licence checked')}});
A('pq-renew',()=>App.modal({title:'Buy or renew a licence',wide:true,body:lockHTML(site()?.name||'Licence',`Choose a plan for ${esc(site()?.name||'this location')}.`).replace('pq-lock card pad','').replace(/<span class="itile"[^>]*>.*?<\/span>/,'')}));
A('pq-change-pw',()=>App.modal({title:'Change password',body:UI.field({label:'New password',help:'At least 8 characters.',control:UI.input({id:'pqNp',type:'password',attrs:'minlength="8" autocomplete="new-password"'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="pq-change-pw-save">Save</button>`}));
A('pq-change-pw-save',async()=>{const v=$('#pqNp').value;if(v.length<8)return toast('At least 8 characters');const {error}=await sb.auth.updateUser({password:v});if(error)return toast(error.message);closeModal();toast('Password updated')});
A('account',()=>drawer({title:'Account Settings',body:UI.field({label:'Email',control:UI.input({value:CTX.email,attrs:'readonly'})})+UI.field({label:'Role',control:UI.input({value:CTX.master?'Proview master':CTX.role,attrs:'readonly'})})+UI.field({label:'Business',control:UI.input({value:CTX.org?.name||'—',attrs:'readonly'})})+`<button class="btn secondary" data-action="pq-change-pw">${ic('lock','sm')}Change password</button>`,footer:`<button class="btn primary" data-close>Done</button>`}));
A('pq-chat',()=>drawer({title:'Chat',width:400,body:UI.empty('msg','No messages yet','Team chat isn\'t part of Proview QR Menu. Use Help → Start Live Chat to talk to Proview.')}));
A('pq-inbox',()=>{const fb=(App.state.feedbacks||[]).filter(f=>f.unread),rv=(App.state.reviews||[]).filter(r=>r.status==='Waiting');
  drawer({title:'Inbox',width:440,body:(fb.length||rv.length)?`${fb.map(f=>`<a class="review" style="display:block;color:inherit;text-decoration:none" href="#feedbacks--results"><strong style="color:var(--ink)">New feedback · ${esc(f.id)}</strong><div class="help">${esc(f.date)}</div></a>`).join('')}${rv.map(r=>`<a class="review" style="display:block;color:inherit;text-decoration:none" href="#engagement-reviews--all"><strong style="color:var(--ink)">Review waiting · ${'★'.repeat(r.rate)}</strong><div class="help">${esc(r.text)}</div></a>`).join('')}`:UI.empty('mail','Inbox is empty','New feedback and reviews waiting for approval show here.')})});
A('pq-bell',()=>{const w=(App.state.orders||[]).filter(o=>/Waiting|In Progress|Ready/i.test(o.status||''));const sv=(App.state.services||[]).filter(x=>!x.done);
  drawer({title:'Notifications',width:440,body:(sv.length?`<div class="eyebrow" style="margin:0 0 6px">Service requests</div>`+sv.map(x=>`<div class="review" style="display:flex;gap:10px;align-items:center"><span class="itile" style="width:36px;height:36px">${ic('hand','sm')}</span><div style="flex:1"><strong style="color:var(--ink)">${esc(x.table)} · ${esc(x.request)}</strong><div class="help">${esc(x.at)}${x.note?' · '+esc(x.note):''}</div></div><button class="btn secondary sm" data-action="pq-svc-done" data-id="${x.id}">Done</button></div>`).join(''):'')+
    (w.length?`<div class="eyebrow" style="margin:14px 0 6px">Live orders</div>`+w.map(o=>`<a class="review" style="display:flex;gap:10px;color:inherit;text-decoration:none" href="#orders-all--live"><span class="itile" style="width:36px;height:36px">${ic('orders','sm')}</span><div><strong style="color:var(--ink)">${esc(o.id)} · ${esc(o.status)}</strong><div class="help">${esc(o.type||'')} · ${esc(o.table&&o.table!=='—'?o.table:o.customer||'')}</div></div></a>`).join(''):'')
    ||UI.empty('bell','No new notifications','New orders and service requests from the QR menu show here.')})});
A('collapse',()=>{if(innerWidth<=900)return;const a=$('#app');const on=!a.classList.contains('collapsed');a.classList.toggle('collapsed',on);App._userCollapsed=on;try{localStorage.setItem('pq.sideCollapsed',on?'1':'0')}catch(e){}
  const b=$('#sfCollapse');if(b){b.title=on?'Expand menu':'Collapse menu';b.setAttribute('aria-label',b.title)}});
A('pq-svc-done',el=>{const x=(App.state.services||[]).find(s=>String(s.id)===el.dataset.id);if(x)x.done=true;App.actions['pq-bell']();updateCounts();toast('Marked as done')});
A('pq-search',openPalette);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&booted){e.preventDefault();openPalette()}});
function openPalette(){App.modal({title:'Search',body:`<label class="search" style="max-width:none">${ic('search','sm')}<input id="pqQ" placeholder="Pages, menu items, orders, guests…" autocomplete="off"></label><div id="pqRes" style="margin-top:10px;max-height:50vh;overflow:auto"></div>`});
  const q=$('#pqQ'),box=$('#pqRes');const run=()=>{const v=q.value.trim().toLowerCase();if(!v){box.innerHTML='<p class="muted">Type to search.</p>';return}
    const pages=Object.entries(TITLES).filter(([k,t])=>k!=='locations'&&t.toLowerCase().includes(v)&&can(featureOf(k)??'menus')).slice(0,8).map(([k,t])=>row('#'+k,'chev',t,'Page'));
    const items=[];(App.state.menus||[]).forEach(m=>m.sections.forEach(s=>s.items.forEach(i=>{if(i.name.toLowerCase().includes(v)&&items.length<8)items.push(row('#menu-editor--'+m.id,'menu',i.name,m.name))})));
    const ords=(App.state.orders||[]).filter(o=>String(o.id).toLowerCase().includes(v)||String(o.customer||o.table||'').toLowerCase().includes(v)).slice(0,5).map(o=>row('#orders-all--live','orders',o.id,o.status));
    const gs=(App.state.customers||[]).filter(c=>c.name.toLowerCase().includes(v)).slice(0,5).map(c=>row('#engagement-customer--'+c.id,'user',c.name,'Guest'));
    box.innerHTML=[...pages,...items,...ords,...gs].join('')||'<p class="muted">No results.</p>'};
  function row(h,i,t,s){return `<a href="${h}" data-close style="display:flex;gap:10px;align-items:center;padding:9px;border-radius:8px;color:var(--ink-2);text-decoration:none">${ic(i,'sm')}${esc(t)}<small class="muted" style="margin-left:auto">${esc(s||'')}</small></a>`}
  q.addEventListener('input',run);run()}

/* ---------- the master, signed in without a business from the licence portal: nothing of any business is loaded ---------- */
App.route('portal',()=>`<div class="card pad pq-portal"><span class="itile" style="margin:0 auto 14px;width:56px;height:56px;background:var(--brand-tint);color:var(--brand-700)">${SV(HI.building)}</span>
  <h1 style="font-size:22px;margin:0 0 8px">Open a business from the licence portal</h1>
  <p class="muted" style="max-width:440px;margin:0 auto 20px">As Proview master you work inside one business at a time. Open the business in the licence portal and press <b>Open in Proview QR Menu</b>. Businesses are added and linked there too (New business, Link with another business).</p>
  <a class="btn primary" id="pqToPortal" href="${CFG.lic}" rel="noopener">Open licence portal</a></div>`);

/* ---------- No Locations page (owner, 12 Nov 2026: "Remove locations, we are not using that anymore") ----------
   What it had moves to Settings → This location (thisLocHTML): the location's name (Rename), its licence with Buy / renew
   online (owners) or the licence portal and Trial… (the master), and the master's Pause / Delete business. Address, hours and
   the other per-location settings were already in Settings (Venue Information, Operating Hours…). */
const orgOf=id=>CTX.orgs.find(o=>o.id===id)||(CTX.org&&CTX.org.id===id?CTX.org:null);
App.route('noloc',()=>CTX.org?`<div class="card pad pq-portal"><h1 style="font-size:22px;margin:0 0 8px">No locations yet</h1><p class="muted" style="margin:0 auto 16px;max-width:440px">${esc(CTX.org.name)} has no locations yet. Businesses are set up by Proview${CTX.master?' in the licence portal (New business, Link with another business)':`. Call Proview on ${CFG.phone}`}.</p>${CTX.master?masterBizHTML():''}</div>`:'');
function masterBizHTML(){return `<div class="row"><div class="grow"><b>Business</b><div class="help" style="margin:0">${esc(CTX.org.name)}${CTX.org.suspended?' · paused':''} · Proview only</div></div><button type="button" class="btn secondary sm" data-action="pq-suspend-org" data-id="${CTX.org.id}" data-v="${CTX.org.suspended?0:1}">${CTX.org.suspended?'Unpause business':'Pause business'}</button><button type="button" class="btn ghost sm" style="color:var(--bad)" data-action="pq-del-org" data-id="${CTX.org.id}" data-name="${esc(CTX.org.name)}">Delete business</button></div>`}
function thisLocHTML(){const s=site();if(!s)return '';const L=lic(s),M=CTX.master,admin=isAdmin();
  const licBtn=M?`<button type="button" class="btn secondary sm" data-action="pq-trial" data-id="${s.id}" title="Set, extend or clear a trial licence by hand (Proview only)">Trial…</button><a class="btn secondary sm" href="${CFG.lic}" target="_blank" rel="noopener">Licence portal</a>`
    :admin?`<button type="button" class="btn ${['none','expired'].includes(L.k)?'primary':'secondary'} sm" data-action="pq-buy-loc" data-id="${s.id}">${L.k==='none'?'Buy licence online':'Renew online'}</button>`:'';
  return `<section class="card pad pq-thisloc" id="pqThisLoc" style="margin-top:20px"><h3 style="margin:0 0 4px">This location · ${esc(s.name)}</h3><p class="help" style="margin:0 0 8px">Businesses are set up and linked by Proview. Address, opening hours and the rest are in Venue Information and Operating Hours above.</p>
    <div class="row"><div class="grow"><label for="pqLocName"><b>Location name</b></label><div class="help" style="margin:0">The name in the location select and your menu links.</div></div>${admin?`<input class="input" id="pqLocName" value="${esc(s.name)}" style="max-width:260px"><button type="button" class="btn primary sm" data-action="pq-loc-name-save" data-id="${s.id}">Save</button>`:`<span>${esc(s.name)}</span>`}</div>
    <div class="row" id="pqThisLic"><div class="grow"><b>Business licence</b><div class="help" style="margin:0">${UI.pill(L.t,L.c)} Each business needs its own licence.${M?'':admin?'':' Ask your owner, or call Proview on '+CFG.phone+'.'}</div></div>${licBtn}</div>
    ${M?masterBizHTML():''}</section>`}
A('pq-loc-name-save',async el=>{const n=($('#pqLocName')?.value||'').trim();if(!n)return toast('Enter a name');if(!CTX.org||!CTX.sites.some(x=>x.id===el.dataset.id))return;
  const {error}=await sb.rpc('pq_update_site',{p_site:el.dataset.id,p_name:n,p_archived:null});if(error)return toast(error.message);
  await openOrg(CTX.org.id,CTX.siteId,true);App.render();toast('Location saved')});
A('pq-suspend-org',async el=>{if(!CTX.master||!CTX.org||el.dataset.id!==CTX.org.id)return;const {error}=await sb.rpc('pq_update_org',{p_org:el.dataset.id,p_name:null,p_suspended:el.dataset.v==='1'});if(error)return toast(error.message);await openOrg(CTX.org.id,CTX.siteId,true);CTX.orgs=[CTX.org];fillLoc();App.render();toast(el.dataset.v==='1'?'Business paused':'Business unpaused')});
A('pq-del-org',el=>modal({title:'Delete '+esc(el.dataset.name)+'?',body:`<p style="margin-top:0">This permanently deletes the business, all its locations, menus, orders and users. It can't be undone.</p>${UI.field({label:'Type the business name to confirm',control:UI.input({id:'pqDelName'})})}`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="pq-del-org-yes" data-id="${el.dataset.id}" data-name="${esc(el.dataset.name)}">Delete permanently</button>`}));
A('pq-del-org-yes',async el=>{if(!CTX.master||!CTX.org||el.dataset.id!==CTX.org.id)return;if($('#pqDelName').value.trim()!==el.dataset.name)return toast('Type the exact business name');const {error}=await sb.rpc('pq_delete_org',{p_org:el.dataset.id});if(error)return toast(error.message);
  closeModal();openSet(null);CTX.org=null;CTX.orgs=[];CTX.sites=[];CTX.siteId='all';CTX.role=null;CTX.member=null;replaceState(window.PV_BLANK(''));fillLoc();fillAcct();App.go('portal');App.render();toast('Business deleted')});   // nothing open any more: the portal page
// No Add location / Archive location (LOCATIONS_LINK_SPEC.md): locations are added, linked and unlinked by Proview in the licence portal.
A('pq-open-lic',()=>window.open(CFG.lic,'_blank','noopener'));   // master only
A('pq-buy-loc',async el=>{const s=CTX.sites.find(x=>x.id===el.dataset.id);if(!s)return;try{const r=await sb.rpc('pq_plans');if(r.data)PLANS=r.data}catch(e){}
  App.modal({title:'Buy or renew a licence',wide:true,body:lockHTML(s.name,`Choose a plan for ${esc(s.name)}.`,false,s.id).replace('pq-lock card pad','').replace(/<span class="itile"[^>]*>.*?<\/span>/,'')})});
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
  <p class="help" style="margin-top:12px">People sign in at this address with the email you add here, using their own password (“Create a login” on the sign-in page creates one) or their Proview account. Owners and Admins always see every location. Managers and Staff see only the locations you tick.</p>`,{nav:'users'});
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

/* ---------- guest inbox: orders, feedback, reviews, likes and service requests from the QR menu ---------- */
const pad2=n=>String(n).padStart(2,'0');
const stamp=d=>{d=new Date(d);return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`};
let pulling=false;
async function pullInbox(){
  if(!booted||pulling||!CTX.org||CTX.siteId==='all'||!navigator.onLine)return;pulling=true;
  try{
    const sid=CTX.siteId;const {data,error}=await sb.rpc('pq_inbox_take',{p_site:sid});
    if(error||!Array.isArray(data)||!data.length||sid!==CTX.siteId)return;
    const S=App.state;S.orders=S.orders||[];S.feedbacks=S.feedbacks||[];S.reviews=S.reviews||[];S.customers=S.customers||[];S.likes=S.likes||{};S.services=S.services||[];
    S.inboxSeen=S.inboxSeen||[];const seen=new Set(S.inboxSeen);const notes=[];
    for(const m of data){ if(seen.has(m.id))continue; const p=m.payload||{},t=stamp(m.at);
      if(m.kind==='order'){
        const max=Math.max(1000,...S.orders.concat(S.archived||[]).map(o=>+String(o.id).replace(/\D/g,'')||0));
        const day=t.slice(0,10),daily=S.orders.filter(o=>(o.sent||'').startsWith(day)).length+1;
        const type=p.type||'Dine-In';
        const o={id:'#'+(max+1),dailyNo:daily,status:'Waiting',type,source:type==='Dine-In'?'QR Menu':type==='Pick-Up'?'Pick-Up Menu':'Delivery Menu',
          customer:p.customer?.name||(type==='Dine-In'?'—':'Guest'),phone:p.customer?.phone||'',email:p.customer?.email||'',address:p.customer?.address||'',
          table:type==='Dine-In'?(p.table||'—'):'—',guests:p.guests||1,name:p.customer?.name||'',waiter:'—',
          items:(p.items||[]).map(i=>({name:i.name,price:+i.price||0,qty:+i.qty||1,options:i.options||[],notes:i.notes||''})),
          subtotal:+p.subtotal||0,tip:+p.tip||0,service:+p.service||0,discount:+p.discount||0,promo:p.promo||'',total:+p.total||0,payment:p.payment||'',
          when:p.when||'',notes:p.notes||'',guestRef:m.ref,updated:t,sent:t,timeline:[{t,text:'Order received from the QR menu'+(p.payment?' · '+p.payment:'')}]};
        S.orders.unshift(o);notes.push(`New order ${o.id}${o.table&&o.table!=='—'?' · '+o.table:''}`);
        if(p.customer?.name&&(p.customer.email||p.customer.phone)){const ex=S.customers.find(c=>(p.customer.email&&c.email===p.customer.email)||(p.customer.phone&&c.phone===p.customer.phone));
          if(ex){ex.orders=(ex.orders||0)+1;ex.spend=(ex.spend||0)+o.total;ex.last='Today'}else S.customers.unshift({id:'c'+m.id,name:p.customer.name,email:p.customer.email||'',phone:p.customer.phone||'',tags:[],orders:1,spend:o.total,visits:1,last:'Today'})}
      }else if(m.kind==='feedback'){
        const n=Math.max(1000,...S.feedbacks.map(f=>+String(f.id).replace(/\D/g,'')||0))+1;
        S.feedbacks.unshift({id:'Form '+n,date:t,form:p.form||'Sample Form',table:p.table||'—',unread:true,answers:(p.answers||[]).map(a=>[a.q,a.a])});notes.push('New feedback');
      }else if(m.kind==='review'){
        const instant=(S.cfg||{})['eng.instant']&&(+p.rate||0)>=3;
        S.reviews.unshift({id:'r'+m.id,text:p.text||'',rate:+p.rate||0,item:p.item||'',customer:p.name||'Guest',date:t,status:instant?'Live':'Waiting',archived:false});notes.push('New review');
      }else if(m.kind==='like'){ if(p.item){S.likes[p.item]=Math.max(0,(S.likes[p.item]||0)+(p.on===false?-1:1))} }
      else if(m.kind==='service'){S.services.unshift({id:m.id,at:t,table:p.table||'—',request:p.request||'Call waiter',note:p.note||'',done:false});notes.push(`${p.table||'A guest'}: ${p.request||'Call waiter'}`)}
      else if(m.kind==='customer'){ if(p.email&&!S.customers.some(c=>c.email===p.email))S.customers.unshift({id:'c'+m.id,name:p.name||p.email,email:p.email,phone:p.phone||'',tags:['Signed up'],orders:0,spend:0,visits:1,last:'Today'}) }
      S.inboxSeen.push(m.id);
    }
    S.inboxSeen=S.inboxSeen.slice(-500);
    await save();
    if(snapshot()===lastSaved){await sb.rpc('pq_inbox_ack',{p_site:sid,p_ids:data.map(m=>m.id)})}
    if(notes.length){App.toast(notes.length>1?`${notes.length} new from the QR menu`:notes[0]);
      const k=App.current().split('--')[0];if(/^(orders|engagement|feedbacks|dashboard|reports)/.test(k)&&!document.querySelector('#scrim.show,#drawer.show'))App.render();else updateCounts()}
  }catch(e){console.warn('inbox',e)}finally{pulling=false}
}
setInterval(pullInbox,15000);
const _openSite=openSite;openSite=async function(id,quiet){await _openSite(id,quiet);setTimeout(pullInbox,500)};
App.pullInbox=pullInbox;

/* ---------- remember the fields on Ordering / Engagement / Feedback settings per location ---------- */
const FORM_ROUTES=/^(orders-settings|engagement-settings|feedbacks)$/;
function fieldLabel(el){const t=x=>x&&x.textContent.replace(/\s+/g,' ').trim().slice(0,80);
  return t(el.closest('label.radio-card')?.querySelector('strong'))||t(el.closest('.form-row')?.querySelector('.txt strong'))||t(el.closest('.field')?.querySelector(':scope>label'))||
    t(el.closest('label.check'))||el.getAttribute('aria-label')||el.placeholder||el.name||'field'}
function formFields(){const route=App.current();const count={};
  return [...document.querySelectorAll('#view input,#view select,#view textarea')].filter(el=>el.type!=='file'&&!el.closest('.search')&&el.type!=='search').map(el=>{
    const base=route+'|'+(el.type==='radio'?'radio:'+(el.name||fieldLabel(el.closest('.radio-cards,div')||el)):fieldLabel(el));count[base]=(count[base]||0)+1;
    return {el,key:el.type==='radio'?base:base+'|'+count[base]}})}
function restoreForm(){const cfg=(App.state.cfg=App.state.cfg||{});const of=cfg.forms||{};
  formFields().forEach(({el,key})=>{if(!(key in of))return;const v=of[key];
    if(el.type==='checkbox'){if(el.checked!==!!v){el.checked=!!v;el.dispatchEvent(new Event('change',{bubbles:true}))}}
    else if(el.type==='radio'){const c=el.value===v;if(c&&!el.checked){el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))}}
    else if(el.value!==v){el.value=v}})}
function collectForm(){const cfg=(App.state.cfg=App.state.cfg||{});cfg.forms=cfg.forms||{};
  formFields().forEach(({el,key})=>{if(el.type==='radio'){if(el.checked)cfg.forms[key]=el.value}else cfg.forms[key]=el.type==='checkbox'?el.checked:el.value})}
App.formValue=(route,label,n=1)=>{const f=(App.state.cfg||{}).forms||{};return f[route+'|'+label+'|'+n]};
document.addEventListener('click',e=>{const b=e.target.closest('#view button');if(!b||!FORM_ROUTES.test(App.current().split('--')[0]))return;
  if(/^\s*save\b/i.test(b.textContent||'')){collectForm();queueSave()}},true);
const _render2=App.render;App.render=function(){_render2();const k=App.current().split('--')[0];if(FORM_ROUTES.test(k)){restoreForm();setTimeout(restoreForm,0)}};

/* ---------- real guest-menu links and scannable QR codes ---------- */
App.guestUrl=(o={})=>{const sid=CTX.siteId&&CTX.siteId!=='all'?CTX.siteId:(CTX.sites.find(s=>!s.archived)||{}).id||'';
  const q=new URLSearchParams({l:sid});if(o.t)q.set('t',o.t);if(o.m)q.set('m',o.m);if(o.o)q.set('o',o.o);if(o.v)q.set('v','1');if(o.p)q.set('p',o.p);
  return location.origin+'/m/?'+q.toString()};
const baseQr=UI.qr;
function qrSeedUrl(seed){seed=String(seed);const S=App.state;
  if(seed.startsWith('menu-display'))return App.guestUrl({v:1});
  if(seed.startsWith('menu-'))return App.guestUrl({m:seed.slice(5)});
  if(seed.startsWith('dp-'))return App.guestUrl({o:/deliver/i.test(seed)?'delivery':'pickup'});
  if(seed.startsWith('tablet-'))return App.guestUrl({o:'tablet'});
  const t=(S.tables||[]).find(x=>x.id===seed||x.name===seed);if(t)return App.guestUrl({t:t.name});
  return App.guestUrl({})}
UI.qr=(seed,size=180)=>{if(seed==='pv-art'||typeof qrcode!=='function')return baseQr(seed,size);
  const url=qrSeedUrl(seed);const q=qrcode(0,'M');q.addData(url);q.make();const n=q.getModuleCount(),m=2,N=n+m*2;let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m} ${r+m}h1v1h-1z`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${N} ${N}" role="img" aria-label="QR code for ${esc(url)}" data-qr-url="${esc(url)}" shape-rendering="crispEdges" style="display:block;margin:0 auto"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1A2330"/></svg>`};
A('download',el=>{const box=el.closest('.modal,.drawer,.card,#view')||document;const svgs=[...box.querySelectorAll('svg[data-qr-url]')];
  const all=svgs.length?svgs:[...document.querySelectorAll('#modal svg[data-qr-url],#view svg[data-qr-url]')];
  if(!all.length){toast('Nothing to download here');return}
  all.slice(0,60).forEach((svg,i)=>{const img=new Image(),c=document.createElement('canvas');c.width=c.height=1024;
    img.onload=()=>{const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1024,1024);x.drawImage(img,0,0,1024,1024);
      const a=document.createElement('a');const u=new URL(svg.dataset.qrUrl);a.download=`qr-${(u.searchParams.get('t')||u.searchParams.get('o')||'menu').replace(/\W+/g,'-').toLowerCase()}${all.length>1?'-'+(i+1):''}.png`;a.href=c.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove()};
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg))});
  toast(all.length>1?`Downloading ${Math.min(all.length,60)} QR codes`:'QR code downloaded')});
A('ed-open',()=>{const mid=App.current().split('--')[1];window.open(App.guestUrl(mid?{m:mid}:{}),'_blank','noopener')});
A('copy-share-link',()=>App.copy(App.guestUrl({}),'Share link copied'));

/* ---------- media uploads (item photos, logo, landing image) to Supabase Storage ---------- */
let PENDING={img:null,video:null};
document.addEventListener('change',async e=>{const inp=e.target.closest&&e.target.closest('input[data-upload]');if(!inp||!inp.files[0]||!booted)return;
  if(!CTX.org||CTX.siteId==='all'){toast('Choose a location first');return}
  const f=inp.files[0];if(f.size>10*1024*1024){toast('That file is over 10 MB');return}
  const ext=(f.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${CTX.siteId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const tile=inp.closest('.upload');if(tile){tile.querySelector('div')&&(tile.querySelector('div').textContent='Uploading…')}
  const {error}=await sb.storage.from('qrmenu').upload(path,f,{contentType:f.type||undefined,upsert:false});
  if(error){toast('Upload failed: '+error.message);if(tile)tile.classList.remove('done');return}
  const url=sb.storage.from('qrmenu').getPublicUrl(path).data.publicUrl;inp.dataset.url=url;
  if(tile){tile.querySelector('div')&&(tile.querySelector('div').textContent=f.name);if(/^image/.test(f.type)){tile.style.backgroundImage=`url("${url}")`;tile.style.backgroundSize='cover';tile.style.backgroundPosition='center';tile.style.color='#fff';tile.style.textShadow='0 1px 3px rgba(0,0,0,.6)'}}
  if(inp.closest('#drawer')){if(/^video/.test(f.type))PENDING.video=url;else PENDING.img=url;toast('Photo uploaded – press Save to keep it');return}
  const label=fieldLabel(inp);const S=App.state;S.cfg=S.cfg||{};S.cfg['upload|'+App.current()+'|'+label]=url;
  if(/^settings-venue/.test(App.current())&&/logo/i.test(label))S.venue={...(S.venue||{}),logo:url};
  if(/^settings-welcome/.test(App.current())){const ch=App.current().split('--')[1]||'dinein';S.cfg[`wp.${ch}.${/^video/.test(f.type)?'landingVideo':'landingImg'}`]=url}
  if(/^settings-design/.test(App.current())&&/background/i.test(label))S.cfg['dz.bgImg']=url;
  queueSave();toast('Uploaded')},true);
function findItemByName(menuId,name){const m=(App.state.menus||[]).find(x=>x.id===menuId);if(!m)return null;for(const s of m.sections)for(const i of s.items)if(i.name===name)return i;return null}
const _edSave=App.actions['ed-save-item'];
if(_edSave)App.action('ed-save-item',(...a)=>{const name=(document.getElementById('edName')||{}).value?.trim();const P={...PENDING};_edSave(...a);
  if(name&&(P.img||P.video)){const it=findItemByName(App.current().split('--')[1],name);if(it){if(P.img){it.img=it.img||P.img;it.imgs=[...(it.imgs||[]),P.img];it.photo=true}if(P.video)it.video=P.video;queueSave();setTimeout(paintThumbs,50)}}
  PENDING={img:null,video:null}});
function paintThumbs(){if(!/^menu-editor/.test(App.current()))return;const m=(App.state.menus||[]).find(x=>x.id===App.current().split('--')[1]);if(!m)return;const by={};m.sections.forEach(s=>s.items.forEach(i=>by[i.id]=i));
  document.querySelectorAll('#view [data-id]').forEach(row=>{const it=by[row.dataset.id];if(!it||!it.img)return;const th=row.querySelector('.thumb');if(th&&!th.dataset.painted){th.dataset.painted=1;th.textContent='';th.classList.remove('none');th.style.background=`center/cover url("${it.img}")`}})}
const _render3=App.render;App.render=function(){_render3();paintThumbs()};
document.addEventListener('click',()=>setTimeout(paintThumbs,30));

window.PQ.start=start;
})();
