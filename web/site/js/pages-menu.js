/* Proview Menu – Dashboard + AI Menu Manager (menus, create, builder, modifiers, translation center, in-app promotions) */
(function(){
const {UI,$,$$}=App,{ic,esc,gbp,uid}=UI;
const S=()=>App.state;
const A=App.action;
const menuById=id=>S().menus.find(m=>m.id===id);
const itemCount=m=>m.sections.reduce((a,s)=>a+s.items.length,0);
const clone=o=>JSON.parse(JSON.stringify(o));
const reId=m=>{m.id='m'+uid();m.sections.forEach(s=>{s.id=uid();s.items.forEach(i=>i.id=uid())});return m};
const today=()=>new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

/* =================== DASHBOARD =================== */
const IQ_CHIPS=['Unique app visitors last week','Most-viewed menu item this month','How is my Google rating trending?','Top complaints from recent reviews'];
const MKT_VIDEOS=[['Opening Hours',10],['Steam Close-Up',110],['Dish Launch',80],['Delivery Dash',80],['UGC Venue Visit',150],['Plate Reveal',50],['Behind the Pass',30],['Comfort Food Drop',80],['Last-Second Catch',40],['Mini World',70],['Too Good to Cut',90],['Drip Feed',50],['Motion Graphic Poster',20],['Floating Fall',130],['CGI Product Video',50,'POPULAR'],['UGC Product Review',100]];
const STUDIO_VIDEOS=[['Cinematic Fly Around',110,'NEW'],['Cinematic Fly-Through',110,'NEW'],['Full Table',50,'POPULAR'],['Ingredient Reveal',60,'POPULAR'],['Restaurant Ad',300],['Beautiful Table',520],['Make It Shine',180],['Delicious Close-Up',100],['Every Angle',60]];
const ACADEMY=['Everything Your Restaurant Needs to Grow','Quick Service vs. Full Service','Add Tables & Get QR Codes','How to Create a Menu','Take Delivery & Pickup Orders','Enhance your images with AI','Create a Website with AI','Import Your Menu','Add Modifiers to Your Dishes','Add Banner & Pop-up Promotions','Turn Menu Photos into Videos','Manage Menus for Multiple Locations','Set Up Your Welcome Page','Set Up Your Floor Plan','Add Nutrition Info & Ingredients','Create Combo Deals','Analytics Overview'];
const GRADS=[['#1565C0','#0D47A1'],['#3A3F47','#1A2330'],['#8D5B2E','#3E2412'],['#1E88E5','#3949AB'],['#2E7D5B','#14402F'],['#A1452B','#4A1C10'],['#5B4E9C','#251E4F'],['#C27C0E','#5A3604']];
const grad=i=>`--c1:${GRADS[i%8][0]};--c2:${GRADS[i%8][1]}`;

function carousel(id,eyebrow,eicon,title,text,allLbl,allHref,list,btnLbl,btnHref,newAll){
  return `<div class="card pad" style="margin-bottom:20px">
   <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
    <div style="flex:1;min-width:280px"><div class="eyebrow" style="color:var(--brand-700);display:flex;gap:6px;align-items:center">${ic(eicon,'sm')}${eyebrow}</div><h2 style="font-size:26px;line-height:32px;margin-top:6px;max-width:520px">${title}</h2><p class="muted" style="margin:8px 0 0;max-width:560px">${text}</p></div>
    <div style="display:flex;gap:8px"><a class="btn secondary" href="#${allHref}">${allLbl} →</a><button class="iconbtn" data-action="menu-car" data-car="${id}" data-dir="-1" aria-label="Previous">${ic('left','sm')}</button><button class="iconbtn" data-action="menu-car" data-car="${id}" data-dir="1" aria-label="Next">${ic('chev','sm')}</button></div></div>
   <p class="muted" style="margin:0 0 10px;font-size:13px">Your first video is on us.</p>
   <div class="carousel" id="${id}">${list.map(([n,c,b],i)=>`<div class="vcard thumbbg" style="${grad(i)}"><div class="badges"><span>FREE</span>${(newAll||b==='NEW')?'<span>NEW</span>':''}${b==='POPULAR'?'<span>POPULAR</span>':''}</div>
     <div style="position:absolute;inset:0;display:grid;place-items:center;opacity:.25">${ic('video')}</div>
     <b style="position:relative">${esc(n)}</b><small style="position:relative">0 credits <s>${c}</s> · first video only</small><a class="btn sm" style="position:relative" href="#${btnHref}">${btnLbl} →</a></div>`).join('')}</div></div>`}

App.route('dashboard',()=>{
  const st=S(),orders=st.orders||[];
  const rev=orders.reduce((a,o)=>a+(+o.total||0),0);
  const waiting=(st.reviews||[]).filter(r=>r.status==='Waiting'&&!r.archived);
  return `
  <form class="card ai-border" id="askIq" style="padding:14px 16px;margin-bottom:20px;border-radius:var(--r-lg)">
   <div style="display:flex;gap:12px;align-items:center"><span class="itile ai-grad" style="width:36px;height:36px;color:#fff">${ic('sparkle','sm')}</span>
    <input id="askIqIn" class="input" style="border:0;flex:1;outline:0;font-size:15px" placeholder='Ask Proview IQ: "${IQ_CHIPS[3]}"' aria-label="Ask Proview IQ">
    <button class="btn ai-btn" type="submit">Ask Proview IQ ${ic('send','sm')}</button></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">${IQ_CHIPS.map(q=>`<button type="button" class="chip-btn" data-action="menu-iq" data-q="${esc(q)}">${q}</button>`).join('')}</div></form>
  ${carousel('carMkt','AI MARKETING - VIDEO','insta','Turn your food and drinks into scroll-stopping Reels','Choose a video template, add a photo of your dish and AI writes the caption. Post it to Instagram and Facebook, or run it as a campaign.','View all video templates','ai-marketing',MKT_VIDEOS,'Create post','ai-marketing-create',true)}
  ${carousel('carStudio','AI MEDIA STUDIO - VIDEO','wand','Turn your food photos into stunning videos','Pick a template, upload a photo and AI turns it into a professional video in seconds.','View all templates','ai-media-studio',STUDIO_VIDEOS,'Use this template','ai-media-studio',false)}
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));margin-bottom:24px">
   ${[['New','NOW IN AI REPORTS','Track every move with AI Reports','Daily KPIs, forecasts, anomalies and recommendations for your venue.','ai-reports','bars'],
      ['New','POST DIRECTLY TO INSTAGRAM','Create AI marketing posts','Choose a template, generate a post and share it to Instagram in one go.','ai-marketing','insta'],
      ['Creative','START WITH THE AI MEDIA STUDIO','Enhance or generate your item images','Restyle your photos with AI, or create new ones in seconds.','ai-media-studio','wand'],
      ['Recommended','START WITH YOUR MENU','Create your AI-powered menu','Set up a professional menu in minutes with AI suggestions and templates.','menu-management','menu'],
      ['New','NEW','Launch your restaurant website','Build a website for your venue with AI-written content and design.','website-builder','globe']]
     .map(([t,e,h,p,href,i])=>`<a class="card pad" href="#${href}" style="text-decoration:none;color:inherit;display:block"><div style="display:flex;justify-content:space-between;align-items:center"><span class="itile" style="width:36px;height:36px">${ic(i,'sm')}</span>${UI.pill(t,t==='Recommended'?'ok':'')}</div><div class="eyebrow" style="margin-top:12px">${e}</div><h3 style="margin-top:4px">${h}</h3><p class="muted" style="margin:6px 0 0;font-size:13px">${p}</p></a>`).join('')}
  </div>
  <div style="display:flex;align-items:center;margin-bottom:12px"><h2>Proview Academy</h2><div style="margin-left:auto;display:flex;gap:8px"><button class="iconbtn" data-action="menu-car" data-car="carAcad" data-dir="-1" aria-label="Previous">${ic('left','sm')}</button><button class="iconbtn" data-action="menu-car" data-car="carAcad" data-dir="1" aria-label="Next">${ic('chev','sm')}</button></div></div>
  <div class="carousel" id="carAcad" style="margin-bottom:24px">${ACADEMY.map((t,i)=>`<button class="card" data-action="tutorial" style="flex:none;width:240px;padding:0;overflow:hidden;text-align:left;cursor:pointer"><div class="thumbbg" style="${grad(i+3)};aspect-ratio:16/9;display:grid;place-items:center;color:#fff">${ic('play')}</div><div style="padding:10px 12px;font-weight:600;color:var(--ink);font-size:13px">${t}</div></button>`).join('')}</div>
  <h2 style="margin-bottom:12px">Analytics Overview</h2>
  <div class="grid g2" style="margin-bottom:20px">
   <div class="card"><div class="card-head"><h3>Today</h3><a class="right btn ghost sm" href="#reports-summary">${ic('chart','sm')}View Reports</a></div>
    <div class="grid g2" style="padding:16px;gap:12px">${[['pound','Revenue',gbp(rev),'0.00%'],['cart','Avg. Order Size',gbp(orders.length?rev/orders.length:0),'0.00%'],['orders','Orders',orders.length,'0.00%'],['eye','Sessions','377','▼ -31.20%'],['users','Visitors','0','0.00%'],['gift','Tip',gbp(0),'0.00%']]
      .map(([i,l,v,d])=>`<div style="border:1px solid var(--border);border-radius:var(--r-md);padding:14px"><div class="lbl" style="display:flex;gap:8px;align-items:center;color:var(--muted);font-weight:600;font-size:13px"><span class="itile" style="width:28px;height:28px">${ic(i,'sm')}</span>${l}</div><div style="font-size:22px;font-weight:700;color:var(--ink);margin-top:8px">${v}</div><div class="delta ${d.includes('-')?'down':'flat'}" style="font-size:13px;font-weight:600">${d}</div></div>`).join('')}</div></div>
   <div class="card"><div class="card-head"><h3>Recent Reviews</h3><a class="right btn ghost sm" href="#engagement-reviews">${ic('eye','sm')}View All</a></div>
    ${waiting.length?waiting.slice(0,4).map(r=>`<div class="review"><div style="display:flex;gap:10px;align-items:center"><span class="avatar">${UI.initials(r.customer)}</span><div><strong style="color:var(--ink)">${esc(r.customer)}</strong><div class="stars">${'★'.repeat(r.rate)}<span style="color:var(--border-input)">${'★'.repeat(5-r.rate)}</span></div></div>${UI.pill('Waiting','warn')}</div><p style="margin:8px 0 0">${esc(r.text)}</p><small class="muted">${esc(r.item)}</small></div>`).join('')
      :UI.empty('msg','No waiting reviews.','Check all reviews in the details section.')}</div></div>
  <div class="card"><div class="card-head"><h3>Recent Orders</h3><a class="right btn ghost sm" href="#orders-all">${ic('orders','sm')}View Orders</a></div>
   ${UI.table({cols:['ID','Daily No','Status','Type','Customer/Table','Waiter','Update Time',{label:'Total',align:'right'}],
     rows:orders.slice(0,8).map(o=>[`<strong style="color:var(--ink)">${esc(o.id)}</strong>`,esc(o.dailyNo??o.no??''),UI.pill(esc(o.status||'Waiting')),esc(o.type||''),esc(o.table||o.customer||o.who||''),esc(o.waiter||'—'),esc(o.time||o.updated||''),`<strong style="color:var(--ink)">${gbp(o.total)}</strong>`]),empty:'No data'})}</div>`;
});
let carTimer=null;
App.after('dashboard',()=>{
  $('#askIq').onsubmit=e=>{e.preventDefault();const v=$('#askIqIn').value.trim()||IQ_CHIPS[3];App.iqAsk(v);$('#askIqIn').value=''};
  let i=0;clearInterval(carTimer);
  const rot=setInterval(()=>{const inp=$('#askIqIn');if(!inp){clearInterval(rot);return}i=(i+1)%IQ_CHIPS.length;inp.placeholder=`Ask Proview IQ: "${IQ_CHIPS[i]}"`},3500);
  carTimer=setInterval(()=>{const a=$('#carMkt'),b=$('#carStudio');if(!a){clearInterval(carTimer);return}
    [a,b].forEach(c=>{if(c.matches(':hover'))return;if(c.scrollLeft+c.clientWidth>=c.scrollWidth-4)c.scrollLeft=0;else c.scrollLeft+=214})},3000);
});
A('menu-iq',el=>App.iqAsk(el.dataset.q));
A('menu-car',el=>{const c=$('#'+el.dataset.car);c.scrollLeft+=(+el.dataset.dir)*c.clientWidth*.8});

/* =================== MENU MANAGEMENT =================== */
const MM_TABS=(active,extra)=>`<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">${UI.tabs([{key:'menus',label:'Menus',href:'menu-management'},{key:'modifiers',label:'Modifiers',href:'menu-modifiers'},{key:'tc',label:'Translation Center',href:'translation-center'},{key:'promo',label:'In-App Promotions',href:'in-app-promotions'}],active).replace('class="tabs"','class="tabs" style="flex:1 1 auto;min-width:max-content;margin-bottom:20px"')}
  <div style="display:flex;gap:4px;margin-bottom:24px"><button class="btn ghost sm" data-action="learn">${ic('book','sm')}Learn More</button><button class="btn ghost sm" data-action="tutorial">${ic('play','sm')}Watch Tutorial</button></div></div>`;
let mf={q:'',status:'Active',sort:'Menu order'};
function menuCards(){
  let list=S().menus.filter(m=>m.name.toLowerCase().includes(mf.q.toLowerCase()));
  if(mf.status==='Live')list=list.filter(m=>m.status==='Live');
  else if(mf.status==='Draft')list=list.filter(m=>m.status==='Draft');
  else if(mf.status==='Archived')list=list.filter(m=>m.status==='Archived');
  else list=list.filter(m=>m.status!=='Archived');
  if(mf.sort==='Name')list=[...list].sort((a,b)=>a.name.localeCompare(b.name));
  if(mf.sort==='Last updated')list=[...list].sort((a,b)=>new Date(b.updated)-new Date(a.updated));
  if(!list.length)return UI.empty('menu','No menus found','Try a different filter, or create a new menu.',`<a class="btn primary" href="#menu-create">${ic('plus','sm')}Create a Menu</a>`);
  return list.map(m=>`<div class="card" draggable="true" data-mid="${m.id}" style="margin-bottom:14px;padding:16px 18px;display:flex;gap:12px">
    <span class="drag" title="Drag to reorder" style="padding-top:2px;cursor:grab">${ic('grip','sm')}</span>
    <div style="flex:1;min-width:0">
     <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h3>${esc(m.name)}</h3>${UI.pill(m.status,m.status==='Live'?'ok':'grey')}<span style="margin-left:auto">${UI.toggle(m.on,`data-change="menu-live" data-id="${m.id}" aria-label="Live"`)}</span></div>
     <div class="muted" style="font-size:13px;margin-top:4px">Availability: ${m.availability==='dates'?'Specific Dates & Times':m.availability==='periodic'?'Periodic':'Always'} · ${m.sections.length||m.sectionsCount} Sections · ${itemCount(m)||m.itemsCount} Items · Last updated on ${m.updated}</div>
     <div class="chips">${m.channels.map(UI.channelChip).join('')}</div>
     <div style="display:flex;align-items:center;gap:8px;margin-top:12px"><button class="btn ghost sm" data-action="menu-preview" data-id="${m.id}">${ic('eye','sm')}Preview</button>
      <span style="margin-left:auto"></span><a class="btn primary sm" href="#menu-editor--${m.id}">${ic('edit','sm')}Edit Menu</a>
      <button class="iconbtn" style="width:32px;height:32px" data-action="menu-settings" data-id="${m.id}" aria-label="Menu settings">${ic('gear','sm')}</button>
      ${UI.more([{label:'Price Editor',icon:'pound',action:'menu-price-editor',data:`data-id="${m.id}"`},{label:'Translate',icon:'translate',href:'translation-center'},{label:'Duplicate',icon:'copy',action:'menu-duplicate',data:`data-id="${m.id}"`},{label:'Delete',icon:'trash',action:'menu-delete',data:`data-id="${m.id}"`,danger:1},{label:'Export',icon:'export',action:'menu-export',data:`data-id="${m.id}"`},{label:'Convert to Section',icon:'layers',action:'menu-convert',data:`data-id="${m.id}"`},{label:'Copy to Venue',icon:'store',action:'menu-copy-venue',data:`data-id="${m.id}"`}]).replace('class="iconbtn"','class="iconbtn" style="width:32px;height:32px" title="More"')}
     </div></div></div>`).join('')}
App.route('menu-management',()=>`
  ${UI.pageHead({title:'Menu Management',back:'dashboard',actions:`<button class="btn secondary" data-action="menu-improve">Improve Menu</button><a class="btn primary" href="#menu-create">Create a Menu</a>`})}
  ${MM_TABS('menus')}
  <div class="toolbar">${UI.searchBox('Search Menu','id="mfQ" data-input="menu-filter" value="'+esc(mf.q)+'"')}
   ${UI.select(['Active','Live','Draft','Archived'],mf.status,'id="mfStatus" data-change="menu-filter" style="width:150px" aria-label="Status"')}
   ${UI.select(['Menu order','Last updated','Name'],mf.sort,'id="mfSort" data-change="menu-filter" style="width:160px" aria-label="Sort"')}</div>
  <div id="menuCards">${menuCards()}</div>`,{nav:'menu-management'});
App.after('menu-management',()=>{const box=$('#menuCards');let drag=null;
  box.addEventListener('dragstart',e=>{const c=e.target.closest('[data-mid]');if(!c)return;drag=c.dataset.mid;c.style.opacity=.5});
  box.addEventListener('dragend',e=>{const c=e.target.closest('[data-mid]');c&&(c.style.opacity='')});
  box.addEventListener('dragover',e=>e.preventDefault());
  box.addEventListener('drop',e=>{e.preventDefault();const c=e.target.closest('[data-mid]');if(!c||!drag||c.dataset.mid===drag)return;const ms=S().menus,fi=ms.findIndex(m=>m.id===drag),ti=ms.findIndex(m=>m.id===c.dataset.mid);const [x]=ms.splice(fi,1);ms.splice(ti,0,x);mf.sort='Menu order';box.innerHTML=menuCards();App.toast('Menu order updated')});
});
A('menu-filter',()=>{mf={q:$('#mfQ').value,status:$('#mfStatus').value,sort:$('#mfSort').value};$('#menuCards').innerHTML=menuCards()});
A('menu-live',el=>{const m=menuById(el.dataset.id);m.on=el.checked;m.status=el.checked?'Live':'Draft';m.updated=today();App.toast(m.name+(m.on?' is live':' is now a draft'));setTimeout(()=>{$('#menuCards')&&($('#menuCards').innerHTML=menuCards())},150)});

/* preview */
function phone(m){const secs=m.sections.filter(s=>s.on!==false&&s.items.some(i=>i.on));
  return `<div class="phone" style="margin:0 auto"><div class="ph-top"><small>‹ &nbsp; ${esc(S().venue.name)}</small><b>${esc(m.name)}</b></div>
   <div class="ph-tabs">${S().menus.filter(x=>x.on).map(x=>`<span class="${x.id===m.id?'on':''}">${esc(x.name.split(' ')[0])}</span>`).join('')}</div>
   <div style="padding:8px 12px"><div class="input-group" style="height:34px"><span>${ic('search','sm')}</span><input placeholder="Search" aria-label="Search menu"></div></div>
   <div class="ph-tabs" style="border:0">${secs.map((s,i)=>`<span class="${i===0?'on':''}">${esc(s.name)}</span>`).join('')}</div>
   <div class="ph-body">${secs.map(s=>`<div class="ph-sec">${esc(s.name)}</div>${s.items.filter(i=>i.on).map(i=>`<div class="ph-item"><div class="t"><b>${esc(i.name)}</b><small>${esc(i.desc||'')}</small><div class="p" style="margin-top:4px">${gbp(i.price)}</div></div><span class="thumb ${i.photo?'':'none'}" style="width:52px;height:52px">${i.photo?UI.initials(i.name):''}</span></div>`).join('')}`).join('')||'<p class="muted" style="text-align:center;margin-top:40px">No items yet</p>'}</div></div>`}
App.menuPhone=phone;
A('menu-preview',el=>{const m=menuById(el.dataset.id);App.modal({title:'Preview – '+esc(m.name),body:phone(m),footer:`<button class="btn secondary" data-action="copy-menu-link">${ic('link','sm')}Copy Menu Link</button><a class="btn primary" href="#menu-editor--${m.id}" data-close>Edit Menu</a>`})});

/* settings drawer */
A('menu-settings',el=>{const m=menuById(el.dataset.id);const vis=m.visibility||{tablet:[1,1],dine:[1,1],delivery:[1,1],pickup:[1,1]};
  App.drawer({title:esc(m.name),id:m.id,width:600,body:`
   ${UI.tabs([{key:'ov',label:'Overview'},{key:'cv',label:'Customize View'},{key:'vi',label:'Visibility'},{key:'av',label:'Availability'}],'ov','ms')}
   ${UI.panel('ms','ov',UI.field({label:'Name',required:true,id:'msName',control:UI.input({id:'msName',value:m.name,placeholder:'Summer Menu'})})+UI.field({label:'Description',id:'msDesc',control:UI.textarea({id:'msDesc',value:m.desc||''})})+UI.field({label:'Note',id:'msNote',control:UI.input({id:'msNote',value:m.note||'',placeholder:'E.g: 20% VAT included'})}),'ov')}
   ${UI.panel('ms','cv',`
     ${UI.toggleRow('Alphabetical Order','This sorts the items and sections inside each section alphabetically.',!!m.alpha,'id="msAlpha"')}
     <div class="form-row" style="display:block"><strong style="color:var(--ink)">Number of Columns</strong> ${UI.pill('Tablet Menu','grey')}<div class="help">Choose how many grid columns are shown in the menu.</div><div style="display:flex;gap:18px;margin-top:10px">${[1,2,3,4].map(n=>UI.radio('msCols',n,(m.cols||2)===n,`value="${n}"`)).join('')}</div></div>
     <div class="form-row" style="display:block"><strong style="color:var(--ink)">Grid Title Position</strong> ${UI.pill('Tablet Menu','grey')}<div class="help">Change where titles sit on inner sections and items.</div><div style="display:flex;gap:18px;margin-top:10px">${['Top','Bottom'].map(n=>UI.radio('msTitlePos',n,(m.titlePos||'Bottom')===n,`value="${n}"`)).join('')}</div></div>`,'ov')}
   ${UI.panel('ms','vi',`<p class="muted" style="margin-top:0">Select products that your menu will be visible on.</p>${[['tablet','Tablet Menu'],['dine','Dine-in QR Menu'],['delivery','Delivery Menu'],['pickup','Pick-up menu']].map(([k,l])=>`<div class="form-row" style="align-items:center"><div class="txt">${UI.check(`<strong style="color:var(--ink);display:inline">${l}</strong>`,m.channels.includes(k),`data-vis="${k}"`)}</div><small class="muted">Enable Ordering</small>${UI.toggle(vis[k]?vis[k][1]:true,`data-visord="${k}" aria-label="Enable ordering on ${l}"`)}</div>`).join('')}`,'ov')}
   ${UI.panel('ms','av',UI.availability('msAv',m.availability||'always'),'ov')}`,
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-settings-save" data-id="${m.id}">Save</button>`})});
A('menu-settings-save',el=>{const m=menuById(el.dataset.id);const n=$('#msName').value.trim();if(!n){App.toast('Name is required');return}
  m.name=n;m.desc=$('#msDesc').value;m.note=$('#msNote').value;m.alpha=$('#msAlpha').checked;
  m.cols=+($('input[name=msCols]:checked')||{}).value||2;m.titlePos=($('input[name=msTitlePos]:checked')||{}).value;
  m.channels=$$('[data-vis]').filter(c=>c.checked).map(c=>c.dataset.vis);
  m.visibility={};$$('[data-visord]').forEach(t=>m.visibility[t.dataset.visord]=[m.channels.includes(t.dataset.visord),t.checked]);
  m.availability=($('input[name=msAv]:checked')||{}).value||'always';m.updated=today();
  App.close();App.render();App.toast('Menu settings saved')});

/* ⋮ actions */
A('menu-price-editor',el=>{const m=menuById(el.dataset.id);
  App.drawer({title:'Price Editor – '+esc(m.name),width:720,body:`
   <div class="card pad" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;background:var(--brand-tint-subtle)">
    ${UI.field({label:'Bulk change',control:UI.select(['Increase by %','Decrease by %'],'','id="peDir"')})}
    ${UI.field({label:'Percentage',control:UI.input({id:'pePct',type:'number',value:'5',suffix:'%'})})}
    ${UI.field({label:'Section',control:UI.select(['All sections',...m.sections.map(s=>s.name)],'','id="peSec"')})}
    <div class="field"><button class="btn secondary" data-action="menu-pe-apply">Apply</button></div></div>
   ${UI.searchBox('Search items','data-input="menu-pe-search"')}
   <div id="peList" style="margin-top:12px">${m.sections.map(s=>`<div data-pesec="${esc(s.name)}"><div class="eyebrow" style="margin:14px 0 6px">${esc(s.name)}</div>${s.items.map(i=>`<div class="stat-row" data-pename="${esc(i.name.toLowerCase())}" style="align-items:center"><span style="color:var(--ink);font-weight:600">${esc(i.name)}</span><div class="input-group" style="width:140px;height:36px"><span>£</span><input data-pid="${i.id}" value="${i.price.toFixed(2)}" inputmode="decimal" aria-label="Price for ${esc(i.name)}"></div></div>`).join('')}</div>`).join('')}</div>`,
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-pe-save" data-id="${m.id}">Save</button>`})});
A('menu-pe-search',el=>{const q=el.value.toLowerCase();$$('[data-pename]').forEach(r=>r.style.display=r.dataset.pename.includes(q)?'':'none')});
A('menu-pe-apply',()=>{const pct=parseFloat($('#pePct').value)||0,f=$('#peDir').value.startsWith('Inc')?1+pct/100:1-pct/100,sec=$('#peSec').value;
  $$('[data-pesec]').forEach(b=>{if(sec!=='All sections'&&b.dataset.pesec!==sec)return;b.querySelectorAll('[data-pid]').forEach(i=>{i.value=(Math.round(parseFloat(i.value||0)*f*100)/100).toFixed(2)})});App.toast('Preview updated – press Save to apply')});
A('menu-pe-save',el=>{const m=menuById(el.dataset.id);const all=m.sections.flatMap(s=>s.items);$$('[data-pid]').forEach(i=>{const it=all.find(x=>x.id===i.dataset.pid);const v=parseFloat(i.value);if(it&&!isNaN(v))it.price=v});m.updated=today();App.close();App.toast('Prices updated')});
A('menu-duplicate',el=>{const m=menuById(el.dataset.id);const c=reId(clone(m));c.name=m.name+' (Copy)';c.status='Draft';c.on=false;c.updated=today();S().menus.splice(S().menus.indexOf(m)+1,0,c);App.render();App.toast('Menu duplicated')});
A('menu-delete',el=>{const m=menuById(el.dataset.id);App.modal({title:'Delete menu?',body:`<p style="margin:0">“${esc(m.name)}” and all its sections and items will be deleted. This can't be undone.</p>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="menu-delete-ok" data-id="${m.id}">Delete</button>`})});
A('menu-delete-ok',el=>{S().menus=S().menus.filter(m=>m.id!==el.dataset.id);App.state.menus=S().menus;App.close();App.render();App.toast('Menu deleted')});
A('menu-export',el=>App.toast(menuById(el.dataset.id).name+' exported'));
A('menu-convert',el=>{const m=menuById(el.dataset.id);const others=S().menus.filter(x=>x.id!==m.id);
  App.modal({title:'Convert to Section',body:`<p style="margin-top:0">“${esc(m.name)}” will become a section inside the menu you choose. Its items move with it.</p>${UI.field({label:'Target menu',required:true,control:UI.select(others.map(x=>({value:x.id,label:x.name})),'','id="cvTarget"')})}`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-convert-ok" data-id="${m.id}">Convert</button>`})});
A('menu-convert-ok',el=>{const m=menuById(el.dataset.id),t=menuById($('#cvTarget').value);if(!t)return;t.sections.push({id:uid(),name:m.name,on:true,open:false,score:80,items:m.sections.flatMap(s=>s.items)});S().menus.splice(S().menus.indexOf(m),1);App.close();App.render();App.toast('Converted to a section in '+t.name)});
A('menu-copy-venue',el=>{const m=menuById(el.dataset.id);App.modal({title:'Copy to Venue',body:`<p style="margin-top:0">Copy “${esc(m.name)}” to:</p>${(S().venues||[]).map(v=>`<div style="padding:6px 0">${UI.check(esc(v.name),false,'data-cv')}</div>`).join('')}`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-copy-venue-ok">Copy</button>`})});
A('menu-copy-venue-ok',()=>{const n=$$('[data-cv]').filter(c=>c.checked).length;if(!n){App.toast('Choose at least one venue');return}App.close();App.toast(`Menu copied to ${n} venue${n>1?'s':''}`)});

/* Improve Menu */
A('menu-improve',()=>App.modal({title:'Improve Menu',wide:true,body:`<form id="impForm">
  <p class="muted" style="margin-top:0">Tell us what you'd like to improve and our menu team will get back to you.</p>
  <div class="grid g2" style="gap:12px">${UI.field({label:'Email',required:true,control:UI.input({id:'impEmail',type:'email',attrs:'required'})})}${UI.field({label:'Contact Country',control:UI.select(['Please Select','United Kingdom','Ireland','Türkiye','United States','Other'],'Please Select')})}
  ${UI.field({label:'First name',required:true,control:UI.input({id:'impFn',attrs:'required'})})}${UI.field({label:'Last name',required:true,control:UI.input({id:'impLn',attrs:'required'})})}</div>
  ${UI.field({label:'Phone number',required:true,control:`<div style="display:flex;gap:8px">${UI.select(['United Kingdom','Ireland','Türkiye','United States'],'United Kingdom','style="width:180px"')}<div class="input-group" style="flex:1"><span>+44</span><input id="impPhone" required></div></div>`})}
  <div class="field"><label>Improvement Request Details</label><div class="grid g2" style="gap:8px">${['Overall Design','Menu Colors','Menu Structure','Functionalities','Maximize the benefit of the system','Order and Pay','Other'].map(o=>UI.check(o)).join('')}</div></div>
  <p class="help">We'll use your details only to respond to this request, as set out in our privacy policy.</p>
  <div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 14px;width:280px">${UI.check("I'm not a robot")}</div></form>`,
  footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-improve-submit">Submit</button>`}));
A('menu-improve-submit',()=>{if(!$('#impEmail').value||!$('#impFn').value||!$('#impLn').value||!$('#impPhone').value){App.toast('Please fill in the required fields');return}App.close();App.toast('Thanks – our menu team will be in touch')});

/* =================== CREATE A MENU =================== */
App.route('menu-create',()=>`
  ${UI.pageHead({title:'How would you like to setup your menu?',back:'menu-management',learn:true})}
  <p class="muted" style="margin-top:-12px">Let's set up your menu. You can change it any time.</p>
  <div class="grid g3" style="margin:20px 0">
   ${[['menu-builder','img','Menu Builder','Upload images, PDFs or Excel/CSV files and we\'ll build your menu automatically.',1],['menu-scratch','blocks','Start from scratch','Start with an empty menu.'],['menu-sample','book','Create a sample menu','Start with a ready-made menu.']].map(([a,i,t,d,rec])=>
     `<button class="select-card" style="padding:24px" ${a==='menu-builder'?'data-href="menu-builder"':`data-action="${a}"`}><div style="display:flex;justify-content:space-between"><span class="itile">${ic(i)}</span>${rec?UI.pill(ic('sparkle','sm')+'Recommended'):''}</div><h3 style="margin-top:14px">${t}</h3><p class="muted" style="margin:6px 0 0">${d}</p></button>`).join('')}</div>
  <div class="card pad" style="display:flex;gap:12px;background:var(--brand-tint-subtle)"><span class="itile" style="width:36px;height:36px">${ic('info','sm')}</span><div><strong style="color:var(--ink)">Have an Excel or CSV file?</strong><p style="margin:4px 0 0">You can upload spreadsheets straight into Menu Builder. Choose Menu Builder and drop your file in – we'll pull everything out for you.</p></div></div>`,{nav:'menu-management'});
function newMenu(name,sections){const m={id:'m'+uid(),name,status:'Draft',on:false,channels:['dine','pickup','delivery','tablet'],updated:today(),sections};S().menus.push(m);return m}
A('menu-scratch',()=>App.modal({title:'Start from scratch',body:UI.field({label:'Menu Name',required:true,control:UI.input({id:'nmName',placeholder:'Summer Menu'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-scratch-ok">Create</button>`}));
A('menu-scratch-ok',()=>{const n=$('#nmName').value.trim();if(!n){App.toast('Enter a menu name');return}const m=newMenu(n,[{id:uid(),name:'New Section',on:true,open:true,score:0,items:[]}]);App.close();App.go('menu-editor--'+m.id);App.toast('Menu created')});
A('menu-sample',()=>{const mk=(n,p,d)=>({id:uid(),name:n,price:p,on:true,photo:true,score:80,desc:d});
  const m=newMenu('Sample Menu',[{id:uid(),name:'Starters',on:true,open:true,score:82,items:[mk('Soup of the Day',6.5,'Served with sourdough'),mk('Garlic Bread',4.95,'With mozzarella')]},{id:uid(),name:'Mains',on:true,open:false,score:80,items:[mk('Fish & Chips',15.95,'Beer-battered cod, mushy peas'),mk('Chicken Caesar',13.5,'Cos, parmesan, croutons')]},{id:uid(),name:'Desserts',on:true,open:false,score:78,items:[mk('Sticky Toffee Pudding',7.5,'With vanilla ice cream')]},{id:uid(),name:'Drinks',on:true,open:false,score:75,items:[mk('Lemonade',3.5,''),mk('Flat White',3.6,'')]}]);
  App.go('menu-editor--'+m.id);App.toast('Sample menu created')});

/* =================== MENU BUILDER =================== */
let mb={step:0,src:'',items:null,channels:['dine','pickup','delivery','tablet']};
const MOCK=()=>[{name:'Starters',items:[['Lentil Soup',5.95],['Hummus & Pitta',6.50],['Halloumi Fries',7.50]]},{name:'Mains',items:[['Chicken Shish',15.95],['Lamb Kofte',16.50],['Mixed Grill',22.95]]},{name:'Desserts',items:[['Baklava',6.50],['Rice Pudding',5.50]]}];
App.route('menu-builder',()=>{
  const head=UI.pageHead({title:'Menu Builder',sub:'Create your digital menu in minutes',back:'menu-create'})+UI.stepper(['Upload Menu','Review Items','Publish'],mb.step);
  if(mb.step===0)return head+`
   <div class="card pad" style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;margin-bottom:20px">
    <div><h2>Upload Your Restaurant Menu</h2><p class="muted">Add a file or link and we'll read the sections, items and prices for you to check.</p>
     <div class="card" style="padding:14px;background:var(--page)">${[['check','Upload your menu document (the list of items with prices)','ok'],['check','Photos of your menu card/board','ok'],['check','PDF menu files','ok'],['check','Digital menu screenshots','ok'],['x',"Don't upload: Individual food/dish photos",'bad']].map(([i,t,k])=>`<div style="display:flex;gap:8px;align-items:center;padding:4px 0;color:var(--${k==='ok'?'ink-2':'bad'})"><span style="color:var(--${k})">${ic(i,'sm')}</span>${t}</div>`).join('')}</div></div>
    <div class="thumbbg" style="border-radius:var(--r-lg);display:grid;place-items:center;color:#fff;min-height:180px">${ic('menu')}</div></div>
   <div class="card pad">
    ${UI.seg([{key:'up',label:'Upload Files',icon:'upload'},{key:'url',label:'Enter URL',icon:'link'}],'up','mb')}
    <div data-segpanel="mb:up" style="margin-top:16px"><label class="upload" style="padding:40px">${ic('upload')}<div style="font-weight:600;margin-top:6px;color:var(--ink)">Click or drag your menu to upload</div><div class="help">Supports JPG, PNG, PDF, XLSX, XLS, CSV and XML (Max 10MB)</div><span class="btn secondary sm" style="margin-top:12px">Choose File</span><input type="file" hidden id="mbFile" data-upload accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv,.xml"></label></div>
    <div data-segpanel="mb:url" hidden style="margin-top:16px">${UI.field({label:'Enter Website URL',help:'Paste a link to a web page that shows your menu and we\'ll pull the items out automatically.',control:UI.input({id:'mbUrl',prefix:'https://',placeholder:'example.com/menu'})})}</div>
    <div style="margin-top:16px"><strong style="color:var(--ink)">Tips for best results:</strong><ul style="margin:6px 0 0;padding-left:18px"><li>Make sure the text is clear and readable</li><li>Include every page if your menu has several sections</li><li>Good lighting helps if you're taking a photo</li></ul></div></div>
   <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px"><a class="btn secondary" href="#menu-create">Cancel</a><button class="btn primary" data-action="menu-mb-create">${ic('sparkle','sm')}Create Digital Menu</button></div>`;
  if(mb.step===1)return head+`<div class="card pad"><div style="display:flex;align-items:center;margin-bottom:12px"><div><h2>Review Items</h2><p class="muted" style="margin:4px 0 0">We found ${mb.items.reduce((a,s)=>a+s.items.length,0)} items in ${mb.items.length} sections from ${esc(mb.src)}. Check the names and prices before publishing.</p></div></div>
    ${mb.items.map((s,si)=>`<div class="card" style="margin-bottom:12px"><div class="card-head"><input class="input" style="max-width:280px;font-weight:600" data-mbsec="${si}" value="${esc(s.name)}" aria-label="Section name"><button class="btn ghost sm right" data-action="menu-mb-additem" data-si="${si}">${ic('plus','sm')}Add item</button></div>
     ${s.items.map((it,ii)=>`<div style="display:flex;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);align-items:center"><input class="input" data-mbn="${si}:${ii}" value="${esc(it[0])}" aria-label="Item name"><div class="input-group" style="width:140px;flex:none"><span>£</span><input data-mbp="${si}:${ii}" value="${it[1].toFixed(2)}" aria-label="Price"></div><button class="iconbtn" style="width:36px;height:36px;border:0" data-action="menu-mb-del" data-k="${si}:${ii}" aria-label="Remove">${ic('trash','sm')}</button></div>`).join('')}</div>`).join('')}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px"><button class="btn secondary" data-action="menu-mb-back">Back</button><button class="btn primary" data-action="menu-mb-next">Continue</button></div>`;
  return head+`<div class="card pad" style="max-width:640px"><h2>Publish</h2><p class="muted">Name your menu and choose where guests can see it.</p>
    ${UI.field({label:'Menu Name',required:true,control:UI.input({id:'mbName',value:'Imported Menu'})})}
    <div class="field"><label>Visible on</label>${[['dine','Dine-in QR Menu'],['pickup','Pick-up menu'],['delivery','Delivery Menu'],['tablet','Tablet Menu']].map(([k,l])=>`<div style="padding:4px 0">${UI.check(l,mb.channels.includes(k),`data-mbch="${k}"`)}</div>`).join('')}</div></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;max-width:640px"><button class="btn secondary" data-action="menu-mb-back">Back</button><button class="btn primary" data-action="menu-mb-publish">Publish</button></div>`;
},{nav:'menu-management'});
function mbSync(){if(!mb.items)return;$$('[data-mbsec]').forEach(i=>mb.items[+i.dataset.mbsec].name=i.value);$$('[data-mbn]').forEach(i=>{const [s,k]=i.dataset.mbn.split(':');mb.items[s].items[k][0]=i.value});$$('[data-mbp]').forEach(i=>{const [s,k]=i.dataset.mbp.split(':');mb.items[s].items[k][1]=parseFloat(i.value)||0})}
A('menu-mb-create',()=>{const f=$('#mbFile'),u=$('#mbUrl');const src=f&&f.files[0]?f.files[0].name:(u&&u.value.trim()?'https://'+u.value.trim():'');if(!src){App.toast('Upload a file or enter a URL first');return}
  mb.src=src;App.toast('Reading your menu…');setTimeout(()=>{mb.items=MOCK();mb.step=1;App.render()},600)});
A('menu-mb-additem',el=>{mbSync();mb.items[+el.dataset.si].items.push(['New item',0]);App.render()});
A('menu-mb-del',el=>{mbSync();const [s,k]=el.dataset.k.split(':');mb.items[s].items.splice(k,1);App.render()});
A('menu-mb-back',()=>{mbSync();mb.step=Math.max(0,mb.step-1);App.render()});
A('menu-mb-next',()=>{mbSync();mb.step=2;App.render()});
A('menu-mb-publish',()=>{const n=$('#mbName').value.trim();if(!n){App.toast('Enter a menu name');return}
  const m=newMenu(n,mb.items.map((s,i)=>({id:uid(),name:s.name,on:true,open:i===0,score:75,items:s.items.map(([nm,p])=>({id:uid(),name:nm,price:p,on:true,photo:false,score:65,desc:''}))})));
  m.channels=$$('[data-mbch]').filter(c=>c.checked).map(c=>c.dataset.mbch);m.status='Live';m.on=true;mb={step:0,src:'',items:null,channels:['dine','pickup','delivery','tablet']};App.go('menu-editor--'+m.id);App.toast('Menu published')});

/* =================== MODIFIERS =================== */
let modQ='';
function modTable(){const list=(S().modifiers||[]).filter(g=>g.name.toLowerCase().includes(modQ.toLowerCase()));
  if(!(S().modifiers||[]).length)return `<div class="card">${UI.empty('layers',"You don't have any modifiers yet.",'Start by creating a new one.',`<button class="btn primary" data-action="menu-mod-add">${ic('plus','sm')}Create a Modifier</button>`)}</div>`;
  return `<div class="card">${UI.table({cols:['Group Name','Modifiers',{label:'Actions',align:'right'}],rows:list.map(g=>[`<strong style="color:var(--ink)">${esc(g.name)}</strong>`,g.mods.map(m=>`${esc(m.name)}${m.price?` (+${gbp(m.price)})`:''}`).join(', '),`<button class="iconbtn" style="width:32px;height:32px;display:inline-grid" data-action="menu-mod-add" data-id="${g.id}" aria-label="Edit">${ic('edit','sm')}</button> <button class="iconbtn" style="width:32px;height:32px;display:inline-grid" data-action="menu-mod-del" data-id="${g.id}" aria-label="Delete">${ic('trash','sm')}</button>`]),empty:'No modifiers match your search'})}</div>`}
App.route('menu-modifiers',()=>`
  ${UI.pageHead({title:'Menu Management',back:'dashboard',actions:`<button class="btn primary" data-action="menu-mod-add">${ic('plus','sm')}Add a Modifier Group</button>`})}
  ${MM_TABS('modifiers')}
  <div class="toolbar">${UI.searchBox('Search','id="modQ" data-input="menu-mod-search"')}</div>
  <div id="modBox">${modTable()}</div>`,{nav:'menu-management'});
A('menu-mod-search',el=>{modQ=el.value;$('#modBox').innerHTML=modTable()});
const modRow=(m={name:'',price:0,cal:0,on:true})=>`<tr data-modrow><td><input class="input" data-mn value="${esc(m.name)}" placeholder="Name" aria-label="Modifier name"></td><td><div class="input-group" style="width:120px"><span>£</span><input data-mp value="${m.price}" inputmode="decimal" aria-label="Price"></div></td><td><div class="input-group" style="width:120px"><input data-mc value="${m.cal}" inputmode="numeric" aria-label="Calories"><span class="after">cal</span></div></td><td>${UI.toggle(m.on,'data-mo aria-label="Available"')}</td><td><button type="button" class="btn ghost sm" data-action="menu-mod-up">Move</button></td><td><button type="button" class="iconbtn" style="width:32px;height:32px;border:0" data-action="menu-mod-rm" aria-label="Remove">${ic('x','sm')}</button></td></tr>`;
A('menu-mod-add',el=>{const g=el.dataset.id?(S().modifiers||[]).find(x=>x.id===el.dataset.id):null;
  App.modal({title:g?'Edit Modifier Group':'Add a Modifier Group',wide:true,body:`${UI.field({label:'Group Name',required:true,control:UI.input({id:'mgName',value:g?g.name:'',placeholder:'e.g. Milk choice'})})}
   <div class="field"><label>Modifiers</label><div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Price</th><th>Calories</th><th></th><th></th><th></th></tr></thead><tbody id="modRows">${(g?g.mods:[undefined]).map(m=>modRow(m)).join('')}</tbody></table></div>
   <button type="button" class="btn ghost sm" style="margin-top:8px" data-action="menu-mod-row">${ic('plus','sm')}Add more modifier</button></div>`,
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-mod-save" data-id="${g?g.id:''}">Save</button>`})});
A('menu-mod-row',()=>$('#modRows').insertAdjacentHTML('beforeend',modRow()));
A('menu-mod-rm',el=>{const rows=$$('[data-modrow]');if(rows.length>1)el.closest('tr').remove();else App.toast('A group needs at least one modifier')});
A('menu-mod-up',el=>{const tr=el.closest('tr'),p=tr.previousElementSibling;if(p)tr.parentElement.insertBefore(tr,p)});
A('menu-mod-save',el=>{const n=$('#mgName').value.trim();if(!n){App.toast('Group Name is required');return}
  const mods=$$('[data-modrow]').map(r=>({name:r.querySelector('[data-mn]').value.trim(),price:parseFloat(r.querySelector('[data-mp]').value)||0,cal:parseInt(r.querySelector('[data-mc]').value)||0,on:r.querySelector('[data-mo]').checked})).filter(m=>m.name);
  if(!mods.length){App.toast('Add at least one modifier name');return}
  S().modifiers=S().modifiers||[];const g=S().modifiers.find(x=>x.id===el.dataset.id);
  if(g)Object.assign(g,{name:n,mods});else S().modifiers.push({id:uid(),name:n,mods});App.close();App.render();App.toast(g?'Modifier group updated':'Modifier group created')});
A('menu-mod-del',el=>{S().modifiers=S().modifiers.filter(g=>g.id!==el.dataset.id);App.render();App.toast('Modifier group deleted')});

/* =================== TRANSLATION CENTER =================== */
let tc={menu:'m1',sec:0,item:0,q:'',mode:'all',langs:[{name:'English',pct:57,on:true}],other:0,survey:0};
const OTHERS=[['Info Page',['Tablet']],['Service Options',['Tablet','QR']],['Venue Name',[]],['Welcome Message',['QR','Pick-Up','Delivery']],['Restaurant Notes',['QR','Pick-Up','Delivery']],['Removable Ingredients',[]]];
const langChips=()=>`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">${tc.langs.map((l,i)=>`<label class="chip-btn ${l.on?'on':''}" style="cursor:pointer"><input type="checkbox" ${l.on?'checked':''} data-change="menu-tc-lang" data-i="${i}" style="accent-color:var(--brand-700)">${esc(l.name)} (%${l.pct})</label>`).join('')}<button class="btn ghost sm" data-action="menu-tc-addlang">${ic('plus','sm')}Add Language</button></div>`;
const langCards=(fields,label)=>tc.langs.filter(l=>l.on).map(l=>`<div class="card" style="margin-bottom:14px;overflow:hidden"><div class="ai-grad" style="color:#fff;padding:10px 16px;font-weight:700">${esc(l.name)}${label?` · <span style="font-weight:500">${esc(label)}</span>`:''}</div><div style="padding:16px">${fields.map(([f,v])=>UI.field({label:f,control:f.toLowerCase().includes('desc')||f==='Text'?UI.textarea({value:l.name==='English'?v:'',placeholder:'Enter text',rows:2}):UI.input({value:l.name==='English'?v:'',placeholder:'Enter text'})})).join('')}</div></div>`).join('')||UI.empty('translate','Choose a language above');
function tcMenus(){const m=menuById(tc.menu)||S().menus[0];tc.menu=m.id;
  const secs=m.sections.map((s,i)=>[s,i]).filter(([s])=>s.name.toLowerCase().includes(tc.q.toLowerCase())||s.items.some(it=>it.name.toLowerCase().includes(tc.q.toLowerCase())));
  const sec=m.sections[tc.sec]||m.sections[0],it=sec&&sec.items[tc.item];
  return `<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start">
   <div class="card pad" id="tcTree"><div class="field">${UI.select(S().menus.map(x=>({value:x.id,label:x.name})),m.id,'data-change="menu-tc-menu" aria-label="Menu"')}</div>
    ${UI.searchBox('Search','data-input="menu-tc-q" value="'+esc(tc.q)+'"')}
    <div style="display:flex;gap:16px;margin:12px 0">${UI.radio('tcMode','All',tc.mode==='all','data-change="menu-tc-mode" value="all"')}${UI.radio('tcMode','Untranslated',tc.mode==='un','data-change="menu-tc-mode" value="un"')}</div>
    <div style="max-height:520px;overflow:auto"><div style="font-weight:700;color:var(--ink);padding:6px 0">${esc(m.name)}</div>${secs.filter(([s,i])=>tc.mode==='all'||i%3).map(([s,i])=>`<button data-action="menu-tc-sec" data-i="${i}" style="display:flex;gap:8px;align-items:center;width:100%;text-align:left;border:0;cursor:pointer;padding:8px 10px;border-radius:8px;background:${i===tc.sec?'var(--brand-tint)':'none'};color:${i===tc.sec?'var(--brand-900)':'var(--ink-2)'};font-weight:${i===tc.sec?700:500}"><span style="width:8px;height:8px;border-radius:50%;flex:none;background:${i%3?'var(--border-input)':'var(--ok)'}"></span>${esc(s.name)}</button>`).join('')}</div></div>
   <div>${langChips()}${it?langCards([['Name',it.name],['Description',it.desc||''],['Note','']],sec.name+' › '+it.name):langCards([['Name',sec?sec.name:'']],sec?sec.name:'')}
    <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn secondary" data-action="menu-tc-save">Save</button><button class="btn primary" data-action="menu-tc-next">Next Item ${ic('chev','sm')}</button></div></div></div>`}
function tcModifiers(){const g=S().modifiers||[];if(!g.length)return `<div class="card">${UI.empty('layers','No modifiers to translate','Create modifier groups first.',`<a class="btn primary" href="#menu-modifiers">Go to Modifiers</a>`)}</div>`;
  const cur=g[tc.other%g.length];return `<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start"><div class="card pad">${g.map((x,i)=>`<button class="btn ${x===cur?'secondary':'ghost'}" style="width:100%;justify-content:flex-start;margin-bottom:4px" data-action="menu-tc-other" data-i="${i}">${esc(x.name)}</button>`).join('')}</div><div>${langChips()}${langCards([['Name',cur.name],...cur.mods.map(m=>['Modifier',m.name])],cur.name)}<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-action="menu-tc-othernext" data-n="${g.length}">Next Item ${ic('chev','sm')}</button></div></div></div>`}
function tcSurveys(){const f=(S().forms||[])[0]||{name:'Sample Form',questions:[]};
  return `<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start"><div class="card pad"><div class="eyebrow" style="margin-bottom:8px">Surveys</div><button class="btn secondary" style="width:100%;justify-content:flex-start">${ic('form','sm')}${esc(f.name)}</button></div>
   <div>${langChips()}${langCards([['Welcome Message','Please Give Us 60 Seconds!'],...f.questions.map((q,i)=>['Question '+(i+1),q[0]])],f.name)}<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-action="menu-tc-save">Save</button></div></div></div>`}
function tcOthers(){const cur=OTHERS[tc.other%OTHERS.length];
  return `<div style="display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start"><div class="card pad">${OTHERS.map(([n,t],i)=>`<button class="btn ${i===tc.other%OTHERS.length?'secondary':'ghost'}" style="width:100%;justify-content:space-between;margin-bottom:4px;height:auto;min-height:40px;flex-wrap:wrap" data-action="menu-tc-other" data-i="${i}"><span>${n}</span><span style="display:flex;gap:4px">${t.map(x=>`<span class="pill grey" style="height:20px;font-size:11px">${x}</span>`).join('')}</span></button>`).join('')}</div>
   <div>${langChips()}${langCards([['Title',cur[0]==='Venue Name'?S().venue.name:cur[0]],['Text','']],cur[0])}<div style="display:flex;justify-content:flex-end"><button class="btn primary" data-action="menu-tc-othernext" data-n="${OTHERS.length}">Next Item ${ic('chev','sm')}</button></div></div></div>`}
App.route('translation-center',(tab='menus')=>{tab=tab||'menus';
  const body={menus:tcMenus,modifiers:tcModifiers,surveys:tcSurveys,others:tcOthers}[tab]||tcMenus;
  return `${UI.pageHead({title:'Translation Center',back:'menu-management',learn:true})}
   ${UI.tabs([{key:'menus',label:'Menus',href:'translation-center--menus'},{key:'modifiers',label:'Modifiers',href:'translation-center--modifiers'},{key:'surveys',label:'Surveys',href:'translation-center--surveys'},{key:'others',label:'Others',href:'translation-center--others'}],tab)}
   <div id="tcBody">${body()}</div>`},{nav:'menu-management'});
const tcRe=()=>App.render();
A('menu-tc-menu',el=>{tc.menu=el.value;tc.sec=0;tc.item=0;tcRe()});
A('menu-tc-q',el=>{tc.q=el.value;clearTimeout(tc._t);tc._t=setTimeout(()=>{tcRe();const i=$('#tcTree input[data-input]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)});
A('menu-tc-mode',el=>{tc.mode=el.value;tcRe()});
A('menu-tc-sec',el=>{tc.sec=+el.dataset.i;tc.item=0;tcRe()});
A('menu-tc-next',()=>{const m=menuById(tc.menu);const s=m.sections[tc.sec];if(s&&tc.item<s.items.length-1)tc.item++;else{tc.sec=(tc.sec+1)%m.sections.length;tc.item=0}tcRe()});
A('menu-tc-other',el=>{tc.other=+el.dataset.i;tcRe()});
A('menu-tc-othernext',el=>{tc.other=(tc.other+1)%(+el.dataset.n);tcRe()});
A('menu-tc-save',()=>App.toast('Translations saved'));
A('menu-tc-lang',el=>{tc.langs[+el.dataset.i].on=el.checked;tcRe()});
A('menu-tc-addlang',()=>App.modal({title:'Choose languages',body:`<div class="field"><label>Languages</label><div style="border:1px solid var(--border-input);border-radius:var(--r-md);padding:10px;max-height:280px;overflow:auto">${['Turkish','Arabic','French','German','Spanish','Italian','Portuguese','Polish','Romanian','Russian','Chinese (Simplified)','Japanese','Korean','Greek','Dutch','Urdu','Hindi'].filter(l=>!tc.langs.some(x=>x.name===l)).map(l=>`<div style="padding:4px 0">${UI.check(l,false,`data-al="${l}"`)}</div>`).join('')}</div><div class="help">Select languages...</div></div>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="menu-tc-addlang-ok">Save</button>`}));
A('menu-tc-addlang-ok',()=>{const add=$$('[data-al]').filter(c=>c.checked).map(c=>c.dataset.al);if(!add.length){App.toast('Select at least one language');return}add.forEach(n=>tc.langs.push({name:n,pct:0,on:true}));App.close();tcRe();App.toast(add.length+' language'+(add.length>1?'s':'')+' added')});

/* =================== IN-APP PROMOTIONS =================== */
let pf={status:'All',q:''};
function promoRows(){const list=S().promotions.filter(p=>p.name.toLowerCase().includes(pf.q.toLowerCase())&&(pf.status==='All'||(pf.status==='Active'?p.on:!p.on)));
  return `<div class="card">${UI.table({cols:[{label:'Display Order',w:'120px'},'Promotion Name','Description','Scheduling','Status',{label:'Actions',align:'right'}],
   rows:list.map(p=>({attrs:`draggable="true" data-pid="${p.id}"`,cells:[`<span style="display:flex;gap:8px;align-items:center"><span class="drag" style="cursor:grab">${ic('grip','sm')}</span>${S().promotions.indexOf(p)+1}</span>`,`<strong style="color:var(--ink)">${esc(p.name)}</strong>`,esc(p.desc),esc(p.sched||'Always'),UI.toggle(p.on,`data-change="menu-promo-toggle" data-id="${p.id}" aria-label="Status"`),`<button class="iconbtn" style="width:32px;height:32px;display:inline-grid" data-action="menu-promo-add" data-id="${p.id}" aria-label="Edit">${ic('edit','sm')}</button> <button class="iconbtn" style="width:32px;height:32px;display:inline-grid" data-action="menu-promo-del" data-id="${p.id}" aria-label="Delete">${ic('trash','sm')}</button>`]})),empty:'No promotions found'})}${UI.pagination()}</div>`}
App.route('in-app-promotions',()=>`
  ${UI.pageHead({title:'In-App Promotions',back:'engagement',learn:true,tutorial:true,actions:`<button class="btn primary" data-action="menu-promo-add">${ic('plus','sm')}Add a Promotion</button>`})}
  <div class="toolbar">${UI.select(['All','Active','Inactive'].map(v=>({value:v,label:'Status: '+v})),pf.status,'id="pfStatus" data-change="menu-promo-filter" style="width:170px" aria-label="Status"')}${UI.searchBox('Search promotions','id="pfQ" data-input="menu-promo-filter" value="'+esc(pf.q)+'"')}</div>
  <div id="promoBox">${promoRows()}</div>`,{nav:'engagement'});
App.after('in-app-promotions',()=>{const box=$('#promoBox');let drag=null;
  box.addEventListener('dragstart',e=>{const r=e.target.closest('[data-pid]');if(r){drag=r.dataset.pid;r.style.opacity=.5}});
  box.addEventListener('dragover',e=>e.preventDefault());
  box.addEventListener('drop',e=>{e.preventDefault();const r=e.target.closest('[data-pid]');if(!r||!drag||r.dataset.pid===drag)return;const ps=S().promotions,fi=ps.findIndex(p=>p.id===drag),ti=ps.findIndex(p=>p.id===r.dataset.pid);const [x]=ps.splice(fi,1);ps.splice(ti,0,x);drag=null;box.innerHTML=promoRows();App.toast('Display order updated')});
  box.addEventListener('dragend',()=>{$$('[data-pid]',box).forEach(r=>r.style.opacity='')});
});
A('menu-promo-filter',()=>{pf={status:$('#pfStatus').value,q:$('#pfQ').value};$('#promoBox').innerHTML=promoRows()});
A('menu-promo-toggle',el=>{const p=S().promotions.find(x=>x.id===el.dataset.id);p.on=el.checked;App.toast(p.name+(p.on?' is live':' paused'))});
A('menu-promo-del',el=>{const p=S().promotions.find(x=>x.id===el.dataset.id);App.modal({title:'Delete promotion?',body:`<p style="margin:0">“${esc(p.name)}” will be removed from your menus.</p>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="menu-promo-del-ok" data-id="${p.id}">Delete</button>`})});
A('menu-promo-del-ok',el=>{S().promotions=S().promotions.filter(p=>p.id!==el.dataset.id);App.state.promotions=S().promotions;App.close();App.render();App.toast('Promotion deleted')});
const secSearch=(opts)=>`<div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap"><span class="help" style="margin:0">Display Section</span>${UI.seg(opts.map(o=>({key:o,label:o})),opts[0])}<input class="input" list="pvPromoTargets" placeholder="Type to search" style="flex:1;min-width:180px" aria-label="Search target"></div>`;
A('menu-promo-add',el=>{const p=el.dataset.id?S().promotions.find(x=>x.id===el.dataset.id):null;const type=p&&p.type||'time';
  const targets=S().menus.flatMap(m=>[m.name,...m.sections.map(s=>s.name)]).slice(0,80);
  App.modal({title:p?'Edit Promotion':'Add a Promotion',wide:true,body:`<datalist id="pvPromoTargets">${[...new Set(targets)].map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
   ${UI.field({label:'Promotion Name',required:true,control:UI.input({id:'prName',value:p?p.name:'',placeholder:'New Year Promotion'})})}
   ${UI.field({label:'Description',control:UI.input({id:'prDesc',value:p?p.desc:'',placeholder:'10% Discount'})})}
   <div class="field"><label>Promotion Type</label><div class="radio-cards" id="prTypes">
    <label class="radio-card"><input type="radio" name="prType" value="time" ${type==='time'?'checked':''} data-change="menu-promo-type"><div style="flex:1"><strong>Time Based ${UI.pill('Tablet Menu Only','grey')}</strong><small>The promotion appears after a set amount of time.</small>
     <div data-ptype="time" style="margin-top:10px;display:flex;gap:8px;align-items:center"><span class="help" style="margin:0">Display After</span><div class="input-group" style="width:140px"><input value="120" inputmode="numeric" aria-label="Seconds"><span class="after">secs</span></div></div></div></label>
    <label class="radio-card"><input type="radio" name="prType" value="selection" ${type==='selection'?'checked':''} data-change="menu-promo-type"><div style="flex:1"><strong>Selection Based</strong><small>The promotion appears when a guest opens a chosen menu, section or item.</small><div data-ptype="selection">${secSearch(['Menu','Item'])}</div></div></label>
    <label class="radio-card"><input type="radio" name="prType" value="banner" ${type==='banner'?'checked':''} data-change="menu-promo-type"><div style="flex:1"><strong>Banner Based</strong><small>The promotion opens when a guest taps a banner. On the tablet menu, banners only show in Infinite Scroll mode; on the Dine-in QR and Delivery & Pick Up menus they show on the menu screen.</small>
     <div data-ptype="banner">${secSearch(['Menu','Section'])}<div style="margin-top:10px">${UI.upload({label:'Banner',hint:'.jpg .jpeg .png .webp .heic .mp4',accept:'.jpg,.jpeg,.png,.webp,.heic,.mp4'})}</div></div></div></label></div></div>
   <div class="field"><label>Promotion Close</label><div style="display:flex;flex-direction:column;gap:8px">${UI.radio('prClose','Keep the promotion open until the user closes.',true,'value="user"')}<div style="display:flex;gap:8px;align-items:center">${UI.radio('prClose','Close promotion after',false,'value="auto"')}<div class="input-group" style="width:110px;height:34px"><input value="10" aria-label="Seconds"><span class="after">secs</span></div></div></div></div>
   <div class="field"><label>Content Type</label>${UI.seg([{key:'img',label:'Image'},{key:'vid',label:'Video'},{key:'url',label:'URL'}],'img','prct')}
    <div data-segpanel="prct:img" style="margin-top:10px;max-width:260px">${UI.upload({label:'Upload',hint:'Only .jpg, .jpeg, .png, .webp and .heic files are supported. Recommended aspect ratio is 9:16 (portrait), under 10MB.',accept:'.jpg,.jpeg,.png,.webp,.heic'})}</div>
    <div data-segpanel="prct:vid" hidden style="margin-top:10px;max-width:260px">${UI.upload({label:'Upload',hint:'Only .mp4 files are supported. Portrait 9:16, under 50MB.',accept:'.mp4'})}</div>
    <div data-segpanel="prct:url" hidden style="margin-top:10px">${UI.input({placeholder:'https://',id:'prUrl'})}</div></div>
   <div data-ptype="selection">${UI.toggleRow('Add URL','Send guests to a link when they tap the image. Dine-in, Delivery / Pick Up only.',false,'aria-label="Add URL"')}</div>
   <div class="field" style="margin-top:12px"><label>Scheduling</label><div class="help" style="margin:0 0 10px">Choose when this promotion is shown. Outside its schedule guests won't see it at all.</div>${UI.availability('prSched',p&&p.schedKey||'always')}</div>`,
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn secondary" data-action="menu-promo-save" data-live="0" data-id="${p?p.id:''}">Save Draft</button><button class="btn primary" data-action="menu-promo-save" data-live="1" data-id="${p?p.id:''}">Go Live</button>`});
  promoType()});
function promoType(){const v=($('input[name=prType]:checked')||{}).value||'time';$$('[data-ptype]').forEach(b=>b.hidden=b.dataset.ptype!==v)}
A('menu-promo-type',promoType);
A('menu-promo-save',el=>{const n=$('#prName').value.trim();if(!n){App.toast('Promotion Name is required');return}
  const sk=($('input[name=prSched]:checked')||{}).value||'always';
  const d={name:n,desc:$('#prDesc').value.trim(),type:($('input[name=prType]:checked')||{}).value,schedKey:sk,sched:{always:'Always',dates:'Specific Dates & Times',periodic:'Periodic'}[sk],on:el.dataset.live==='1'};
  const p=S().promotions.find(x=>x.id===el.dataset.id);if(p)Object.assign(p,d);else S().promotions.push({id:'p'+uid(),...d});
  App.close();App.render();App.toast(d.on?'Promotion is live':'Promotion saved as draft')});
})();
