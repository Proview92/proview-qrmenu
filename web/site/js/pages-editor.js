/* Proview Menu – Menu editor (#menu-editor--<menuId>) */
(function(){
const {UI,toast}=App, {ic,esc,gbp,uid,initials}=UI;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const A=App.action;

/* editor-only styles */
const css=document.createElement('style');css.textContent=`
.ed-price{display:flex;align-items:center;border:1px solid var(--border-input);border-radius:8px;height:36px;overflow:hidden;background:#fff}
.ed-price input{border:0;outline:0;width:100%;text-align:right;font-weight:600;padding:0 6px;min-width:0;background:transparent}
.ed-price span{padding:0 8px 0 2px;color:var(--muted)}
.ed-price .ed-enter{display:none;border:0;background:var(--brand-tint);color:var(--brand-700);height:100%;padding:0 8px;cursor:pointer}
.ed-price:focus-within{border-color:var(--brand-700);box-shadow:0 0 0 1px var(--brand-700)}
.ed-price:focus-within .ed-enter{display:grid;place-items:center}
.ed-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none;display:inline-block}
.ed-dot.off{background:#B5BEC8}
.ed-coll{display:flex;align-items:center;gap:12px;width:100%;padding:14px 18px;background:none;border:0;cursor:pointer;text-align:left;font:inherit;color:inherit}
.ed-bulk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;margin-bottom:14px;position:sticky;top:72px;z-index:6;box-shadow:var(--shadow)}
.ed-sections .section{overflow:visible}
.ed-sections .sec-head{border-radius:14px 14px 0 0}
.ed-sections .sec-head:not(.open){border-radius:14px}
.ed-sections .item{grid-template-columns:18px 18px 48px minmax(0,1fr) 130px 44px 36px;cursor:pointer}
.ed-sections .item:hover{background:var(--brand-tint-subtle)}
.ed-sections .item .drag,.ed-sections .sec-head .drag{cursor:grab}
.ed-tiles{display:flex;gap:8px;overflow:auto;padding:4px 12px 8px;scrollbar-width:none}
.ed-tile{flex:none;width:72px;text-align:center;font-size:11px;font-weight:600;color:var(--ink);line-height:13px}
.ed-tile i{display:grid;place-items:center;width:72px;height:52px;border-radius:10px;background:var(--brand-tint);color:var(--brand-700);font-style:normal;font-weight:700;margin-bottom:4px}
.ed-toolbar{display:flex;gap:2px;border:1px solid var(--border-input);border-bottom:0;border-radius:10px 10px 0 0;padding:4px;background:var(--page);flex-wrap:wrap}
.ed-toolbar button{min-width:30px;height:28px;border:0;background:none;border-radius:6px;cursor:pointer;font-weight:700;color:var(--ink-2);display:grid;place-items:center}
.ed-toolbar button:hover{background:#fff}
.ed-rte{border:1px solid var(--border-input);border-radius:0 0 10px 10px;min-height:90px;padding:10px 12px;outline:0;background:#fff}
.ed-rte:focus{border-color:var(--brand-700)}
.ed-rte:empty::before{content:attr(data-ph);color:var(--muted)}
.ed-drop-over{outline:2px dashed var(--brand-500);outline-offset:-2px}
.ed-group-sub{display:block;font-size:12px;color:var(--muted);font-weight:400}
.ed-po{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 36px;gap:8px;align-items:end;margin-bottom:10px}
.ed-po label{font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px}
.ed-chips{display:flex;gap:6px;flex-wrap:wrap}
.ed-gen-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px 14px}
.ed-gen-grid label{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:10px;padding:8px 10px;cursor:pointer;background:#fff}
.ed-gen-grid label:has(input:checked){border-color:var(--brand-700);background:var(--brand-tint-subtle)}
.ed-promo{position:absolute;inset:0;background:rgba(26,35,48,.55);display:flex;align-items:flex-end;z-index:3}
.ed-promo>div{background:#fff;border-radius:18px 18px 0 0;padding:18px;width:100%;position:relative}
.ed-tiles-stat{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0 18px 12px}
.ed-tiles-stat div{background:var(--page);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.ed-tiles-stat b{display:block;font-size:20px;color:var(--ink);margin-top:2px}
@media (max-width:760px){.ed-sections .item{grid-template-columns:18px 48px minmax(0,1fr) 96px 44px}.ed-sections .item .drag,.ed-sections .item>.dd{display:none}.ed-tiles-stat{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(css);

const ALLERGENS=['Celery','Cereals containing gluten','Crustaceans','Eggs','Fish','Lupin','Milk','Molluscs','Mustard','Tree nuts','Peanuts','Sesame','Soya','Sulphur dioxide'];
const LABELS=['Vegan','Vegetarian','Gluten Free','Halal','Spicy','New','Chef\'s Pick','Popular'];
let BADGES=['Best Seller','Limited Time','House Favourite'];
let REMOVABLE=['Onion','Tomato','Cheese','Mayo','Pickles','Garlic','Sauce','Bread'];

/* local state */
let M=null, mid=null, sel=new Set(), q='', scoreOpen=false, genOpen=false, genSel=new Set(), pvMenu=null, pvQ='', promoClosed=false;
let ctx={}; // pending modal/drawer context
const menus=()=>App.state.menus;
const allItems=m=>(m||M).sections.flatMap(s=>s.items);
const findItem=id=>{for(const s of M.sections){const i=s.items.find(x=>x.id===id);if(i)return {s,i}}return {}};
const findSec=id=>M.sections.find(s=>s.id===id);
const pct=(n,d)=>d?Math.round(n/d*100):0;
const isMissing=i=>!i.photo||!i.desc||!(i.allergens&&i.allergens.length)||!(i.price>0);
function scoreOf(m){const it=allItems(m);if(!it.length)return 0;return Math.round(it.reduce((a,i)=>a+(i.photo?25:0)+(i.desc?25:0)+((i.allergens||[]).length?25:0)+(i.price>0?25:0),0)/it.length)}
const clone=o=>JSON.parse(JSON.stringify(o));
const freshItem=i=>({...clone(i),id:uid()});
const freshSec=s=>({...clone(s),id:uid(),items:s.items.map(freshItem)});

/* ---------- page ---------- */
App.route('menu-editor',id=>{
  const m=menus().find(x=>x.id===id);
  if(!m)return UI.pageHead({title:'Menu not found',back:'menu-management'})+UI.empty('menu','This menu no longer exists','',`<a class="btn primary" href="#menu-management">Back to menus</a>`);
  if(mid!==id){mid=id;sel=new Set();q='';scoreOpen=false;genOpen=false;genSel=new Set();pvQ='';promoClosed=false}
  M=m;pvMenu=pvMenu&&menus().some(x=>x.id===pvMenu)&&pvMenu!==null?pvMenu:id;if(!menus().some(x=>x.id===pvMenu))pvMenu=id;
  return `<div class="page-head" style="margin-bottom:18px"><div style="display:flex;align-items:center;gap:12px;min-width:0">
      <a href="#menu-management" class="iconbtn" aria-label="Back to menus">${ic('back')}</a>
      <div style="min-width:0"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h2 class="ent-name" style="font-size:18px;line-height:26px;margin:0">${esc(m.name)}</h2><span id="edStatus">${statusPill()}</span>${UI.toggle(m.on,'data-change="ed-menu-toggle" aria-label="Menu live"')}</div>
      <p class="sub" id="edMeta">${metaText()}</p></div></div>
      <div class="actions"><button class="btn ghost" data-action="learn">${ic('book','sm')}Learn More</button></div></div>
    <div class="editor"><div style="min-width:0">
      <div id="edScore">${scoreHTML()}</div>
      <div id="edGen">${genHTML()}</div>
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <label class="search" style="background:#fff;max-width:none;flex:1">${ic('search','sm')}<input id="edSearch" placeholder="Search for a section or item" value="${esc(q)}" data-input="ed-search"></label>
        ${UI.dd(`${ic('plus','sm')}Add`,[{label:'Section',icon:'layers',action:'ed-add-section'},{label:'Item',icon:'menu',action:'ed-add-item'},{label:'Combo',icon:'blocks',action:'ed-add-combo'}],{cls:'btn secondary',aria:'Add section/item'}).replace('class="btn secondary"','class="btn secondary" title="Add section/item" style="height:40px"')}
      </div>
      <div id="edBulk">${bulkHTML()}</div>
      <div id="edSecs" class="ed-sections">${secsHTML()}</div>
    </div>
    <aside class="preview" id="edSide">${sideHTML()}</aside></div>`;
},{collapse:true,nav:'menu-management'});

function statusPill(){return M.on?UI.pill('Live','ok'):UI.pill(M.status==='Live'?'Draft':(M.status||'Draft'),'grey')}
function metaText(){const it=allItems();return `${it.length} items · ${it.filter(i=>!i.photo).length} missing photos`}

/* ---------- score card ---------- */
function scoreHTML(){
  const it=allItems(),n=it.length,sc=scoreOf(M),imp=it.filter(isMissing).length;
  const ph=pct(it.filter(i=>i.photo).length,n),de=pct(it.filter(i=>i.desc).length,n),al=pct(it.filter(i=>(i.allergens||[]).length).length,n),pr=pct(it.filter(i=>i.price>0).length,n);
  const col=sc>=80?'var(--ok)':sc>=50?'var(--warn)':'var(--bad)';
  return `<div class="card ai-border" style="margin-bottom:14px">
   <button type="button" class="ed-coll" data-action="ed-score-toggle" aria-expanded="${scoreOpen}">
    <span class="pill" style="background:var(--brand-700);color:#fff">${ic('sparkle','sm')}Menu Engineering score</span>
    <strong style="color:${col};font-size:16px">${sc}/100</strong>
    <span class="muted" style="flex:1">${imp} of ${n} items can be improved</span>${ic(scoreOpen?'chevu':'chevd')}</button>
   ${scoreOpen?`<div style="padding:0 18px 12px"><div class="progress" style="background:var(--warn-tint)"><i style="width:${sc}%;background:${col}"></i></div></div>
   <div class="ed-tiles-stat">${[['With photo',ph,'camera'],['With description',de,'form'],['With allergens',al,'warn'],['With price',pr,'pound']].map(([l,v,i])=>`<div><small class="muted" style="display:flex;gap:6px;align-items:center">${ic(i,'sm')}${l}</small><b>${v}%</b></div>`).join('')}</div>
   <div style="padding:0 18px 14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap" class="help"><span>Photos, last 30 days: 0 added · 0 improved · ${it.filter(i=>!i.photo||i.score<80).length} still to improve</span><span>Scored daily · last scored Nov 8, 2026</span></div>`:''}
  </div>`}

/* ---------- AI photo generator ---------- */
function genHTML(){
  const miss=allItems().filter(i=>!i.photo),n=genSel.size,cr=App.state.credits||0;
  return `<div class="card" style="margin-bottom:14px">
   <button type="button" class="ed-coll" data-action="ed-gen-toggle" aria-expanded="${genOpen}">
    <span class="itile ai-grad" style="width:40px;height:40px;color:#fff">${ic('sparkle')}</span>
    <div style="flex:1"><strong style="color:var(--ink);display:block">AI Photo Generator</strong><span style="color:var(--brand-700);font-size:13px">Generate with AI — tap to get started</span></div>
    <span class="pill" style="background:var(--brand-700);color:#fff">${miss.length}</span>${ic(genOpen?'chevu':'chevd')}</button>
   ${genOpen?(miss.length?`<div style="padding:0 18px 10px">${UI.check('<strong>Select all</strong>',n&&n===miss.length,'data-change="ed-gen-all"')}</div>
    <div class="ed-gen-grid">${miss.map(i=>`<label><input type="checkbox" data-change="ed-gen-item" data-id="${i.id}" ${genSel.has(i.id)?'checked':''} style="accent-color:var(--brand-700)"><span class="thumb none" style="width:36px;height:36px">${ic('camera','sm')}</span><span style="font-weight:600;color:var(--ink)">${esc(i.name)}</span></label>`).join('')}</div>
    <div style="display:flex;gap:10px;align-items:center;padding:12px 18px;border-top:1px solid var(--border);flex-wrap:wrap">
     <div class="card" style="padding:8px 12px;background:var(--page)"><small class="muted">Available credits</small><div style="font-weight:700;color:var(--ink)">${cr}</div></div>
     <div class="card" style="padding:8px 12px;background:var(--page)"><small class="muted">Cost</small><div style="font-weight:700;color:var(--ink)">${n?`${n*5} credits`:'—'}</div></div>
     <button class="btn ai-btn" style="margin-left:auto" data-action="ed-gen-run" ${n?'':'disabled'}>${ic('sparkle','sm')}${n?`Generate ${n} photo${n>1?'s':''}`:'Select items to generate'}</button></div>`
    :`<div style="padding:0 18px 16px" class="muted">Every item in this menu has a photo.</div>`):''}
  </div>`}

/* ---------- bulk bar ---------- */
function bulkHTML(){
  if(!sel.size)return '';
  const b=(a,l,i,cls='btn secondary sm')=>`<button class="${cls}" data-action="${a}">${i?ic(i,'sm'):''}${l}</button>`;
  return `<div class="card ed-bulk"><strong style="color:var(--ink);margin-right:6px">${sel.size} selected</strong>
   ${b('ed-bulk-publish','Publish','eye')}${b('ed-bulk-unpublish','Unpublish','eyeoff')}${b('ed-bulk-duplicate','Duplicate','copy')}${b('ed-bulk-copy','Copy','layers')}${b('ed-bulk-move','Move','open')}
   ${b('ed-bulk-enhance','Enhance with AI','sparkle','btn ai-btn sm')}${b('ed-bulk-recs','Recommendations','star')}${b('ed-bulk-delete','Delete','trash','btn danger sm')}
   <button class="btn ghost sm" style="margin-left:auto" data-action="ed-bulk-clear">${ic('x','sm')}Clear</button></div>`}

/* ---------- sections ---------- */
function secsHTML(){
  const ql=q.trim().toLowerCase();
  const html=M.sections.map(s=>{
    const secHit=!ql||s.name.toLowerCase().includes(ql);
    const its=ql&&!secHit?s.items.filter(i=>i.name.toLowerCase().includes(ql)):s.items;
    if(ql&&!secHit&&!its.length)return '';
    const open=s.open||(!!ql&&!secHit);
    const need=s.items.filter(i=>!i.photo).length;
    return `<div class="card section" data-drop="s:${s.id}">
     <div class="sec-head ${open?'open':''}" data-action="ed-sec-expand" data-id="${s.id}">
      <input type="checkbox" data-change="ed-check" data-key="s:${s.id}" ${sel.has('s:'+s.id)?'checked':''} aria-label="Select ${esc(s.name)}" style="accent-color:var(--brand-700);width:16px;height:16px">
      <span class="drag" draggable="true" data-drag="s:${s.id}" title="Drag to reorder">${ic('grip','sm')}</span>
      <span class="thumb" style="width:40px;height:40px;font-size:13px">${initials(s.name)}</span>
      <span class="ed-dot ${s.on===false?'off':''}"></span>
      <div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="${s.on===false?'color:var(--muted)':''}">${esc(s.name)}</h3>${s.score!=null?`<span class="score" title="AI score">${s.score}</span>`:''}</div>
       <small class="muted">${s.items.length} items</small>${need?` <span class="pill warn" style="height:20px;font-size:11px;margin-left:4px">${ic('camera','sm')}${need} need photo${need>1?'s':''}</span>`:''}</div>
      ${UI.toggle(s.on!==false,`data-change="ed-sec-on" data-id="${s.id}" aria-label="Show section"`)}
      ${UI.more([{label:'Duplicate',icon:'copy',action:'ed-sec-dup',data:`data-id="${s.id}"`},{label:'Delete',icon:'trash',action:'ed-sec-del',danger:1,data:`data-id="${s.id}"`},{label:'Convert to Menu',icon:'menu',action:'ed-sec-convert',data:`data-id="${s.id}"`},{label:'Copy',icon:'layers',action:'ed-sec-copy',data:`data-id="${s.id}"`}],'Section options')}
      <span style="color:var(--muted)">${ic(open?'chevu':'chevd')}</span></div>
     ${open?its.map(i=>itemRow(i)).join('')+`<div style="padding:8px 16px"><button class="btn ghost sm" data-action="ed-add-item" data-sec="${s.id}">${ic('plus','sm')}Add item to ${esc(s.name)}</button></div>`:''}
    </div>`}).join('');
  return html||`<div class="card">${UI.empty('search','No sections or items match your search')}</div>`}
function itemRow(i){
  return `<div class="item ${i.on?'':'off'}" data-action="ed-open-item" data-id="${i.id}" data-drop="i:${i.id}">
   <input type="checkbox" data-change="ed-check" data-key="i:${i.id}" ${sel.has('i:'+i.id)?'checked':''} aria-label="Select ${esc(i.name)}" style="accent-color:var(--brand-700);width:16px;height:16px">
   <span class="drag" draggable="true" data-drag="i:${i.id}" title="Drag to reorder">${ic('grip','sm')}</span>
   <span class="thumb ${i.photo?'':'none'}">${i.photo?initials(i.name):ic('sparkle','sm')}</span>
   <div style="min-width:0;display:flex;gap:8px;align-items:center"><span class="ed-dot ${i.on?'':'off'}"></span><span class="nm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.name)}</span>${i.score&&i.score>=80?`<span class="score" title="AI score">${i.score}</span>`:''}${i.soldOut?UI.pill('Sold out','bad'):''}${i.combo?UI.pill('Combo'):''}</div>
   <div class="ed-price"><input data-ed-price data-id="${i.id}" value="${Number(i.price||0).toFixed(2)}" inputmode="decimal" aria-label="Price for ${esc(i.name)}"><span>£</span><button type="button" class="ed-enter" data-action="ed-price-save" data-id="${i.id}" aria-label="Save price">${ic('enter','sm')}</button></div>
   ${UI.toggle(i.on,`data-change="ed-item-on" data-id="${i.id}" aria-label="Available"`)}
   ${UI.more([{label:'Duplicate',icon:'copy',action:'ed-item-dup',data:`data-id="${i.id}"`},{label:'Delete',icon:'trash',action:'ed-item-del',danger:1,data:`data-id="${i.id}"`},{label:'Copy',icon:'layers',action:'ed-item-copy',data:`data-id="${i.id}"`}],'Item options')}
  </div>`}

/* ---------- right column / preview ---------- */
function sideHTML(){
  return `<div class="card" style="border-top:3px solid var(--brand-700);padding:12px;margin-bottom:10px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
     <button class="btn secondary sm" data-action="ed-qr">${ic('qr','sm')}QR Code</button>
     ${UI.dd(`${ic('share','sm')}Share`,[{label:'WhatsApp',icon:'wa',action:'ed-share-wa'},{label:'SMS',icon:'sms',action:'ed-share-sms'}],{cls:'btn secondary sm'}).replace('<div class="dd">','<div class="dd" style="display:block">').replace('class="btn secondary sm"','class="btn secondary sm" style="width:100%"')}
     <button class="btn secondary sm" data-action="ed-open">${ic('open','sm')}Open</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
     <button class="btn secondary sm" data-action="ed-copy-menu-link">${ic('copy','sm')}Copy Menu Link</button>
     <button class="btn secondary sm" data-action="ed-copy-share-link">${ic('link','sm')}Copy Share Link</button></div></div>
   <div style="padding:8px 12px;border-radius:10px;margin-bottom:10px;font-weight:600;${M.on?'background:var(--ok-tint);color:var(--ok)':'background:var(--page);color:var(--muted);border:1px solid var(--border)'}">● ${M.on?'Live':'Draft'}</div>
   <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span class="eyebrow" style="display:flex;gap:6px;align-items:center">${ic('phone','sm')}Preview</span><button class="iconbtn" style="width:30px;height:30px;border:0" data-action="ed-pv-refresh" aria-label="Refresh preview">${ic('refresh','sm')}</button></div>
   <div id="edPhone">${phoneHTML()}</div>`}
function phoneHTML(full){
  const pm=menus().find(m=>m.id===pvMenu)||M;const v=App.state.venue||{name:"Alici's"};
  const promo=(App.state.promotions||[]).find(p=>p.on);
  return `<div class="phone" style="position:relative;${full?'width:340px;height:680px':''}">
   <div class="ph-top" style="display:flex;align-items:center;gap:8px;padding:14px 12px 12px">${ic('left','sm')}<b style="flex:1;text-align:center;font-size:15px">${esc(v.name)}</b>${ic('sidebar','sm')}</div>
   <div style="padding:10px 12px 2px;font-weight:700;color:var(--ink);font-size:14px">${esc(pm.name)}</div>
   <div class="ph-tabs">${menus().filter(m=>m.on||m.id===pvMenu).map(m=>`<span class="${m.id===pm.id?'on':''}" data-action="ed-pv-menu" data-id="${m.id}" style="cursor:pointer">${esc(m.name.replace(/\s\d\d:\d\d.*$/,''))}</span>`).join('')}</div>
   <div style="padding:8px 12px 4px;display:flex;gap:6px"><div class="input-group" style="height:34px;flex:1;border-color:var(--border)"><span style="background:#fff;border:0">${ic('search','sm')}</span><input placeholder="Search" value="${esc(pvQ)}" data-input="ed-pv-search" aria-label="Search preview menu"></div><button class="iconbtn" style="width:34px;height:34px" data-action="ed-pv-filter" aria-label="Filter">${ic('filter','sm')}</button></div>
   <div class="ed-tiles">${pm.sections.filter(s=>s.on!==false).slice(0,12).map(s=>`<div class="ed-tile"><i>${initials(s.name)}</i>${esc(s.name)}</div>`).join('')}</div>
   <div class="ph-body" id="edPvBody">${pvBody(pm)}</div>
   ${promo&&!promoClosed?`<div class="ed-promo"><div><button class="iconbtn" style="position:absolute;top:10px;right:10px;width:30px;height:30px" data-action="ed-promo-close" aria-label="Close promotion">${ic('x','sm')}</button><div class="thumbbg" style="height:110px;border-radius:12px;margin-bottom:10px;display:grid;place-items:center;color:#fff">${ic('gift')}</div><b style="color:var(--ink)">${esc(promo.name)}</b><p class="muted" style="margin:4px 0 0;font-size:12px">${esc(promo.desc||'')}</p></div></div>`:''}
  </div>`}
function pvBody(pm){
  const ql=pvQ.trim().toLowerCase();
  const out=pm.sections.filter(s=>s.on!==false).map(s=>{const its=s.items.filter(i=>i.on&&(!ql||i.name.toLowerCase().includes(ql)));if(!its.length)return '';
    return `<div class="ph-sec">${esc(s.name)}</div>${its.map(i=>`<div class="ph-item"><div class="t"><b>${esc(i.name)}</b><small>${esc(i.desc||'')}</small>${i.soldOut?'<small style="color:var(--bad);font-weight:700">Sold out</small>':''}</div><div style="text-align:right"><span class="thumb ${i.photo?'':'none'}" style="margin-bottom:4px">${i.photo?initials(i.name):''}</span><div class="p">${gbp(i.price)}</div></div></div>`).join('')}`}).join('');
  return out||`<p class="muted" style="text-align:center;margin-top:30px;font-size:13px">No items found</p>`}

/* ---------- partial refresh ---------- */
function rSecs(){const e=$('#edSecs');if(e)e.innerHTML=secsHTML()}
function rBulk(){const e=$('#edBulk');if(e)e.innerHTML=bulkHTML()}
function rScore(){const e=$('#edScore');if(e)e.innerHTML=scoreHTML()}
function rGen(){const e=$('#edGen');if(e)e.innerHTML=genHTML()}
function rSide(){const e=$('#edSide');if(e)e.innerHTML=sideHTML()}
function rHead(){const a=$('#edMeta'),b=$('#edStatus');if(a)a.textContent=metaText();if(b)b.innerHTML=statusPill()}
function refresh(){if(!$('#edSecs'))return;rHead();rScore();rGen();rBulk();rSecs();rSide()}

/* ---------- toggles & simple actions ---------- */
A('ed-score-toggle',()=>{scoreOpen=!scoreOpen;rScore()});
A('ed-gen-toggle',()=>{genOpen=!genOpen;rGen()});
A('ed-gen-all',el=>{const miss=allItems().filter(i=>!i.photo);genSel=el.checked?new Set(miss.map(i=>i.id)):new Set();rGen()});
A('ed-gen-item',el=>{el.checked?genSel.add(el.dataset.id):genSel.delete(el.dataset.id);rGen()});
A('ed-gen-run',()=>{const cost=genSel.size*5;if((App.state.credits||0)<cost)return noCredits(cost);
  genSel.forEach(id=>{const {i}=findItem(id);if(i)i.photo=true});App.state.credits-=cost;genSel=new Set();refresh();toast('Photos generated')});
function noCredits(cost){App.modal({title:'Not enough credits',body:`<div style="display:flex;gap:14px;align-items:flex-start"><span class="itile">${ic('coin')}</span><div><p style="margin:0 0 6px">This needs <strong>${cost} credits</strong> and you have <strong>${App.state.credits||0}</strong>.</p><p class="muted" style="margin:0">Top up your credits to generate AI photos and enhance items.</p></div></div>`,
  footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-buy-credits">${ic('coin','sm')}Buy credits</button>`})}
