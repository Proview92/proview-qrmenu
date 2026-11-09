/* Proview Menu – core: helpers, UI kit, shell, router, actions.
   Page modules call App.route(key, fn, opts) and App.action(name, fn).
   Routes use plain hashes: #key or #key--param (e.g. #menu-editor--m1). */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const uid=()=>Math.random().toString(36).slice(2,9);
const initials=s=>String(s).split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();

/* ---------- icons (24px line, 2px stroke) ---------- */
const P={
home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
menu:'<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v6M7 3v6M17 21V3c-2 0-4 2-4 6v4h4"/>',
code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
palette:'<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A5.6 5.6 0 0 0 22 10c0-4.4-4.5-8-10-8z"/>',
wand:'<path d="m15 4 5 5M3 21l12-12M14 3v2M19 8h2M18 2l1 1M5 3v3M3.5 4.5h3"/>',
sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z"/>',
chart:'<path d="M3 3v18h18M7 15l4-4 3 3 6-7"/>',
bars:'<path d="M3 3v18h18M8 17v-5M12 17V8M16 17v-3M20 17V6"/>',
orders:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4"/>',
bell2:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0M4 2 2 4M20 2l2 2"/>',
cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14l2 2 4-4"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
trend:'<path d="M22 7 13.5 15.5l-5-5L2 17M16 7h6v6"/>',
cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.5L22 8H6"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
img:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
coin:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
eyeoff:'<path d="M17.9 17.9A10 10 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 5.1-5.9M9.9 5.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M2 2l20 20M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
sidebar:'<path d="M3 6h18M3 12h18M3 18h18"/>',
share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
help:'<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
rocket:'<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
minus:'<path d="M5 12h14"/>',
chev:'<path d="m9 18 6-6-6-6"/>',
chevd:'<path d="m6 9 6 6 6-6"/>',
chevu:'<path d="m18 15-6-6-6 6"/>',
back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
left:'<path d="m15 18-6-6 6-6"/>',
x:'<path d="M18 6 6 18M6 6l12 12"/>',
check:'<path d="M20 6 9 17l-5-5"/>',
grip:'<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
dots:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
dine:'<path d="M3 11h18M5 11v9M19 11v9M8 11V7a4 4 0 0 1 8 0v4"/>',
bag:'<path d="M5 7h14l-1 14H6zM9 7a3 3 0 0 1 6 0"/>',
bike:'<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 11.5M5.5 17.5 9 10h7l-4 7.5M9 10 7.5 6H5"/>',
tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>',
phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
open:'<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
export:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5"/>',
expand:'<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
full:'<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
archive:'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
send:'<path d="M12 19V5M5 12l7-7 7 7"/>',
book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
play:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/>',
blocks:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
map:'<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15"/>',
filter:'<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
sort:'<path d="M7 3v18M3 7l4-4 4 4M17 21V3M13 17l4 4 4-4"/>',
lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
users:'<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-5.5"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
tag:'<path d="M20 12 12 20l-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
form:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6"/>',
store:'<path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
pound:'<path d="M18 20H6c2-1 3-3 3-6V8a4 4 0 0 1 7.5-2M6 13h9"/>',
door:'<path d="M3 21h18M6 21V3h12v18M14 12h.01"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
hand:'<path d="M18 11V6a2 2 0 0 0-4 0v0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
insta:'<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
fb:'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
mega:'<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
layers:'<path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
translate:'<path d="M4 5h9M8.5 3v2M6 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8M13 21l4-9 4 9M14.5 18h5"/>',
cube:'<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7zM3.3 7 12 12l8.7-5M12 22V12"/>',
zoomin:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
sms:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01"/>',
wa:'<path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 7.9 19.6z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
pencil:'<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
enter:'<path d="M9 10 4 15l5 5M20 4v7a4 4 0 0 1-4 4H4"/>',
power:'<path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10"/>',
logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
sound:'<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
handshake:'<path d="m11 17 2 2a1 1 0 1 0 3-3M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7 .9L21 7M21 3l1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6"/>',
fire:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.4.2 1.5 1.2 2.9 2.5 2.9z"/>',
};
const ic=(n,c='')=>`<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||P.info}</svg>`;

