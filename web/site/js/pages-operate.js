/* Proview Menu – Operate (Orders, Reservations, Guests & Engagement) and Insights (Reports) */
(function(){
const {UI,$,$$,toast,modal,drawer,closeModal,closeDrawer}=App;
const S=App.state, ic=UI.ic, esc=UI.esc, gbp=UI.gbp;
S.orders=S.orders||[];S.archived=S.archived||[];S.promoCodes=S.promoCodes||[];S.forms=S.forms||[];S.tables=S.tables||[];
const A=(n,f)=>App.action(n,f);
const R=(k,f,o)=>App.route(k,f,o);
const pad=n=>String(n).padStart(2,'0');
const now=()=>{const d=new Date();return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const tblName=t=>typeof t==='string'?t:(t.name||t.label||t.title||'Table');
let full=false;
function refresh(){App.render();if(full){$('#app').classList.add('full');ensureExit()}}
function ensureExit(){if(!$('#opExitFull'))document.body.insertAdjacentHTML('beforeend',`<button id="opExitFull" class="btn secondary" style="position:fixed;top:14px;right:14px;z-index:60" data-action="op-exit-full">${ic('full','sm')}Exit Full Screen</button>`)}
window.addEventListener('hashchange',()=>{full=false;const b=$('#opExitFull');b&&b.remove()});
A('op-full',()=>{full=true;$('#app').classList.add('full');ensureExit();toast('Full screen on')});
A('op-exit-full',()=>{full=false;$('#app').classList.remove('full');const b=$('#opExitFull');b&&b.remove()});

/* ---------- generic filters / sort / paging ---------- */
const F={};          // key -> Set | null
const PAGE={};       // key -> page index
const SORT={};       // key -> {field,dir}
function filterTh(label,key,options){const on=F[key]&&F[key].size;return `${label}<span class="th-tools"><button type="button" class="iconbtn" style="width:22px;height:22px;border:0;background:none;${on?'color:var(--brand-700)':''}" data-action="op-filter" data-key="${key}" data-options="${esc(options.join('|'))}" aria-label="Filter ${esc(label)}">${ic('filter','sm')}</button></span>`}
function sortTh(label,key,field){const s=SORT[key];return `${label}<span class="th-tools"><button type="button" class="iconbtn" style="width:22px;height:22px;border:0;background:none;${s&&s.field===field?'color:var(--brand-700)':''}" data-action="op-sort" data-key="${key}" data-field="${field}" aria-label="Sort by ${esc(label)}">${ic('sort','sm')}</button></span>`}
function applyF(list,key,get){const f=F[key];if(!f||!f.size)return list;return list.filter(x=>{const v=get(x);return Array.isArray(v)?v.some(y=>f.has(y)):f.has(String(v))})}
function applySort(list,key){const s=SORT[key];if(!s)return list;return [...list].sort((a,b)=>{const x=a[s.field],y=b[s.field];return (x>y?1:x<y?-1:0)*s.dir})}
A('op-filter',(el,e)=>{e.stopPropagation();$$('.pop').forEach(p=>p.remove());const key=el.dataset.key,opts=el.dataset.options?el.dataset.options.split('|'):[],cur=F[key];
  const pop=document.createElement('div');pop.className='pop';pop.dataset.key=key;
  pop.innerHTML=`<div style="max-height:260px;overflow:auto">${opts.map(o=>`<div style="padding:4px 0"><label class="check"><input type="checkbox" data-val="${esc(o)}" ${!cur||!cur.size||cur.has(o)?'':''}${cur&&cur.has(o)?'checked':''}>${esc(o)}</label></div>`).join('')||'<p class="muted">No options</p>'}</div>
   <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn secondary sm" data-action="op-filter-reset" data-key="${key}">Reset</button><button class="btn primary sm" data-action="op-filter-ok" data-key="${key}">OK</button></div>`;
  const r=el.getBoundingClientRect();pop.style.top=(r.bottom+scrollY+6)+'px';pop.style.left=Math.min(r.left+scrollX,innerWidth-260)+'px';document.body.appendChild(pop)});
A('op-filter-ok',el=>{const pop=el.closest('.pop'),key=el.dataset.key;const vals=$$('input[data-val]:checked',pop).map(i=>i.dataset.val);F[key]=vals.length?new Set(vals):null;PAGE[key.split('-')[0]]=0;pop.remove();refresh();toast(vals.length?'Filter applied':'Filter cleared')});
A('op-filter-reset',el=>{F[el.dataset.key]=null;el.closest('.pop').remove();refresh();toast('Filter reset')});
A('op-sort',el=>{const k=el.dataset.key,f=el.dataset.field,s=SORT[k];SORT[k]=s&&s.field===f?{field:f,dir:-s.dir}:{field:f,dir:1};refresh()});
function paged(list,key,size=10){const pages=Math.max(1,Math.ceil(list.length/size));let p=Math.min(PAGE[key]||0,pages-1);PAGE[key]=p;return {rows:list.slice(p*size,p*size+size),pager:`<div class="pagination"><small class="muted" style="margin-right:auto">${list.length} total</small><button class="iconbtn" style="width:32px;height:32px" data-action="op-page" data-key="${key}" data-p="${p-1}" ${p===0?'disabled':''} aria-label="Previous page">${ic('left','sm')}</button>${Array.from({length:pages},(_,i)=>i).filter(i=>Math.abs(i-p)<3||i===0||i===pages-1).map(i=>`<button class="btn ${i===p?'primary':'secondary'} sm" style="min-width:32px;padding:0 8px" data-action="op-page" data-key="${key}" data-p="${i}">${i+1}</button>`).join('')}<button class="iconbtn" style="width:32px;height:32px" data-action="op-page" data-key="${key}" data-p="${p+1}" ${p>=pages-1?'disabled':''} aria-label="Next page">${ic('chev','sm')}</button><select class="input" style="width:110px;height:32px" aria-label="Rows per page"><option>10 / page</option></select></div>`}}
A('op-page',el=>{if(el.disabled)return;PAGE[el.dataset.key]=+el.dataset.p;if(el.dataset.key==='cust'){$('#custTable').innerHTML=custTable();return}refresh()});
function confirmDlg(title,text,action,data='',label='Delete'){modal({title,body:`<p style="margin:0">${text}</p>`,footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn danger" data-action="${action}" ${data}>${label}</button>`})}
const statusKind=s=>({'Waiting':'warn','In Progress':'','Ready':'ok','Ready for Pickup':'ok','Closed':'grey','Cancelled':'bad','Refunded':'grey','Live':'ok','Draft':'grey','Rejected':'bad','Active':'ok','Inactive':'grey'}[s]??'');
const sp=s=>UI.pill(esc(s),statusKind(s));
const TABS={live:['Waiting','In Progress'],ready:['Ready','Ready for Pickup'],closed:['Closed','Cancelled','Refunded']};
const ALL_STATUS=['Waiting','In Progress','Ready','Ready for Pickup','Cancelled','Closed','Refunded'];

/* ================= ORDERS ================= */
R('orders',()=>`${UI.pageHead({title:'Orders',sub:'Manage your restaurant orders and settings'})}
  <div class="section-label">Quick Actions</div>
  ${UI.hubCards([{icon:'plus',title:'Create Order',text:'Create a new dine-in, delivery or pick-up order directly',action:'create-order'},{icon:'list',title:'All Orders',text:'View and manage all your orders',href:'orders-all--live'},{icon:'gear',title:'Ordering Settings',text:'Configure your order settings',href:'orders-settings--dinein'},{icon:'trash',title:'Archived Orders',text:'View and restore deleted orders',href:'orders-archived'}])}`);

/* ---- Create Order drawer ---- */
let D=null;
function newDraft(){return {type:'Dine-In',table:'',guests:2,name:'',menuId:'',section:'',items:[],notes:'',cname:'',cphone:'',caddr:''}}
A('create-order',()=>{D=newDraft();drawer({title:'Create Order',width:560,body:`<div id="coBody">${coBody()}</div>`,
  footer:`<strong style="margin-right:auto;color:var(--ink);font-size:16px">Total: <span id="coTotal">${gbp(0)}</span></strong><button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="op-co-create">Create Order</button>`})});
function coBody(){const menu=S.menus.find(m=>m.id===D.menuId);
  const tables=S.tables||[];
  const typeFields=D.type==='Dine-In'?UI.field({label:'Table',required:true,control:tables.length?UI.select([{value:'',label:'Select table'},...tables.map(t=>({value:tblName(t),label:tblName(t)}))],D.table,'data-change="op-co-f" data-f="table" id="coTable"'):`<select class="input" disabled><option>Select table</option></select><div class="help">No tables yet – <a href="#settings-operations--tables" data-close>add tables in Settings</a>.</div>`})
    :D.type==='Delivery'?`<div class="grid g2" style="gap:12px">${UI.field({label:'Customer Name',required:true,control:UI.input({value:D.cname,placeholder:'Customer name',attrs:'data-input="op-co-f" data-f="cname" id="coCname"'})})}${UI.field({label:'Phone',required:true,control:UI.input({value:D.cphone,placeholder:'07700 900000',attrs:'data-input="op-co-f" data-f="cphone" id="coCphone"'})})}</div>${UI.field({label:'Address',required:true,control:UI.textarea({value:D.caddr,placeholder:'Delivery address',rows:2,attrs:'data-input="op-co-f" data-f="caddr" id="coCaddr"'})})}`
    :`<div class="grid g2" style="gap:12px">${UI.field({label:'Customer Name',required:true,control:UI.input({value:D.cname,placeholder:'Customer name',attrs:'data-input="op-co-f" data-f="cname" id="coCname"'})})}${UI.field({label:'Phone',control:UI.input({value:D.cphone,placeholder:'07700 900000',attrs:'data-input="op-co-f" data-f="cphone" id="coCphone"'})})}</div>`;
  return `${UI.field({label:'Order Type',required:true,control:UI.select(['Dine-In','Delivery','Pick-Up'],D.type,'data-change="op-co-type" id="coType"')})}
   ${typeFields}
   <div class="grid g2" style="gap:12px">${UI.field({label:'Guest Count',control:UI.input({type:'number',value:D.guests,attrs:'min="1" data-input="op-co-f" data-f="guests" id="coGuests"'})})}${UI.field({label:'Order Name',control:UI.input({value:D.name,placeholder:'Enter order name (optional)',attrs:'data-input="op-co-f" data-f="name" id="coName"'})})}</div>
   <div style="display:flex;align-items:center;gap:10px;margin:8px 0 14px"><hr style="flex:1;border:0;border-top:1px solid var(--border)"><span class="eyebrow">Order Items</span><hr style="flex:1;border:0;border-top:1px solid var(--border)"></div>
   ${UI.field({label:'Menu',control:UI.select([{value:'',label:'Select a menu to browse items'},...S.menus.map(m=>({value:m.id,label:m.name}))],D.menuId,'data-change="op-co-menu" id="coMenu"')})}
   ${menu?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${menu.sections.map(s=>`<button type="button" class="chip-btn ${D.section===s.id?'on':''}" data-action="op-co-sec" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>
     <div id="coItems" style="max-height:260px;overflow:auto;border:1px solid var(--border);border-radius:var(--r-md)">${coItems(menu)}</div>`:''}
   <div id="coSel">${coSel()}</div>
   ${UI.field({label:'Notes',control:UI.textarea({value:D.notes,placeholder:'Enter order notes (optional)',rows:2,attrs:'data-input="op-co-f" data-f="notes" id="coNotes"'})})}`}
function coItems(menu){const secs=D.section?menu.sections.filter(s=>s.id===D.section):menu.sections;
  const rows=secs.flatMap(s=>s.items.filter(i=>i.on!==false).map(i=>{const q=(D.items.find(x=>x.id===i.id)||{}).qty;return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border)"><div style="flex:1"><strong style="color:var(--ink)">${esc(i.name)}</strong><div class="help" style="margin:0">${gbp(i.price)}</div></div>${q?`<span class="pill">+ ${q}</span>`:''}<button type="button" class="iconbtn" style="width:32px;height:32px" data-action="op-co-add" data-id="${i.id}" aria-label="Add ${esc(i.name)}">${ic('plus','sm')}</button></div>`}));
  return rows.join('')||'<p class="muted" style="padding:12px">No items in this section.</p>'}
function coSel(){if(!D.items.length)return '';return `<div style="margin:14px 0"><strong style="color:var(--ink)">Selected Items (${D.items.reduce((a,b)=>a+b.qty,0)})</strong>${D.items.map(i=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><button type="button" class="iconbtn" style="width:28px;height:28px" data-action="op-co-qty" data-id="${i.id}" data-d="-1" aria-label="Decrease">${ic('minus','sm')}</button><strong style="min-width:18px;text-align:center">${i.qty}</strong><button type="button" class="iconbtn" style="width:28px;height:28px" data-action="op-co-qty" data-id="${i.id}" data-d="1" aria-label="Increase">${ic('plus','sm')}</button><span style="flex:1">${esc(i.name)} - ${gbp(i.price*i.qty)}</span><button type="button" class="iconbtn" style="width:28px;height:28px;border:0;color:var(--bad)" data-action="op-co-del" data-id="${i.id}" aria-label="Remove">${ic('trash','sm')}</button></div>`).join('')}<div style="text-align:right;margin-top:8px;font-weight:700;color:var(--ink)">Total: ${gbp(coTotal())}</div></div>`}
const coTotal=()=>D.items.reduce((a,i)=>a+i.price*i.qty,0);
function coUpdate(){const m=S.menus.find(x=>x.id===D.menuId);if(m&&$('#coItems'))$('#coItems').innerHTML=coItems(m);$('#coSel').innerHTML=coSel();$('#coTotal').textContent=gbp(coTotal())}
function coRedraw(){$('#coBody').innerHTML=coBody();$('#coTotal').textContent=gbp(coTotal())}
A('op-co-f',el=>{D[el.dataset.f]=el.value});
A('op-co-type',el=>{D.type=el.value;coRedraw()});
A('op-co-menu',el=>{D.menuId=el.value;D.section='';coRedraw()});
A('op-co-sec',el=>{D.section=D.section===el.dataset.id?'':el.dataset.id;coRedraw()});
A('op-co-add',el=>{const m=S.menus.find(x=>x.id===D.menuId);let it;m.sections.forEach(s=>s.items.forEach(i=>{if(i.id===el.dataset.id)it=i}));const ex=D.items.find(x=>x.id===it.id);if(ex)ex.qty++;else D.items.push({id:it.id,name:it.name,price:it.price,qty:1});coUpdate()});
A('op-co-qty',el=>{const i=D.items.find(x=>x.id===el.dataset.id);i.qty+=+el.dataset.d;if(i.qty<1)D.items=D.items.filter(x=>x!==i);coUpdate()});
A('op-co-del',el=>{D.items=D.items.filter(x=>x.id!==el.dataset.id);coUpdate()});
let seq=1000;
A('op-co-create',()=>{
  if(D.type==='Dine-In'&&!D.table)return toast(S.tables.length?'Select a table':'Add a table first, or choose Pick-Up or Delivery');
  if(D.type!=='Dine-In'&&!D.cname.trim())return toast('Enter the customer name');
  if(D.type==='Delivery'&&(!D.cphone.trim()||!D.caddr.trim()))return toast('Enter phone and address for delivery');
  if(!D.items.length)return toast('Add at least one item');
  seq=Math.max(seq,...S.orders.concat(S.archived||[]).map(o=>+String(o.id).replace(/\D/g,'')||0))+1;const t=now(),daily=S.orders.filter(o=>o.sent&&o.sent.startsWith(t.slice(0,10))).length+1;
  const o={id:'#'+seq,dailyNo:daily,status:'Waiting',type:D.type,source:'Dashboard',customer:D.type==='Dine-In'?(D.name||'—'):D.cname,phone:D.cphone,address:D.caddr,table:D.type==='Dine-In'?D.table:'—',guests:+D.guests||1,name:D.name,waiter:'—',items:D.items.map(i=>({name:i.name,price:i.price,qty:i.qty})),total:coTotal(),notes:D.notes,updated:t,sent:t,timeline:[{t,text:'Order created from Dashboard'}]};
  S.orders.unshift(o);closeDrawer();toast(`Order ${o.id} created`);if(App.current()==='orders-all--live')refresh();else App.go('orders-all--live')});

/* ---- All Orders ---- */
let oView='list',oSearch='',oAllDay=true,oItemList=false,oCompact=false,oZoom=100,fpZoom=100;
const COLS=[['id','ID',true],['daily','Daily No',true],['status','Status',true],['type','Type',true],['source','Source',true],['customer','Customer',false],['table','Table',true],['updated','Updated Time',true],['sent','Sent Time',false],['total','Totals',true]];
const colOn={};COLS.forEach(c=>colOn[c[0]]=c[2]);
function ordersFor(tab){let l=S.orders.filter(o=>TABS[tab].includes(o.status));
  if(oSearch){const q=oSearch.toLowerCase();l=l.filter(o=>[o.id,o.customer,o.table,o.name,o.type].join(' ').toLowerCase().includes(q))}
  l=applyF(l,'ord-status',o=>o.status);l=applyF(l,'ord-type',o=>o.type);l=applyF(l,'ord-source',o=>o.source);l=applyF(l,'ord-table',o=>o.table);
  return applySort(l,'ord')}
R('orders-all',tab=>{tab=TABS[tab]?tab:'live';const cnt=k=>S.orders.filter(o=>TABS[k].includes(o.status)).length;
  return `${UI.pageHead({title:'All Orders',back:'orders',learn:true,actions:`<button class="btn primary" data-action="create-order">${ic('plus','sm')}Create Order</button>`})}
  <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">${UI.tabs([{key:'live',label:'Live',badge:cnt('live'),href:'orders-all--live'},{key:'ready',label:'Ready',badge:cnt('ready'),href:'orders-all--ready'},{key:'closed',label:'Closed',href:'orders-all--closed'}],tab).replace('class="tabs"','class="tabs" style="flex:1"')}
   <div class="seg" style="margin-bottom:20px">${[['list','list','List view'],['cards','grid','Cards view'],['floor','map','Floor plan']].map(([k,i,l])=>`<button type="button" class="${oView===k?'on':''}" data-action="op-oview" data-v="${k}" title="${l}" aria-label="${l}">${ic(i,'sm')}</button>`).join('')}</div></div>
  ${oView==='list'?ordList(tab):oView==='cards'?ordCards(tab):ordFloor()}`},{nav:'orders'});
function ordToolbar(extra){return `<div class="toolbar">${UI.searchBox('Search','data-input="op-osearch" id="oSearch"').replace('<input','<input value="'+esc(oSearch)+'"')}${UI.dateRange('08/11/2026','08/11/2026')}${extra}<span class="grow"></span>
  <button class="iconbtn" data-action="op-reload" aria-label="Reload" title="Reload">${ic('refresh','sm')}</button><button class="btn primary" data-action="export">${ic('export','sm')}Export</button><button class="iconbtn" data-action="op-full" aria-label="Full Screen" title="Full Screen">${ic('full','sm')}</button></div>`}
function editDisplay(){return `<div class="dd"><button type="button" class="btn secondary" data-dd>Edit Display ${ic('chevd','sm')}</button><div class="dd-menu" style="padding:12px;min-width:220px"><div class="eyebrow" style="margin-bottom:8px">Displayed Items on table</div>${COLS.map(([k,l])=>`<div style="padding:4px 0">${UI.check(l,colOn[k],`data-change="op-col" data-col="${k}" ${k==='id'?'disabled':''}`)}</div>`).join('')}</div></div>`}
function ordList(tab){const list=ordersFor(tab);
  const cols=[['id',sortTh('ID','ord','id')],['daily',sortTh('Daily No','ord','dailyNo')],['status',filterTh('Status','ord-status',ALL_STATUS)],['type',filterTh('Type','ord-type',['Dine-In','Delivery','Pick-Up'])],['source',filterTh('Source','ord-source',['Dashboard','QR Menu','Tablet','Delivery Menu','Pick-Up Menu'])],['customer','Customer'],['table',filterTh('Table','ord-table',S.tables.map(tblName))],['updated',sortTh('Update Time','ord','updated')],['sent','Sent Time'],['total','Total']].filter(c=>colOn[c[0]]);
  const val=(o,k)=>({id:`<strong style="color:var(--ink)">${o.id}</strong>`,daily:o.dailyNo,status:sp(o.status),type:o.type,source:o.source,customer:esc(o.customer),table:esc(o.table),updated:o.updated,sent:o.sent,total:`<strong style="color:var(--ink)">${gbp(o.total)}</strong>`}[k]);
  return `${ordToolbar(editDisplay())}<div class="card">${UI.table({check:true,cols:cols.map(c=>({label:c[1],align:c[0]==='total'?'right':''})),rows:list.map(o=>({attrs:`data-action="op-order" data-id="${o.id}" style="cursor:pointer"`,cells:cols.map(c=>val(o,c[0]))})),empty:'No data'})}</div>`}
function ordCards(tab){const list=ordersFor(tab);
  return `${ordToolbar(`${UI.dd(`${ic('filter','sm')}Filter`,ALL_STATUS.map(s=>({label:s,action:'op-cfilter',data:`data-s="${s}"`})).concat([{divider:1},{label:'Show all',action:'op-cfilter',data:'data-s=""'}]))}
    <button class="btn ${oAllDay?'primary':'secondary'}" data-action="op-tg" data-k="allday">All Day</button><button class="btn ${oItemList?'primary':'secondary'}" data-action="op-tg" data-k="items">Item List</button><button class="btn ${oCompact?'primary':'secondary'}" data-action="op-tg" data-k="compact">Compact</button>
    <div class="seg"><button type="button" data-action="op-zoom" data-d="-10" aria-label="Zoom out">${ic('minus','sm')}</button><button type="button" disabled style="color:var(--ink)">${oZoom}%</button><button type="button" data-action="op-zoom" data-d="10" aria-label="Zoom in">${ic('plus','sm')}</button></div>`)}
   ${list.length?`<div style="zoom:${oZoom/100};display:grid;grid-template-columns:repeat(auto-fill,minmax(${oCompact?220:270}px,1fr));gap:${oCompact?10:16}px">${list.map(o=>`<div class="card" style="padding:${oCompact?10:16}px"><div style="display:flex;align-items:center;gap:8px"><strong style="color:var(--ink)">${o.id}</strong>${sp(o.status)}<small class="muted" style="margin-left:auto">${o.updated.slice(11)}</small></div>
     <div style="margin:6px 0;color:var(--ink);font-weight:600">${esc(o.type==='Dine-In'?o.table:o.customer)} <small class="muted">· ${o.type} · #${o.dailyNo}</small></div>
     ${oItemList?`<ul style="margin:6px 0;padding-left:18px">${o.items.map(i=>`<li>${i.qty} × ${esc(i.name)}</li>`).join('')}</ul>`:`<small class="muted">${o.items.reduce((a,b)=>a+b.qty,0)} items</small>`}
     <div style="display:flex;align-items:center;gap:6px;margin-top:10px"><strong style="color:var(--ink)">${gbp(o.total)}</strong><span style="flex:1"></span>${nextBtn(o,'sm')}<button class="btn secondary sm" data-action="op-order" data-id="${o.id}">Details</button></div></div>`).join('')}</div>`:`<div class="card">${UI.empty('orders','No data found.')}</div>`}`}
function nextBtn(o,sz=''){const n={'Waiting':['Accept','In Progress'],'In Progress':['Mark Ready','Ready'],'Ready':['Close','Closed'],'Ready for Pickup':['Close','Closed']}[o.status];return n?`<button class="btn primary ${sz}" data-action="op-ostatus" data-id="${o.id}" data-s="${n[1]}">${n[0]}</button>`:''}
function ordFloor(){const t=S.tables||[];const live=new Set(S.orders.filter(o=>TABS.live.includes(o.status)||TABS.ready.includes(o.status)).map(o=>o.table));
  return `<div class="toolbar"><span class="grow"></span><div class="seg"><button type="button" data-action="op-fzoom" data-d="-10" aria-label="Zoom out">${ic('minus','sm')}</button><button type="button" disabled style="color:var(--ink)">${fpZoom}%</button><button type="button" data-action="op-fzoom" data-d="10" aria-label="Zoom in">${ic('plus','sm')}</button><button type="button" data-action="op-fzoom" data-d="0" title="Fit">${ic('expand','sm')}</button></div></div>
  <div class="canvas" style="padding:24px">${t.length?`<div style="zoom:${fpZoom/100};display:grid;grid-template-columns:repeat(auto-fill,110px);gap:24px">${t.map(x=>{const n=tblName(x),busy=live.has(n);return `<div style="height:90px;border-radius:14px;display:grid;place-items:center;text-align:center;font-weight:700;border:2px solid ${busy?'var(--brand-700)':'var(--border-input)'};background:${busy?'var(--brand-tint)':'#fff'};color:${busy?'var(--brand-900)':'var(--ink-2)'}">${esc(n)}<small style="font-weight:500">${busy?'Has orders':'Free'}</small></div>`}).join('')}</div>`:`<div style="display:grid;place-items:center;min-height:360px;text-align:center" class="muted">${ic('map')}<div style="margin-top:8px">No tables on your floor plan yet.</div><a href="#settings-operations--tables" style="margin-top:6px">Add tables in Settings</a></div>`}</div>`}
A('op-oview',el=>{oView=el.dataset.v;refresh()});
A('op-osearch',el=>{oSearch=el.value;const pos=el.selectionStart;refresh();const i=$('#oSearch');if(i){i.focus();i.setSelectionRange(pos,pos)}});
A('op-reload',()=>{refresh();toast('Orders refreshed')});
A('op-col',el=>{colOn[el.dataset.col]=el.checked;refresh();const d=$('.dd [data-dd]');});
A('op-tg',el=>{const k=el.dataset.k;if(k==='allday')oAllDay=!oAllDay;if(k==='items')oItemList=!oItemList;if(k==='compact')oCompact=!oCompact;refresh()});
A('op-zoom',el=>{oZoom=Math.max(50,Math.min(150,oZoom+ +el.dataset.d));refresh()});
A('op-fzoom',el=>{const d=+el.dataset.d;fpZoom=d===0?100:Math.max(50,Math.min(150,fpZoom+d));refresh()});
A('op-cfilter',el=>{F['ord-status']=el.dataset.s?new Set([el.dataset.s]):null;refresh()});
function findOrder(id){return S.orders.find(o=>o.id===id)}
function setStatus(o,s){o.status=s;o.updated=now();o.timeline.push({t:o.updated,text:'Status changed to '+s})}
A('op-ostatus',(el,e)=>{e.stopPropagation();const o=findOrder(el.dataset.id);setStatus(o,el.dataset.s);toast(`${o.id} is now ${el.dataset.s}`);if($('#drawer').classList.contains('show')&&$('#drawer').dataset.id==='order')openOrder(o.id);refresh()});
A('op-order',(el,e)=>{if(e.target.closest('input')||e.target.closest('button')&&e.target.closest('button')!==el)return;openOrder(el.dataset.id)});
function openOrder(id){const o=findOrder(id);if(!o)return;const acts=[];
  if(o.status==='Waiting')acts.push(['Accept','In Progress','primary']);
  if(o.status==='In Progress')acts.push(['Mark Ready',o.type==='Pick-Up'?'Ready for Pickup':'Ready','primary']);
  if(['Ready','Ready for Pickup','In Progress'].includes(o.status))acts.push(['Close','Closed','secondary']);
  if(!['Closed','Cancelled','Refunded'].includes(o.status))acts.push(['Cancel','Cancelled','danger']);
  if(o.status==='Closed')acts.push(['Refund','Refunded','secondary']);
  drawer({id:'order',title:`Order ${o.id} ${sp(o.status)}`,width:520,body:`
   <div class="grid g2" style="gap:12px;margin-bottom:16px">${[['Type',o.type],['Daily No',o.dailyNo],[o.type==='Dine-In'?'Table':'Customer',esc(o.type==='Dine-In'?o.table:o.customer)],['Guests',o.guests],['Source',o.source],['Waiter',o.waiter]].map(([k,v])=>`<div class="card" style="padding:10px 12px"><small class="muted">${k}</small><div style="color:var(--ink);font-weight:600">${v}</div></div>`).join('')}</div>
   ${o.phone?`<div class="stat-row"><span>Phone</span><strong>${esc(o.phone)}</strong></div>`:''}${o.address?`<div class="stat-row"><span>Address</span><strong>${esc(o.address)}</strong></div>`:''}
   <h3 style="margin:12px 0 6px">Items</h3>${o.items.map(i=>`<div class="stat-row"><span>${i.qty} × ${esc(i.name)}</span><strong style="color:var(--ink)">${gbp(i.qty*i.price)}</strong></div>`).join('')}
   <div class="stat-row"><span>Subtotal</span><span>${gbp(o.total)}</span></div><div class="stat-row"><strong style="color:var(--ink)">Total</strong><strong style="color:var(--ink)">${gbp(o.total)}</strong></div>
   ${o.notes?`<h3 style="margin:12px 0 6px">Notes</h3><p style="margin:0">${esc(o.notes)}</p>`:''}
   <h3 style="margin:16px 0 6px">Timeline</h3>${o.timeline.map(t=>`<div style="display:flex;gap:10px;padding:6px 0"><span style="width:8px;height:8px;border-radius:50%;background:var(--brand-700);margin-top:6px;flex:none"></span><div><div style="color:var(--ink)">${esc(t.text)}</div><small class="muted">${t.t}</small></div></div>`).join('')}`,
   footer:`<button class="btn danger" data-action="op-odelete" data-id="${o.id}" style="margin-right:auto">${ic('trash','sm')}Delete</button><button class="btn secondary" data-action="op-print">Print</button>${acts.map(([l,s,k])=>`<button class="btn ${k}" data-action="op-ostatus" data-id="${o.id}" data-s="${s}">${l}</button>`).join('')}`})}
A('op-print',()=>toast('Sent to printer'));
A('op-odelete',el=>confirmDlg('Delete order?','The order moves to Archived Orders, where you can restore it.','op-odelete-yes',`data-id="${el.dataset.id}"`));
A('op-odelete-yes',el=>{const o=findOrder(el.dataset.id);S.orders=S.orders.filter(x=>x!==o);S.archived.unshift({...o,deletedBy:'Ömer A.',deletedAt:now()});App.close();refresh();toast(`${o.id} moved to Archived Orders`)});

/* ---- Archived ---- */
R('orders-archived',()=>`${UI.pageHead({title:'Archived Orders',back:'orders',learn:true,actions:`<button class="btn primary" id="opBulkRestore" data-action="op-restore-sel" disabled>${ic('refresh','sm')}Restore selected</button>`})}
  <div class="card" id="opArch">${UI.table({check:true,cols:['Order ID','Table','Total','Deleted By','Deleted At','Status',{label:'',align:'right'}],rows:S.archived.map(o=>({attrs:`data-id="${o.id}"`,cells:[`<strong style="color:var(--ink)">${o.id}</strong>`,esc(o.table),gbp(o.total),esc(o.deletedBy),o.deletedAt,sp(o.status),`<button class="btn ghost sm" data-action="op-restore" data-id="${o.id}">${ic('refresh','sm')}Restore</button>`]})),empty:'No data'})}</div>`,{nav:'orders'});
document.addEventListener('change',e=>{const box=e.target.closest('#opArch');if(box){const b=$('#opBulkRestore');if(b)b.disabled=!$$('[data-rowcheck]:checked',box).length}});
function restore(ids){ids.forEach(id=>{const o=S.archived.find(x=>x.id===id);if(o){S.archived=S.archived.filter(x=>x!==o);const {deletedBy,deletedAt,...r}=o;r.timeline=(r.timeline||[]).concat({t:now(),text:'Restored from archive'});S.orders.unshift(r)}})}
A('op-restore',el=>{restore([el.dataset.id]);refresh();toast('Order restored')});
A('op-restore-sel',()=>{const ids=$$('#opArch [data-rowcheck]:checked').map(c=>c.closest('tr').dataset.id);if(!ids.length)return;restore(ids);refresh();toast(ids.length+' order(s) restored')});

/* ---- Ordering Settings ---- */
const OS={formRows:[['Name',true,true],['Email Address',true,true],['Phone Number',true,true]]};
function cond(id,on,html){return `<div id="${id}" ${on?'':'hidden'} style="padding:0 0 8px 0">${html}</div>`}
const payTypes=(p)=>`<div style="display:grid;gap:8px;margin-top:8px">${['Credit/Debit Card through POS','Cash','Online Payment - Apple Pay, Google Pay, Credit/Debit Card'].map((t,i)=>UI.check(t,i<2,`name="${p}pt"`)).join('')}</div>`;
function tipBlock(p){return UI.toggleRow('Accept tip','Let guests add a tip at checkout.',true,`data-change="op-cond" data-target="${p}Tip"`)+cond(p+'Tip',true,`<div class="help" style="margin-bottom:6px">Define tip rates to show at checkout</div><div style="display:flex;gap:10px;max-width:420px">${[10,12.5,15].map(v=>UI.input({value:v,suffix:'%',attrs:'type="number" step="0.5" aria-label="Tip rate"'})).join('')}</div>`)}
function ageCancel(){return UI.toggleRow('Age Verification','Ask guests to confirm their age when they order alcoholic items.',false)+UI.toggleRow('Display Cancel Order Button','Guests can cancel an order themselves until you accept it.',true)}
function formOptions(p){return `<div class="form-row" style="display:block"><div class="txt"><strong>Customer Form Option</strong><small>Name, Email Address and Phone Number are asked by default. Add more questions if you need them.</small></div>
  <div id="${p}FormRows" style="margin-top:10px">${formRowsHTML(p)}</div>
  <div style="display:flex;gap:10px;margin-top:8px"><button type="button" class="btn secondary sm" data-action="op-form-add" data-p="${p}">${ic('plus','sm')}Add Item</button><a class="btn ghost sm" href="#translation-center--others">${ic('translate','sm')}Translate Form Items</a></div></div>`}
function formRowsHTML(p){return OS.formRows.map((r,i)=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${r[2]?`<input class="input" value="${esc(r[0])}" disabled style="flex:1">`:`<input class="input" value="${esc(r[0])}" placeholder="Question, e.g. Company name" style="flex:1" data-input="op-form-name" data-i="${i}">`}<label class="check" style="white-space:nowrap">Required ${UI.toggle(r[1],`data-change="op-form-req" data-i="${i}" aria-label="Required"`)}</label>${r[2]?'<span style="width:32px"></span>':`<button type="button" class="iconbtn" style="width:32px;height:32px;border:0;color:var(--bad)" data-action="op-form-del" data-i="${i}" data-p="${p}" aria-label="Remove">${ic('trash','sm')}</button>`}</div>`).join('')}
A('op-form-add',el=>{OS.formRows.push(['',false,false]);$$('[id$="FormRows"]').forEach(b=>b.innerHTML=formRowsHTML(b.id.replace('FormRows','')))});
A('op-form-del',el=>{OS.formRows.splice(+el.dataset.i,1);$$('[id$="FormRows"]').forEach(b=>b.innerHTML=formRowsHTML(b.id.replace('FormRows','')))});
A('op-form-name',el=>{OS.formRows[+el.dataset.i][0]=el.value});
A('op-form-req',el=>{OS.formRows[+el.dataset.i][1]=el.checked});
A('op-cond',el=>{const t=document.getElementById(el.dataset.target);if(t)t.hidden=!el.checked});
A('op-save',()=>toast('Settings saved'));
function deliveryForm(p,isPick){return `<div class="form-card" style="max-width:none">
  ${UI.toggleRow('Enable Ordering',isPick?'Let guests order ahead and collect.':'Let guests order for delivery.',true,`data-change="op-cond" data-target="${p}Body"`)}
  ${cond(p+'Body',true,`
   <div class="form-row" style="display:block"><div class="txt"><strong>Email addresses to send the orders</strong><small>Every new order is also sent to these addresses.</small></div><div style="margin-top:8px">${tagInput(p+'Em',['orders@alicis.co.uk'],'Enter email addresses')}</div></div>
   <div class="card pad" style="background:var(--brand-tint-subtle);margin:12px 0;display:flex;gap:10px">${ic('info','sm')}<span>To accept online payments, connect a payment provider in <a href="#marketplace">Marketplace</a>.</span></div>
   <div class="form-row" style="display:block"><div class="txt"><strong>Payment Types</strong></div>${payTypes(p)}</div>
   ${tipBlock(p)}
   <div class="grid g2" style="gap:16px;padding:16px 0">${UI.field({label:'Minimum Order Amount',control:UI.input({value:'0.00',prefix:'£'})})}${isPick?'':UI.field({label:'Delivery Fee',control:UI.input({value:'2.50',prefix:'£'})})}${isPick?UI.field({label:'Preparation Time',help:'Shown to guests as the estimated collection time.',control:UI.input({value:'20',suffix:'min'})}):UI.field({label:'Delivery Time',help:'Shown to guests as the estimated delivery time.',control:UI.input({value:'45',suffix:'min'})})}</div>
   ${UI.field({label:'Restaurant Note',control:UI.textarea({placeholder:'e.g. Allergens: please tell us before ordering',rows:2})})}
   ${UI.toggleRow('Enable Pre-Order',`Guests can order for the next few days, within your ${isPick?'pick-up':'delivery'} operating hours.`,false,`data-change="op-cond" data-target="${p}Pre"`)}
   ${cond(p+'Pre',false,UI.field({label:'Days in advance',control:UI.select(['1 day','2 days','3 days','5 days','7 days'],'3 days')}))}
   ${formOptions(p)}
   ${ageCancel()}`)}
  <div style="margin-top:16px"><button class="btn primary" data-action="op-save">Save</button></div></div>`}
function tagInput(id,vals,ph){return `<div class="input" style="height:auto;min-height:40px;display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;align-items:center" id="${id}">${vals.map(v=>`<span class="chip">${esc(v)}<button type="button" style="border:0;background:none;cursor:pointer;padding:0" data-action="op-tag-rm" aria-label="Remove">${ic('x','sm')}</button></span>`).join('')}<input placeholder="${esc(ph)}" style="border:0;outline:0;flex:1;min-width:160px" data-tagin></div><div class="help">Press Enter to add.</div>`}
A('op-tag-rm',el=>el.closest('.chip').remove());
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-tagin]')){e.preventDefault();const v=e.target.value.trim();if(!v)return;e.target.insertAdjacentHTML('beforebegin',`<span class="chip">${esc(v)}<button type="button" style="border:0;background:none;cursor:pointer;padding:0" data-action="op-tag-rm" aria-label="Remove">${ic('x','sm')}</button></span>`);e.target.value=''}});
R('orders-settings',tab=>{tab=['dinein','delivery','tablet'].includes(tab)?tab:'dinein';
  const tabs=UI.tabs([{key:'dinein',label:'Dine-In QR',href:'orders-settings--dinein'},{key:'delivery',label:'Delivery & Pick-Up',href:'orders-settings--delivery'},{key:'tablet',label:'Tablet',href:'orders-settings--tablet'}],tab);
  let body='';
  if(tab==='dinein')body=`<div class="form-card" style="max-width:none">
   <div class="card pad" style="background:var(--brand-tint-subtle);display:flex;gap:10px;margin-bottom:8px">${ic('info','sm')}<span><strong style="color:var(--ink)">Tip:</strong> venues that switch on table ordering typically see revenue rise by around a fifth.</span></div>
   ${UI.toggleRow('Enable Ordering','Guests can order from their table by scanning the QR code.',true,'data-change="op-cond" data-target="diOrd"')}
   ${cond('diOrd',true,`
   ${UI.toggleRow('Enable Payment','Guests can pay from their phone.',true,'data-change="op-cond" data-target="diPay"')}
   ${cond('diPay',true,`${UI.radioCards('chk',[{value:'default',label:'Default Checkout',text:'Accept card, cash or online payments.'},{value:'fast',label:'Fast Checkout <span class="tag-new">NEW</span>',text:'Take online payments with flexible bill-splitting. Works with Stripe and Myfatoorah.',extra:'<div><button type="button" class="btn ghost sm" style="padding:0;margin-top:4px" data-action="op-fast">What is Fast Checkout?</button></div>'}],'default')}
     <div class="form-row" style="display:block"><div class="txt"><strong>Select Payment Types</strong></div>${payTypes('di')}</div>`)}
   ${tipBlock('di')}
   <div style="padding:16px 0;max-width:320px">${UI.field({label:'Minimum Order Amount',control:UI.input({value:'0.00',prefix:'£'})})}</div>
   ${UI.field({label:'Restaurant Note',control:UI.textarea({placeholder:'e.g. 12.5% service charge is added to every bill',rows:2})})}
   ${ageCancel()}
   <div class="form-row" style="display:block"><div class="txt"><strong>Error Emailing</strong><small>If an order fails to reach your till, we email these addresses.</small></div><div style="margin-top:8px">${tagInput('diErr',[],'Enter email addresses')}</div></div>`)}
   <div style="margin-top:16px"><button class="btn primary" data-action="op-save">Save</button></div></div>`;
  if(tab==='delivery')body=`${UI.tabs([{key:'d',label:'Delivery'},{key:'p',label:'Pick Up'}],'d','dp')}${UI.panel('dp','d',deliveryForm('dl',false),'d')}${UI.panel('dp','p',deliveryForm('pu',true),'d')}`;
  if(tab==='tablet')body=`<div class="form-card" style="max-width:none">
   <h3>Ordering Options</h3>
   <div class="form-row" style="display:block"><div class="txt"><strong>Ordering Modes</strong></div><div style="margin-top:10px">${UI.radioCards('mode',[{value:'full',label:'Full Service',text:'Open a new ticket for each order and carry tablets around the restaurant.'},{value:'top',label:'Table Top',text:'Assign each tablet to a specific table.'},{value:'kiosk',label:'Kiosk',text:'Each guest gets a new ticket and ticket number automatically.'}],'full')}</div></div>
   <div class="form-row" style="display:block"><div class="txt"><strong>Checkout Request Submission</strong><small>Payment types guests can choose when they ask for the bill.</small></div>${payTypes('tb')}<div class="help" style="margin-top:8px">To accept online payments, connect a payment provider in <a href="#marketplace">Marketplace</a>.</div></div>
   ${UI.toggleRow('Display Bill Info','Show the running bill on the tablet.',true)}
   <div class="form-row"><div class="txt"><strong>Order Submission</strong><small>Who sends the ticket from the tablet?</small></div><div style="display:flex;gap:16px">${UI.radio('sub','Customer',true)}${UI.radio('sub','Waiter')}</div></div>
   <div class="form-row"><div class="txt"><strong>Table Selection</strong><small>Who opens the ticket on the tablet?</small></div><div style="display:flex;gap:16px">${UI.radio('tsel','Customer')}${UI.radio('tsel','Waiter',true)}</div></div>
   ${UI.toggleRow('Return to home screen after submitting the ticket','',true)}
   <div style="margin-top:16px"><button class="btn primary" data-action="op-save">Save</button></div></div>`;
  return `${UI.pageHead({title:'Ordering Settings',back:'orders',learn:true,tutorial:true})}${tabs}${body}`},{nav:'orders'});
A('op-fast',(el,e)=>{e.preventDefault();modal({title:'What is Fast Checkout?',body:'<p style="margin-top:0">Fast Checkout lets guests pay from their phone in a couple of taps, and split the bill by item, by equal share or by a custom amount.</p><ul><li>Apple Pay, Google Pay and cards</li><li>Split by item, equally or custom amount</li><li>Works with Stripe and Myfatoorah</li></ul>',footer:'<button class="btn primary" data-close>Got it</button>'})});

/* ================= RESERVATIONS ================= */
R('reservations',()=>`${UI.pageHead({title:'Reservations',sub:'Manage your restaurant reservations and settings'})}<div class="section-label">Quick Actions</div>
  ${UI.hubCards([{icon:'plus',title:'Create Reservation',text:'Create a new reservation',locked:1},{icon:'list',title:'All Reservations',text:'View and manage all your reservations',locked:1},{icon:'gear',title:'Reservation Settings',text:'Configure your reservation settings',locked:1}],4)}`);
R('reservations-list',()=>`${UI.pageHead({title:'Reservations',back:'reservations'})}<div class="rel">
  <div class="toolbar">${UI.seg([{key:'list',label:'List',icon:'list'},{key:'tl',label:'Timeline',icon:'clock'},{key:'tb',label:'Tables',icon:'table'},{key:'fp',label:'Floor plan',icon:'map'}],'list')}${UI.dateRange('08/11/2026','08/11/2026')}<span class="grow"></span>
   ${UI.dd(`Pending Reservation (0) ${ic('chevd','sm')}`,[{label:'No pending reservations',disabled:1}])}<button class="btn primary" data-action="locked">${ic('plus','sm')}New Reservation</button><button class="btn secondary" disabled>New Walk-in</button></div>
  <div class="card">${UI.empty('cal',"You don't have any reservations yet.",'Start creating one.')}</div>
  <div class="locked-overlay" style="position:fixed;left:0;right:0;top:0;bottom:0;z-index:30;background:rgba(26,35,48,.35)"><div class="card pad" style="max-width:420px;text-align:center;box-shadow:var(--shadow)"><span class="itile" style="margin:0 auto 12px;background:var(--warn-tint);color:var(--warn)">${ic('warn')}</span><h2>Upgrade to unlock the Reservations feature</h2><p class="muted">Take bookings online, manage walk-ins and see every table on a live timeline.</p><div style="display:flex;gap:10px;justify-content:center"><a class="btn secondary" href="#reservations">Back</a><button class="btn primary" data-action="close-toast" data-msg="Thanks – our team will contact you shortly">Contact Us</button></div></div></div></div>`,{nav:'reservations'});

/* ================= GUESTS & ENGAGEMENT ================= */
R('engagement',()=>`${UI.pageHead({title:'Engagement',sub:'Manage your customer engagement, promotions, and reviews'})}
  ${UI.hubCards([{icon:'user',title:'Customers',text:'View and manage all your customers',href:'engagement-customers'},{icon:'gift',title:'In-App Promotions',text:'Create and manage in-app promotions',href:'in-app-promotions'},{icon:'tag',title:'Promo Codes',text:'Create and manage promo codes',href:'engagement-promo-codes'},{icon:'gear',title:'Engagement Settings',text:'Configure your engagement settings',href:'engagement-settings--general'},{icon:'msg',title:'Reviews',text:'View and manage customer reviews',href:'engagement-reviews--all'},{icon:'form',title:'Feedbacks',text:'Create feedback forms and view customer feedback',href:'feedbacks--results'}])}`);

/* customers */
let cSearch='';let TAGS=['VIP','Regular','Staff','New Guest'];
function custList(){let l=S.customers;if(cSearch){const q=cSearch.toLowerCase();l=l.filter(c=>[c.name,c.email,c.phone].join(' ').toLowerCase().includes(q))}l=applyF(l,'cust-tags',c=>c.tags);return applySort(l,'cust')}
function custTable(){const l=custList(),{rows,pager}=paged(l,'cust');
  return `<p class="muted" style="margin:0 0 10px">${l.length} results listed.</p><div class="card">${UI.table({check:true,cols:[sortTh('Customer','cust','name'),filterTh('Tags','cust-tags',TAGS),'Email','Phone','Total Orders','Last Visit',{label:'',align:'right'}],
   rows:rows.map(c=>[`<div style="display:flex;gap:10px;align-items:center"><span class="avatar">${UI.initials(c.name)}</span><strong style="color:var(--ink)">${esc(c.name)}</strong></div>`,c.tags.map(t=>UI.pill(esc(t))).join(' ')||'<span class="muted">—</span>',esc(c.email),esc(c.phone),c.orders,c.last,`<div style="display:flex;gap:4px;justify-content:flex-end"><a class="iconbtn" style="width:32px;height:32px" href="#engagement-customer--${c.id}" aria-label="View">${ic('eye','sm')}</a><button class="iconbtn" style="width:32px;height:32px;color:var(--bad)" data-action="op-cust-del" data-id="${c.id}" aria-label="Delete">${ic('trash','sm')}</button></div>`]),empty:'No customers found'})}${pager}</div>`}
R('engagement-customers',()=>`${UI.pageHead({title:'Customers',back:'engagement',learn:true})}
  <div class="card pad" style="background:var(--brand-tint-subtle);display:flex;gap:10px;margin-bottom:16px">${ic('info','sm')}<span>Turn on <a href="#orders-settings--delivery">Customer Form Options</a> in your ordering settings to keep your customers' details.</span></div>
  <div class="toolbar">${UI.searchBox('Search','data-input="op-csearch" id="cSearch"').replace('<input','<input value="'+esc(cSearch)+'"')}<span class="grow"></span><button class="btn primary" data-action="export">${ic('export','sm')}Export</button></div>
  <div id="custTable">${custTable()}</div>`,{nav:'engagement'});
A('op-csearch',el=>{cSearch=el.value;PAGE.cust=0;$('#custTable').innerHTML=custTable()});
A('op-cust-del',el=>{const c=S.customers.find(x=>x.id===el.dataset.id);confirmDlg('Delete customer?',`${esc(c.name)} and their saved details will be removed. Past orders stay in your reports.`,'op-cust-del-yes',`data-id="${c.id}"`)});
A('op-cust-del-yes',el=>{S.customers=S.customers.filter(c=>c.id!==el.dataset.id);App.close();refresh();toast('Customer deleted')});
R('engagement-customer',id=>{const c=S.customers.find(x=>x.id===id);if(!c)return UI.pageHead({title:'Customer not found',back:'engagement-customers'});
  const ords=S.orders.concat(S.archived).filter(o=>o.customer===c.name);const n=c.orders,spent=c.spend;
  const types={'Dine-in':Math.ceil(n*.6),'Delivery':Math.floor(n*.25),'Pickup':Math.max(0,n-Math.ceil(n*.6)-Math.floor(n*.25))};const tot=Object.values(types).reduce((a,b)=>a+b,0)||1;
  const cols=['var(--brand-700)','var(--brand-500)','#9CC3F0'];let acc=0;const grad=Object.values(types).map((v,i)=>{const s=acc;acc+=v/tot*100;return `${cols[i]} ${s}% ${acc}%`}).join(',');
  return `${UI.pageHead({title:esc(c.name),back:'engagement-customers'})}
  ${UI.tabs([{key:'s',label:'Order Summary'},{key:'p',label:'Personal Information'}],'s','cu')}
  ${UI.panel('cu','s',`<div class="grid g4" style="margin-bottom:20px">${UI.kpi('Orders',n,'','orders')}${UI.kpi('Total Spent',gbp(spent),'','pound')}${UI.kpi('Average Check Size',gbp(spent/(n||1)),'','cart')}${UI.kpi('Total Tips',gbp(spent*.04),'','gift')}</div>
   <div class="split"><div class="card"><div class="card-head"><h2>Latest Orders</h2></div>${UI.table({cols:['Order ID','Type','Update Time',{label:'Total',align:'right'}],rows:ords.map(o=>[o.id,o.type,o.updated,gbp(o.total)]),empty:'No data'})}</div>
   <div class="card pad"><h2 style="margin-bottom:16px">Share by Order Types</h2><div style="width:170px;height:170px;border-radius:50%;margin:0 auto;background:conic-gradient(${grad});display:grid;place-items:center"><div style="width:100px;height:100px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-weight:700;color:var(--ink)">${n} orders</div></div>
   <div style="display:flex;gap:14px;justify-content:center;margin-top:16px;flex-wrap:wrap">${Object.entries(types).map(([k,v],i)=>`<span style="display:flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:${cols[i]};display:inline-block"></i>${k} (${v})</span>`).join('')}</div></div></div>`,'s')}
  ${UI.panel('cu','p',`<div class="form-card">
   <div class="grid g2" style="gap:12px">${UI.field({label:'Name',control:UI.input({id:'cuName',value:c.name})})}${UI.field({label:'Phone',control:UI.input({id:'cuPhone',value:c.phone})})}</div>
   <div class="grid g2" style="gap:12px">${UI.field({label:'Email',control:UI.input({id:'cuEmail',value:c.email})})}${UI.field({label:'Birthdate',control:UI.input({id:'cuBirth',type:'date',value:c.birth||'',placeholder:'Select date'})})}</div>
   ${UI.field({label:'Tags',control:`<div style="display:flex;flex-wrap:wrap;gap:6px" id="cuTags">${TAGS.map(t=>`<button type="button" class="chip-btn ${c.tags.includes(t)?'on':''}" data-chip="multi" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`})}
   <div class="grid g2" style="gap:12px;align-items:end">${UI.field({label:'Tags Mode',control:UI.select(['Manual','Automatic'],'Manual','id="cuMode"'),help:'Automatic tags guests by visit count and spend.'})}<div class="field"><button class="btn secondary" data-action="op-tags-manage">${ic('tag','sm')}Manage Tags</button></div></div>
   <button class="btn primary" data-action="op-cust-save" data-id="${c.id}">Save</button></div>`,'s')}`},{nav:'engagement'});
A('op-cust-save',el=>{const c=S.customers.find(x=>x.id===el.dataset.id);c.name=$('#cuName').value;c.phone=$('#cuPhone').value;c.email=$('#cuEmail').value;c.birth=$('#cuBirth').value;c.tags=$$('#cuTags .chip-btn.on').map(b=>b.dataset.tag);toast('Customer saved')});
function tagsModalBody(){return `<div id="tagList">${TAGS.map((t,i)=>`<div class="stat-row" style="align-items:center"><span class="pill">${esc(t)}</span><button class="iconbtn" style="width:30px;height:30px;color:var(--bad)" data-action="op-tag-del" data-i="${i}" aria-label="Delete tag">${ic('trash','sm')}</button></div>`).join('')}</div><div style="display:flex;gap:8px;margin-top:12px"><input class="input" id="newTag" placeholder="New tag name"><button class="btn primary" data-action="op-tag-add">Add</button></div>`}
A('op-tags-manage',()=>modal({title:'Manage Tags',body:tagsModalBody(),footer:'<button class="btn primary" data-action="op-tags-done">Done</button>'}));
A('op-tag-add',()=>{const v=$('#newTag').value.trim();if(!v)return;if(!TAGS.includes(v))TAGS.push(v);$('#modal .body').innerHTML=tagsModalBody();toast('Tag added')});
A('op-tag-del',el=>{const t=TAGS[+el.dataset.i];TAGS.splice(+el.dataset.i,1);S.customers.forEach(c=>c.tags=c.tags.filter(x=>x!==t));$('#modal .body').innerHTML=tagsModalBody()});
A('op-tags-done',()=>{closeModal();refresh()});

/* promo codes */
R('engagement-promo-codes',()=>`${UI.pageHead({title:'Promo Codes',back:'engagement',learn:true,actions:`<button class="btn primary" data-action="op-pc-new">${ic('plus','sm')}Add a Promo Code</button>`})}
  <div class="card">${UI.table({cols:['Discount Code','Description','Status',{label:'Actions',align:'right'}],rows:S.promoCodes.map((p,i)=>[`<span class="pill" style="font-family:monospace;font-size:13px">${esc(p.code)}</span><div class="help" style="margin:4px 0 0">${p.type==='Percentage'?p.off+'%':gbp(p.off)} off · ${esc(p.mode)}${+p.min?` · min ${gbp(p.min)}`:''}</div>`,esc(p.desc)||'<span class="muted">—</span>',`<div style="display:flex;gap:8px;align-items:center">${sp(p.status)}${UI.toggle(p.active,`data-change="op-pc-active" data-i="${i}" aria-label="Active"`)}</div>`,`<div style="display:flex;gap:4px;justify-content:flex-end"><button class="iconbtn" style="width:32px;height:32px" data-action="op-pc-edit" data-i="${i}" aria-label="Edit">${ic('edit','sm')}</button><button class="iconbtn" style="width:32px;height:32px;color:var(--bad)" data-action="op-pc-del" data-i="${i}" aria-label="Delete">${ic('trash','sm')}</button></div>`]),empty:'No data'})}</div>`,{nav:'engagement'});
function pcModal(i){const p=i!=null?S.promoCodes[i]:{code:'',desc:'',type:'Percentage',off:0,mode:'All',min:'0.00',active:true};
  modal({title:i!=null?'Edit Promo Code':'Add a Promo Code',body:`
   ${UI.field({label:'Discount Code',required:true,control:UI.input({id:'pcCode',value:p.code,placeholder:'SUMMER30',attrs:'style="text-transform:uppercase"'})})}
   ${UI.field({label:'Description',control:UI.input({id:'pcDesc',value:p.desc,placeholder:'e.g. 30% off summer brunch'})})}
   ${UI.field({label:'Discount Type',control:`<div style="display:flex;gap:18px">${UI.radio('pcType','Percentage',p.type==='Percentage','value="Percentage" data-change="op-pc-type"')}${UI.radio('pcType','Amount',p.type==='Amount','value="Amount" data-change="op-pc-type"')}</div>`})}
   <div class="grid g2" style="gap:12px">${UI.field({label:'Discount Off',control:`<div class="input-group"><span id="pcPre">${p.type==='Percentage'?'%':'£'}</span><input id="pcOff" type="number" min="0" value="${p.off}"></div>`})}${UI.field({label:'Order Mode',control:UI.select(['All','Dine In','Delivery','Pick Up'],p.mode,'id="pcMode"')})}</div>
   ${UI.field({label:'Min. Order Value',control:UI.input({id:'pcMin',value:p.min,prefix:'£'})})}
   <div class="form-row" style="padding:8px 0"><div class="txt"><strong>Active</strong></div>${UI.toggle(p.active,'id="pcActive"')}</div>`,
   footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn secondary" data-action="op-pc-save" data-s="Draft" ${i!=null?`data-i="${i}"`:''}>Save Draft</button><button class="btn primary" data-action="op-pc-save" data-s="Live" ${i!=null?`data-i="${i}"`:''}>Go Live</button>`})}
A('op-pc-new',()=>pcModal());
A('op-pc-edit',el=>pcModal(+el.dataset.i));
A('op-pc-type',el=>{$('#pcPre').textContent=el.value==='Percentage'?'%':'£'});
A('op-pc-save',el=>{const code=$('#pcCode').value.trim().toUpperCase();if(!code)return toast('Enter a discount code');
  const p={code,desc:$('#pcDesc').value,type:$('input[name=pcType]:checked').value,off:+$('#pcOff').value||0,mode:$('#pcMode').value,min:$('#pcMin').value,active:$('#pcActive').checked,status:el.dataset.s};
  if(el.dataset.i!=null)S.promoCodes[+el.dataset.i]=p;else S.promoCodes.unshift(p);closeModal();refresh();toast(el.dataset.s==='Live'?`${code} is live`:`${code} saved as draft`)});
A('op-pc-active',el=>{const p=S.promoCodes[+el.dataset.i];p.active=el.checked;toast(`${p.code} ${el.checked?'activated':'deactivated'}`)});
A('op-pc-del',el=>confirmDlg('Delete promo code?',`${esc(S.promoCodes[+el.dataset.i].code)} will stop working immediately.`,'op-pc-del-yes',`data-i="${el.dataset.i}"`));
A('op-pc-del-yes',el=>{S.promoCodes.splice(+el.dataset.i,1);App.close();refresh();toast('Promo code deleted')});

/* engagement settings */
const ES={like:true,likeMenus:null,review:true,reviewMenus:null};
function menuTags(key){const sel=ES[key]||(ES[key]=S.menus.map(m=>m.id));const rest=S.menus.filter(m=>!sel.includes(m.id));
  return `<div class="input" style="height:auto;min-height:40px;display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;align-items:center">${sel.map(id=>{const m=S.menus.find(x=>x.id===id);return m?`<span class="chip">${esc(m.name)}<button type="button" style="border:0;background:none;cursor:pointer;padding:0" data-action="op-es-rm" data-k="${key}" data-id="${id}" aria-label="Remove">${ic('x','sm')}</button></span>`:''}).join('')}
   ${rest.length?`<select data-change="op-es-add" data-k="${key}" style="border:0;outline:0;background:none;color:var(--muted)"><option value="">+ Add menu</option>${rest.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>`:''}</div>`}
A('op-es-rm',el=>{ES[el.dataset.k]=ES[el.dataset.k].filter(x=>x!==el.dataset.id);$('#es-'+el.dataset.k).innerHTML=menuTags(el.dataset.k)});
A('op-es-add',el=>{if(!el.value)return;ES[el.dataset.k].push(el.value);$('#es-'+el.dataset.k).innerHTML=menuTags(el.dataset.k)});
R('engagement-settings',tab=>{tab=tab==='sms'?'sms':'general';
  const tabs=UI.tabs([{key:'general',label:'General Settings',href:'engagement-settings--general'},{key:'sms',label:'SMS Settings',href:'engagement-settings--sms'}],tab);
  const gen=`<div class="split"><div class="form-card" style="max-width:none">
   ${UI.toggleRow('Enable User Profile','Guests can sign up and save their details for faster ordering next time.',true,'','<button type="button" class="btn ghost sm" style="padding:0;margin-top:4px" data-action="op-es-info" data-t="profile">'+ic('eye','sm')+'What are the benefits?</button>')}
   ${UI.toggleRow('Enable Like <span class="tag-new">NEW</span>','Guests can like items or save them for later, which lifts your most popular dishes.',ES.like,'data-change="op-cond" data-target="esLike"','<button type="button" class="btn ghost sm" style="padding:0;margin-top:4px" data-action="op-es-info" data-t="like">What is Like?</button>')}
   ${cond('esLike',ES.like,UI.field({label:`Select menu to allow like ${ic('info','sm')}`,control:`<div id="es-likeMenus">${menuTags('likeMenus')}</div>`})+UI.toggleRow('Enable "Most Liked" section','Adds a section to those menus showing your 5 most-liked items.',true))}
   ${UI.toggleRow('Enable Review <span class="tag-new">NEW</span>','Guests can rate and review your menu items.',ES.review,'data-change="op-cond" data-target="esRev"','<button type="button" class="btn ghost sm" style="padding:0;margin-top:4px" data-action="op-es-info" data-t="review">What is Review?</button>')}
   ${cond('esRev',ES.review,UI.field({label:'Select menu to allow review',control:`<div id="es-reviewMenus">${menuTags('reviewMenus')}</div>`})+UI.toggleRow('Enable instant reviews','Reviews rated 3 out of 5 or higher go live on your menu automatically. You can still withdraw or publish reviews yourself.',false))}
   ${UI.toggleRow('Display "Review Us on Google" button <span class="tag-new">NEW</span>','Link guests to your Google Business page to collect more reviews.',false)}
   <div style="margin-top:16px"><button class="btn primary" data-action="op-save">Save</button></div></div>
   <div><div class="card pad" id="esWn" style="background:var(--brand-tint-subtle)"><div style="display:flex;align-items:center;gap:8px"><span class="itile" style="width:32px;height:32px">${ic('star','sm')}</span><strong style="color:var(--ink)">What's New</strong><button class="iconbtn" style="margin-left:auto;width:28px;height:28px;border:0;background:none" data-action="op-es-wn-close" aria-label="Close">${ic('x','sm')}</button></div>
   <h3 style="margin-top:12px">Turn guests into advocates</h3><p class="muted">Switch on reviews so happy guests can recommend your dishes to everyone who opens your menu.</p><button class="btn secondary sm" data-action="op-es-info" data-t="review">More Detail</button></div></div></div>`;
  const sms=`<div class="form-card"><h2>SMS Information</h2><p class="muted">Keep in touch with guests by text message: order updates, booking reminders and offers.</p>
   <div class="grid g3" style="margin:16px 0">${UI.kpi('Plan','0 SMS / month')}${UI.kpi('Used','0 SMS')}${UI.kpi('Remaining','0 SMS')}</div>
   <button class="btn primary" data-action="close-toast" data-msg="Our team will be in touch about SMS packages">Buy SMS package</button></div>`;
  return `${UI.pageHead({title:'Engagement Settings',back:'engagement',learn:true})}${tabs}${tab==='sms'?sms:gen}`},{nav:'engagement'});
A('op-es-wn-close',()=>$('#esWn').remove());
A('op-es-info',el=>{const t={profile:['User Profiles','Guests who sign up can save favourites, reorder in one tap and get their receipts by email – and you get their details for your guest list.'],like:['What is Like?','A heart on every item lets guests save dishes for later. Your most-liked items can be shown in their own section.'],review:['What is Review?','Guests can give items a star rating and a short review. You approve what goes live, or publish 3★ and above automatically.']}[el.dataset.t];modal({title:t[0],body:`<p style="margin:0">${t[1]}</p>`,footer:'<button class="btn primary" data-close>Got it</button>'})});

/* reviews */
let rSearch='';
R('engagement-reviews',tab=>{tab=tab==='archive'?'archive':'all';let l=S.reviews.filter(r=>!!r.archived===(tab==='archive'));
  if(rSearch){const q=rSearch.toLowerCase();l=l.filter(r=>[r.text,r.item,r.customer].join(' ').toLowerCase().includes(q))}
  l=applyF(l,'rev-rate',r=>'★ '+r.rate);l=applyF(l,'rev-status',r=>r.status);l=applySort(l,'rev');const {rows,pager}=paged(l,'rev');
  return `${UI.pageHead({title:'Reviews',back:'engagement',learn:true})}
  ${UI.tabs([{key:'all',label:'All Reviews',href:'engagement-reviews--all'},{key:'archive',label:'Archive',href:'engagement-reviews--archive'}],tab)}
  <div class="toolbar"><strong style="color:var(--ink)">${l.length} review listed</strong>${UI.searchBox('Search','data-input="op-rsearch" id="rSearch"').replace('<input','<input value="'+esc(rSearch)+'"')}${UI.dateRange('01/10/2026','08/11/2026')}<span class="grow"></span>
   <button class="btn secondary" data-action="op-rev-bulk" data-do="${tab==='all'?'archive':'unarchive'}">${ic('archive','sm')}${tab==='all'?'Archive':'Restore'} selected</button><button class="btn danger" data-action="op-rev-bulk" data-do="delete">${ic('trash','sm')}Delete selected</button><button class="btn primary" data-action="export">${ic('export','sm')}Export</button></div>
  <div class="card" id="revTbl">${UI.table({check:true,cols:['Review',filterTh('Rate','rev-rate',['★ 5','★ 4','★ 3','★ 2','★ 1']),'Item','Customer',sortTh('Date','rev','date'),filterTh('Status','rev-status',['Waiting','Live','Rejected']),{label:'',align:'right'}],
   rows:rows.map(r=>({attrs:`data-id="${r.id}"`,cells:[`<span style="color:var(--ink)">${esc(r.text)}</span>`,`<span class="stars">★</span> ${r.rate}`,`<small>${esc(r.item)}</small>`,esc(r.customer),r.date,
    UI.dd(`${sp(r.status)}${ic('chevd','sm')}`,['Waiting','Live','Rejected'].map(s=>({label:s,action:'op-rev-status',data:`data-id="${r.id}" data-s="${s}"`})),{cls:'btn ghost sm',left:true}),
    `<div style="display:flex;gap:4px;justify-content:flex-end"><button class="iconbtn" style="width:32px;height:32px" data-action="op-rev-arch" data-id="${r.id}" aria-label="${r.archived?'Restore':'Archive'}" title="${r.archived?'Restore':'Archive'}">${ic(r.archived?'refresh':'archive','sm')}</button><button class="iconbtn" style="width:32px;height:32px;color:var(--bad)" data-action="op-rev-del" data-id="${r.id}" aria-label="Delete">${ic('trash','sm')}</button></div>`]})),empty:'No data'})}${pager}</div>`},{nav:'engagement'});
A('op-rsearch',el=>{rSearch=el.value;PAGE.rev=0;const pos=el.selectionStart;refresh();const i=$('#rSearch');i.focus();i.setSelectionRange(pos,pos)});
A('op-rev-status',el=>{const r=S.reviews.find(x=>x.id===el.dataset.id);r.status=el.dataset.s;refresh();toast('Review marked '+el.dataset.s)});
A('op-rev-arch',el=>{const r=S.reviews.find(x=>x.id===el.dataset.id);r.archived=!r.archived;refresh();toast(r.archived?'Review archived':'Review restored')});
A('op-rev-del',el=>confirmDlg('Delete review?','This review will be removed from your menu permanently.','op-rev-del-yes',`data-ids="${el.dataset.id}"`));
A('op-rev-del-yes',el=>{const ids=el.dataset.ids.split(',');S.reviews=S.reviews.filter(r=>!ids.includes(r.id));App.close();refresh();toast(ids.length>1?ids.length+' reviews deleted':'Review deleted')});
A('op-rev-bulk',el=>{const ids=$$('#revTbl [data-rowcheck]:checked').map(c=>c.closest('tr').dataset.id);if(!ids.length)return toast('Select reviews first');
  if(el.dataset.do==='delete')return confirmDlg('Delete reviews?',`${ids.length} review(s) will be removed permanently.`,'op-rev-del-yes',`data-ids="${ids.join(',')}"`);
  S.reviews.forEach(r=>{if(ids.includes(r.id))r.archived=el.dataset.do==='archive'});refresh();toast(`${ids.length} review(s) ${el.dataset.do==='archive'?'archived':'restored'}`)});

/* feedbacks */
const FS={on:true};
R('feedbacks',tab=>{tab=['results','forms','settings'].includes(tab)?tab:'results';
  const tabs=UI.tabs([{key:'results',label:'Results',href:'feedbacks--results'},{key:'forms',label:'Forms',href:'feedbacks--forms'},{key:'settings',label:'Settings',href:'feedbacks--settings'}],tab);
  let body='';
  if(tab==='results'){let l=applyF(S.feedbacks,'fb-table',f=>f.table);l=applySort(l,'fb');const {rows,pager}=paged(l,'fb');
    body=`<div class="toolbar"><strong style="color:var(--ink)">${l.length} results listed.</strong>${UI.dateRange('01/10/2026','08/11/2026')}<span class="grow"></span><button class="iconbtn" data-action="op-reload" aria-label="Reload">${ic('refresh','sm')}</button><button class="btn primary" data-action="export">${ic('export','sm')}Export</button></div>
    <div class="card">${UI.table({cols:['Results',sortTh('Date','fb','date'),'Form',filterTh('Table','fb-table',[...new Set(S.feedbacks.map(f=>f.table))]),{label:'Actions',align:'right'}],rows:rows.map(f=>({attrs:f.unread?'class="unread"':'',cells:[esc(f.id),f.date,esc(f.form),esc(f.table),`<button class="iconbtn" style="width:32px;height:32px;margin-left:auto" data-action="op-fb-view" data-id="${esc(f.id)}" aria-label="View">${ic('eye','sm')}</button>`]})),empty:'No data'})}${pager}</div>`}
  if(tab==='forms')body=`<div class="card pad" style="background:var(--brand-tint-subtle);display:flex;gap:10px;margin-bottom:16px">${ic('info','sm')}<span>Your default menu language is English. To change it, go to <a href="#settings-venue--language">Language Settings</a>.</span></div>
    <p class="muted">${S.forms.length} form${S.forms.length===1?'':'s'} listed.</p>
    ${S.forms.map((f,i)=>`<div class="card" style="display:flex;align-items:center;gap:12px;padding:14px 18px;margin-bottom:10px"><span class="itile" style="width:36px;height:36px">${ic('form','sm')}</span><strong style="color:var(--ink)">${esc(f.name)}</strong>${sp(f.active?'Active':'Inactive')}<span style="flex:1"></span>${UI.toggle(f.active,`data-change="op-fm-active" data-i="${i}" aria-label="Active"`)}<a class="iconbtn" style="width:34px;height:34px" href="#feedback-form--${f.id}" aria-label="Edit">${ic('edit','sm')}</a>${UI.more([{label:'Duplicate',icon:'copy',action:'op-fm-dup',data:`data-i="${i}"`},{label:'Delete',icon:'trash',action:'op-fm-del',danger:1,data:`data-i="${i}"`}])}</div>`).join('')||UI.empty('form','No forms yet')}`;
  if(tab==='settings')body=`<div class="form-card"><p class="muted" style="margin-top:0">Choose how you collect feedback from guests.</p>
    ${UI.toggleRow('Enable Feedback System','Guests can leave feedback after their visit.',FS.on,'data-change="op-cond" data-target="fsBody"')}
    ${cond('fsBody',FS.on,`<div class="form-row" style="display:block"><div class="txt"><strong>Feedback Mode</strong><small>How feedback is collected from guests</small></div><div style="margin-top:10px">${UI.radioCards('fbmode',[{value:'form',label:'With Form Available',text:'Guests fill in your detailed feedback form.'},{value:'default',label:'Default Mode',text:'A simple rating, with no custom form.'}],'form')}</div></div>
    <div class="form-row" style="display:block"><div class="txt"><strong>Email Notifications</strong><small>Notification Email Addresses</small></div><div style="margin-top:8px">${tagInput('fsEm',['info@alicis.co.uk'],'Enter email addresses')}</div></div>`)}
    <div style="margin-top:16px"><button class="btn primary" data-action="op-save">Save</button></div></div>`;
  return `${UI.pageHead({title:'Feedbacks',back:'engagement',learn:true,actions:tab==='forms'?`<button class="btn primary" data-action="op-fm-new">${ic('plus','sm')}Create a Form</button>`:''})}${tabs}${body}`},{nav:'engagement'});
A('op-fb-view',el=>{const f=S.feedbacks.find(x=>x.id===el.dataset.id);modal({title:`Feedbacks ${esc(f.id.replace('Form ',''))}`,body:`<div class="grid g2" style="gap:10px;margin-bottom:12px"><div class="card" style="padding:10px"><small class="muted">Date</small><div style="color:var(--ink);font-weight:600">${f.date}</div></div><div class="card" style="padding:10px"><small class="muted">Form</small><div style="color:var(--ink);font-weight:600">${esc(f.form)}</div></div></div>
  ${f.answers.map(([q,a],i)=>`<div class="stat-row" style="gap:12px"><span><strong style="color:var(--ink)">${i+1}.</strong> ${esc(q)}</span><strong style="color:${a.includes('★')?'#E8A317':'var(--ink)'};text-align:right">${esc(a)}</strong></div>`).join('')}`,footer:`<button class="btn primary" data-action="op-fb-ok" data-id="${esc(f.id)}">Ok</button>`})});
A('op-fb-ok',el=>{const f=S.feedbacks.find(x=>x.id===el.dataset.id);f.unread=false;closeModal();refresh()});
A('op-fm-active',el=>{const f=S.forms[+el.dataset.i];f.active=el.checked;refresh();toast(`${f.name} ${f.active?'activated':'deactivated'}`)});
A('op-fm-dup',el=>{const f=S.forms[+el.dataset.i];S.forms.push({...f,id:'f'+UI.uid(),name:f.name+' (copy)',active:false,questions:f.questions.map(q=>[...q])});refresh();toast('Form duplicated')});
A('op-fm-del',el=>confirmDlg('Delete form?',`${esc(S.forms[+el.dataset.i].name)} will be deleted. Past results are kept.`,'op-fm-del-yes',`data-i="${el.dataset.i}"`));
A('op-fm-del-yes',el=>{S.forms.splice(+el.dataset.i,1);App.close();refresh();toast('Form deleted')});
A('op-fm-new',()=>modal({title:'Create a Form',body:UI.field({label:'Form Name',required:true,control:UI.input({id:'fmName',placeholder:'e.g. Brunch feedback'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="op-fm-create">Create</button>`}));
A('op-fm-create',()=>{const n=$('#fmName').value.trim();if(!n)return toast('Enter a form name');const f={id:'f'+UI.uid(),name:n,active:false,questions:[['','Text Box',false]]};S.forms.push(f);closeModal();App.go('feedback-form--'+f.id);toast('Form created')});
R('feedback-form',id=>{const f=S.forms.find(x=>x.id===id);if(!f)return UI.pageHead({title:'Form not found',back:'feedbacks--forms'});
  return `${UI.pageHead({title:esc(f.name),back:'feedbacks--forms',actions:`<button class="btn ghost" data-action="op-fm-settings" data-id="${f.id}">${ic('gear','sm')}Settings</button><button class="btn primary" data-action="op-fm-save" data-id="${f.id}">Save</button>`})}
  <div id="fmQs" style="max-width:860px">${f.questions.map((q,i)=>`<div class="card pad" style="margin-bottom:12px;display:flex;gap:12px;align-items:flex-start"><span class="drag" style="margin-top:34px">${ic('grip','sm')}</span><div style="flex:1">
    <label style="font-weight:600;color:var(--ink);font-size:13px">Question ${i+1}</label><div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap"><input class="input" style="flex:1;min-width:220px" value="${esc(q[0])}" placeholder="Type your question" data-input="op-q-text" data-f="${f.id}" data-i="${i}" aria-label="Question ${i+1}">
    ${UI.select(['Text Box','Star Rating','Yes/No','Smiley'],q[1],`style="width:160px" data-change="op-q-type" data-f="${f.id}" data-i="${i}" aria-label="Question type"`)}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px">${UI.check('Required',q[2],`data-change="op-q-req" data-f="${f.id}" data-i="${i}"`)}<span style="flex:1"></span>
    <button class="iconbtn" style="width:32px;height:32px" data-action="op-q-move" data-f="${f.id}" data-i="${i}" data-d="-1" ${i===0?'disabled':''} aria-label="Move up">${ic('chevu','sm')}</button><button class="iconbtn" style="width:32px;height:32px" data-action="op-q-move" data-f="${f.id}" data-i="${i}" data-d="1" ${i===f.questions.length-1?'disabled':''} aria-label="Move down">${ic('chevd','sm')}</button><button class="iconbtn" style="width:32px;height:32px;color:var(--bad)" data-action="op-q-del" data-f="${f.id}" data-i="${i}" aria-label="Delete question">${ic('trash','sm')}</button></div></div></div>`).join('')}
  <button class="btn secondary" data-action="op-q-add" data-f="${f.id}">${ic('plus','sm')}Add Question</button></div>`},{nav:'engagement'});
const fq=el=>S.forms.find(x=>x.id===el.dataset.f);
A('op-q-text',el=>{fq(el).questions[+el.dataset.i][0]=el.value});
A('op-q-type',el=>{fq(el).questions[+el.dataset.i][1]=el.value});
A('op-q-req',el=>{fq(el).questions[+el.dataset.i][2]=el.checked});
A('op-q-add',el=>{fq(el).questions.push(['','Text Box',false]);refresh()});
A('op-q-del',el=>{fq(el).questions.splice(+el.dataset.i,1);refresh()});
A('op-q-move',el=>{if(el.disabled)return;const q=fq(el).questions,i=+el.dataset.i,j=i+ +el.dataset.d;[q[i],q[j]]=[q[j],q[i]];refresh()});
A('op-fm-save',()=>toast('Form saved'));
A('op-fm-settings',el=>{const f=S.forms.find(x=>x.id===el.dataset.id);drawer({title:'Form Settings',width:460,body:UI.field({label:'Survey Name',required:true,control:UI.input({id:'fmSName',value:f.name})})+UI.field({label:'Email for survey results',control:tagInput('fmSEm',['info@alicis.co.uk'],'Enter email addresses')}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="op-fm-settings-save" data-id="${f.id}">Save</button>`})});
A('op-fm-settings-save',el=>{const f=S.forms.find(x=>x.id===el.dataset.id);f.name=$('#fmSName').value.trim()||f.name;closeDrawer();refresh();toast('Form settings saved')});

/* ================= REPORTS ================= */
R('reports',()=>`${UI.pageHead({title:'Reports',sub:'Access comprehensive reports and analytics for your restaurant'})}
  ${UI.hubCards([{icon:'chart',title:'Summary',text:'View overall summary and statistics',href:'reports-summary'},{icon:'menu',title:'Item Report',text:'Analyse individual item performance',href:'reports-item'},{icon:'bars',title:'Business Report',text:'Comprehensive business insights and analytics',href:'reports-business'},{icon:'cal',title:'Reservation Report',text:'Analyse reservation trends and patterns',href:'reports-reservation'}])}`);
function repHead(tab,extra=''){return `${UI.pageHead({title:'Reports',back:'reports',learn:true})}
  ${UI.tabs([{key:'summary',label:'Summary',href:'reports-summary'},{key:'item',label:'Item Report',href:'reports-item'},{key:'sales',label:'Sales Report',disabled:1,soon:1},{key:'payment',label:'Payment Report',disabled:1,soon:1},{key:'business',label:'Business Report',href:'reports-business'},{key:'reservation',label:'Reservation Report',href:'reports-reservation'},{key:'analysis',label:'Analysis Report',disabled:1,soon:1}],tab)}
  <div class="toolbar"><label class="check" style="font-weight:600">${UI.toggle(true,'aria-label="Filter by Time"')} Filter by Time</label>${UI.dateRange('08/11/2026','14/11/2026')}${extra}<span class="grow"></span><button class="btn primary" data-action="export">${ic('download','sm')}Export</button></div>`}
const VIEWS={'Mediterranean Breakfast':41,'Serpme Kahvalti':33,'English Twist':32,'Avocado Delight':32,'American Twist':21};
const LIKES={'Coca-Cola':1,'Porn Star Martini':1,'Buffalo Chicken Wings':1,'S\'Mac Burger':1};
function hash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h}
const viewsOf=n=>VIEWS[n]??(hash(n)%19);
function listCard(title,rows,emptyTxt){return `<div class="card"><div class="card-head"><h3>${title}</h3><a class="right" href="#reports-item">Details</a></div><div style="padding:6px 20px 14px">${rows.length?rows.map(([n,v],i)=>`<div class="stat-row"><span><strong style="color:var(--muted)">${i+1}.</strong> ${esc(n)}</span><strong style="color:var(--ink)">${v}</strong></div>`).join(''):`<p class="muted" style="text-align:center;padding:16px 0;margin:0">${emptyTxt}</p>`}</div></div>`}
R('reports-summary',()=>{const rv=S.reviews;const avg=rv.length?(rv.reduce((a,r)=>a+r.rate,0)/rv.length):0;
  const allItems=S.menus[0].sections.flatMap(s=>s.items);const byViews=[...allItems].map(i=>[i.name,viewsOf(i.name)]).sort((a,b)=>b[1]-a[1]);
  const revCount={},revRate={};rv.forEach(r=>{const n=r.item.split(' (')[0];revCount[n]=(revCount[n]||0)+1;(revRate[n]=revRate[n]||[]).push(r.rate)});
  const rc=Object.entries(revCount).sort((a,b)=>b[1]-a[1]);const rr=Object.entries(revRate).map(([n,a])=>[n,(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1)+' ★']).sort((a,b)=>parseFloat(b[1])-parseFloat(a[1]));
  const hours=Array.from({length:24},(_,i)=>pad(i));const dens=[0,0,0,0,0,0,.05,.15,.6,.85,.9,.75,.7,.65,.5,.4,.35,.45,.7,.8,.6,.35,.15,.05];
  return `${repHead('summary')}
  <div class="grid g6" style="margin-bottom:20px">${UI.kpi('Session',377,'','users')}${UI.kpi('Feedback',S.feedbacks.length,'','form')}${UI.kpi('Customers',S.customers.length,'','user')}${UI.kpi('Requested Service',0,'','bell')}${UI.kpi('Like',4,'','heart')}${UI.kpi('Review',rv.length,'','star')}</div>
  <div class="split" style="margin-bottom:20px"><div class="card pad"><h3 style="margin-bottom:12px">Visitor Density</h3>${UI.heat(['Visits'],hours,(r,c)=>dens[c])}<div class="help">Busiest between 09:00 and 11:00, and again from 18:00.</div></div>
   <div class="card pad"><h3>Average Review Rate</h3>${rv.length?`<div style="display:flex;align-items:baseline;gap:8px;margin:8px 0"><span style="font-size:34px;font-weight:700;color:var(--ink)">${avg.toFixed(1)}</span><span class="stars">${'★'.repeat(Math.round(avg))}</span><small class="muted">${rv.length} reviews</small></div>${[5,4,3,2,1].map(s=>{const n=rv.filter(r=>r.rate===s).length;return `<div class="hbar" style="grid-template-columns:30px 1fr 30px;padding:3px 0"><span>${s} ★</span><div class="tr"><i style="width:${n/rv.length*100}%"></i></div><small>${n}</small></div>`}).join('')}`:'<p class="muted">No reviews yet.</p>'}</div></div>
  <h2 style="margin:8px 0 14px">Item Success</h2>
  <div class="grid g2" style="margin-bottom:20px">${listCard('Most Viewed Items',byViews.slice(0,5),'No view data yet')}${listCard('Least Viewed Items',byViews.slice(-5).reverse(),'No view data yet')}</div>
  <div class="grid g3">${listCard('Most Reviewed Items',rc.slice(0,5),'No review data yet')}${listCard('Least Reviewed Items',rc.slice(-5).reverse(),'No review data yet')}${listCard('Highest Rated Items',rr.slice(0,5),'No rating data yet')}${listCard('Lowest Rated Items',rr.slice(-5).reverse(),'No rating data yet')}${listCard('Most Liked Items',Object.entries(LIKES),'No like data yet')}${listCard('Least Liked Items',[],'No like data yet')}</div>`},{nav:'reports'});
let irHideInactive=false,irHideZero=false;const irCols={menu:true,views:true,rec:true,like:true,revq:true,rate:true,sale:true,rev:true};
R('reports-item',()=>{
  const sold={};S.orders.concat(S.archived).forEach(o=>o.items.forEach(i=>{sold[i.name]=(sold[i.name]||0)+i.qty}));
  let rows=[];S.menus.forEach(m=>m.sections.forEach(s=>s.items.forEach(i=>rows.push({i,m}))));
  if(irHideInactive)rows=rows.filter(r=>r.i.on!==false);if(irHideZero)rows=rows.filter(r=>sold[r.i.name]);
  const {rows:pg,pager}=paged(rows,'ir');
  const C=[['name','Item Name'],['menu','Menu'],['views','Total View'],['rec','Recommended Views'],['like','Like Quantity'],['revq','Review Quantity'],['rate','Review Rate'],['sale','Sale Quantity'],['rev','Revenue (£)']].filter(c=>c[0]==='name'||irCols[c[0]]);
  const ch={dine:'Dine In',pickup:'Pick Up',delivery:'Delivery'};
  const val=({i,m},k)=>{const rv=S.reviews.filter(r=>r.item.startsWith(i.name+' ('));return {name:`<strong style="color:var(--ink)">${esc(i.name)}</strong>${i.on===false?' <span class="pill grey" style="height:20px">Inactive</span>':''}`,menu:`<small>${esc(m.name)}</small><div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">${m.channels.filter(c=>ch[c]).map(c=>`<span class="pill grey" style="height:20px;font-size:11px">${ch[c]}</span>`).join('')}</div>`,views:m.id==='m1'?viewsOf(i.name):0,rec:0,like:LIKES[i.name]||0,revq:rv.length,rate:(rv.length?(rv.reduce((a,r)=>a+r.rate,0)/rv.length).toFixed(1):0)+'/5',sale:sold[i.name]||0,rev:gbp((sold[i.name]||0)*i.price).slice(1)}[k]};
  return `${repHead('item',`<div class="dd"><button type="button" class="btn secondary" data-dd>Edit Display ${ic('chevd','sm')}</button><div class="dd-menu" style="padding:12px;min-width:220px">${[['menu','Menu'],['views','Total View'],['rec','Recommended Views'],['like','Like Quantity'],['revq','Review Quantity'],['rate','Review Rate'],['sale','Sale Quantity'],['rev','Revenue (£)']].map(([k,l])=>`<div style="padding:4px 0">${UI.check(l,irCols[k],`data-change="op-ir-col" data-col="${k}"`)}</div>`).join('')}</div></div>`)}
  ${UI.tabs([{key:'i',label:'Item Summary'},{key:'m',label:'Modifier Summary'}],'i','ir')}
  ${UI.panel('ir','i',`<div class="toolbar">${UI.check('Hide inactive items',irHideInactive,'data-change="op-ir-f" data-k="inactive"')}${UI.check('Hide zero sales',irHideZero,'data-change="op-ir-f" data-k="zero"')}</div>
   <div class="card">${UI.table({cols:C.map(c=>({label:c[1],align:['views','rec','like','revq','sale','rev'].includes(c[0])?'right':''})),rows:pg.map(r=>C.map(c=>val(r,c[0]))),empty:'No data'})}${pager}</div>`,'i')}
  ${UI.panel('ir','m',`<div class="card">${UI.table({cols:['Modifier Name','Group',{label:'Sale Quantity',align:'right'},{label:'Revenue (£)',align:'right'}],rows:(S.modifiers||[]).flatMap(g=>(g.items||g.modifiers||[]).map(x=>[esc(x.name||x[0]),esc(g.name),0,'0.00'])),empty:'No data'})}</div>`,'i')}`},{nav:'reports'});
A('op-ir-f',el=>{if(el.dataset.k==='inactive')irHideInactive=el.checked;else irHideZero=el.checked;PAGE.ir=0;refresh()});
A('op-ir-col',el=>{irCols[el.dataset.col]=el.checked;refresh()});
const ACTIVITY=[['Updated price','French Toast · £13.95','Menu Item'],['Turned off item','Vegan Breakfast','Menu Item'],['Edited menu','Breakfast & Brunch 08:00 - 16:00','Menu'],['Added promotion','Food Allergy','In-App Promotion'],['Updated opening hours','Dine-in QR','Settings'],['Uploaded photo','Serpme Kahvalti','Menu Item'],['Changed section order','Desserts','Section'],['Updated QR colours','View Only','Settings'],['Created form','Sample Form','Feedback'],['Signed in','Dashboard','Account']];
R('reports-business',()=>`${repHead('business')}<div class="card">${UI.table({cols:['Activity','Detail','Type','User','IP Address','Date'],rows:ACTIVITY.map(([a,d,t],i)=>[`<strong style="color:var(--ink)">${a}</strong>`,esc(d),UI.pill(t,'grey'),'Ömer A.',`81.2.${60+i}.${(i*37)%250}`,`${pad(8-Math.floor(i/3))}/11/2026 ${pad(18-i)}:${pad((i*13)%60)}`]),empty:'No data'})}</div>`,{nav:'reports'});
R('reports-reservation',()=>`${repHead('reservation')}
  <div class="grid g6" style="margin-bottom:20px">${UI.kpi('Total Reservations',0,'','cal')}${UI.kpi('Completed',0,'','check')}${UI.kpi('Cancelled',0,'','x')}${UI.kpi('No-Shows',0,'','user')}${UI.kpi('Avg. Guest Count',0,'','users')}${UI.kpi('Completion Rate','0%','','trend')}</div>
  <div class="grid g2">${['Daily Reservation Trend','Status Breakdown','Source Breakdown','Reservation Density'].map(t=>`<div class="card"><div class="card-head"><h3>${t}</h3></div>${UI.empty('chart','No reservation data yet','Data appears here once you start taking reservations.')}</div>`).join('')}</div>`,{nav:'reports'});
})();