A('ed-buy-credits',()=>{App.closeModal();toast('Our team will contact you to top up credits')});
A('ed-search',el=>{q=el.value;rSecs()});
A('ed-menu-toggle',el=>{M.on=el.checked;M.status=el.checked?'Live':'Draft';rHead();rSide();toast(M.on?'Menu is live':'Menu set to draft')});
A('ed-sec-expand',(el,e)=>{if(e.target.closest('input,label,button,.dd,.drag'))return;const s=findSec(el.dataset.id);if(s){s.open=!s.open;rSecs()}});
A('ed-sec-on',el=>{const s=findSec(el.dataset.id);s.on=el.checked;rSecs();rSide();toast(el.checked?'Section shown':'Section hidden')});
A('ed-item-on',el=>{const {i}=findItem(el.dataset.id);i.on=el.checked;rSecs();rSide();toast(el.checked?'Item is now visible':'Item hidden from guests')});
A('ed-check',el=>{el.checked?sel.add(el.dataset.key):sel.delete(el.dataset.key);rBulk()});

/* price inline edit */
function savePrice(inp){const {i}=findItem(inp.dataset.id);if(!i)return;const v=parseFloat(String(inp.value).replace(/[^0-9.]/g,''));
  if(isNaN(v)||v<0){inp.value=Number(i.price).toFixed(2);return toast('Enter a valid price')}
  inp.value=v.toFixed(2);if(v!==i.price){i.price=v;rSide();rScore();toast(`${i.name} updated to ${gbp(v)}`)}}