/* ---------- toast / modal / drawer / popovers ---------- */
function toast(msg){let t=$('#toast');t.querySelector('span').textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2400)}
function modal({title,body,footer='',wide=false,id=''}){const m=$('#modal');m.className='modal'+(wide?' wide':'');m.dataset.id=id;
  m.innerHTML=`<header><h2>${title}</h2><button class="iconbtn" data-close aria-label="Close">${ic('x')}</button></header><div class="body">${body}</div>${footer?`<footer>${footer}</footer>`:''}`;
  $('#scrim').classList.add('show');setTimeout(()=>{if(m.contains(document.activeElement))return;const f=m.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea');f&&f.focus()},30);return m}
function drawer({title,body,footer='',width=560,id=''}){const d=$('#drawer');d.style.width=width+'px';d.dataset.id=id;
  d.innerHTML=`<header><h2>${title}</h2><button class="iconbtn x" data-close aria-label="Close">${ic('x')}</button></header><div class="body">${body}</div>${footer?`<footer>${footer}</footer>`:''}`;
  d.classList.add('show');$('#dscrim').classList.add('show');return d}
function close(){$('#scrim').classList.remove('show');closeDrawer()}
function closeModal(){$('#scrim').classList.remove('show')}
function closeDrawer(){const d=$('#drawer');if(!d.classList.contains('show'))return;d.classList.remove('show');$('#dscrim').classList.remove('show');clearTimeout(d._t);d._t=setTimeout(()=>{if(!d.classList.contains('show'))d.innerHTML=''},250)}

/* ---------- UI kit (all return HTML strings) ---------- */
const UI={
  ic,esc,gbp,uid,initials,
  pageHead({title,sub='',back='',actions='',learn=false,tutorial=false}){
    return `<div class="page-head"><div style="display:flex;align-items:center;gap:12px">${back?`<a href="#${back}" class="iconbtn" aria-label="Back">${ic('back')}</a>`:''}<div><h1>${title}</h1>${sub?`<p class="sub">${sub}</p>`:''}</div></div>
    <div class="actions">${tutorial?`<button class="btn ghost" data-action="tutorial">${ic('play','sm')}Watch Tutorial</button>`:''}${learn?`<button class="btn ghost" data-action="learn">${ic('book','sm')}Learn More</button>`:''}${actions}</div></div>`},
  /* tabs: items=[{key,label,badge,soon,disabled,href}] ; if href given acts as link, else local tabset switching panels data-panel="set:key" */
  tabs(items,active,set=''){return `<div class="tabs" ${set?`data-tabset="${set}"`:''} role="tablist">${items.map(t=>{const k=t.key??t.label;
    const lbl=`${t.label}${t.badge!=null?` <span class="pill grey" style="height:20px;margin-left:4px">${t.badge}</span>`:''}${t.isNew?'<span class="tag-new">NEW</span>':''}${t.soon?'<span class="tag-soon">Coming Soon</span>':''}${t.tag?`<span class="tag-soon">${t.tag}</span>`:''}`;
    return t.href&&!t.disabled?`<button class="${k===active?'on':''}" data-href="${t.href}">${lbl}</button>`:`<button class="${k===active?'on':''}" ${t.disabled?'disabled':''} data-tab="${k}">${lbl}</button>`}).join('')}</div>`},
  panel(set,key,html,active){return `<div data-panel="${set}:${key}" ${key===active?'':'hidden'}>${html}</div>`},
  seg(items,active,set=''){return `<div class="seg" ${set?`data-segset="${set}"`:''}>${items.map(t=>{const k=t.key??t.label;return `<button type="button" class="${k===active?'on':''}" data-seg="${k}" ${t.disabled?'disabled':''}>${t.icon?ic(t.icon,'sm'):''}${t.label??''}${t.badge?`<span class="tag-new">${t.badge}</span>`:''}</button>`}).join('')}</div>`},
  field({label='',required=false,help='',control='',id=''}){return `<div class="field">${label?`<label ${id?`for="${id}"`:''}>${required?'<span class="req">*</span> ':''}${label}</label>`:''}${control}${help?`<div class="help">${help}</div>`:''}</div>`},
  input({id='',value='',placeholder='',type='text',attrs='',prefix='',suffix=''}={}){const i=`<input ${id?`id="${id}" name="${id}"`:''} type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs} ${prefix||suffix?'':'class="input"'}>`;
    return prefix||suffix?`<div class="input-group">${prefix?`<span>${prefix}</span>`:''}${i}${suffix?`<span class="after">${suffix}</span>`:''}</div>`:i},
  textarea({id='',value='',placeholder='',rows=3,attrs=''}={}){return `<textarea class="input" ${id?`id="${id}" name="${id}"`:''} rows="${rows}" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`},
  select(options,value='',attrs=''){return `<select class="input" ${attrs}>${options.map(o=>{const v=typeof o==='object'?o.value:o,l=typeof o==='object'?o.label:o;return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`}).join('')}</select>`},
  toggle(checked=false,attrs=''){return `<label class="switch"><input type="checkbox" ${checked?'checked':''} ${attrs}><span></span></label>`},
  check(label,checked=false,attrs=''){return `<label class="check"><input type="checkbox" ${checked?'checked':''} ${attrs}>${label}</label>`},
  radio(name,label,checked=false,attrs=''){return `<label class="check"><input type="radio" name="${name}" ${checked?'checked':''} ${attrs} style="accent-color:var(--brand-700)">${label}</label>`},
  radioCards(name,opts,value){return `<div class="radio-cards">${opts.map(o=>`<label class="radio-card"><input type="radio" name="${name}" value="${esc(o.value)}" ${o.value===value?'checked':''}><div><strong>${o.label}${o.tag?` <span class="pill grey" style="height:20px">${o.tag}</span>`:''}</strong>${o.text?`<small>${o.text}</small>`:''}${o.extra||''}</div></label>`).join('')}</div>`},
  toggleRow(title,text='',checked=false,attrs='',extra=''){return `<div class="form-row"><div class="txt"><strong>${title}</strong>${text?`<small>${text}</small>`:''}${extra}</div>${UI.toggle(checked,attrs)}</div>`},
  upload({label='Upload',hint='',accept='image/*',sm=false}={}){return `<label class="upload ${sm?'sm':''}">${ic('upload')}<div style="font-weight:600;margin-top:4px">${label}</div>${hint?`<div class="help" style="margin-top:4px">${hint}</div>`:''}<input type="file" hidden accept="${accept}" data-upload></label>`},
  pill(t,k=''){return `<span class="pill ${k}">${t}</span>`},
  empty(icon='img',title='No data',text='',action=''){return `<div class="empty"><span class="itile">${ic(icon)}</span><div style="color:var(--ink);font-weight:600">${title}</div>${text?`<div style="margin-top:4px">${text}</div>`:''}${action?`<div style="margin-top:14px">${action}</div>`:''}</div>`},
  /* table: cols=[{label,sort,filter,align,w}] rows=[[cells]] */
  table({cols,rows,empty='No data',check=false,cls=''}){return `<div class="tbl-wrap"><table class="${cls}"><thead><tr>${check?'<th style="width:36px"><input type="checkbox" data-checkall></th>':''}${cols.map(c=>{c=typeof c==='string'?{label:c}:c;return `<th style="${c.align?`text-align:${c.align};`:''}${c.w?`width:${c.w};`:''}">${c.label}${c.sort||c.filter?`<span class="th-tools">${c.sort?ic('sort','sm'):''}${c.filter?`<button class="iconbtn" style="width:22px;height:22px;border:0;background:none" data-action="col-filter" data-col="${esc(c.label)}" data-options="${esc((c.filter===true?[]:c.filter).join('|'))}">${ic('filter','sm')}</button>`:''}</span>`:''}</th>`}).join('')}</tr></thead>
      <tbody>${rows.length?rows.map(r=>{const cells=Array.isArray(r)?r:r.cells;return `<tr ${r.attrs||''}>${check?'<td><input type="checkbox" data-rowcheck></td>':''}${cells.map((c,i)=>{const col=typeof cols[i]==='object'?cols[i]:{};return `<td style="${col.align?`text-align:${col.align}`:''}">${c}</td>`}).join('')}</tr>`}).join(''):`<tr><td colspan="${cols.length+(check?1:0)}">${UI.empty('table',empty)}</td></tr>`}</tbody></table></div>`},
  pagination(total=1){return `<div class="pagination"><button class="iconbtn" style="width:32px;height:32px" aria-label="Previous">${ic('left','sm')}</button><span class="pill">1</span><button class="iconbtn" style="width:32px;height:32px" aria-label="Next">${ic('chev','sm')}</button><select class="input" style="width:110px;height:32px"><option>10 / page</option><option>20 / page</option><option>50 / page</option></select></div>`},
  hubCards(cards,cols=4){return `<div class="hub" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cards.map(c=>`<a class="hub-card ${c.locked?'locked':''}" ${c.href&&!c.locked?`href="#${c.href}"`:''} ${c.action?`data-action="${c.action}"`:''} ${c.locked?'data-action="locked"':''}>${c.locked?`<span class="lock">${ic('lock','sm')}</span>`:''}<span class="itile">${ic(c.icon)}</span><h3>${c.title}</h3><p>${c.text||''}</p></a>`).join('')}</div>`},
  searchBox(ph='Search',attrs=''){return `<label class="search">${ic('search','sm')}<input placeholder="${esc(ph)}" ${attrs}></label>`},
  dateRange(a='08/11/2026',b='08/11/2026'){return `<div class="input-group" style="width:260px">${'<input value="'+a+'" aria-label="Start date">'}<span style="border:0;background:#fff">→</span><input value="${b}" aria-label="End date"><span class="after">${ic('cal','sm')}</span></div>`},
  /* dropdown button: items=[{label,icon,action,href,danger,disabled,divider,data}] */
  dd(trigger,items,{left=false,cls='btn secondary',aria=''}={}){return `<div class="dd"><button type="button" class="${cls}" data-dd ${aria?`aria-label="${aria}"`:''}>${trigger}</button><div class="dd-menu ${left?'left':''}">${items.map(i=>i.divider?'<hr>':`<button type="button" class="${i.danger?'danger':''} ${i.disabled?'disabled':''} ${i.sub?'sub':''}" ${i.action?`data-action="${i.action}"`:''} ${i.href?`data-href="${i.href}"`:''} ${i.data||''}>${i.icon?ic(i.icon,'sm'):''}<span>${i.label}</span>${i.sub?ic('chev','sm'):''}</button>`).join('')}</div></div>`},
  more(items,aria='More'){return UI.dd(ic('dots'),items,{cls:'iconbtn',aria})},
  /* availability block (Always / Specific dates / Periodic) */
  availability(name='av',value='always'){const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return `<div class="radio-cards">
      <label class="radio-card"><input type="radio" name="${name}" value="always" ${value==='always'?'checked':''}><div><strong>Always</strong><small>The menu will always be shown</small></div></label>
      <label class="radio-card"><input type="radio" name="${name}" value="dates" ${value==='dates'?'checked':''}><div style="flex:1"><strong>Specific Dates & Times</strong><small>Visible only between specific dates.</small>
        <div class="help" style="margin:8px 0">Current Time: Sunday, November 8, 2026, ${new Date().toTimeString().slice(0,8)}</div>${UI.dateRange('Start date','End date')}<div style="margin-top:8px">${UI.check('All Day')}</div></div></label>
      <label class="radio-card"><input type="radio" name="${name}" value="periodic" ${value==='periodic'?'checked':''}><div style="flex:1"><strong>Periodic</strong><small>Repeat on chosen days and times.</small>
        <div class="days" style="margin-top:10px">${days.map(d=>`<div class="day">${UI.check(d)}<input class="input" type="time" value="07:00" aria-label="${d} start"><span>→</span><input class="input" type="time" value="17:00" aria-label="${d} end"></div>`).join('')}</div></div></label></div>`},
  qr(seed='x',size=180){let h=0;for(const c of String(seed))h=(h*31+c.charCodeAt(0))>>>0;const n=25,cell=8;let r='';const rnd=()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return(h>>>0)/4294967296};
    const f=(x,y)=>`<rect x="${x*cell}" y="${y*cell}" width="${7*cell}" height="${7*cell}" fill="#1A2330"/><rect x="${(x+1)*cell}" y="${(y+1)*cell}" width="${5*cell}" height="${5*cell}" fill="#fff"/><rect x="${(x+2)*cell}" y="${(y+2)*cell}" width="${3*cell}" height="${3*cell}" fill="#1A2330"/>`;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){if((x<8&&y<8)||(x>16&&y<8)||(x<8&&y>16))continue;if(rnd()>.52)r+=`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#1A2330"/>`}
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${n*cell} ${n*cell}" role="img" aria-label="QR code" style="display:block;margin:0 auto"><rect width="100%" height="100%" fill="#fff"/>${r}${f(0,0)}${f(18,0)}${f(0,18)}</svg>`},
  bars(values,labels,{h=180,fmt=v=>v}={}){const mx=Math.max(1,...values);return `<div class="bars" style="height:${h+40}px">${values.map((v,i)=>`<div class="b" title="${labels[i]}: ${fmt(v)}"><small style="color:var(--ink);font-weight:600">${fmt(v)}</small><i style="height:${v/mx*h}px"></i><small>${labels[i]}</small></div>`).join('')}</div>`},
  heat(rows,cols,fn){return `<div style="overflow:auto"><div class="heat" style="grid-template-columns:40px repeat(${cols.length},minmax(14px,1fr));min-width:${cols.length*18+40}px">${'<span></span>'+cols.map(c=>`<small class="muted" style="font-size:10px;text-align:center">${c}</small>`).join('')}${rows.map((r,ri)=>`<small class="muted" style="font-size:11px">${r}</small>`+cols.map((c,ci)=>`<i style="opacity:${Math.max(.06,fn(ri,ci))}" title="${r} ${c}"></i>`).join('')).join('')}</div></div>`},
  spark(seed=1,color='var(--brand-700)'){let pts=[],v=50;for(let i=0;i<14;i++){v+=Math.sin(seed*7+i)*12;pts.push(`${i*10},${40-Math.max(4,Math.min(36,v/2.5))}`)}return `<svg class="sparkline" viewBox="0 0 130 40" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/></svg>`},
  kpi(label,value,delta='',icon='',dir=''){return `<div class="card kpi"><div class="lbl">${icon?`<span class="itile" style="width:30px;height:30px">${ic(icon,'sm')}</span>`:''}${label}</div><div class="val">${value}</div>${delta?`<div class="delta ${dir||(String(delta).startsWith('-')?'down':'up')}">${delta}</div>`:''}</div>`},
  stepper(steps,active){return `<div class="stepper">${steps.map((s,i)=>`${i?'<span class="ln"></span>':''}<span class="st ${i===active?'on':i<active?'done':''}"><i>${i<active?'✓':i+1}</i>${s}</span>`).join('')}</div>`},
  channelChip(k){const m={dine:['dine','Dine-in QR'],pickup:['bag','Pick-Up'],delivery:['bike','Delivery'],tablet:['tablet','Tablet']}[k];return `<span class="chip">${ic(m[0])}${m[1]}</span>`},
};

