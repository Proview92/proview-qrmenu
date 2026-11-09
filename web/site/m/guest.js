/* Proview QR Menu – guest menu (what diners see after scanning a table / menu QR code).
   URL: /m/?l=<location id>[&t=<table>][&m=<menu id>][&o=pickup|delivery|tablet][&v=1 view only]
   Data: pq_public_menu (read only). Guest actions go to pq_guest_submit (orders, feedback, reviews, likes, service, sign-up). */
(function(){
'use strict';
const SB_URL='https://yblafwttmqaqvfvedaoc.supabase.co',SB_KEY='sb_publishable_mcs45XaG9XHMWbyXO_PyCw_NQaQ08MR';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Q=new URLSearchParams(location.search);const SITE=Q.get('l')||'';
const store={get(k,d){try{const v=localStorage.getItem('pqm:'+SITE+':'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('pqm:'+SITE+':'+k,JSON.stringify(v))}catch(e){}}};
const sess={get(k,d){try{const v=sessionStorage.getItem('pqm:'+SITE+':'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{sessionStorage.setItem('pqm:'+SITE+':'+k,JSON.stringify(v))}catch(e){}}};
const I={back:'<path d="m15 18-6-6 6-6"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
 filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',plus:'<path d="M12 5v14M5 12h14"/>',
 up:'<path d="M12 19V5M5 12l7-7 7 7"/>',chev:'<path d="m9 18 6-6-6-6"/>',chevd:'<path d="m6 9 6 6 6-6"/>',phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
 msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',bag:'<path d="M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0"/>',star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',receipt:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4"/>',link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
 wa:'<path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 7.9 19.6z"/>',sms:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01"/>',
 insta:'<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',fb:'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',tiktok:'<path d="M15 3c.4 2.6 2 4.3 5 4.5V11c-1.8 0-3.5-.6-5-1.6V16a5 5 0 1 1-5-5v3.3a1.8 1.8 0 1 0 1.8 1.8V3z"/>',
 leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6"/>',fire:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.4.2 1.5 1.2 2.9 2.5 2.9z"/>',
 warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',check:'<path d="M20 6 9 17l-5-5"/>'};
const ic=(n,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]||I.info}</svg>`;

/* ---------- state ---------- */
let D=null,cfg={},mode='view',TABLE=Q.get('t')||'',MENU=null,filt={sort:'rec',avoid:[]},term='';
let cart=sess.get('cart',[]);const liked=new Set(store.get('liked',[]));let profile=store.get('profile',null);
const F=(route,re,n=1)=>{const f=cfg.forms||{};const keys=Object.keys(f).filter(k=>k.startsWith(route+'|')&&re.test(k.split('|')[1]));const k=keys.find(k=>k.endsWith('|'+n))||keys[0];return k?f[k]:undefined};
const C=(k,d)=>cfg[k]!==undefined&&cfg[k]!==''?cfg[k]:d;
const ORD_ROUTE=()=>mode==='dine'?'orders-settings--dinein':'orders-settings--delivery';
const typeLabel=()=>({dine:'Dine-In',pickup:'Pick-Up',delivery:'Delivery'})[mode]||'';

/* ---------- api ---------- */
async function rpc(fn,args){const r=await fetch(`${SB_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:SB_KEY,'content-type':'application/json'},body:JSON.stringify(args)});
  const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&j.message)||'Something went wrong. Please try again.');return j}
const submit=(kind,payload)=>rpc('pq_guest_submit',{p_site:SITE,p_kind:kind,p_payload:payload});

/* ---------- money ---------- */
function money(n){const ch=mode==='tablet'?'tablet':'dinein';if(C(`pr.${ch}.show`,true)===false)return '';const cur=String(C(`pr.${ch}.cur`,'GBP'));
  const sym=C(`pr.${ch}.sign`,true)===false?'':/eur/i.test(cur)?'€':/usd|dollar/i.test(cur)?'$':/try|lira/i.test(cur)?'₺':/aed|dirham/i.test(cur)?'AED ':'£';
  const v=Number(n||0);const frac=C(`pr.${ch}.frac`,true);return sym+(frac===false&&Number.isInteger(v)?String(v):v.toFixed(2))}
const itemPrices=i=>{const po=(i.priceOptions||[]).filter(p=>p.name||p.price);return po.length?po.map(p=>+p.price||0):[+i.price||0]};
const priceText=i=>{const p=itemPrices(i);const lo=Math.min(...p),hi=Math.max(...p);return lo===hi?money(lo):money(lo)+'–'+money(hi)};

/* ---------- toast / sheets ---------- */
function toast(t){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2400)}
function sheet({title='',body='',foot='',left='',cls='',center=false,onClose}={}){closeSheet(true);const bd=document.createElement('div');bd.className='bd'+(center?' center':'');bd.id='sheet';
  bd.innerHTML=`<div class="sh ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header>${left||'<span></span>'}<h3>${esc(title)}</h3><button class="ib x" data-x aria-label="Close">${ic('x')}</button></header><div class="bdy">${body}</div>${foot?`<footer>${foot}</footer>`:''}</div>`;
  bd.addEventListener('click',e=>{if(e.target===bd||e.target.closest('[data-x]')){closeSheet();onClose&&onClose()}});document.body.appendChild(bd);return bd}