A('ed-price-save',el=>{const inp=el.parentElement.querySelector('input');savePrice(inp);inp.blur()});
document.addEventListener('keydown',e=>{const t=e.target;if(!t.matches||!t.matches('[data-ed-price]'))return;
  if(e.key==='Enter'){e.preventDefault();savePrice(t);t.blur()}
  if(e.key==='Escape'){const {i}=findItem(t.dataset.id);if(i)t.value=Number(i.price).toFixed(2);t.blur()}});
document.addEventListener('focusout',e=>{const t=e.target;if(t.matches&&t.matches('[data-ed-price]')&&!(e.relatedTarget&&e.relatedTarget.classList.contains('ed-enter')))savePrice(t)});

/* ---------- drag & drop reorder ---------- */
let dragKey=null;
document.addEventListener('dragstart',e=>{const d=e.target.closest&&e.target.closest('[data-drag]');if(!d||!$('#edSecs'))return;dragKey=d.dataset.drag;try{e.dataTransfer.setData('text/plain',dragKey);e.dataTransfer.effectAllowed='move'}catch(_){}});
function dropTarget(e){if(!dragKey)return null;const typ=dragKey[0];return e.target.closest&&e.target.closest(`[data-drop^="${typ}:"]`)}
document.addEventListener('dragover',e=>{const t=dropTarget(e);if(t){e.preventDefault();$$('.ed-drop-over').forEach(x=>x!==t&&x.classList.remove('ed-drop-over'));t.classList.add('ed-drop-over')}});
document.addEventListener('dragend',()=>{dragKey=null;$$('.ed-drop-over').forEach(x=>x.classList.remove('ed-drop-over'))});
document.addEventListener('drop',e=>{const t=dropTarget(e);if(!t)return;e.preventDefault();const [typ,from]=dragKey.split(':'),to=t.dataset.drop.split(':')[1];dragKey=null;
  if(from===to)return refresh();
  if(typ==='s'){const a=M.sections,fi=a.findIndex(s=>s.id===from),[s]=a.splice(fi,1);a.splice(a.findIndex(x=>x.id===to),0,s)}
  else{const src=findItem(from),dst=findItem(to);src.s.items.splice(src.s.items.indexOf(src.i),1);dst.s.items.splice(dst.s.items.indexOf(dst.i),0,src.i)}
  refresh();toast('Order updated')});