/* ---------- router ---------- */
const routes={},actions={},afters={};
const App={$,$$,UI,toast,modal,drawer,close,closeModal,closeDrawer,routes,actions,state:window.PV_DATA||{},
  route(key,fn,opts={}){routes[key]={fn,opts}},
  action(name,fn){actions[name]=fn},
  after(key,fn){afters[key]=fn},
  go(h){location.hash=h},
  current(){return location.hash.slice(1)||'dashboard'},
  render(){const h=App.current();const [key,param]=h.split('--');const r=routes[key]||routes.dashboard||{fn:()=>UI.empty('info','Page not found'),opts:{}};
    const app=$('#app');app.classList.toggle('full',!!r.opts.full);
    if(r.opts.collapse)app.classList.add('collapsed');else if(!App._userCollapsed)app.classList.remove('collapsed');
    $('#view').innerHTML=r.fn(param)||'';renderNav(r.opts.nav||key);
    (afters[key]||(()=>{}))(param);app.classList.remove('mobile-open')},
};
window.App=App;

/* ---------- shell ---------- */
const NAV=[
  ['',[['dashboard','home','Dashboard']]],
  ['Grow with AI',[['menu-management','menu','AI Menu Manager'],['website-builder','code','AI Website Builder'],['brand-kit','palette','AI Brand Kit',1],['ai-media-studio','wand','AI Media Studio',1],['ai-marketing','sparkle','AI Marketing Hub',1],['ai-reports','bars','AI Reports',1]]],
  ['Operate',[['orders','bell2','Orders'],['reservations','cal','Reservations'],['engagement','heart','Guests & Engagement']]],
  ['Insights',[['reports','trend','Reports']]],
  ['Setup',[['marketplace','cart','Marketplace'],['settings','gear','Settings'],['ai-media-library','img','AI Media Library']]],
];
function renderNav(active){
  const grp=active.split('-')[0];
  $('#nav').innerHTML=NAV.map(([g,items])=>`<div class="nav-group">${g?`<div class="eyebrow">${g}</div>`:''}${items.map(([k,i,l,n])=>{const on=active===k||active.startsWith(k);return `<a href="#${k}" class="${on?'on':''}" title="${l}"><span class="tile">${ic(i)}</span><span class="lbl">${l}</span>${n?'<span class="new">New</span>':''}</a>`}).join('')}</div>`).join('');
}
function shell(){
  document.body.insertAdjacentHTML('afterbegin',`
<div class="app" id="app">
  <aside class="side" id="side">
    <div class="brand"><b>PROVIEW</b><span>Menu</span></div>
    ${UI.dd(`<span class="av" id="venueAv">A</span><div style="flex:1"><strong id="venueName">Alici's</strong></div>${ic('chev','sm')}`,[],{cls:'venue',left:true,aria:'Switch venue'}).replace('<div class="dd-menu left"></div>',`<div class="dd-menu left" style="width:260px;padding:10px">
      ${UI.searchBox('Search','id="venueSearch"')}<div style="display:flex;justify-content:space-between;align-items:center;margin:12px 4px 6px"><span class="eyebrow">Venues</span><button class="btn ghost sm" style="width:auto;padding:0 8px" data-action="add-venue">${ic('plus','sm')}Add</button></div>
      <div id="venueList"></div><hr><button data-action="add-brand">${ic('store','sm')}<span>Add New Brand</span></button></div>`)}
    <nav class="nav" id="nav"></nav>
    <div class="credits"><span class="itile" style="width:32px;height:32px">${ic('coin','sm')}</span><strong id="credits">0 Credits</strong><button class="iconbtn" data-action="toggle-credits" aria-label="Show or hide balance">${ic('eye','sm')}</button></div>
  </aside>
  <div class="main">
    <header class="top">
      <button class="iconbtn" data-action="collapse" aria-label="Collapse sidebar">${ic('sidebar')}</button>
      <div class="top-search"><label class="search" style="max-width:none">${ic('search','sm')}<input id="globalSearch" placeholder="Search" aria-label="Search" autocomplete="off"></label><div class="results" id="searchResults"></div></div>
      <div class="spacer"></div>
      ${UI.dd(ic('share'),[{label:'Menu Link',icon:'link',action:'copy-menu-link'},{label:'Website Link',icon:'globe',disabled:true},{label:'Reservation Link',icon:'cal',action:'copy-res-link'},{label:'Preview QR Menu',icon:'qr',action:'preview-qr'}],{cls:'iconbtn',aria:'Share'})}
      ${UI.dd(ic('help'),[{label:'Visit Support Center',icon:'book',action:'support'},{label:'Start Live Chat',icon:'msg',action:'live-chat'}],{cls:'iconbtn',aria:'Help'})}
      <button class="iconbtn" data-action="notifications" aria-label="Notifications">${ic('bell')}<span class="badge" id="notifBadge">9</span></button>
      <button class="iconbtn" data-action="whats-new" aria-label="What's New">${ic('rocket')}<span class="badge" id="wnBadge">11</span></button>
      <button class="iconbtn" data-action="theme" aria-label="Change theme">${ic('sun')}</button>
      ${UI.dd(`<span class="me">ÖA</span>`,[{label:'Account Settings',icon:'user',action:'account'},{label:'Notifications',icon:'bell',action:'notifications'},{label:'Help Center',icon:'help',action:'support'},{label:'Change Sound',icon:'sound',action:'change-sound',sub:1},{label:'Change Language',icon:'translate',action:'change-language',sub:1},{label:'Change Theme',icon:'sun',action:'change-theme',sub:1},{label:'Partner Program',icon:'handshake',action:'partner'},{divider:1},{label:'Sign Out',icon:'logout',action:'sign-out',danger:1}],{cls:'iconbtn',aria:'Account menu'}).replace('class="iconbtn"','class="iconbtn" style="border:0;width:auto"')}
    </header>
    <main class="content" id="view"></main>
  </div>
  <button class="fab ai-grad" data-action="open-iq" aria-label="Open Proview IQ">${ic('sparkle')}</button>
  <aside class="iq-panel" id="iq"></aside>
</div>
<div class="scrim" id="scrim"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>
<div class="drawer-scrim" id="dscrim" data-close></div><aside class="drawer" id="drawer" role="dialog" aria-modal="true"></aside>
<div class="toast" id="toast">${ic('check','sm')}<span></span></div>`);
  renderVenues();
}
function renderVenues(q=''){const v=(App.state.venues||[{name:"Alici's"}]).filter(x=>x.name.toLowerCase().includes(q.toLowerCase()));
  $('#venueList').innerHTML=v.map((x,i)=>`<button data-action="switch-venue" data-name="${esc(x.name)}" style="${x.name===$('#venueName').textContent?'background:var(--brand-tint);color:var(--brand-900);font-weight:700':''}"><span class="avatar" style="width:28px;height:28px;font-size:12px">${initials(x.name)}</span><span>${esc(x.name)}</span></button>`).join('')||'<p class="muted" style="padding:6px">No venues found</p>'}