function closeSheet(silent){const s=$('#sheet');if(s)s.remove();if(!silent&&/\/item\//.test(location.hash))history.back()}

/* ---------- theme ---------- */
function luminance(h){h=String(h||'').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);if(isNaN(n))return .5;const r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255;return .2126*r+.7152*g+.0722*b}
function theme(){const r=document.documentElement.style;const tx=C('dz.text','#17171c'),bg=C('dz.bg','#f4f3ef'),hl=C('dz.hl','#4a6cd0');
  r.setProperty('--tx',tx);r.setProperty('--bg',bg);r.setProperty('--hl',hl);r.setProperty('--on-hl',luminance(hl)>.6?'#17171c':'#fff');
  r.setProperty('--card',luminance(bg)<.35?'rgba(255,255,255,.08)':'#fff');r.setProperty('--mut',luminance(bg)<.35?'rgba(255,255,255,.7)':'#6b6b75');
  const img=C('dz.bgImg','');const app=$('.app');if(app)app.style.backgroundImage=img?`url("${img}")`:'';
  document.querySelector('meta[name=theme-color]').content=hl}

/* ---------- data helpers ---------- */
const MENUS=()=>{const ch={dine:'dine',pickup:'pickup',delivery:'delivery',tablet:'tablet',view:'dine'}[mode];return (D.menus||[]).filter(m=>!m.channels||!m.channels.length||m.channels.includes(ch))};
const findMenu=id=>MENUS().find(m=>m.id===id)||(D.menus||[]).find(m=>m.id===id);
const liveSecs=m=>(m?.sections||[]).filter(s=>s.on!==false&&(s.items||[]).some(i=>i.on!==false));
const liveItems=s=>(s.items||[]).filter(i=>i.on!==false);
const findItem=(m,id)=>{for(const s of m.sections||[])for(const i of s.items||[])if(i.id===id)return {s,i};return {}};
const reviewsOf=i=>(D.reviews||[]).filter(r=>{const n=String(r.item||'');return n===i.name||n.startsWith(i.name+' (')});
const rating=i=>{const r=reviewsOf(i);return r.length?{avg:r.reduce((a,b)=>a+(+b.rate||0),0)/r.length,n:r.length,last:r[0]}:null};
const likes=i=>Math.max(0,(+(D.likes||{})[i.id]||0)+(liked.has(i.id)&&!store.get('likedSent',[]).includes(i.id)?1:0));
const imgOf=i=>i.img||(i.imgs||[])[0]||'';
const secImg=s=>s.img||(liveItems(s).find(imgOf)||{}).img||'';
const initials=s=>String(s).split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
const tags=i=>[...(i.badges||[]),...(i.labels||[])];
const avoidable=()=>{const set=new Set();MENUS().forEach(m=>liveSecs(m).forEach(s=>liveItems(s).forEach(i=>[...(i.allergens||[]),...(i.labels||[])].forEach(x=>set.add(x)))));return [...set].sort()};
const isAlcohol=(i,s)=>/alcohol/i.test([...(i.labels||[]),...(i.allergens||[])].join(' '))||/cocktail|wine|beer|gin|vodka|whisk|rum|cognac|shot|liqu|champagne|prosecco|spirit|lager|cider/i.test((s&&s.name)||'');
const canOrder=()=>['dine','pickup','delivery','tablet'].includes(mode);
const ordering=()=>{if(!canOrder())return false;if(mode==='dine'){const v=F('orders-settings--dinein',/^Enable Ordering$/);return v!==false}
  if(mode==='delivery'){const v=F('orders-settings--delivery',/^Enable Ordering$/,1);return v!==false}if(mode==='pickup'){const v=F('orders-settings--delivery',/^Enable Ordering$/,2);return v!==false}return true};

/* ---------- router ---------- */
const go=h=>{location.hash=h};
window.addEventListener('hashchange',route);
let lastPage='';
function route(){const h=location.hash.replace(/^#\/?/,'');const p=h.split('/');closeSheet(true);
  if(!D)return;const pageKey=p[0]+'/'+(p[1]||'');if(pageKey!==lastPage){lastPage=pageKey;window.scrollTo(0,0)}
  if(p[0]==='menu'&&p[1]){MENU=findMenu(p[1])||MENUS()[0];renderMenu();if(p[2]==='item'&&p[3]){if(p[4]==='reviews')renderReviews(p[3]);else openItem(p[3])}return}
  ({'':home,menus:pickMenu,basket:renderBasket,checkout:renderCheckout,order:()=>renderOrder(p[1]),orders:renderMyOrders,feedback:renderFeedback,info:renderInfo,join:renderJoin}[p[0]]||home)()}

/* ---------- landing / welcome ---------- */
function ch(){return mode==='pickup'||mode==='delivery'?'delivery':mode==='tablet'?'tablet':'dinein'}
function socials(color){const SO=[['Instagram','insta','https://instagram.com/'],['Facebook','fb','https://facebook.com/'],['Tiktok','tiktok','https://tiktok.com/@'],['X','globe','https://x.com/'],['WhatsApp','wa','https://wa.me/'],['Website','globe','https://']];
  const out=SO.map(([k,i,pre])=>{let v=cfg['social.'+k];if(!v)return '';v=String(v).trim();const url=/^https?:/.test(v)?v:pre+v.replace(/^@/,'');return `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${k}" style="${color?'--ic:'+esc(color):''}">${ic(i)}</a>`}).join('');
  return out?`<div class="soc">${out}</div>`:''}
function home(){const c=ch(),wp=k=>C(`wp.${c}.${k}`,undefined);const V=D.venue||{};const app=$('.app');
  const landing=wp('landing')===true&&(cfg[`wp.${c}.landingImg`]||cfg[`wp.${c}.landingVideo`]);
  if(landing){const img=cfg[`wp.${c}.landingImg`],vid=cfg[`wp.${c}.landingVideo`];
    app.innerHTML=`<div class="land" style="background-image:url('${esc(img||'')}')">${vid?`<video src="${esc(vid)}" ${img?`poster="${esc(img)}"`:''} autoplay muted loop playsinline></video>`:''}
      <div>${V.logo?`<img class="logo" src="${esc(V.logo)}" alt="${esc(V.name||D.site.name)}">`:`<div class="vn">${esc(V.name||D.site.name)}</div>`}</div>
      ${wp('btn')!==false?`<button class="cta" style="--btn:${esc(wp('btnColor')||'#fff')}" data-go="menus">${esc(wp('btnText')||'View Menu')}</button>`:'<span></span>'}
      ${wp('social')!==false?socials(wp('iconColor')):'<span></span>'}</div>`;bindGo(app);return}
  if(wp('show')===false){pickMenu();return}
  const msg=wp('msg')!==false?(wp('msgText')||`Welcome to ${V.name||D.site.name}!`):'';
  app.innerHTML=`<div class="wel"><div class="lg" style="${V.logo?`background-image:url('${esc(V.logo)}')`:''}">${V.logo?'':esc(initials(V.name||D.site.name))}</div>
    ${wp('name')!==false?`<h1>${esc(V.name||D.site.name)}</h1>`:''}${msg?`<p class="mut" style="margin:0;max-width:360px">${esc(msg)}</p>`:''}
    ${TABLE?`<span class="tbl-badge">${ic('pin','sm')}${esc(TABLE)}</span>`:mode==='pickup'?`<span class="tbl-badge">${ic('bag','sm')}Pick-Up</span>`:mode==='delivery'?`<span class="tbl-badge">${ic('bag','sm')}Delivery</span>`:''}
    <div class="acts"><button class="btn" data-go="menus">View Menu</button>${forms().length?`<button class="btn sec" data-go="feedback">Give Feedback</button>`:''}${C('dz.info',true)!==false?`<button class="btn sec" data-go="info">Venue information</button>`:''}</div>
    ${wp('social')!==false?socials(wp('iconColor')):''}</div>${footer()}`;bindGo(app)}
function bindGo(root){$$('[data-go]',root).forEach(b=>b.onclick=()=>go(b.dataset.go))}
function pickMenu(){const ms=MENUS();if(!ms.length){$('.app').innerHTML=`<div class="err"><div>${ic('info')}<h1>No menu yet</h1><p class="mut">This venue hasn't published a menu for this link yet.</p></div></div>`;return}
  if(ms.length===1){location.replace('#/menu/'+ms[0].id);return}
  if(!$('.app .wel')&&!$('.app .land')&&!$('.app .hd'))home();
  sheet({title:'Select a Menu',body:ms.map(m=>`<button class="row" data-m="${esc(m.id)}"><span style="flex:1;font-weight:700">${esc(m.name)}</span>${ic('chev')}</button>`).join('')});
  $$('#sheet [data-m]').forEach(b=>b.onclick=()=>{closeSheet(true);go('/menu/'+b.dataset.m)})}
const footer=()=>`<div class="foot">Powered by <b>PROVIEW</b> QR Menu</div>`;
function forms(){return (D.forms||[]).filter(f=>(f.questions||[]).length)}

/* ---------- menu screen ---------- */
function header(title,{back='',right=''}={}){return `<div class="hd"><button class="ib" data-back="${esc(back)}" aria-label="Back">${ic('back')}</button><h1>${esc(title)}</h1>${right||`<button class="ib" data-drawer aria-label="Menu">${ic('menu')}</button>`}</div>`}
function bindHeader(root){$$('[data-back]',root).forEach(b=>b.onclick=()=>{const t=b.dataset.back;if(t)go(t);else if(history.length>1)history.back();else go('')});$$('[data-drawer]',root).forEach(b=>b.onclick=openDrawer)}
function sortItems(list){if(filt.sort==='top')return [...list].sort((a,b)=>(rating(b)?.avg||0)-(rating(a)?.avg||0));if(filt.sort==='liked')return [...list].sort((a,b)=>likes(b)-likes(a));return list}
function visible(i){if(filt.avoid.length&&[...(i.allergens||[]),...(i.labels||[])].some(x=>filt.avoid.includes(x)))return false;
  if(term){const t=term.toLowerCase();return (i.name||'').toLowerCase().includes(t)||(i.desc||'').toLowerCase().includes(t)}return true}
function card(i,s,grid){const r=rating(i),lk=likes(i),im=imgOf(i);const lbl=C('dz.warn',true)!==false?tags(i).slice(0,5):[];
  return `<div class="it ${i.soldOut?'so':''}" data-item="${esc(i.id)}" role="button" tabindex="0" aria-label="${esc(i.name)}">
    <div class="tx">${r?`<span class="rt">${ic('star','sm')}${r.avg.toFixed(1)} · ${r.n}</span>`:''}<span class="nm">${esc(i.name)}</span>${i.desc&&!grid?`<span class="ds">${esc(i.desc)}</span>`:''}
      ${lbl.length?`<span class="lbls">${lbl.map(x=>`<span class="lb ${/^new$/i.test(x)?'new':''}">${/vegan|vegetarian/i.test(x)?ic('leaf','sm'):/spicy|hot/i.test(x)?ic('fire','sm'):''}${esc(x)}</span>`).join('')}</span>`:''}
      ${i.soldOut?'<span class="so-b">Sold out</span>':`<span class="pr">${priceText(i)}</span>`}</div>
    ${im?`<div class="im" style="background-image:url('${esc(im)}')">${lk?`<span class="lk">${ic('heart')}${lk}</span>`:''}</div>`:grid?`<div class="im" style="display:grid;place-items:center;font-weight:800;color:var(--hl);font-size:22px">${esc(initials(i.name))}</div>`:''}
    ${ordering()&&!i.soldOut?`<button class="add" data-quick="${esc(i.id)}" aria-label="Add ${esc(i.name)}">${ic('plus','sm')}</button>`:''}</div>`}
function renderMenu(){const m=MENU;if(!m){pickMenu();return}const V=D.venue||{};const app=$('.app');const grid=C('dz.style','list')==='grid';const ts=C('dz.title','both');
  const secs=liveSecs(m);const others=MENUS();
  const mostLiked=F('engagement-settings--general',/Most Liked/)===true?[...secs.flatMap(liveItems)].filter(i=>likes(i)>0).sort((a,b)=>likes(b)-likes(a)).slice(0,5):[];
  const body=[mostLiked.length&&!term&&!filt.avoid.length?{id:'__liked',name:'Most Liked',items:mostLiked}:null,...secs].filter(Boolean).map(s=>{const its=sortItems((s.items||[]).filter(i=>i.on!==false&&visible(i)));if(!its.length)return '';const hero=s.id==='__liked'?'':secImg(s);
    return `<section class="sec" id="s-${esc(s.id)}" data-sec="${esc(s.id)}">${hero&&ts!=='txt'?`<div class="hero" style="background-image:url('${esc(hero)}')"></div>`:''}${ts!=='img'||!hero?`<h2>${esc(s.name)}</h2>`:''}${s.desc?`<p class="sd">${esc(s.desc)}</p>`:''}
      <div class="items ${grid?'grid':''}">${its.map(i=>card(i,s,grid)).join('')}</div></section>`}).join('');
  app.innerHTML=`${header(V.name||D.site.name,{back:MENUS().length>1?'menus':''})}
    <div class="chips" id="chips">${secs.map(s=>`<button data-to="${esc(s.id)}">${esc(s.name)}</button>`).join('')}</div>
    <div class="mtitle">${esc(m.name)}</div>
    ${others.length>1?`<div class="mtabs">${others.map(x=>`<button class="${x.id===m.id?'on':''}" data-menu="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div>`:''}
    ${TABLE&&mode==='dine'?`<div style="text-align:center;margin-top:10px"><span class="tbl-badge">${ic('pin','sm')}${esc(TABLE)}</span></div>`:''}
    ${C('dz.search',true)!==false?`<div class="srch"><label>${ic('search','sm')}<input id="q" type="search" placeholder="Search" value="${esc(term)}" aria-label="Search the menu"></label><button class="fb" id="fbtn" aria-label="Filter">${ic('filter')}${filt.avoid.length||filt.sort!=='rec'?`<span class="n">${filt.avoid.length+(filt.sort!=='rec'?1:0)}</span>`:''}</button></div>`:''}
    <div class="tiles ${ts==='txt'?'txt':''}" id="tiles">${secs.map(s=>{const im=secImg(s);return `<button class="tile" data-to="${esc(s.id)}"><div class="ph" style="${im?`background-image:url('${esc(im)}')`:''}">${im?'':esc(initials(s.name))}</div><span>${esc(s.name)}</span></button>`}).join('')}</div>
    <div id="secs">${body||`<div class="empty">${term||filt.avoid.length?'No items match your search.':'This menu has no items yet.'}</div>`}</div>
    ${footer()}<button class="totop" id="totop" aria-label="Back to top">${ic('up')}</button>${basketBar()}`;
  bindHeader(app);bindMenu();showPromo()}
function bindMenu(){const app=$('.app');
  $$('[data-menu]',app).forEach(b=>b.onclick=()=>go('/menu/'+b.dataset.menu));
  $$('[data-to]',app).forEach(b=>b.onclick=()=>{const el=document.getElementById('s-'+b.dataset.to);if(el)window.scrollTo({top:el.getBoundingClientRect().top+scrollY-110,behavior:'smooth'})});
  $$('.it',app).forEach(c=>{c.onclick=e=>{if(e.target.closest('[data-quick]'))return;go(`/menu/${MENU.id}/item/${c.dataset.item}`)};c.onkeydown=e=>{if(e.key==='Enter')c.click()}});
  $$('[data-quick]',app).forEach(b=>b.onclick=e=>{e.stopPropagation();const {i}=findItem(MENU,b.dataset.quick);if(!i)return;
    if((i.priceOptions||[]).filter(p=>p.name).length>1||(i.modifiers||[]).length||(i.removable||[]).length)go(`/menu/${MENU.id}/item/${i.id}`);else addToCart(i,{qty:1})});
  const q=$('#q');if(q){q.oninput=()=>{term=q.value;const pos=q.selectionStart;renderMenu();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)}}
  const fb=$('#fbtn');if(fb)fb.onclick=openFilter;
  const tb=$('#totop');tb.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  const bb=$('#bar');if(bb)bb.onclick=()=>go('basket');
  onScroll()}
function onScroll(){const tiles=$('#tiles'),chips=$('#chips'),tt=$('#totop');if(!chips)return;const past=tiles?tiles.getBoundingClientRect().bottom<60:true;chips.classList.toggle('show',past);if(tt)tt.classList.toggle('show',scrollY>600);
  let cur=null;$$('.sec').forEach(s=>{if(s.getBoundingClientRect().top<140)cur=s.dataset.sec});
  $$('#chips button,#tiles .tile').forEach(b=>b.classList.toggle('on',b.dataset.to===cur));
  const on=$('#chips button.on');if(on&&past){const r=on.getBoundingClientRect(),cr=chips.getBoundingClientRect();if(r.left<cr.left||r.right>cr.right)chips.scrollTo({left:on.offsetLeft-20,behavior:'smooth'})}}
window.addEventListener('scroll',()=>{if(!window._st){window._st=requestAnimationFrame(()=>{window._st=0;onScroll()})}},{passive:true});
function showPromo(){const ps=(D.promotions||[]);if(!ps.length||sess.get('promo:'+MENU.id,false))return;sess.set('promo:'+MENU.id,true);const p=ps[0];
  const bd=document.createElement('div');bd.className='bd center';bd.id='sheet';bd.innerHTML=`<div class="promo" style="${p.img?`background-image:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.65)),url('${esc(p.img)}')`:''}"><button class="ib x" aria-label="Close">${ic('x')}</button><h2>${esc(p.name)}</h2>${p.desc?`<p>${esc(p.desc)}</p>`:''}</div>`;
  bd.onclick=e=>{if(e.target===bd||e.target.closest('.x'))bd.remove()};document.body.appendChild(bd)}

/* ---------- filter ---------- */
function openFilter(){const av=avoidable();let st={...filt,avoid:[...filt.avoid]};
  const draw=()=>`<div class="grp"><button data-tg="srt">Sort By ${ic('chevd','sm')}</button><div id="srt">${[['rec','Recommended (Default)'],['top','Top Rated'],['liked','Most Liked']].map(([k,l])=>`<label class="opt"><input type="radio" name="srt" value="${k}" ${st.sort===k?'checked':''}>${l}</label>`).join('')}</div></div>
    ${av.length?`<div class="grp"><button data-tg="avd">Ingredients you avoid ${ic('chevd','sm')}</button><div id="avd"><p class="hint">Items containing any selected ingredient are hidden from the menu.</p>${av.map(a=>`<label class="opt"><input type="checkbox" value="${esc(a)}" ${st.avoid.includes(a)?'checked':''}>${esc(a)}</label>`).join('')}</div></div>`:''}`;
  sheet({title:'Filter',left:'<button class="l" id="clr">Clear All</button>',body:draw(),foot:'<button class="btn" id="apply">Filter</button>'});
  const s=$('#sheet');s.addEventListener('change',e=>{if(e.target.name==='srt')st.sort=e.target.value;else if(e.target.type==='checkbox'){st.avoid=$$('#avd input:checked',s).map(x=>x.value)}});
  $$('[data-tg]',s).forEach(b=>b.onclick=()=>{const t=document.getElementById(b.dataset.tg);t.hidden=!t.hidden});
  $('#clr').onclick=()=>{st={sort:'rec',avoid:[]};$('.bdy',s).innerHTML=draw();$$('[data-tg]',s).forEach(b=>b.onclick=()=>{const t=document.getElementById(b.dataset.tg);t.hidden=!t.hidden})};
  $('#apply').onclick=()=>{filt=st;closeSheet(true);renderMenu()}}

/* ---------- drawer ---------- */
function openDrawer(){const V=D.venue||{};const bd=document.createElement('div');bd.className='dr-bd';bd.id='sheet';
  const orders=store.get('orders',[]);
  bd.innerHTML=`<div class="dr" role="dialog" aria-label="Menu"><button class="ib" data-x aria-label="Close">${ic('x')}</button>
    <div class="lg" style="${V.logo?`background-image:url('${esc(V.logo)}')`:''}">${V.logo?'':esc(initials(V.name||D.site.name))}</div>
    ${mode==='dine'&&ordering()?`<button class="row" data-go="__waiter">${ic('bell')}Call waiter</button>`:''}
    ${orders.length?`<button class="row" data-go="orders">${ic('receipt')}My orders</button>`:''}
    ${forms().length?`<button class="row" data-go="feedback">${ic('msg')}Give Feedback</button>`:''}
    ${C('dz.info',true)!==false?`<button class="row" data-go="info">${ic('info')}Venue information</button>`:''}
    ${V.phone?`<a class="row" href="tel:${esc(String(V.phone).replace(/\s/g,''))}" style="text-decoration:none">${ic('phone')}${esc(V.phone)}</a>`:''}
    <button class="row" data-go="join">${ic('user')}${profile?esc(profile.name||profile.email):'Login'}</button>
    <div class="bot">${V.address?`<p>${esc(V.address)}</p>`:''}${socials()}</div></div>`;
  bd.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(e.target===bd||e.target.closest('[data-x]')){bd.remove();return}if(g){bd.remove();if(g.dataset.go==='__waiter')callWaiter();else go(g.dataset.go)}});
  document.body.appendChild(bd)}
function callWaiter(){const opts=(cfg.serviceOpts||[]).length?cfg.serviceOpts:['Call waiter','Request the bill'];let sel=opts[0];
  sheet({title:'Call waiter',body:`${TABLE?'':`<label class="fl">Your table</label>${tablePicker()}`}<div class="pills" style="margin:10px 0">${opts.map((o,i)=>`<button class="${i?'':'on'}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><label class="fl">Note (optional)</label><input class="inp" id="svN" maxlength="160">`,foot:'<button class="btn" id="svSend">Send request</button>'});
  $$('#sheet [data-o]').forEach(b=>b.onclick=()=>{sel=b.dataset.o;$$('#sheet [data-o]').forEach(x=>x.classList.toggle('on',x===b))});
  $('#svSend').onclick=async()=>{const t=TABLE||($('#tblSel')||{}).value;if(!t){toast('Choose your table');return}const b=$('#svSend');b.disabled=true;
    try{await submit('service',{table:t,request:sel,note:$('#svN').value.trim()});closeSheet(true);toast('Request sent – someone will be with you shortly')}catch(e){b.disabled=false;toast(e.message)}}}
function tablePicker(v=''){const ts=D.tables||[];return ts.length?`<select class="inp" id="tblSel"><option value="">Choose your table</option>${ts.map(t=>`<option ${t.name===v?'selected':''}>${esc(t.name)}</option>`).join('')}</select>`:`<input class="inp" id="tblSel" placeholder="Table number" value="${esc(v)}">`}

/* ---------- item detail ---------- */
function openItem(id){const {i,s:sec}=findItem(MENU,id);if(!i){go('/menu/'+MENU.id);return}
  const imgs=[...(i.imgs||[]),...(i.img&&!(i.imgs||[]).includes(i.img)?[i.img]:[])];const r=rating(i);const po=(i.priceOptions||[]).filter(p=>p.name||p.price);
  const mods=(i.modifiers||[]).map(id=>(D.modifiers||[]).find(g=>g.id===id)).filter(Boolean);const can=ordering()&&!i.soldOut;
  let st={qty:1,po:0,mods:{},rm:[],note:''};
  const cal=+i.calories||0,unit=C('dz.cal','cal');const nf=i.nf&&i.nf.shown&&i.nf.v?Object.entries(i.nf.v):[];const nc=i.nc&&i.nc.shown?(i.nc.rows||[]):[];
  const recs=(i.recommended||[]).map(id=>findItem(MENU,id).i).filter(Boolean);
  const unitPrice=()=>{const base=po.length?+po[st.po].price||0:+i.price||0;return base+Object.values(st.mods).flat().reduce((a,m)=>a+(+m.price||0),0)};
  const body=`<div class="dt"><div class="gal"><div class="imgs">${imgs.length?imgs.map(u=>`<div style="background-image:url('${esc(u)}')"></div>`).join(''):`<div style="display:grid;place-items:center;font-size:44px;font-weight:800;color:var(--hl);aspect-ratio:16/7">${esc(initials(i.name))}</div>`}${i.video?`<video src="${esc(i.video)}" muted playsinline loop autoplay></video>`:''}</div>
      <button class="ov" style="left:12px" data-x aria-label="Back">${ic('back')}</button><button class="ov" style="right:12px" id="shr" aria-label="Share">${ic('share')}</button></div>
    <h2><span>${esc(i.name)}</span><button class="like ${liked.has(i.id)?'on':''}" id="lk" aria-pressed="${liked.has(i.id)}">${ic('heart','sm')}<b>${likes(i)||''}</b></button></h2>
    ${tags(i).length&&C('dz.warn',true)!==false?`<div class="meta">${tags(i).map(x=>`<span class="lb ${/^new$/i.test(x)?'new':''}">${esc(x)}</span>`).join('')}</div>`:''}
    ${i.desc?`<div class="desc">${esc(i.desc)}</div>`:''}
    ${i.soldOut?'<div class="err-m">Sold out today</div>':po.length<2?`<div class="price">${money(po.length?po[0].price:i.price)}</div>`:''}
    ${cal?`<div class="meta"><span class="chipx">${cal} ${esc(unit)}</span>${C('dz.walk',false)?`<span class="chipx">≈ ${Math.max(1,Math.round(cal/4))} min walk</span>`:''}${i.prep?`<span class="chipx">${ic('clock','sm')}${esc(i.prep)} min</span>`:''}</div>`:''}
    ${(i.allergens||[]).length&&C('dz.warn',true)!==false?`<div class="sec-t">Allergens</div><div class="meta">${i.allergens.map(a=>`<span class="chipx">${ic('warn','sm')}${esc(a)}</span>`).join('')}</div>`:''}
    <div class="revbar" id="rv">${r?`<span class="big">${r.avg.toFixed(1)}</span><div><div class="stars">${'★'.repeat(Math.round(r.avg))}${'☆'.repeat(5-Math.round(r.avg))}</div><small>${r.n} Review${r.n>1?'s':''} ›</small></div><q>${esc(r.last.text||'')}</q>`:`<span style="flex:1">Doesn't have any review yet.</span>`}<button id="addRv">Add Review</button></div>
    ${po.length>1?`<div class="sec-t">${can?'Choose an option':'Prices'}</div>${po.map((p,k)=>can?`<label class="opt"><input type="radio" name="po" value="${k}" ${k===0?'checked':''}>${esc(p.name||'Option '+(k+1))}<span class="p">${money(p.price)}</span></label>`:`<div class="line"><span>${esc(p.name||'Option '+(k+1))}</span><b>${money(p.price)}</b></div>`).join('')}`:''}
    ${can?mods.map(g=>`<div class="sec-t">${esc(g.name||g.groupName)}</div>${(g.mods||[]).filter(m=>m.on!==false&&m.name).map((m,k)=>`<label class="opt"><input type="checkbox" data-g="${esc(g.id)}" data-k="${k}">${esc(m.name)}<span class="p">${+m.price?'+'+money(m.price):''}</span></label>`).join('')}`).join(''):''}
    ${can&&(i.removable||[]).length?`<div class="sec-t">Remove ingredients</div>${i.removable.map(x=>`<label class="opt"><input type="checkbox" data-rm="${esc(x)}">No ${esc(x)}</label>`).join('')}`:''}
    ${nf.length?`<div class="sec-t">Nutrition facts</div>${nf.map(([k,v])=>`<div class="line"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}`:''}
    ${nc.length?`<div class="sec-t">Nutritional content</div>${nc.map(x=>`<div class="line"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>`).join('')}`:''}
    ${recs.length?`<div class="sec-t">Goes well with</div><div class="rec">${recs.map(x=>`<button data-rec="${esc(x.id)}"><div class="ph" style="${imgOf(x)?`background-image:url('${esc(imgOf(x))}')`:''}"></div><b>${esc(x.name)}</b><small class="mut">${priceText(x)}</small></button>`).join('')}</div>`:''}
    ${can?`<label class="fl" for="nt">Note for the kitchen</label><textarea class="inp" id="nt" maxlength="200" placeholder="Any requests? (optional)"></textarea>`:''}</div>`;
  const foot=can?`<div style="display:flex;gap:10px;align-items:center"><div class="qty"><button id="qm" aria-label="Less">−</button><b id="qv">1</b><button id="qp" aria-label="More">+</button></div><button class="btn" id="addC" style="flex:1">Add to basket · <span id="tp">${money(unitPrice())}</span></button></div>`:'';
  const bd=sheet({title:'',body,foot,cls:'item-sh',onClose:()=>{}});bd.querySelector('header').style.display='none';
  const s=bd;const upd=()=>{$('#qv',s).textContent=st.qty;$('#tp',s).textContent=money(unitPrice()*st.qty)};
  if(can){$('#qm',s).onclick=()=>{st.qty=Math.max(1,st.qty-1);upd()};$('#qp',s).onclick=()=>{st.qty=Math.min(50,st.qty+1);upd()};
    s.addEventListener('change',e=>{const t=e.target;if(t.name==='po')st.po=+t.value;else if(t.dataset.g){const g=mods.find(x=>x.id===t.dataset.g);st.mods[g.id]=$$(`[data-g="${t.dataset.g}"]:checked`,s).map(c=>g.mods.filter(m=>m.on!==false&&m.name)[+c.dataset.k])}else if(t.dataset.rm!==undefined)st.rm=$$('[data-rm]:checked',s).map(c=>c.dataset.rm);upd()});
    $('#addC',s).onclick=()=>{st.note=$('#nt',s).value.trim();const opts=[...(po.length>1?[po[st.po].name]:[]),...Object.values(st.mods).flat().map(m=>m.name),...st.rm.map(x=>'No '+x)];
      addToCart(i,{qty:st.qty,price:unitPrice(),opts,note:st.note,alcohol:isAlcohol(i,sec)});closeSheet()}}
  $('#lk',s).onclick=async()=>{const on=!liked.has(i.id);if(on)liked.add(i.id);else liked.delete(i.id);store.set('liked',[...liked]);$('#lk',s).classList.toggle('on',on);$('#lk b',s).textContent=likes(i)||'';
    try{await submit('like',{item:i.id,name:i.name,on})}catch(e){}};
  $('#shr',s).onclick=()=>shareItem(i);
  $('#rv',s).onclick=e=>{if(e.target.closest('#addRv'))return;if(r){closeSheet(true);go(`/menu/${MENU.id}/item/${i.id}/reviews`)}};
  $('#addRv',s).onclick=e=>{e.stopPropagation();addReview(i)};
  $$('[data-rec]',s).forEach(b=>b.onclick=()=>{closeSheet(true);history.replaceState(null,'',`#/menu/${MENU.id}/item/${b.dataset.rec}`);openItem(b.dataset.rec)})}
function shareItem(i){const url=location.href;const txt=`${i.name} at ${(D.venue||{}).name||D.site.name}`;
  if(navigator.share){navigator.share({title:txt,url}).catch(()=>{});return}
  const bd=sheet({title:'Share',center:true,body:`<div style="display:flex;gap:18px;justify-content:center;padding:10px 0">
    <a class="ib" style="width:58px;height:58px;background:var(--bg);border-radius:50%" href="https://wa.me/?text=${encodeURIComponent(txt+' '+url)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a>
    <button class="ib" id="cpl" style="width:58px;height:58px;background:var(--bg);border-radius:50%" aria-label="Copy link">${ic('link')}</button>
    <a class="ib" style="width:58px;height:58px;background:var(--bg);border-radius:50%" href="sms:?&body=${encodeURIComponent(txt+' '+url)}" aria-label="SMS">${ic('sms')}</a></div>`});
  $('#cpl',bd).onclick=()=>{try{navigator.clipboard.writeText(url)}catch(e){}toast('Link copied');bd.remove()}}
function addReview(i){if(!profile){sheet({title:'',center:true,body:`<div style="text-align:center;padding:10px 6px"><div style="font-size:40px">💙</div><h3 style="margin:8px 0">Join us and be valued in our community!</h3><p class="mut">Sign up to leave reviews, like your favourites and check out faster next time.</p><button class="btn" id="su">Sign Up</button><p style="margin:14px 0 0">Already have an account? <a href="#/join" id="lg">Login</a></p></div>`});
    $('#su').onclick=()=>{closeSheet(true);go('join')};$('#lg').onclick=()=>closeSheet(true);return}
  let rate=0;sheet({title:'Add Review',body:`<p style="text-align:center;font-weight:700;margin:4px 0 10px">${esc(i.name)}</p><div class="qstars" id="rs">${[1,2,3,4,5].map(n=>`<button data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div><label class="fl" for="rtx">Your review</label><textarea class="inp" id="rtx" maxlength="500" placeholder="What did you think?"></textarea>`,foot:'<button class="btn" id="rsend" disabled>Submit review</button>'});
  $$('#rs button').forEach(b=>b.onclick=()=>{rate=+b.dataset.n;$$('#rs button').forEach(x=>x.classList.toggle('on',+x.dataset.n<=rate));$('#rsend').disabled=false});
  $('#rsend').onclick=async()=>{const b=$('#rsend');b.disabled=true;try{await submit('review',{item:`${i.name} (${MENU.name})`,rate,text:$('#rtx').value.trim(),name:profile.name||'Guest',email:profile.email||''});closeSheet(true);toast('Thanks! Your review has been sent')}catch(e){b.disabled=false;toast(e.message)}}}
function renderReviews(id){const {i}=findItem(MENU,id);if(!i){go('/menu/'+MENU.id);return}const rs=reviewsOf(i),r=rating(i);const dist=[5,4,3,2,1].map(n=>[n,rs.filter(x=>Math.round(+x.rate)===n).length]);
  $('.app').innerHTML=`${header('Review',{back:`/menu/${MENU.id}/item/${i.id}`,right:'<span></span>'})}<div class="pg"><div class="bdy"><h2 style="margin:0 0 12px">${esc(i.name)}</h2>
    ${r?`<div class="card" style="display:flex;gap:18px;align-items:center"><div style="text-align:center"><div style="font-size:40px;font-weight:800">${r.avg.toFixed(1)}</div><div class="stars">${'★'.repeat(Math.round(r.avg))}</div><small class="mut">${r.n} Reviews</small></div><div style="flex:1">${dist.map(([n,c])=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px"><span>${n}★</span><div style="flex:1;height:7px;border-radius:9px;background:var(--bg);overflow:hidden"><i style="display:block;height:100%;width:${rs.length?c/rs.length*100:0}%;background:var(--hl)"></i></div><span>${c}</span></div>`).join('')}</div></div>
    ${rs.map(x=>`<div class="card"><div style="display:flex;justify-content:space-between"><b>${esc(x.customer||'Guest')}</b><small class="mut">${esc(String(x.date||'').slice(0,10))}</small></div><div class="stars">${'★'.repeat(+x.rate||0)}</div>${x.text?`<p style="margin:6px 0 0">${esc(x.text)}</p>`:''}</div>`).join('')}`:`<div class="empty">No reviews yet.</div>`}</div>
    <div class="sticky-b"><button class="btn" id="arv">Add Review</button></div></div>`;bindHeader($('.app'));$('#arv').onclick=()=>addReview(i)}

/* ---------- basket ---------- */
function saveCart(){sess.set('cart',cart)}
function addToCart(i,{qty=1,price,opts=[],note='',alcohol=false}){price=price??(+i.price||itemPrices(i)[0]);const key=i.id+'|'+opts.join(',')+'|'+note;
  const ex=cart.find(c=>c.key===key);if(ex)ex.qty+=qty;else cart.push({key,id:i.id,name:i.name,price,qty,opts,note,alcohol,img:imgOf(i)});saveCart();toast(`${i.name} added to basket`);
  const bb=$('#bar');if(bb)bb.outerHTML=basketBar();else $('.app').insertAdjacentHTML('beforeend',basketBar());const nb=$('#bar');if(nb)nb.onclick=()=>go('basket')}
const cartQty=()=>cart.reduce((a,c)=>a+c.qty,0),cartSub=()=>cart.reduce((a,c)=>a+c.price*c.qty,0);
function basketBar(){return ordering()&&cart.length?`<button class="bar" id="bar">${ic('bag')}<span class="c">${cartQty()}</span>View basket<span class="t">${money(cartSub())}</span></button>`:''}
let promo=sess.get('promo',null),tipPct=sess.get('tip',0);
function charges(){const sub=cartSub();const svc=((cfg.charges||{}).service||[]).reduce((a,c)=>a+sub*(+c.rate||0)/100,0);
  let disc=0;if(promo){if(sub>=(+promo.min||0)){disc=promo.type==='Amount'?Math.min(sub,+promo.off||0):sub*(+promo.off||0)/100}}
  const fee=mode==='delivery'?+(F('orders-settings--delivery',/Delivery Fee/)||0):0;const tip=(sub-disc)*tipPct/100;
  return {sub,svc,disc,fee,tip,total:Math.max(0,sub-disc+svc+fee+tip)}}
function renderBasket(){if(!MENU)MENU=MENUS()[0];const app=$('.app');const ch2=charges();const min=+(F(ORD_ROUTE(),/Minimum Order/)||0);const note=F(ORD_ROUTE(),/Restaurant Note/);
  const tipOn=F(ORD_ROUTE(),/^Accept tip/)===true;const rates=[10,12.5,15];
  app.innerHTML=`${header('Your basket',{back:MENU?'/menu/'+MENU.id:'',right:'<span></span>'})}<div class="pg"><div class="bdy">
    ${cart.length?`<div class="card">${cart.map((c,k)=>`<div class="bl">${c.img?`<div style="width:54px;height:54px;border-radius:10px;background:center/cover url('${esc(c.img)}');flex:none"></div>`:''}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b>${c.opts.length?`<div class="mut" style="font-size:13px">${esc(c.opts.join(' · '))}</div>`:''}${c.note?`<div class="mut" style="font-size:13px">“${esc(c.note)}”</div>`:''}<div style="font-weight:700;margin-top:4px">${money(c.price*c.qty)}</div></div>
      <div class="q"><button data-d="-1" data-k="${k}" aria-label="Less">−</button><b>${c.qty}</b><button data-d="1" data-k="${k}" aria-label="More">+</button></div></div>`).join('')}</div>
      ${note?`<div class="card" style="font-size:14px">${ic('info','sm')} ${esc(note)}</div>`:''}
      <div class="card"><label class="fl" style="margin-top:0">Promo code</label><div style="display:flex;gap:8px"><input class="inp" id="pc" placeholder="Enter code" value="${esc(promo?promo.code:'')}" style="text-transform:uppercase"><button class="btn sm" id="pcA">${promo?'Remove':'Apply'}</button></div><div id="pcM"></div></div>
      ${tipOn?`<div class="card"><b>Add a tip</b><div class="pills" style="margin-top:10px">${[0,...rates].map(r=>`<button data-tip="${r}" class="${tipPct===r?'on':''}">${r?r+'%':'No tip'}</button>`).join('')}</div></div>`:''}
      <div class="card"><div class="line"><span>Subtotal</span><span>${money(ch2.sub)}</span></div>${ch2.disc?`<div class="line"><span>Discount (${esc(promo.code)})</span><span>−${money(ch2.disc)}</span></div>`:''}${ch2.svc?`<div class="line"><span>Service charge</span><span>${money(ch2.svc)}</span></div>`:''}${ch2.fee?`<div class="line"><span>Delivery fee</span><span>${money(ch2.fee)}</span></div>`:''}${ch2.tip?`<div class="line"><span>Tip</span><span>${money(ch2.tip)}</span></div>`:''}<div class="line tot"><span>Total</span><span>${money(ch2.total)}</span></div>
        ${min&&ch2.sub<min?`<div class="err-m">Minimum order is ${money(min)}. Add ${money(min-ch2.sub)} more.</div>`:''}</div>`:`<div class="empty">${ic('bag')}<p>Your basket is empty.</p><button class="btn sec" data-back-menu>Browse the menu</button></div>`}
    </div>${cart.length?`<div class="sticky-b"><button class="btn" id="toCo" ${min&&ch2.sub<min?'disabled':''}>Go to checkout · ${money(ch2.total)}</button></div>`:''}</div>`;
  bindHeader(app);$$('[data-back-menu]',app).forEach(b=>b.onclick=()=>go(MENU?'/menu/'+MENU.id:''));
  $$('.bl [data-d]',app).forEach(b=>b.onclick=()=>{const c=cart[+b.dataset.k];c.qty+=+b.dataset.d;if(c.qty<1)cart.splice(+b.dataset.k,1);saveCart();renderBasket()});
  $$('[data-tip]',app).forEach(b=>b.onclick=()=>{tipPct=+b.dataset.tip;sess.set('tip',tipPct);renderBasket()});
  const pa=$('#pcA');if(pa)pa.onclick=()=>{if(promo){promo=null;sess.set('promo',null);renderBasket();return}const code=$('#pc').value.trim().toUpperCase();
    const p=(D.promoCodes||[]).find(x=>String(x.code).toUpperCase()===code&&(!x.mode||x.mode==='All'||x.mode.replace(/[\s-]/g,'').toLowerCase()===typeLabel().replace(/[\s-]/g,'').toLowerCase()));
    if(!p){$('#pcM').innerHTML='<div class="err-m">That code isn’t valid here.</div>';return}if(cartSub()<(+p.min||0)){$('#pcM').innerHTML=`<div class="err-m">This code needs a minimum order of ${money(p.min)}.</div>`;return}
    promo=p;sess.set('promo',p);renderBasket();toast('Promo code applied')};
  const co=$('#toCo');if(co)co.onclick=()=>go('checkout')}

/* ---------- checkout ---------- */
function renderCheckout(){if(!cart.length){go('basket');return}const app=$('.app');const R=ORD_ROUTE();
  const pay=[['Credit/Debit Card through POS',/Credit\/Debit Card through POS/],['Cash',/^Cash$/]].filter(([l,re])=>F(R,re)!==false).map(x=>x[0]);
  const age=F(R,/Age Verification/)===true&&cart.some(c=>c.alcohol);const pre=mode!=='dine'&&F(R,/Pre-Order/)===true;const dTime=F(R,/Delivery Time/);
  const p=profile||{};
  app.innerHTML=`${header('Checkout',{back:'basket',right:'<span></span>'})}<div class="pg"><div class="bdy">
    <div class="card"><b>${typeLabel()}</b>${mode==='dine'?`<label class="fl">Table</label>${TABLE?`<div class="tbl-badge">${ic('pin','sm')}${esc(TABLE)}</div>`:tablePicker()}<label class="fl" for="gc">Guests</label><input class="inp" id="gc" type="number" min="1" max="30" value="2">`:''}
      ${mode==='delivery'&&dTime?`<p class="mut" style="margin:8px 0 0">Estimated delivery: about ${esc(dTime)} minutes.</p>`:''}</div>
    <div class="card"><b>Your details</b><label class="fl" for="cn">Name${mode==='dine'?'':' *'}</label><input class="inp" id="cn" autocomplete="name" value="${esc(p.name||'')}">
      <label class="fl" for="cp">Phone${mode==='dine'?'':' *'}</label><input class="inp" id="cp" type="tel" autocomplete="tel" value="${esc(p.phone||'')}">
      <label class="fl" for="ce">Email</label><input class="inp" id="ce" type="email" autocomplete="email" value="${esc(p.email||'')}">
      ${mode==='delivery'?`<label class="fl" for="ca">Delivery address *</label><textarea class="inp" id="ca" autocomplete="street-address" style="min-height:70px"></textarea>`:''}</div>
    ${pre?`<div class="card"><b>When?</b><div class="seg" style="margin-top:10px"><button class="on" data-when="asap">As soon as possible</button><button data-when="later">Schedule</button></div><input class="inp hidden" id="wt" type="datetime-local" style="margin-top:10px"></div>`:''}
    ${pay.length?`<div class="card"><b>Payment</b>${pay.map((x,k)=>`<label class="opt"><input type="radio" name="pay" value="${esc(x)}" ${k?'':'checked'}>${esc(x==='Credit/Debit Card through POS'?'Card (pay staff)':x)}</label>`).join('')}</div>`:''}
    <div class="card"><label class="fl" style="margin-top:0" for="on">Order note</label><textarea class="inp" id="on" maxlength="300" placeholder="Anything we should know? (optional)"></textarea></div>
    ${age?`<div class="card"><label class="check"><input type="checkbox" id="age">I confirm I am 18 or over (your order includes alcohol).</label></div>`:''}
    <label class="check" style="margin:6px 4px 0"><input type="checkbox" id="tos">I agree to share these details with ${esc((D.venue||{}).name||D.site.name)} to process my order.</label>
    <div id="coErr"></div></div><div class="sticky-b"><button class="btn" id="place">Place order · ${money(charges().total)}</button></div></div>`;
  bindHeader(app);$$('[data-when]',app).forEach(b=>b.onclick=()=>{$$('[data-when]',app).forEach(x=>x.classList.toggle('on',x===b));$('#wt').classList.toggle('hidden',b.dataset.when!=='later')});
  $('#place').onclick=async()=>{const e=m=>{$('#coErr').innerHTML=`<div class="err-m">${esc(m)}</div>`};const t=TABLE||($('#tblSel')||{}).value||'';
    const cust={name:$('#cn').value.trim(),phone:$('#cp').value.trim(),email:$('#ce').value.trim(),address:($('#ca')||{}).value?.trim()||''};
    if(mode==='dine'&&!t)return e('Choose your table.');if(mode!=='dine'&&(!cust.name||!cust.phone))return e('Enter your name and phone number.');
    if(mode==='delivery'&&!cust.address)return e('Enter your delivery address.');if(age&&!$('#age').checked)return e('Please confirm you are 18 or over.');if(!$('#tos').checked)return e('Please tick the box to agree.');
    const c2=charges();const b=$('#place');b.disabled=true;b.textContent='Sending…';
    const when=$('#wt')&&!$('#wt').classList.contains('hidden')&&$('#wt').value?$('#wt').value.replace('T',' '):'';
    const payload={type:typeLabel(),table:mode==='dine'?t:'',guests:+(($('#gc')||{}).value||1),customer:cust,items:cart.map(c=>({name:c.name,price:c.price,qty:c.qty,options:c.opts,notes:c.note})),
      subtotal:c2.sub,service:c2.svc,discount:c2.disc,tip:c2.tip,fee:c2.fee,total:c2.total,promo:promo?promo.code:'',payment:(($('input[name=pay]:checked')||{}).value)||'',when,notes:$('#on').value.trim()};
    try{const r=await submit('order',payload);const orders=store.get('orders',[]);orders.unshift({ref:r.ref,at:Date.now(),total:c2.total,type:typeLabel(),table:payload.table});store.set('orders',orders.slice(0,20));
      if(cust.name||cust.email){profile={...(profile||{}),...cust};store.set('profile',profile)}cart=[];saveCart();promo=null;sess.set('promo',null);location.replace('#/order/'+r.ref)}
    catch(x){b.disabled=false;b.textContent='Place order';e(x.message)}}}
let orderTimer=null;
async function renderOrder(ref){clearInterval(orderTimer);const app=$('.app');const mine=store.get('orders',[]).find(o=>o.ref===ref)||{};
  const draw=st=>{const s=(st&&st.status)||'Sent';const flow=['Sent','Waiting','In Progress',mine.type==='Pick-Up'?'Ready for Pickup':'Ready','Closed'];const idx=s==='Sent'?0:Math.max(1,flow.findIndex(x=>x.toLowerCase()===s.toLowerCase()));
    const cancelled=/cancel|refund/i.test(s);const canCancel=F(ORD_ROUTE(),/Cancel Order/)===true&&(s==='Sent'||s==='Waiting');
    app.innerHTML=`${header('Your order',{back:MENU?'/menu/'+MENU.id:'',right:'<span></span>'})}<div class="pg"><div class="bdy">
      <div class="card" style="text-align:center"><div style="font-size:40px">${cancelled?'✕':idx>=3?'✓':'🧾'}</div><h2 style="margin:6px 0">${cancelled?'Order cancelled':idx>=3?'Your order is ready':'Order received'}</h2><p class="mut" style="margin:0">Reference <b>${esc(ref)}</b>${st&&st.id?` · Order ${esc(st.id)}`:''}${mine.table?` · ${esc(mine.table)}`:''}</p></div>
      ${cancelled?'':`<div class="card"><div class="steps">${[['Sent','Sent to the venue'],['Waiting','Waiting to be accepted'],['In Progress','Being prepared'],[flow[3],mine.type==='Pick-Up'?'Ready to collect':'Ready'],['Closed','Completed']].map(([k,l],n)=>`<div class="step ${n<=idx?'done':''} ${n===idx?'cur':''}"><i>${n<idx?'✓':n+1}</i><div><b>${l}</b></div></div>`).join('')}</div><p class="mut" style="font-size:13px;margin:6px 0 0">This page updates automatically.</p></div>`}
      ${canCancel?`<button class="btn sec" id="cxl">Cancel order</button>`:''}<button class="btn sec" style="margin-top:10px" data-back-menu>Back to menu</button></div></div>`;
    bindHeader(app);$$('[data-back-menu]',app).forEach(b=>b.onclick=()=>go(MENU?'/menu/'+MENU.id:''));
    const cx=$('#cxl');if(cx)cx.onclick=async()=>{cx.disabled=true;try{await submit('service',{table:mine.table||'',request:'Cancel order '+ref,note:'Guest asked to cancel this order'});toast('Cancellation requested')}catch(x){cx.disabled=false;toast(x.message)}}};
  draw(null);const tick=async()=>{try{const st=await rpc('pq_guest_order',{p_site:SITE,p_ref:ref});if(location.hash.includes(ref))draw(st)}catch(e){}};tick();orderTimer=setInterval(()=>{if(!location.hash.includes('/order/'))return clearInterval(orderTimer);tick()},10000)}
function renderMyOrders(){const os=store.get('orders',[]);const app=$('.app');
  app.innerHTML=`${header('My orders',{right:'<span></span>'})}<div class="pg"><div class="bdy">${os.length?os.map(o=>`<button class="row card" data-o="${esc(o.ref)}" style="border:0"><div style="flex:1"><b>${esc(o.type||'Order')} · ${esc(o.ref)}</b><div class="mut" style="font-size:13px">${new Date(o.at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}${o.table?' · '+esc(o.table):''}</div></div><b>${money(o.total)}</b>${ic('chev')}</button>`).join(''):'<div class="empty">No orders yet.</div>'}</div></div>`;
  bindHeader(app);$$('[data-o]',app).forEach(b=>b.onclick=()=>go('order/'+b.dataset.o))}

/* ---------- feedback ---------- */
function renderFeedback(){const f=forms()[0];if(!f){go('');return}const app=$('.app');const ans={};
  const qs=f.questions.map(([q,type,req],k)=>({q,type,req,k}));
  const ctl=x=>x.type==='Star Rating'?`<div class="qstars" data-q="${x.k}">${[1,2,3,4,5].map(n=>`<button data-v="${n}" aria-label="${n} stars">★</button>`).join('')}</div>`:x.type==='Yes/No'?`<div class="yn" data-q="${x.k}"><button data-v="Yes">Yes</button><button data-v="No">No</button></div>`:x.type==='Smiley'?`<div class="yn" data-q="${x.k}">${['😞','😐','🙂','😍'].map(s=>`<button data-v="${s}" style="min-width:56px;font-size:22px">${s}</button>`).join('')}</div>`:`<input class="inp" data-q="${x.k}" maxlength="500">`;
  app.innerHTML=`${header(f.name||'Feedback',{right:'<span></span>'})}<div class="pg"><div class="bdy"><h2 style="text-align:center;margin:6px 0 4px">${esc(f.welcome||'Please give us 60 seconds!')}</h2>
    ${qs.map(x=>`<div class="fq"><p>${esc(x.q)}${x.req?' *':''}</p>${ctl(x)}</div>`).join('')}
    <div class="fq" style="text-align:left"><label class="fl" for="fn">Name *</label><input class="inp" id="fn" value="${esc((profile||{}).name||'')}"><label class="fl" for="fe">Email address *</label><input class="inp" id="fe" type="email" value="${esc((profile||{}).email||'')}"></div>
    <label class="check"><input type="checkbox" id="ftos">I agree to ${esc((D.venue||{}).name||D.site.name)} storing my answers to improve its service.</label></div>
    <div class="sticky-b"><button class="btn" id="fsend" disabled>SUBMIT</button></div></div>`;
  bindHeader(app);const chk=()=>{const ok=qs.every(x=>!x.req||(ans[x.k]&&String(ans[x.k]).trim()))&&$('#fn').value.trim()&&/\S+@\S+\.\S+/.test($('#fe').value)&&$('#ftos').checked;$('#fsend').disabled=!ok};
  app.addEventListener('click',e=>{const b=e.target.closest('[data-q] button');if(!b)return;const g=b.parentElement;ans[g.dataset.q]=g.classList.contains('qstars')?'★'.repeat(+b.dataset.v):b.dataset.v;
    $$('button',g).forEach(x=>x.classList.toggle('on',g.classList.contains('qstars')?+x.dataset.v<=+b.dataset.v:x===b));chk()});
  app.addEventListener('input',e=>{if(e.target.matches('input[data-q]'))ans[e.target.dataset.q]=e.target.value;chk()});$('#ftos').onchange=chk;
  $('#fsend').onclick=async()=>{const b=$('#fsend');b.disabled=true;try{await submit('feedback',{form:f.name,table:TABLE||'—',answers:[...qs.map(x=>({q:x.q,a:ans[x.k]||'—'})),{q:'Name',a:$('#fn').value.trim()},{q:'Email',a:$('#fe').value.trim()}]});
    app.innerHTML=`${header('Thank you',{right:'<span></span>'})}<div class="err"><div><div style="font-size:48px">🙏</div><h1>Thank you!</h1><p class="mut">Your feedback has been sent to ${esc((D.venue||{}).name||D.site.name)}.</p><button class="btn" data-back-menu style="margin-top:12px">Back to menu</button></div></div>`;bindHeader(app);$$('[data-back-menu]',app).forEach(x=>x.onclick=()=>go(MENU?'/menu/'+MENU.id:''))}
    catch(x){b.disabled=false;toast(x.message)}}}

/* ---------- venue info ---------- */
function renderInfo(){const V=D.venue||{};const app=$('.app');const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];const c=ch()==='tablet'?'dinein':ch();
  const hrs=days.map(d=>{const o=cfg[`hrs.${c}.${d}.open`],cl=cfg[`hrs.${c}.${d}.close`],on=cfg[`hrs.${c}.${d}`];return [d,on===false?'Closed':o&&cl?`${o} – ${cl}`:'']}).filter(x=>x[1]);
  const addr=[V.address,V.city,V.zip].filter(Boolean).join(', ');
  app.innerHTML=`${header(V.name||D.site.name,{right:'<span></span>'})}<div class="pg"><div class="bdy">
    <div class="card" style="text-align:center"><div class="lg" style="width:90px;height:90px;border-radius:22px;margin:0 auto 10px;background:var(--bg) center/contain no-repeat;${V.logo?`background-image:url('${esc(V.logo)}')`:''};display:grid;place-items:center;font-weight:800;font-size:28px;color:var(--hl)">${V.logo?'':esc(initials(V.name||D.site.name))}</div><h2 style="margin:0">${esc(V.name||D.site.name)}</h2></div>
    ${addr?`<a class="card row" style="text-decoration:none;border:0" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${ic('pin')}<span style="flex:1">${esc(addr)}</span>${ic('chev')}</a>`:''}
    ${V.phone?`<a class="card row" style="text-decoration:none;border:0" href="tel:${esc(String(V.phone).replace(/\s/g,''))}">${ic('phone')}<span style="flex:1">${esc(V.phone)}</span>${ic('chev')}</a>`:''}
    ${V.website?`<a class="card row" style="text-decoration:none;border:0" href="${esc(/^https?:/.test(V.website)?V.website:'https://'+V.website)}" target="_blank" rel="noopener">${ic('globe')}<span style="flex:1">${esc(V.website)}</span>${ic('chev')}</a>`:''}
    ${hrs.length?`<div class="card"><b>Opening hours</b>${hrs.map(([d,h])=>`<div class="line"><span>${d}</span><span class="mut">${esc(h)}</span></div>`).join('')}</div>`:''}
    ${socials()?`<div class="card">${socials('var(--hl)')}</div>`:''}</div></div>`;bindHeader(app)}

/* ---------- guest profile (sign up / login) ---------- */
function renderJoin(){const app=$('.app');const p=profile||{};
  app.innerHTML=`${header(profile?'Your profile':'Sign Up',{right:'<span></span>'})}<div class="pg"><div class="bdy">
    <h2 style="margin:4px 0">${profile?'Your details':'Sign up with email'}</h2><p class="mut" style="margin:0 0 6px">${profile?'Used to speed up checkout and to sign your reviews.':'Save your details for faster ordering, leave reviews and like your favourites.'}</p>
    <label class="fl" for="jn">Name *</label><input class="inp" id="jn" autocomplete="name" value="${esc(p.name||'')}">
    <label class="fl" for="je">Email address *</label><input class="inp" id="je" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(p.email||'')}">
    <label class="fl" for="jp">Phone</label><input class="inp" id="jp" type="tel" autocomplete="tel" value="${esc(p.phone||'')}">
    <label class="check" style="margin-top:14px"><input type="checkbox" id="jok" ${profile?'checked':''}>I agree to ${esc((D.venue||{}).name||D.site.name)} keeping these details to serve me.</label>
    <div id="jm"></div>${profile?'<button class="btn sec" id="jout" style="margin-top:14px">Sign out on this device</button>':''}</div>
    <div class="sticky-b"><button class="btn" id="jgo">${profile?'Save':'Sign Up'}</button></div></div>`;bindHeader(app);
  $('#jgo').onclick=async()=>{const n=$('#jn').value.trim(),e=$('#je').value.trim(),ph=$('#jp').value.trim();if(!n||!/\S+@\S+\.\S+/.test(e)){$('#jm').innerHTML='<div class="err-m">Enter your name and a valid email address.</div>';return}
    if(!$('#jok').checked){$('#jm').innerHTML='<div class="err-m">Please tick the box to agree.</div>';return}
    const isNew=!profile||profile.email!==e;profile={name:n,email:e,phone:ph};store.set('profile',profile);if(isNew){try{await submit('customer',profile)}catch(x){}}
    toast(isNew?'Welcome, '+n.split(' ')[0]+'!':'Saved');history.length>1?history.back():go('')};
  const so=$('#jout');if(so)so.onclick=()=>{profile=null;store.set('profile',null);toast('Signed out');go('')}}

/* ---------- cookie consent ---------- */
function cookies(){if(store.get('cookies',null))return;const el=document.createElement('div');el.className='ck';el.setAttribute('role','dialog');
  el.innerHTML=`<h3>We value your privacy</h3><p>We use cookies and similar storage to remember your basket and preferences and to understand how the menu is used.</p><div class="bs"><button class="btn sec" id="ckC">Customize</button><button class="btn sec" id="ckE">Essential only</button><button class="btn" id="ckA">Accept all</button></div>`;
  document.body.appendChild(el);const done=v=>{store.set('cookies',v);el.remove()};
  $('#ckA',el).onclick=()=>done({ess:1,mkt:1,an:1});$('#ckE',el).onclick=()=>done({ess:1,mkt:0,an:0});
  $('#ckC',el).onclick=()=>{el.innerHTML=`<h3>Privacy settings</h3><p>Choose which cookies you allow. Strictly necessary cookies keep the menu and your basket working and can't be turned off.</p>
    ${[['ess','Strictly Necessary Cookies',1,1],['mkt','Marketing Cookies',0,0],['an','Analytics Cookies',0,0]].map(([k,l,v,d])=>`<label class="opt" style="justify-content:space-between"><span>${l}</span><span class="sw"><input type="checkbox" data-ck="${k}" ${v?'checked':''} ${d?'disabled':''}><span></span></span></label>`).join('')}
    <button class="btn" id="ckS" style="margin-top:10px">Save Settings</button>`;$('#ckS',el).onclick=()=>done(Object.fromEntries($$('[data-ck]',el).map(c=>[c.dataset.ck,c.checked?1:0])))}}

/* ---------- boot ---------- */
async function boot(){const app=$('.app');app.innerHTML='<div class="load"><div class="dot"></div></div>';
  if(!SITE){app.innerHTML=`<div class="err"><div>${ic('info')}<h1>Menu not found</h1><p class="mut">Scan the QR code on your table again.</p></div></div>`;return}
  try{D=await rpc('pq_public_menu',{p_site:SITE})}catch(e){D=null}
  if(!D){app.innerHTML=`<div class="err"><div>${ic('info')}<h1>This menu isn’t available right now</h1><p class="mut">Please ask a member of staff for help.</p></div></div>`;return}
  cfg=D.cfg||{};const o=Q.get('o');mode=Q.get('v')==='1'?'view':o==='pickup'||o==='delivery'||o==='tablet'?o:'dine';
  if(mode==='dine'&&!ordering())mode='view';
  if(mode==='view'&&Q.get('t'))TABLE=Q.get('t');
  document.title=`${(D.venue||{}).name||D.site.name} | Menu`;theme();cookies();
  if(Q.get('p')==='reservation'){go('info');toast('Please call the venue to book a table');}
  const m=Q.get('m');if(m&&!location.hash){location.replace('#/menu/'+m);return route()}
  route()}
boot();
})();