/* ---------- section menu ---------- */
A('ed-sec-dup',el=>{const s=findSec(el.dataset.id),c=freshSec(s);c.name=s.name+' (copy)';M.sections.splice(M.sections.indexOf(s)+1,0,c);refresh();toast('Section duplicated')});
A('ed-sec-del',el=>{const s=findSec(el.dataset.id);ctx={del:{secs:[s.id],items:[]}};confirmDelete(`Delete the section <strong>${esc(s.name)}</strong> and its ${s.items.length} items?`)});
A('ed-sec-convert',el=>{const s=findSec(el.dataset.id);const nm={id:'m'+uid(),name:s.name,status:'Draft',on:false,channels:[...(M.channels||['dine'])],sectionsCount:1,itemsCount:s.items.length,updated:'Nov 8, 2026',sections:[freshSec(s)]};
  menus().push(nm);toast(`"${s.name}" converted to a new draft menu`);rSide()});
A('ed-sec-copy',el=>{ctx={copy:{secs:[el.dataset.id],items:[]}};copyModal('Copy section')});

/* ---------- item menu ---------- */
A('ed-item-dup',el=>{const {s,i}=findItem(el.dataset.id),c=freshItem(i);c.name=i.name+' (copy)';s.items.splice(s.items.indexOf(i)+1,0,c);refresh();toast('Item duplicated')});
A('ed-item-del',el=>{const {i}=findItem(el.dataset.id);ctx={del:{secs:[],items:[i.id]}};confirmDelete(`Delete <strong>${esc(i.name)}</strong>?`)});
A('ed-item-copy',el=>{ctx={copy:{secs:[],items:[el.dataset.id]}};copyModal('Copy item')});

/* ---------- bulk ---------- */
const selSecs=()=>[...sel].filter(k=>k[0]==='s').map(k=>k.slice(2)).filter(findSec);
const selItems=()=>[...sel].filter(k=>k[0]==='i').map(k=>k.slice(2)).filter(id=>findItem(id).i);
function eachSelItem(fn){const seen=new Set();selSecs().forEach(id=>findSec(id).items.forEach(i=>{seen.add(i.id);fn(i)}));selItems().forEach(id=>{if(!seen.has(id))fn(findItem(id).i)})}
A('ed-bulk-publish',()=>{selSecs().forEach(id=>findSec(id).on=true);eachSelItem(i=>i.on=true);refresh();toast('Published')});
A('ed-bulk-unpublish',()=>{selSecs().forEach(id=>findSec(id).on=false);eachSelItem(i=>i.on=false);refresh();toast('Unpublished')});
A('ed-bulk-duplicate',()=>{selSecs().forEach(id=>{const s=findSec(id),c=freshSec(s);c.name=s.name+' (copy)';M.sections.splice(M.sections.indexOf(s)+1,0,c)});
  selItems().forEach(id=>{const {s,i}=findItem(id),c=freshItem(i);c.name=i.name+' (copy)';s.items.splice(s.items.indexOf(i)+1,0,c)});sel=new Set();refresh();toast('Duplicated')});