/* ---------- shell actions ---------- */
const A=App.action;
A('collapse',()=>{if(innerWidth<=760)$('#app').classList.toggle('mobile-open');else{$('#app').classList.toggle('collapsed');App._userCollapsed=$('#app').classList.contains('collapsed')}});
A('switch-venue',el=>{$('#venueName').textContent=el.dataset.name;$('#venueAv').textContent=el.dataset.name[0];renderVenues();toast('Switched to '+el.dataset.name)});
A('add-venue',()=>modal({title:'Add Venue',body:UI.field({label:'Venue Name',required:true,control:UI.input({id:'nvName',placeholder:'e.g. Alici\'s Brighton'})})+UI.field({label:'Country',control:UI.select(['United Kingdom','Ireland','Türkiye'])}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="save-venue">Create</button>`}));
A('save-venue',()=>{const n=$('#nvName').value.trim();if(!n)return toast('Enter a venue name');App.state.venues.push({name:n});renderVenues();closeModal();toast('Venue added')});
A('add-brand',()=>modal({title:'Add New Brand',body:UI.field({label:'Brand Name',required:true,control:UI.input({id:'nbName'})}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="close-toast" data-msg="Brand created">Create</button>`}));
A('close-toast',el=>{close();toast(el.dataset.msg||'Saved')});
A('toggle-credits',el=>{const c=$('#credits');c.dataset.h=c.dataset.h?'':'1';c.textContent=c.dataset.h?'•• Credits':(App.state.credits||0)+' Credits';el.innerHTML=ic(c.dataset.h?'eyeoff':'eye','sm')});
A('copy-menu-link',()=>copy('https://menu.proviewtech.co.uk/SJ5RJTroD','Menu link copied'));
A('copy-res-link',()=>copy('https://menu.proviewtech.co.uk/SJ5RJTroD/reservation','Reservation link copied'));
A('preview-qr',()=>modal({title:'Preview QR Menu',body:`${UI.qr('venue',200)}<p class="muted" style="text-align:center">Scan with your phone to preview the guest menu.</p><div class="field"><input class="input" readonly value="https://menu.proviewtech.co.uk/SJ5RJTroD"></div>`,footer:`<button class="btn secondary" data-action="copy-menu-link">${ic('copy','sm')}Copy Link</button><button class="btn primary" data-action="download">${ic('download','sm')}Download</button>`}));
A('support',()=>modal({title:'Support Center',body:`<p style="margin-top:0">Proview's UK support team is here 7 days a week.</p><div class="stat-row"><span>Phone</span><strong style="color:var(--ink)">0330 111 0000</strong></div><div class="stat-row"><span>Email</span><strong style="color:var(--ink)">support@proviewtech.co.uk</strong></div><div class="stat-row"><span>Help articles</span><a href="https://proviewtech.co.uk">proviewtech.co.uk</a></div>`}));
A('live-chat',()=>{drawer({title:'Live Chat',width:400,body:`<div class="msg ai">Hi Ömer 👋 You're through to Proview support. How can we help?</div><div id="chatLog"></div>`,footer:`<input class="input" id="chatIn" placeholder="Type a message…" style="flex:1"><button class="btn primary" data-action="chat-send">${ic('send','sm')}</button>`})});
A('chat-send',()=>{const v=$('#chatIn').value.trim();if(!v)return;$('#chatLog').insertAdjacentHTML('beforeend',`<div class="msg me">${esc(v)}</div><div class="msg ai">Thanks, an agent will reply here shortly.</div>`);$('#chatIn').value=''});
A('notifications',()=>{$('#notifBadge').remove?.();drawer({title:'Notifications',width:440,body:`
  <div class="card pad" id="pushBanner" style="display:flex;gap:12px;align-items:flex-start;background:var(--brand-tint-subtle);margin-bottom:16px"><span class="itile" style="width:36px;height:36px">${ic('bell','sm')}</span><div style="flex:1"><strong style="color:var(--ink)">Enable Push Notifications</strong><div class="help">Get instant alerts for new orders, reservations, reviews and feedback, even when the browser is closed.</div><button class="btn primary sm" style="margin-top:8px" data-action="close-toast" data-msg="Push notifications enabled">Enable</button></div><button class="iconbtn" style="border:0;width:28px;height:28px" onclick="this.parentElement.remove()" aria-label="Dismiss">${ic('x','sm')}</button></div>
  ${UI.tabs([{key:'o',label:'Orders'},{key:'f',label:'Feedbacks',badge:4},{key:'r',label:'Reservations'},{key:'m',label:'…'}],'o','ntf')}
  <div style="text-align:right;margin:-8px 0 8px"><button class="btn ghost sm" data-action="mark-read">Mark All as Read</button></div>
  ${UI.panel('ntf','o',UI.empty('bell','No notifications'),'o')}
  ${UI.panel('ntf','f',(App.state.feedbacks||[]).slice(0,4).map(f=>`<div class="review" style="padding:12px 0"><strong style="color:var(--ink)">New feedback · ${f.id}</strong><div class="help">${f.date} · ${f.form}</div></div>`).join(''),'o')}
  ${UI.panel('ntf','r',UI.empty('cal','No notifications'),'o')}${UI.panel('ntf','m',UI.empty('bell','No notifications'),'o')}`})});
A('mark-read',()=>toast('All notifications marked as read'));
A('whats-new',()=>{const b=$('#wnBadge');b&&b.remove();drawer({title:`What's New <span class="pill" style="margin-left:6px">11 new</span>`,width:460,body:`<div style="text-align:right;margin:-8px 0 8px"><button class="btn ghost sm" data-action="mark-read">Mark all as read</button></div>`+
  [['Website Builder redesigned, with version history','Edit every section side by side with a live preview, then restore any earlier version.',['Sections on the left, live preview in the middle','Version history and one-click restore','Rebuild with AI any time'],18],['Post straight to Instagram','Generate a post from a menu item and publish it without leaving Proview.',['Templates for feed posts and stories','AI-written captions'],24],['AI Reports','Daily KPIs, forecasts and anomaly alerts in one place.',['11 report tabs','Hourly refresh'],30]].map(([t,d,l,a])=>`<div class="card" style="margin-bottom:14px;overflow:hidden"><div class="thumbbg" style="height:120px"></div><div style="padding:14px"><span class="pill">Product update</span> <small class="muted">${a} days ago</small><h3 style="margin-top:8px">${t}</h3><p style="margin:6px 0">${d}</p><ul style="margin:0;padding-left:18px">${l.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`).join(''),
  footer:`<button class="iconbtn" aria-label="Settings" data-action="soon">${ic('gear')}</button><button class="btn primary" data-action="soon">See all updates</button>`})});
A('theme',()=>{document.body.classList.toggle('dark');toast(document.body.classList.contains('dark')?'Dark theme on':'Light theme on')});
A('change-theme',()=>modal({title:'Change Theme',body:UI.radioCards('th',[{value:'light',label:'Light'},{value:'dark',label:'Dark'},{value:'system',label:'Use system setting'}],'light'),footer:`<button class="btn primary" data-action="close-toast" data-msg="Theme updated">Save</button>`}));
A('change-language',()=>modal({title:'Change Language',body:UI.radioCards('ln',['English','Türkçe','Español','Deutsch','Français','العربية'].map(l=>({value:l,label:l})),'English'),footer:`<button class="btn primary" data-action="close-toast" data-msg="Language updated">Save</button>`}));
A('change-sound',()=>modal({title:'Change Sound',body:UI.radioCards('snd',['Classic bell','Soft chime','Kitchen ticket','Silent'].map(l=>({value:l,label:l})),'Classic bell'),footer:`<button class="btn primary" data-action="close-toast" data-msg="Sound updated">Save</button>`}));
A('account',()=>drawer({title:'Account Settings',body:UI.field({label:'First name',control:UI.input({value:'Ömer'})})+UI.field({label:'Last name',control:UI.input({value:'Altun'})})+UI.field({label:'Email',control:UI.input({value:'altun@proviewtech.co.uk'})})+UI.field({label:'Password',control:`<button class="btn secondary">Change password</button>`}),footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="close-toast" data-msg="Account saved">Save</button>`}));
A('partner',()=>modal({title:'Partner Program',body:`<p style="margin-top:0">Refer another venue to Proview and earn a month free for every venue that signs up.</p>${UI.field({label:'Your referral link',control:UI.input({value:'https://proviewtech.co.uk/r/OA2026',attrs:'readonly'})})}`,footer:`<button class="btn primary" data-action="copy-text" data-text="https://proviewtech.co.uk/r/OA2026">Copy link</button>`}));
A('sign-out',()=>modal({title:'Sign out?',body:'<p style="margin:0">You will need to sign in again to manage your venue.</p>',footer:`<button class="btn secondary" data-close>Cancel</button><button class="btn primary" data-action="close-toast" data-msg="This is a preview – sign out is disabled">Sign Out</button>`}));
A('copy-text',el=>copy(el.dataset.text,'Copied'));
A('learn',()=>modal({title:'Learn More',body:'<p style="margin:0">Step-by-step guides for this page are in the Proview Help Center. Call 0330 111 0000 if you need a hand.</p>',footer:`<button class="btn primary" data-close>Got it</button>`}));
A('tutorial',()=>modal({title:'Watch Tutorial',wide:true,body:`<div class="thumbbg" style="aspect-ratio:16/9;border-radius:12px;display:grid;place-items:center;color:#fff">${ic('play')}</div>`}));
A('soon',()=>toast('Coming soon in this preview'));
A('download',()=>toast('Download started'));
A('export',()=>toast('Export ready – check your downloads'));
A('reload',()=>{App.render();toast('Refreshed')});
A('locked',()=>modal({title:`${ic('lock')} Contact us to unlock this feature`,body:'<p style="margin:0">This feature isn\'t included in your current plan. Our team can switch it on for you.</p>',footer:`<button class="btn secondary" data-close>Close</button><button class="btn primary" data-action="close-toast" data-msg="We'll be in touch shortly">Contact Us</button>`}));
A('col-filter',(el,e)=>{e.stopPropagation();const opts=el.dataset.options?el.dataset.options.split('|'):[];const pop=document.createElement('div');pop.className='pop';pop.innerHTML=(opts.length?opts.map(o=>`<div style="padding:4px 0">${UI.check(o,true)}</div>`).join(''):UI.input({placeholder:'Search '+el.dataset.col}))+`<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn secondary sm" data-popclose>Reset</button><button class="btn primary sm" data-popclose>OK</button></div>`;
  const r=el.getBoundingClientRect();pop.style.top=(r.bottom+scrollY+6)+'px';pop.style.left=Math.min(r.left+scrollX,innerWidth-260)+'px';document.querySelectorAll('.pop').forEach(p=>p.remove());document.body.appendChild(pop)});

/* IQ assistant */
A('open-iq',()=>{const p=$('#iq');if(p.classList.contains('show')){p.classList.remove('show');$('#app').classList.remove('iq-open');return}
  p.innerHTML=`<header><span class="itile ai-grad" style="width:32px;height:32px;color:#fff">${ic('sparkle','sm')}</span><div><strong style="color:var(--ink)">Proview IQ</strong> <span class="pill" style="height:20px">BETA</span><div class="help" style="margin:0"><span style="color:var(--ok)">●</span> Asking your data · just now</div></div>
    <div style="margin-left:auto;display:flex;gap:4px"><button class="iconbtn" style="border:0;width:32px;height:32px" data-action="iq-new" aria-label="New chat">${ic('plus','sm')}</button><button class="iconbtn" style="border:0;width:32px;height:32px" data-action="iq-history" aria-label="History">${ic('history','sm')}</button><button class="iconbtn" style="border:0;width:32px;height:32px" data-action="iq-expand" aria-label="Expand">${ic('expand','sm')}</button><button class="iconbtn" style="border:0;width:32px;height:32px" data-action="open-iq" aria-label="Close">${ic('x','sm')}</button></div></header>
    <div class="body" id="iqBody">${iqHome()}</div>
    <footer><div style="display:flex;gap:8px"><textarea class="input" id="iqIn" rows="1" placeholder="Ask a follow-up..." style="min-height:40px"></textarea><button class="btn primary" style="border-radius:50%;width:40px;padding:0" data-action="iq-send" aria-label="Send">${ic('send','sm')}</button></div><div class="help" style="text-align:center">IQ can be wrong. Always verify important details.</div></footer>`;
  p.classList.add('show');$('#app').classList.add('iq-open','collapsed')});
function iqHome(){return `<div style="text-align:center;margin:20px 0"><span class="itile ai-grad" style="margin:0 auto 12px;color:#fff;width:52px;height:52px">${ic('sparkle')}</span><h2>What can I help you with?</h2><p class="muted">Ask plain-English questions about your venues, orders, items and revenue.</p></div>
  <div class="iq-sugg">${IQ_SUGG.map(([i,q])=>`<button data-action="iq-ask" data-q="${esc(q)}">${ic(i,'sm')}${q}</button>`).join('')}</div>`}
const IQ_SUGG=[['users','Unique app visitors last week'],['eye','Most-viewed menu item this month'],['star','How is my Google rating trending?'],['msg','Top complaints from recent reviews']];
const IQ_ANS={'Unique app visitors last week':'You had <b>2,184 unique visitors</b> from 2–8 Nov, down 31% on the week before. Saturday was busiest with 512.','Most-viewed menu item this month':'<b>Mediterranean Breakfast</b> is your most-viewed item this month (41 views), followed by Serpme Kahvalti (33) and English Twist (32).','How is my Google rating trending?':'Google reviews aren\'t connected yet. Connect your Google Business Profile in <a href="#settings-venue--google">Venue Information</a> and I\'ll track it daily.','Top complaints from recent reviews':'The most common theme in the last 30 days is <b>slow coffee at weekend peaks</b> (3 mentions), then portion size on the Vegan Breakfast (1).'};
function iqAsk(q){if(!$('#iq').classList.contains('show'))actions['open-iq']();const b=$('#iqBody');if(b.querySelector('.iq-sugg'))b.innerHTML='';b.insertAdjacentHTML('beforeend',`<div class="msg me">${esc(q)}</div><div class="msg ai">${IQ_ANS[q]||'I looked at your last 30 days of orders and menu views. I can\'t answer that one precisely yet in this preview, but try one of the suggested questions.'}</div>`);b.scrollTop=1e6}
App.iqAsk=iqAsk;
A('iq-ask',el=>iqAsk(el.dataset.q));
A('iq-send',()=>{const v=$('#iqIn').value.trim();if(v){iqAsk(v);$('#iqIn').value=''}});
A('iq-new',()=>{$('#iqBody').innerHTML=iqHome()});
A('iq-history',()=>{$('#iqBody').innerHTML='<h3>History</h3>'+UI.empty('history','No conversations yet')});
A('iq-expand',()=>{const p=$('#iq');p.style.width=p.style.width==='720px'?'':'720px'});

function copy(t,msg){try{navigator.clipboard.writeText(t).catch(()=>{})}catch(e){}toast(msg||'Copied')}
App.copy=copy;

/* ---------- global events ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(!t.closest('.pop')&&!t.closest('[data-action="col-filter"]'))$$('.pop').forEach(p=>p.remove());
  if(t.closest('[data-popclose]')){t.closest('.pop').remove();toast('Filter applied');return}
  const ddb=t.closest('[data-dd]');
  $$('.dd.open').forEach(d=>{if(!ddb||d!==ddb.parentElement)if(!t.closest('.dd-menu')||t.closest('.dd-menu button:not([data-keep])'))d.classList.remove('open')});
  if(ddb){ddb.parentElement.classList.toggle('open');e.preventDefault();return}
  if(t.id==='scrim'||t.closest('[data-close]')){if(t.id==='scrim'||t.closest('#modal'))closeModal();else closeDrawer();if(!t.closest('[data-action]'))return}
  const hr=t.closest('[data-href]');if(hr&&!hr.disabled){location.hash=hr.dataset.href;return}
  const tab=t.closest('[data-tabset] [data-tab]');if(tab){const set=tab.parentElement.dataset.tabset,k=tab.dataset.tab;tab.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===tab));$$(`[data-panel^="${set}:"]`).forEach(p=>p.hidden=p.dataset.panel!==`${set}:${k}`)}
  const seg=t.closest('[data-seg]');if(seg&&!seg.disabled){const box=seg.parentElement;box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===seg));const set=box.dataset.segset;if(set)$$(`[data-segpanel^="${set}:"]`).forEach(p=>p.hidden=p.dataset.segpanel!==`${set}:${seg.dataset.seg}`)}
  const chip=t.closest('.chip-btn[data-chip]');if(chip){if(chip.dataset.chip==='single')chip.parentElement.querySelectorAll('.chip-btn').forEach(c=>c.classList.toggle('on',c===chip));else chip.classList.toggle('on')}
  const sc=t.closest('.select-card[data-pick]');if(sc){sc.parentElement.querySelectorAll('.select-card').forEach(c=>c.classList.toggle('on',c===sc))}
  const a=t.closest('[data-action]');if(a&&actions[a.dataset.action]){actions[a.dataset.action](a,e)}
  else if(a&&!actions[a.dataset.action]){console.warn('missing action',a.dataset.action);toast('Coming soon in this preview')}
  const cp=t.closest('[data-copy]');if(cp)copy(cp.dataset.copy,cp.dataset.msg||'Link copied');
});
document.addEventListener('change',e=>{
  const u=e.target.closest('[data-upload]');if(u&&u.files[0]){const l=u.closest('.upload');l.classList.add('done');l.querySelector('div').textContent=u.files[0].name;toast('File added')}
  if(e.target.matches('[data-checkall]')){e.target.closest('table').querySelectorAll('[data-rowcheck]').forEach(c=>{c.checked=e.target.checked})}
  const a=e.target.closest('[data-change]');if(a&&actions[a.dataset.change])actions[a.dataset.change](a,e);
});
document.addEventListener('input',e=>{const a=e.target.closest('[data-input]');if(a&&actions[a.dataset.input])actions[a.dataset.input](a,e)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();$$('.dd.open').forEach(d=>d.classList.remove('open'))}
  if(e.key==='Enter'&&e.target.id==='iqIn'&&!e.shiftKey){e.preventDefault();actions['iq-send']()}});

/* global search */
function bindSearch(){const inp=$('#globalSearch'),box=$('#searchResults');
  inp.addEventListener('input',()=>{const q=inp.value.trim().toLowerCase();if(!q){box.style.display='none';return}
    const pages=[['Dashboard','dashboard'],['Menus','menu-management'],['Modifiers','menu-modifiers'],['Translation Center','translation-center'],['In-App Promotions','in-app-promotions'],['Orders','orders'],['All Orders','orders-all'],['Ordering Settings','orders-settings'],['Customers','engagement-customers'],['Promo Codes','engagement-promo-codes'],['Reviews','engagement-reviews'],['Feedbacks','feedbacks'],['Reports','reports'],['Settings','settings'],['Tables','settings-operations'],['QR Codes','settings-qr'],['Marketplace','marketplace'],['AI Media Studio','ai-media-studio'],['AI Reports','ai-reports'],['AI Brand Kit','brand-kit'],['AI Website Builder','website-builder']].filter(p=>p[0].toLowerCase().includes(q)).map(p=>`<a href="#${p[1]}">${ic('chev','sm')}${p[0]}<small class="muted" style="margin-left:auto">Page</small></a>`);
    const items=[];(App.state.menus||[]).forEach(m=>m.sections.forEach(s=>s.items.forEach(i=>{if(i.name.toLowerCase().includes(q)&&items.length<8)items.push(`<a href="#menu-editor--${m.id}" data-q="${esc(i.name)}">${ic('menu','sm')}${esc(i.name)}<small class="muted" style="margin-left:auto">${esc(m.name)}</small></a>`)})));
    box.innerHTML=[...pages,...items].join('')||'<div class="empty" style="padding:16px">No results</div>';box.style.display='block'});
  inp.addEventListener('blur',()=>setTimeout(()=>box.style.display='none',200))}

window.addEventListener('hashchange',()=>{close();App.render();scrollTo(0,0)});
App.boot=()=>{shell();bindSearch();App.render()};
})();