A('ed-bulk-copy',()=>{ctx={copy:{secs:selSecs(),items:selItems()}};copyModal(`Copy ${sel.size} selected`)});
A('ed-bulk-move',()=>{const ids=selItems();if(!ids.length)return toast('Select items to move (sections can be dragged)');
  App.modal({title:`Move ${ids.length} item${ids.length>1?'s':''}`,body:UI.field({label:'Move to section',control:UI.select(M.sections.map(s=>({value:s.id,label:s.name})),M.sections[0].id,'id="edMoveSec"')}),
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-move-confirm">Move</button>`})});
A('ed-move-confirm',()=>{const to=findSec($('#edMoveSec').value);selItems().forEach(id=>{const {s,i}=findItem(id);s.items.splice(s.items.indexOf(i),1);to.items.push(i)});to.open=true;sel=new Set();App.closeModal();refresh();toast('Moved to '+to.name)});
A('ed-bulk-enhance',()=>{let n=0;eachSelItem(()=>n++);const cost=n*5;
  App.modal({title:'Enhance with AI',body:`<p style="margin-top:0">AI will improve photos and write fuller descriptions for <strong>${n} item${n!==1?'s':''}</strong>.</p><div class="stat-row"><span>Credits needed</span><strong style="color:var(--ink)">${cost}</strong></div><div class="stat-row"><span>Available credits</span><strong style="color:var(--ink)">${App.state.credits||0}</strong></div>`,
   footer:`<button class="btn secondary" data-close>Cancel</button>${(App.state.credits||0)<cost?`<button class="btn primary" data-action="ed-buy-credits">${ic('coin','sm')}Buy credits</button>`:`<button class="btn ai-btn" data-action="ed-enhance-run">${ic('sparkle','sm')}Enhance</button>`}`})});
A('ed-enhance-run',()=>{let n=0;eachSelItem(i=>{n++;i.photo=true;if(!i.desc)i.desc=autoDesc(i.name)});App.state.credits-=n*5;App.closeModal();refresh();toast('Items enhanced')});
A('ed-bulk-recs',()=>{const rows=[];eachSelItem(i=>{const t=[];if(!i.photo)t.push('Add a photo – items with photos sell up to 30% more');if(!i.desc)t.push('Add a description of 12–20 words');if(!(i.allergens||[]).length)t.push('Add allergen information');if(!i.labels||!i.labels.length)t.push('Add a dietary label so guests can filter');rows.push(`<div class="stat-row" style="align-items:flex-start;gap:12px"><div><strong style="color:var(--ink)">${esc(i.name)}</strong>${t.length?`<ul style="margin:4px 0 0;padding-left:18px">${t.map(x=>`<li class="muted">${x}</li>`).join('')}</ul>`:'<div class="muted">Looks great – nothing to improve.</div>'}</div><span class="score">${i.score||'–'}</span></div>`)});
  App.modal({title:'Recommendations',body:rows.join('')||UI.empty('star','Nothing selected'),footer:`<button class="btn primary" data-close>Done</button>`})});
A('ed-bulk-delete',()=>{ctx={del:{secs:selSecs(),items:selItems()}};confirmDelete(`Delete ${sel.size} selected row${sel.size>1?'s':''}? This can't be undone.`)});
A('ed-bulk-clear',()=>{sel=new Set();rBulk();rSecs()});

function confirmDelete(msg){App.modal({title:'Delete',body:`<p style="margin:0">${msg}</p>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="ed-delete-confirm">${ic('trash','sm')}Delete</button>`})}
A('ed-delete-confirm',()=>{const d=ctx.del||{secs:[],items:[]};d.items.forEach(id=>{const {s,i}=findItem(id);if(i)s.items.splice(s.items.indexOf(i),1)});
  M.sections=M.sections.filter(s=>!d.secs.includes(s.id));d.secs.concat(d.items).forEach(id=>{sel.delete('s:'+id);sel.delete('i:'+id)});App.closeModal();refresh();toast('Deleted')});
function copyModal(title){App.modal({title,body:UI.field({label:'Copy to menu',control:UI.select(menus().map(m=>({value:m.id,label:m.name})),M.id,'id="edCopyMenu"'),help:'Sections are added to the end of the chosen menu. Items go into a section with the same name, or a new one is created.'}),
  footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-copy-confirm">Copy</button>`})}
A('ed-copy-confirm',()=>{const tm=menus().find(m=>m.id===$('#edCopyMenu').value),c=ctx.copy||{secs:[],items:[]};
  c.secs.forEach(id=>{const s=findSec(id);if(s)tm.sections.push(freshSec(s))});
  c.items.forEach(id=>{const {s,i}=findItem(id);if(!i)return;let ts=tm.sections.find(x=>x.name===s.name);if(!ts){ts={id:uid(),name:s.name,on:true,open:false,score:s.score,items:[]};tm.sections.push(ts)}ts.items.push(freshItem(i))});
  App.closeModal();sel=new Set();refresh();toast('Copied to '+tm.name)});

/* ---------- add section / combo ---------- */
A('ed-add-section',()=>App.modal({title:'Add Section',body:UI.field({label:'Section Name',required:true,control:UI.input({id:'edNewSec',placeholder:'e.g. Desserts'})})+UI.field({label:'Description',control:UI.textarea({id:'edNewSecDesc',rows:2})}),
  footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-add-section-save">Save</button>`}));
A('ed-add-section-save',()=>{const n=$('#edNewSec').value.trim();if(!n)return toast('Enter a section name');M.sections.push({id:uid(),name:n,on:true,open:true,score:null,items:[]});App.closeModal();refresh();toast('Section added');setTimeout(()=>{const e=$$('#edSecs .section');e.length&&e[e.length-1].scrollIntoView({behavior:'smooth',block:'center'})},50)});
A('ed-add-combo',()=>{App.drawer({title:'Add Combo',width:600,body:
  `<p class="muted" style="margin-top:0">Bundle items together and sell them at one price.</p>`+
  UI.field({label:'Combo Name',required:true,control:UI.input({id:'edcName',placeholder:'e.g. Brunch for Two',attrs:'data-input="ed-combo-name"'})})+
  `<div class="grid g2" style="gap:12px">${UI.field({label:'Price',control:UI.input({id:'edcPrice',prefix:'£',placeholder:'0.00'})})}${UI.field({label:'Section',control:UI.select(M.sections.map(s=>({value:s.id,label:s.name})),M.sections[0]?.id,'id="edcSec"')})}</div>`+
  UI.field({label:'Description',control:UI.textarea({id:'edcDesc',rows:2})})+
  `<h3 style="margin:8px 0">Items in this combo</h3>`+M.sections.map((s,si)=>`<details class="collapsible" ${si===0?'open':''}><summary><span class="chev">${ic('chev','sm')}</span><strong style="color:var(--ink)">${esc(s.name)}</strong><small class="muted">${s.items.length} items</small></summary><div style="display:grid;gap:6px;padding:0 0 12px 26px">${s.items.map(i=>UI.check(`${esc(i.name)} <span class="muted">${gbp(i.price)}</span>`,false,`data-combo-item="${i.id}"`)).join('')}</div></details>`).join(''),
  footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" id="edcSave" data-action="ed-combo-save" disabled>Save</button>`})});
A('ed-combo-name',el=>{const b=$('#edcSave');if(b)b.disabled=!el.value.trim()});
A('ed-combo-save',()=>{const ids=$$('[data-combo-item]:checked').map(c=>c.dataset.comboItem);if(!ids.length)return toast('Pick at least one item');
  const names=ids.map(id=>findItem(id).i.name),s=findSec($('#edcSec').value),p=parseFloat($('#edcPrice').value)||ids.reduce((a,id)=>a+findItem(id).i.price,0);
  s.items.push({id:uid(),name:$('#edcName').value.trim(),price:p,on:true,photo:false,score:70,combo:true,desc:$('#edcDesc').value.trim()||'Includes: '+names.join(', '),allergens:[],labels:[]});s.open=true;App.closeDrawer();refresh();toast('Combo added')});

/* ---------- item drawer ---------- */
A('ed-add-item',el=>itemDrawer(null,el.dataset.sec||(M.sections[0]&&M.sections[0].id)));
A('ed-open-item',(el,e)=>{if(e.target.closest('input,label,button,.dd,.drag,.ed-price'))return;itemDrawer(el.dataset.id)});
function group(title,sub,body,open=true){return `<details class="collapsible" ${open?'open':''}><summary><span class="chev">${ic('chev','sm')}</span><div><strong style="color:var(--ink)">${title}</strong><span class="ed-group-sub">${sub}</span></div></summary><div style="padding:2px 0 16px">${body}</div></details>`}
function chips(id,opts,on){return `<div class="ed-chips" id="${id}">${opts.map(o=>`<button type="button" class="chip-btn ${on.includes(o)?'on':''}" data-chip="multi" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>`}
function poRow(p={},n=1){return `<div class="ed-po" data-po-row><div><label>Option ${n}</label><input class="input" data-po="name" value="${esc(p.name||'')}" placeholder="e.g. Large"></div>
  <div><label>Price</label>${UI.input({prefix:'£',value:p.price??'',attrs:'data-po="price" inputmode="decimal"'})}</div>
  <div><label>Caffeine</label>${UI.input({suffix:'mg',value:p.caf??'',attrs:'data-po="caf" inputmode="decimal"'})}</div>
  <div><label>Discount</label>${UI.input({value:p.disc??'',attrs:'data-po="disc" inputmode="decimal"',placeholder:'0'})}</div>
  <button type="button" class="iconbtn" data-action="ed-po-del" aria-label="Remove option">${ic('trash','sm')}</button></div>`}
function ncRow(r={}){return `<div style="display:grid;grid-template-columns:1fr 1fr 36px;gap:8px;margin-bottom:8px" data-nc-row><input class="input" data-nc="label" placeholder="Label, e.g. Omega-3" value="${esc(r.label||'')}"><input class="input" data-nc="value" placeholder="Value, e.g. 1.2g" value="${esc(r.value||'')}"><button type="button" class="iconbtn" data-action="ed-nc-del" aria-label="Remove">${ic('trash','sm')}</button></div>`}
const NF=[['Serving size','g'],['Calories','kcal'],['Fat','g'],['of which saturates','g'],['Carbohydrate','g'],['of which sugars','g'],['Fibre','g'],['Protein','g'],['Salt','g']];
function itemDrawer(id,secId){
  const found=id?findItem(id):{},it=found.i||null,sec=found.s||findSec(secId)||M.sections[0];
  if(!sec){toast('Add a section first');return actions_addSection()}
  const d=it?clone(it):{name:'',desc:'',price:'',discount:'',calories:'',on:true,soldOut:false,labels:[],badges:[],allergens:[],removable:[],recommended:[],prep:'',carbon:'',priceOptions:[],modifiers:[],nf:{shown:false,v:{}},nc:{shown:false,rows:[]},availability:'always'};
  d.labels=d.labels||[];d.badges=d.badges||[];d.allergens=d.allergens||[];d.removable=d.removable||[];d.recommended=d.recommended||[];d.priceOptions=d.priceOptions||[];d.modifiers=d.modifiers||[];d.nf=d.nf||{shown:false,v:{}};d.nc=d.nc||{shown:false,rows:[]};
  ctx.item={id:it?it.id:null,sec:sec.id};
  const mods=App.state.modifiers||[];
  const gen=`<p class="muted" style="margin-top:0">Set the core details, media, pricing and visibility for this item. Changes apply across every menu this item appears on.</p>
   <div class="card" style="display:flex;gap:12px;align-items:center;padding:14px;margin-bottom:8px;background:var(--brand-tint-subtle);border-color:#C9DCF5"><span class="itile ai-grad" style="width:38px;height:38px;color:#fff">${ic('sparkle','sm')}</span><div style="flex:1"><strong style="color:var(--ink)">Auto-fill with AI</strong><div class="help" style="margin:0">Fill calories, nutrition facts, ingredient warnings and more in one go.</div></div><button type="button" class="btn ai-btn sm" data-action="ed-autofill">Auto-fill</button></div>
   ${group('Basics','Name and description shown to guests',
     UI.field({label:'Name',required:true,id:'edName',control:UI.input({id:'edName',value:d.name,placeholder:'Pasta Alfredo',attrs:'data-input="ed-name"'})})+
     `<div class="field"><label style="display:flex;justify-content:space-between">Description<button type="button" class="btn ghost sm" style="height:24px;padding:0 6px" data-action="ed-enhance-desc">${ic('sparkle','sm')}Enhance with AI</button></label>
      <div class="ed-toolbar">${[['bold','<b>B</b>','Bold'],['underline','<u>U</u>','Underline'],['italic','<i>I</i>','Italic'],['insertUnorderedList',ic('list','sm'),'Bulleted list'],['insertOrderedList','1.','Numbered list'],['outdent','⇤','Outdent'],['indent','⇥','Indent'],['emoji','😋','Emoji'],['expand',ic('expand','sm'),'Expand']].map(([c,l,t])=>`<button type="button" data-action="ed-fmt" data-cmd="${c}" title="${t}" aria-label="${t}">${l}</button>`).join('')}</div>
      <div class="ed-rte" id="edDesc" contenteditable="true" data-ph="Describe the dish – ingredients, taste, how it's served">${esc(d.desc||'')}</div></div>`)}
   ${group('Media','A photo or video helps the item sell itself',
     `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="color:var(--ink);font-size:13px">Images</strong><button type="button" class="btn ai-btn sm" data-action="ed-gen-image">${ic('sparkle','sm')}Generate AI Image</button></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${d.photo?`<div class="thumb" style="width:110px;height:110px;font-size:24px">${initials(d.name)}</div>`:''}${UI.upload({sm:true,label:'Upload',hint:'',accept:'.jpg,.jpeg,.png,.webp,.heic'})}</div>
      <div class="help">Only .jpg, .jpeg, .png, .webp and .heic files are supported. Drag to reorder — the first image is the main image of the item.</div>
      <strong style="color:var(--ink);font-size:13px;display:block;margin:14px 0 8px">Video</strong>${UI.upload({sm:true,label:'Upload',accept:'.mp4'})}<div class="help">Only .mp4 files are supported.</div>
      <div class="help" style="margin-top:8px">Recommended aspect ratio is 3:2 for landscape, 1:1 for square or 2:3 for portrait images with a file size of less than 10MB.</div>`)}
   ${group('Pricing','Default price and calories for this item',
     `<div class="grid g3" style="gap:10px">${UI.field({label:'Price',control:UI.input({id:'edPrice',prefix:'£',value:d.price===''?'':Number(d.price).toFixed(2),placeholder:'0.00',attrs:'inputmode="decimal"'})})}${UI.field({label:'Discount',control:UI.input({id:'edDisc',value:d.discount||'',placeholder:'0',attrs:'inputmode="decimal"'})})}${UI.field({label:'Calorie',control:UI.input({id:'edCal',suffix:'cal',value:d.calories||'',placeholder:'0',attrs:'inputmode="numeric"'})})}</div>
      <div class="help">Items can have price options according to their sizes, servings etc. For more check <a href="javascript:void 0" data-action="ed-goto-po">Price Options</a></div>`)}
   ${group('Visibility','Control how this item appears on the menu',UI.toggleRow('Display the item','Guests can see this item on the menu',d.on,'id="edOn"')+UI.toggleRow('Mark as Sold Out','Shown but can\'t be ordered',d.soldOut,'id="edSold"'))}
   ${group('Categorization','Placement, labels, allergens and recommendations',
     UI.field({label:'Section',control:UI.select(M.sections.map(s=>({value:s.id,label:s.name})),sec.id,'id="edSec"')})+
     UI.field({label:'Labels',control:chips('edLabels',LABELS,d.labels)})+
     `<div class="field"><label style="display:flex;justify-content:space-between">Custom Badges<a href="javascript:void 0" data-action="ed-manage-badges" style="font-weight:600">Manage badges</a></label><div id="edBadgesWrap">${chips('edBadges',BADGES,d.badges)}</div></div>`+
     UI.field({label:'Ingredient Warnings',control:chips('edAllergens',ALLERGENS,d.allergens)})+
     `<div class="field"><label style="display:flex;justify-content:space-between">Removable Ingredients<a href="javascript:void 0" data-action="ed-manage-ingredients" style="font-weight:600">Manage Ingredients</a></label><div id="edRemWrap">${chips('edRemov',REMOVABLE,d.removable)}</div></div>`+
     `<div class="field"><label>Recommended Items</label><div style="display:flex;gap:8px"><input class="input" id="edRecIn" list="edRecList" placeholder="Type to search items"><button type="button" class="btn secondary" data-action="ed-rec-add">Add</button></div>
      <datalist id="edRecList">${allItems().filter(x=>!it||x.id!==it.id).map(x=>`<option value="${esc(x.name)}">`).join('')}</datalist><div class="ed-chips" id="edRec" style="margin-top:8px">${d.recommended.map(recChip).join('')}</div></div>`)}
   ${group('Operations','Kitchen routing, prep time and sustainability',`<div class="grid g2" style="gap:10px">${UI.field({label:'Preparation Time',control:UI.input({id:'edPrep',suffix:'min(s)',value:d.prep||'',attrs:'inputmode="numeric"'})})}${UI.field({label:'Carbon Footprint',control:UI.input({id:'edCarbon',suffix:'g CO₂e',value:d.carbon||'',attrs:'inputmode="decimal"'})})}</div>`)}`;
  const po=`<p class="muted" style="margin-top:0">Items can have price options according to their sizes, servings etc. If the item has one price option, you can leave the name blank. To update prices in bulk or apply percentage discounts, use the Price Editor.</p>
   <div id="edPO">${(d.priceOptions.length?d.priceOptions:[]).map((p,i)=>poRow(p,i+1)).join('')}</div>
   <button type="button" class="btn secondary" data-action="ed-po-add">${ic('plus','sm')}Add Price Option</button>`;
  const mod=`<p class="muted" style="margin-top:0">Items can have modifiers according to their sizes, servings etc.</p>
   ${mods.length?`<div id="edMods" style="display:grid;gap:8px">${mods.map(g=>{const nm=g.name||g.groupName||'Modifier group';const gid=g.id||nm;return `<label class="radio-card"><input type="checkbox" data-mod="${esc(gid)}" ${d.modifiers.includes(gid)?'checked':''} style="accent-color:var(--brand-700)"><div><strong>${esc(nm)}</strong><small>${(g.modifiers||g.mods||g.items||[]).length} options</small></div></label>`}).join('')}</div>`
     :`<div class="card">${UI.empty('layers','No modifier groups yet','Create a group like "Milk choice" or "Add extras", then attach it here.',`<button type="button" class="btn primary" data-action="ed-goto-modifiers">${ic('plus','sm')}Add Modifier Option</button>`)}</div>`}`;
  const nut=`<p class="muted" style="margin-top:0">Add nutrition details for this item. Each section publishes to your guest menu independently — flip its toggle off to keep it as a draft.</p>
   <div class="card pad" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:12px"><div style="flex:1"><strong style="color:var(--ink)">Nutrition Facts</strong><div class="help" style="margin:0">Standardized label: serving size, calories & % daily values</div></div><small class="muted" id="edNfLbl">${d.nf.shown?'Shown':'Hidden'}</small>${UI.toggle(d.nf.shown,'id="edNfOn" data-change="ed-nf-toggle" aria-label="Show nutrition facts"')}</div>
    <div id="edNutNotice" class="card" style="margin-top:12px;padding:12px;background:var(--warn-tint);border-color:#F5D9A8;color:var(--warn);${d.priceOptions.length?'display:none':''}">${ic('info','sm')} Add a price option in the <a href="javascript:void 0" data-action="ed-goto-po">Price Options</a> tab first — nutrition details are set per price option.</div>
    <div id="edNfFields" class="grid g3" style="gap:10px;margin-top:12px;${d.priceOptions.length?'':'display:none'}">${NF.map(([l,u])=>UI.field({label:l,control:UI.input({suffix:u,value:d.nf.v[l]||'',attrs:`data-nf="${esc(l)}" inputmode="decimal"`})})).join('')}</div></div>
   <div class="card pad"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="flex:1"><strong style="color:var(--ink)">Nutritional Content</strong><div class="help" style="margin:0">Your own label + value pairs</div></div><small class="muted" id="edNcLbl">${d.nc.shown?'Shown':'Hidden'}</small>${UI.toggle(d.nc.shown,'id="edNcOn" data-change="ed-nc-toggle" aria-label="Show nutritional content"')}</div>
    <div id="edNC">${d.nc.rows.map(ncRow).join('')}</div><button type="button" class="btn ghost sm" data-action="ed-nc-add">${ic('plus','sm')}Add row</button></div>`;
  App.drawer({title:it?esc(it.name):'Add New Item',width:620,body:
    UI.tabs([{key:'gen',label:'General Information'},{key:'po',label:'Price Options'},{key:'mod',label:'Modifier Options'},{key:'nut',label:'Nutrition Info'},{key:'av',label:'Availability'}],'gen','edt')+
    UI.panel('edt','gen',gen,'gen')+UI.panel('edt','po',po,'gen')+UI.panel('edt','mod',mod,'gen')+UI.panel('edt','nut',nut,'gen')+UI.panel('edt','av',`<p class="muted" style="margin-top:0">Choose when guests can see this item.</p>`+UI.availability('edav',d.availability||'always'),'gen'),
    footer:`${UI.check('Save and add more',false,'id="edMore"')}<span style="flex:1"></span><button class="btn secondary" data-close>Cancel</button><button class="btn primary" id="edSave" data-action="ed-save-item" ${d.name?'':'disabled'}>Save</button>`});
}
function actions_addSection(){App.actions['ed-add-section']()}
const recChip=n=>`<span class="chip" data-rec="${esc(n)}">${esc(n)}<button type="button" data-action="ed-rec-del" aria-label="Remove ${esc(n)}" style="border:0;background:none;cursor:pointer;padding:0;color:var(--muted)">${ic('x','sm')}</button></span>`;
const showTab=k=>{const b=document.querySelector(`#drawer [data-tabset="edt"] [data-tab="${k}"]`);b&&b.click()};
A('ed-goto-po',()=>showTab('po'));
A('ed-goto-modifiers',()=>{App.closeDrawer();App.go('menu-modifiers')});
A('ed-name',el=>{const b=$('#edSave');if(b)b.disabled=!el.value.trim()});
document.addEventListener('mousedown',e=>{if(e.target.closest&&e.target.closest('[data-action="ed-fmt"]'))e.preventDefault()});
A('ed-fmt',el=>{const box=$('#edDesc');if(!box)return;const c=el.dataset.cmd;
  if(c==='expand'){box.style.minHeight=box.style.minHeight==='240px'?'':'240px';return}
  if(document.activeElement!==box){box.focus();const r=document.createRange();r.selectNodeContents(box);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}
  try{c==='emoji'?document.execCommand('insertText',false,'😋'):document.execCommand(c)}catch(_){}});
function autoDesc(n){const l=n.toLowerCase();if(/latte|coffee|flat white|cappuccino|tea/.test(l))return `${n}, made with freshly ground beans and served just how you like it.`;
  if(/cocktail|martini|mojito|spritz|gin|wine|prosecco/.test(l))return `${n}, mixed to order by our bar team and served chilled.`;
  return `${n}, freshly prepared to order with quality ingredients and served warm.`}
A('ed-enhance-desc',()=>{const box=$('#edDesc'),n=$('#edName').value.trim()||'This dish',t=box.innerText.trim();
  box.innerText=t?t.replace(/\.?$/,'.')+' A guest favourite, made fresh in our kitchen every day.':autoDesc(n);toast('Description enhanced')});
A('ed-autofill',()=>{const n=($('#edName').value||'').trim();if(!n)return toast('Enter a name first');const l=n.toLowerCase();
  if(!$('#edCal').value)$('#edCal').value=/coffee|latte|tea|cola|coke/.test(l)?120:/salad/.test(l)?380:620;
  const box=$('#edDesc');if(!box.innerText.trim())box.innerText=autoDesc(n);
  const al=[];if(/egg|benedict|menemen|toast|pancake|breakfast|brekky|twist|kahvalti/.test(l))al.push('Eggs','Milk','Cereals containing gluten');if(/latte|cappuccino|flat white|cheese|halloumi/.test(l))al.push('Milk');if(/pistachio|baklava|kunafa|nut/.test(l))al.push('Tree nuts');if(/burger|wrap|toast|sourdough|bread|pitta/.test(l))al.push('Cereals containing gluten','Sesame');
  [...new Set(al)].forEach(a=>{const b=document.querySelector(`#edAllergens [data-val="${a}"]`);b&&b.classList.add('on')});
  if(!$('#edPrep').value)$('#edPrep').value=/coffee|latte|tea|cola/.test(l)?3:12;toast('Auto-filled with AI – please check the details')});
A('ed-gen-image',()=>{if((App.state.credits||0)<5)return noCredits(5);App.state.credits-=5;toast('AI image generated');const {i}=findItem(ctx.item.id)||{};if(i)i.photo=true});
A('ed-manage-badges',()=>App.modal({title:'Manage badges',body:`<div class="ed-chips" style="margin-bottom:12px">${BADGES.map(b=>`<span class="chip">${esc(b)}</span>`).join('')}</div>`+UI.field({label:'New badge',control:UI.input({id:'edNewBadge',placeholder:'e.g. Award Winner'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-badge-save">Add badge</button>`}));
A('ed-badge-save',()=>{const v=$('#edNewBadge').value.trim();if(!v)return toast('Enter a badge name');BADGES.push(v);const on=$$('#edBadges .chip-btn.on').map(b=>b.dataset.val);const w=$('#edBadgesWrap');if(w)w.innerHTML=chips('edBadges',BADGES,on);App.closeModal();toast('Badge added')});
A('ed-manage-ingredients',()=>App.modal({title:'Manage Ingredients',body:`<div class="ed-chips" style="margin-bottom:12px">${REMOVABLE.map(b=>`<span class="chip">${esc(b)}</span>`).join('')}</div>`+UI.field({label:'New ingredient',control:UI.input({id:'edNewIng',placeholder:'e.g. Coriander'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="ed-ing-save">Add ingredient</button>`}));
A('ed-ing-save',()=>{const v=$('#edNewIng').value.trim();if(!v)return toast('Enter an ingredient');REMOVABLE.push(v);const on=$$('#edRemov .chip-btn.on').map(b=>b.dataset.val);const w=$('#edRemWrap');if(w)w.innerHTML=chips('edRemov',REMOVABLE,on);App.closeModal();toast('Ingredient added')});
A('ed-rec-add',()=>{const inp=$('#edRecIn'),v=inp.value.trim();if(!v)return;if(!allItems().some(i=>i.name===v))return toast('Pick an item from the list');if($$('#edRec [data-rec]').some(c=>c.dataset.rec===v))return;$('#edRec').insertAdjacentHTML('beforeend',recChip(v));inp.value=''});
A('ed-rec-del',el=>el.closest('[data-rec]').remove());
const poCount=()=>$$('#edPO [data-po-row]').length;
function renumberPO(){$$('#edPO [data-po-row]').forEach((r,i)=>{r.querySelector('label').textContent='Option '+(i+1)});const has=poCount()>0;const n=$('#edNutNotice'),f=$('#edNfFields');if(n)n.style.display=has?'none':'';if(f)f.style.display=has?'':'none'}
A('ed-po-add',()=>{$('#edPO').insertAdjacentHTML('beforeend',poRow({price:$('#edPrice')?.value||''},poCount()+1));renumberPO()});
A('ed-po-del',el=>{el.closest('[data-po-row]').remove();renumberPO()});
A('ed-nf-toggle',el=>{$('#edNfLbl').textContent=el.checked?'Shown':'Hidden'});
A('ed-nc-toggle',el=>{$('#edNcLbl').textContent=el.checked?'Shown':'Hidden'});
A('ed-nc-add',()=>$('#edNC').insertAdjacentHTML('beforeend',ncRow()));
A('ed-nc-del',el=>el.closest('[data-nc-row]').remove());
A('ed-save-item',()=>{
  const name=$('#edName').value.trim();if(!name){showTab('gen');return toast('Name is required')}
  const on=id=>$$(`#${id} .chip-btn.on`).map(b=>b.dataset.val);
  const po=$$('#edPO [data-po-row]').map(r=>({name:r.querySelector('[data-po="name"]').value.trim(),price:r.querySelector('[data-po="price"]').value,caf:r.querySelector('[data-po="caf"]').value,disc:r.querySelector('[data-po="disc"]').value}));
  let price=parseFloat($('#edPrice').value);if(isNaN(price))price=po.length?parseFloat(po[0].price)||0:0;
  const nfv={};$$('[data-nf]').forEach(x=>{if(x.value)nfv[x.dataset.nf]=x.value});
  const av=(document.querySelector('input[name="edav"]:checked')||{}).value||'always';
  const data={name,desc:$('#edDesc').innerText.trim(),price,discount:$('#edDisc').value,calories:$('#edCal').value,on:$('#edOn').checked,soldOut:$('#edSold').checked,
    labels:on('edLabels'),badges:on('edBadges'),allergens:on('edAllergens'),removable:on('edRemov'),recommended:$$('#edRec [data-rec]').map(c=>c.dataset.rec),
    prep:$('#edPrep').value,carbon:$('#edCarbon').value,priceOptions:po,modifiers:$$('[data-mod]:checked').map(c=>c.dataset.mod),
    nf:{shown:$('#edNfOn').checked,v:nfv},nc:{shown:$('#edNcOn').checked,rows:$$('#edNC [data-nc-row]').map(r=>({label:r.querySelector('[data-nc="label"]').value,value:r.querySelector('[data-nc="value"]').value})).filter(r=>r.label)},availability:av};
  if($('#drawer .upload.done'))data.photo=true;
  const target=findSec($('#edSec').value)||M.sections[0];
  if(ctx.item.id){const {s,i}=findItem(ctx.item.id);Object.assign(i,data);if(s!==target){s.items.splice(s.items.indexOf(i),1);target.items.push(i)}}
  else target.items.push({id:uid(),photo:false,score:70,...data,photo:!!data.photo});
  target.open=true;const more=$('#edMore').checked,wasNew=!ctx.item.id;
  refresh();toast(wasNew?'Item added':'Item saved');
  if(more)itemDrawer(null,target.id);else App.closeDrawer();
});

/* ---------- right column actions ---------- */
const MENU_URL=()=>App.guestUrl({m:M.id});
A('ed-qr',()=>App.modal({title:'QR Code',body:`${UI.qr('menu-'+M.id,200)}<p style="text-align:center;margin:12px 0 4px;font-weight:600;color:var(--ink)">${esc(M.name)}</p><div class="field" style="margin-top:10px"><div class="input-group"><input readonly value="${MENU_URL()}" aria-label="Short link"><span class="after" style="cursor:pointer" data-copy="${MENU_URL()}">${ic('copy','sm')}</span></div></div>`,footer:`<button class="btn primary" data-action="download">${ic('download','sm')}Download</button>`}));
A('ed-share-wa',()=>toast('Opening WhatsApp share…'));
A('ed-share-sms',()=>toast('Opening SMS share…'));
A('ed-open',()=>App.modal({title:esc(M.name),wide:true,body:`<div style="display:flex;justify-content:center">${phoneHTML(true)}</div><p class="help" style="text-align:center">Guest view · ${MENU_URL()}</p>`}));
A('ed-copy-menu-link',()=>App.copy(MENU_URL(),'Menu link copied'));
A('ed-copy-share-link',()=>App.copy(App.guestUrl({m:M.id}),'Share link copied'));
A('ed-pv-refresh',()=>{promoClosed=false;rSide();toast('Preview refreshed')});
A('ed-pv-menu',el=>{pvMenu=el.dataset.id;pvQ='';const p=$('#edPhone');if(p)p.innerHTML=phoneHTML()});
A('ed-pv-search',el=>{pvQ=el.value;const b=$('#edPvBody');if(b)b.innerHTML=pvBody(menus().find(m=>m.id===pvMenu)||M)});
A('ed-pv-filter',()=>App.modal({title:'Filter menu',body:`<p class="muted" style="margin-top:0">What guests see when they tap the filter button.</p><div class="ed-chips">${LABELS.map(l=>`<button type="button" class="chip-btn" data-chip="multi">${l}</button>`).join('')}</div><h3 style="margin:16px 0 8px">Hide items containing</h3><div class="ed-chips">${ALLERGENS.map(l=>`<button type="button" class="chip-btn" data-chip="multi">${l}</button>`).join('')}</div>`,footer:`<button class="btn primary" data-close>Apply</button>`}));
A('ed-promo-close',()=>{promoClosed=true;const p=$('#edPhone');if(p)p.innerHTML=phoneHTML();$$('.ed-promo').forEach(x=>x.remove())});
})();
