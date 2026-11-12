// Headless tests of MULTI_BUSINESS_PICKER_STANDARD.md (OWNER UPDATE 07:47 / 07:47b, No Locations page) in Proview QR Menu
// (web/site) against a mocked Supabase: a person in two businesses (A = Burger Barn: Camden, Soho; B = Pizza Palace: Leeds).
// Usage: node web/tests/multi_business_ui.mjs web/site [shots dir]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const ROOT = process.argv[2], SHOTS = process.argv[3] || os.tmpdir();
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const base = await new Promise((ok) => { const s = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${s.address().port}/`)); });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sess = (email) => { const exp = 4102444800, uid = 'u-' + email; const jwt = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: uid, role: 'authenticated', aud: 'authenticated', email, exp }) + '.sig';
  return { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: uid, email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { pwSet: true }, email_confirmed_at: '2026-01-01T00:00:00Z' } }; };
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/0' }, body: JSON.stringify(body) });
const iso = (d) => new Date(Date.now() + d * 864e5).toISOString();
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'} ${n}${x && !c ? ' :: ' + x : ''}`);
const MASTER = 'altun@proviewtech.co.uk', TWO = 'sam@two.test', ONE = 'own@bb.test';
const A = '11111111-2222-4333-8444-555555555555', B = '22222222-2222-4333-8444-555555555555';
const NAMES = { [A]: 'Burger Barn', [B]: 'Pizza Palace' };
const S1 = 'aaaaaaaa-0000-4000-8000-000000000001', S2 = 'aaaaaaaa-0000-4000-8000-000000000002', S3 = 'bbbbbbbb-0000-4000-8000-000000000001';
const SITES = [{ id: S2, org_id: A, name: 'Soho' }, { id: S1, org_id: A, name: 'Camden' }, { id: S3, org_id: B, name: 'Leeds' }]
  .map((s) => ({ ...s, archived: false, created_at: iso(-60), license_type: 'lifetime', starts_at: iso(-60), expires_at: null }));
const MENU = { [S1]: 'Camden Burger Menu', [S2]: 'Soho Burger Menu', [S3]: 'Leeds Pizza Menu' };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
// o.mems: [{org, role, site_ids}] · o.org: {id: {suspended}} · o.lic: {siteId: {license_type, expires_at}} · o.ls: localStorage
async function boot(o) {
  const EM = o.email, s = sess(EM); const seen = []; const st = { sso: null, reply: o.reply, hdrs: [], updates: [], names: {} };
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const siteOf = (x) => ({ ...x, ...((o.lic || {})[x.id] || {}), name: st.names[x.id] || x.name });
  await ctx.route(/supabase\.co|jsdelivr|cdnjs/, (r) => { const u = new URL(r.request().url()), p = u.pathname;
    if (!/supabase\.co/.test(u.host)) return r.continue();
    if (r.request().method() === 'OPTIONS') return json(r, {});
    const body = JSON.parse(r.request().postData() || '{}'); seen.push(r.request().method() + ' ' + p + u.search + ' ' + JSON.stringify(body));
    const hdr = r.request().headers()['x-pq-org'] || ''; if (/\/rest\/v1\//.test(p)) st.hdrs.push(hdr);
    const mems = o.master ? [] : o.mems;
    const mine = (org) => o.master ? org === hdr : mems.some((m) => m.org === org);
    if (p === '/functions/v1/sso-login') { st.sso = body; return json(r, st.reply.body, st.reply.status || 200); }
    if (p === '/auth/v1/verify') return json(r, s);
    if (p === '/rest/v1/rpc/pq_whoami') return json(r, { email: EM, master: !!o.master, trial_used: false,
      memberships: mems.map((m) => ({ org_id: m.org, org_name: NAMES[m.org], role: m.role, site_ids: m.site_ids || [], features: {}, suspended: !!((o.org || {})[m.org] || {}).suspended })) });
    if (p === '/rest/v1/rpc/pq_sites_of') { if (!mine(body.p_org)) return json(r, []); const m = mems.find((x) => x.org === body.p_org);
      let L = SITES.filter((x) => x.org_id === body.p_org).map(siteOf); if (m && ['manager', 'staff'].includes(m.role)) L = L.filter((x) => (m.site_ids || []).includes(x.id));
      return json(r, L.sort((x, y) => x.name.localeCompare(y.name))); }
    if (p === '/rest/v1/pq_orgs') { const id = (u.searchParams.get('id') || '').replace('eq.', ''); return json(r, mine(id) ? { id, name: NAMES[id], suspended: !!((o.org || {})[id] || {}).suspended } : null); }
    if (p === '/rest/v1/pq_state') { const sid = (u.searchParams.get('site_id') || '').replace('eq.', ''); const ok2 = SITES.some((x) => x.id === sid && mine(x.org_id));
      return json(r, ok2 ? { data: { menus: [{ id: 'm1', name: MENU[sid], on: true, sections: [] }] }, updated_at: iso(0) } : null); }
    if (p === '/rest/v1/rpc/pq_update_site') { st.updates.push(body); if (body.p_name) st.names[body.p_site] = body.p_name; return json(r, null); }
    if (p === '/rest/v1/rpc/pq_plans') return json(r, { m12: { label: '12 months', amount: 15000, link: 'https://buy.stripe.com/test' } });
    if (p === '/rest/v1/rpc/pq_inbox_take') return json(r, []);
    if (p === '/rest/v1/rpc/pq_save_state') return json(r, null);
    if (p === '/rest/v1/pq_members') return json(r, []);
    if (p.startsWith('/auth/v1/user')) return json(r, s.user);
    if (p.startsWith('/auth/v1/logout')) return r.fulfill({ status: 204 });
    return json(r, []); });
  await ctx.addInitScript(([s, extra]) => { if (!sessionStorage.getItem('__i')) { sessionStorage.setItem('__i', 1); localStorage.clear(); localStorage.setItem('sb-yblafwttmqaqvfvedaoc-auth-token', JSON.stringify(s)); Object.entries(extra || {}).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); } }, [o.reply && !o.master ? s : s, o.ls]);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + 'index.html' + (o.url || '')); await p.waitForTimeout(2200);
  return { ctx, p, errs, seen, st };
}
const text = (p) => p.evaluate(() => document.body.innerText);
const view = (p) => p.evaluate(() => (document.querySelector('#view') || document.body).innerText);
const hdrOpts = (p) => p.$$eval('#hdr-site option', (o) => o.map((x) => x.textContent));
const picked = (p) => p.$eval('#hdr-site', (s) => s.options[s.selectedIndex] ? s.options[s.selectedIndex].textContent : '');
const box = (p) => p.$eval('#hdr-site', (s) => s.disabled ? s.textContent.trim() : null);
const locOpts = (p) => p.$$eval('#pqLoc option', (o) => o.map((x) => x.textContent));
const locNow = (p) => p.$eval('#pqLoc', (s) => s.options[s.selectedIndex].textContent).catch(() => null);
const go = async (p, h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(600); };
const two = (ra = 'owner', rb = 'owner', extra = {}) => [{ org: A, role: ra, ...(extra.a || {}) }, { org: B, role: rb, ...(extra.b || {}) }];
const LAST = (org, site) => ({ ['pq_last_' + TWO]: { org, site } });
const plain = async (p, who) => { const h = await p.$eval('.top', (e) => e.outerHTML);
  ok(who + ': header has no location breakdown (no optgroup, ▸, All my locations, Choose/Switch location)', !/optgroup|▸|All my locations|All locations|Choose location|Switch location/.test(h), h.slice(0, 300)); };
const HDR = JSON.stringify(['Burger Barn', 'Pizza Palace']);
const done = async (n, x) => { ok(n + ': no page errors', !x.errs.length, x.errs.join(' | ')); await x.ctx.close(); };

// 1. two businesses: names only; lands in the last used
{ const x = await boot({ email: TWO, mems: two(), ls: LAST(B, S3) }); const { p } = x;
  ok('two: header lists business names only, by name', JSON.stringify(await hdrOpts(p)) === HDR, JSON.stringify(await hdrOpts(p)));
  await plain(p, 'two');
  ok('two: select aria-label "Business", hidden label "Business"', await p.$eval('#hdr-site', (s) => s.getAttribute('aria-label') === 'Business') && await p.$eval('label[for=hdr-site]', (l) => l.textContent.trim() === 'Business'));
  ok('two: lands in the last-used business (Pizza Palace)', await picked(p) === 'Pizza Palace' && /Leeds Pizza Menu/.test(await p.evaluate(() => JSON.stringify(window.App.state.menus))), await picked(p));
  ok('two: no "choose a business" page, lands on the Dashboard', await p.evaluate(() => window.App.current()) === 'dashboard', p.url());
  await p.evaluate(() => { window.App.actions['pq-signout-yes'](); }); await p.waitForTimeout(2000);
  { const kept = await p.evaluate((k) => localStorage.getItem(k), 'pq_last_' + TWO); ok('two: the business used last is kept through sign-out', kept && JSON.parse(kept).org === B && /Sign in/.test(await text(p)), String(kept) + ' ' + (await text(p)).slice(0, 80)); }
  await p.screenshot({ path: SHOTS + '/qr-two.png' });
  await done('two last used B', x); }
{ const x = await boot({ email: TWO, mems: two() });
  ok('two: nothing remembered → the first business by name', await picked(x.p) === 'Burger Barn');
  await done('two nothing remembered', x); }
{ const x = await boot({ email: TWO, mems: two(), ls: LAST(B, S3), url: '#pv_sso=T', reply: { body: { token_hash: 'h', email: TWO } } });
  ok('two SSO: lands in the last-used business', await picked(x.p) === 'Pizza Palace', await picked(x.p));
  await done('two SSO', x); }

// 2. switching: B, then A covers its locations (in-page select), never mixing
{ const x = await boot({ email: TWO, mems: two(), ls: LAST(A, S2) }); const { p } = x;
  ok('A: opens the last-used location (Soho)', await locNow(p) === 'Soho', await locNow(p));
  ok('A: in-page location select lists A\'s locations only, by name', JSON.stringify(await locOpts(p)) === JSON.stringify(['Camden', 'Soho']), JSON.stringify(await locOpts(p)));
  ok('A: in-page select has aria-label "Location", no "All" entry', await p.$eval('#pqLoc', (s) => s.getAttribute('aria-label') === 'Location' && ![...s.options].some((o) => /All/.test(o.textContent))));
  await p.selectOption('#hdr-site', B); await p.waitForTimeout(1200);
  ok('switch to B: header shows Pizza Palace', await picked(p) === 'Pizza Palace');
  const mB = await p.evaluate(() => JSON.stringify(window.App.state.menus));
  ok('switch to B: B\'s data only', /Leeds Pizza Menu/.test(mB) && !/Burger/.test(mB), mB);
  ok('switch to B: one location, no in-page select', !(await p.$('#pqLoc')));
  ok('switch to B: remembered by email', await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).org, 'pq_last_' + TWO) === B);
  ok('switch to B: nothing of A on the page', !/Burger Barn|Camden|Soho/.test(await view(p)));
  await p.selectOption('#hdr-site', A); await p.waitForTimeout(1200);
  ok('switch back to A: its last location (Soho) again', await locNow(p) === 'Soho' && await picked(p) === 'Burger Barn');
  await p.selectOption('#pqLoc', S1); await p.waitForTimeout(1000);
  const mA = await p.evaluate(() => JSON.stringify(window.App.state.menus));
  ok('A ▸ Camden via the in-page select: Camden\'s data only', /Camden Burger Menu/.test(mA) && !/Pizza|Soho/.test(mA), mA);
  ok('A: header still the business', await picked(p) === 'Burger Barn');
  await done('two switch', x); }

// 3. fallback when A is unusable
{ const x = await boot({ email: TWO, mems: two(), org: { [A]: { suspended: true } }, ls: LAST(A, S1) });
  ok('A paused: lands in Pizza Palace (not signed out)', await picked(x.p) === 'Pizza Palace' && !/Sign in/.test(await text(x.p)), await picked(x.p));
  ok('A paused: fallback not saved over the last used', await x.p.evaluate((k) => JSON.parse(localStorage.getItem(k)).org, 'pq_last_' + TWO) === A);
  await done('fallback paused', x); }
{ const x = await boot({ email: TWO, mems: two(), lic: { [S1]: { license_type: null }, [S2]: { license_type: 'm12', expires_at: iso(-3) } }, ls: LAST(A, S1) });
  ok('A no working licence: lands in Pizza Palace', await picked(x.p) === 'Pizza Palace', await picked(x.p));
  ok('A no working licence: only usable businesses listed, one left = disabled box (07:55)', await box(x.p) === 'Pizza Palace', JSON.stringify(await hdrOpts(x.p)));
  await done('fallback licence', x); }
{ const x = await boot({ email: TWO, mems: two('manager', 'owner', { a: { site_ids: [] } }), ls: LAST(A, S1) });
  ok('A has no location for them: lands in Pizza Palace (one business left: disabled box)', await box(x.p) === 'Pizza Palace', JSON.stringify(await hdrOpts(x.p)));
  await done('fallback no locations', x); }
{ const x = await boot({ email: TWO, mems: two(), org: { [B]: { suspended: true } }, ls: LAST(B, S3) });
  ok('B paused, last used B: lands in Burger Barn', await picked(x.p) === 'Burger Barn', await picked(x.p));
  await done('fallback B', x); }
{ const x = await boot({ email: TWO, mems: two('manager', 'manager', { a: { site_ids: [] }, b: { site_ids: [] } }) });
  ok('no business with a location: signed out', /Sign in/.test(await text(x.p)) && /Ask your owner or Proview/.test(await text(x.p)));
  await done('none usable', x); }

// 4. one business: its name in a disabled box
{ const x = await boot({ email: ONE, mems: [{ org: A, role: 'owner' }] }); const { p } = x;
  ok('one business: disabled box with the business name', await box(p) === 'Burger Barn', JSON.stringify(await hdrOpts(p)));
  await plain(p, 'one business');
  ok('one business, 2 locations: in-page select, first location open, Dashboard', JSON.stringify(await locOpts(p)) === JSON.stringify(['Camden', 'Soho']) && await locNow(p) === 'Camden' && await p.evaluate(() => window.App.current()) === 'dashboard');
  await done('one business', x); }
{ const x = await boot({ email: ONE, mems: [{ org: B, role: 'owner' }] });
  ok('one location: disabled box with the business name, no in-page select', await box(x.p) === 'Pizza Palace' && !(await x.p.$('#pqLoc')));
  await done('one location', x); }

// 5. master-open: the opened business's name in the same disabled box
{ const x = await boot({ email: MASTER, master: true, url: '#pv_sso=T', reply: { body: { token_hash: 'h', email: MASTER, open: A } } }); const { p } = x;
  ok('master open: Viewing Burger Barn as Proview', /Viewing Burger Barn as Proview/.test(await text(p)));
  ok('master open: disabled box with the business name', await box(p) === 'Burger Barn');
  ok('master open: in-page location select for its 2 locations', JSON.stringify(await locOpts(p)) === JSON.stringify(['Camden', 'Soho']));
  ok('master open: only Burger Barn requested', !x.seen.some((s) => s.includes(B) || s.includes('bbbbbbbb')));
  await done('master open', x); }

// 6. no Locations page, for every role; Settings → This location
const noLoc = async (p, who) => {
  ok(who + ': no Locations item in the menu', !(await p.$$eval('#nav a', (a) => a.some((x) => /Locations/.test(x.textContent) || x.getAttribute('href') === '#locations'))));
  await go(p, 'locations');
  ok(who + ': old #locations goes to the Dashboard', /#dashboard$/.test(p.url()), p.url());
};
{ const x = await boot({ email: TWO, mems: two(), ls: LAST(A, S2) }); const { p, st } = x;
  await noLoc(p, 'owner');
  await go(p, 'orders');
  await p.selectOption('#hdr-site', B); await p.waitForTimeout(1200);
  ok('switching business keeps the same page when it exists there (Orders)', await p.evaluate(() => window.App.current()) === 'orders', await p.evaluate(() => window.App.current()));
  await p.selectOption('#hdr-site', A); await p.waitForTimeout(1200);
  await go(p, 'settings');
  ok('owner: Settings has This location for the selected location (Soho)', /This location · Soho/.test(await view(p)) && await p.$eval('#pqLocName', (i) => i.value) === 'Soho');
  ok('owner: This location shows the licence in business wording', /Business licence/.test(await p.$eval('#pqThisLic', (e) => e.innerText)) && /Each business needs its own licence/.test(await p.$eval('#pqThisLic', (e) => e.innerText)) && /Lifetime/.test(await p.$eval('#pqThisLic', (e) => e.innerText)));
  ok('owner: Renew online button', /Renew online/.test(await p.$eval('#pqThisLic', (e) => e.innerText)));
  await p.selectOption('#pqLoc', S1); await p.waitForTimeout(900);
  ok('owner: the in-page select changes This location (Camden)', await p.$eval('#pqLocName', (i) => i.value) === 'Camden');
  await p.fill('#pqLocName', 'Camden Town'); await p.click('[data-action=pq-loc-name-save]'); await p.waitForTimeout(1200);
  ok('owner: This location saves to that location only', st.updates.length === 1 && st.updates[0].p_site === S1 && st.updates[0].p_name === 'Camden Town', JSON.stringify(st.updates));
  ok('owner: the new name shows', await p.$eval('#pqLocName', (i) => i.value) === 'Camden Town' && (await locOpts(p)).includes('Camden Town'));
  await p.click('[data-action=pq-buy-loc]'); await p.waitForTimeout(500);
  ok('owner: Renew opens the plans for that location', /12 months/.test(await p.evaluate(() => document.querySelector('#modal')?.innerText || '')) && await p.evaluate((id) => !!document.querySelector(`#modal a[href*="pvq__${id}__m12"]`), S1));
  await p.screenshot({ path: SHOTS + '/qr-thisloc.png' });
  await done('no Locations owner', x); }
{ const x = await boot({ email: ONE, mems: [{ org: B, role: 'owner' }], lic: { [S3]: { license_type: null } } }); const { p } = x;
  ok('locked: lock says the business needs a licence, buy online', /No licence yet/.test(await view(p)));
  await go(p, 'settings');
  ok('locked: Settings shows the lock with Buy online for that location', /No licence yet/.test(await view(p)) && await p.evaluate((id) => !!document.querySelector(`#view .pq-lock a[href*="pvq__${id}__m12"]`), S3) && /Buy online/.test(await view(p)));
  ok('locked: no "Other locations" link to the old Locations page', !(await p.$('a[href="#locations"]')));
  await done('locked', x); }
{ const x = await boot({ email: TWO, mems: [{ org: A, role: 'manager', site_ids: [S1] }] });
  await noLoc(x.p, 'manager');
  await go(x.p, 'settings');
  ok('manager: This location shows the name read-only, no Rename/Buy', /This location · Camden/.test(await view(x.p)) && !(await x.p.$('#pqLocName')) && !(await x.p.$('[data-action=pq-buy-loc]')));
  await done('no Locations manager', x); }
{ const x = await boot({ email: TWO, mems: [{ org: A, role: 'staff', site_ids: [S1] }] });
  await noLoc(x.p, 'staff');
  await done('no Locations staff', x); }
{ const x = await boot({ email: MASTER, master: true, url: '#pv_sso=T', reply: { body: { token_hash: 'h', email: MASTER, open: A } } }); const { p } = x;
  await noLoc(p, 'master');
  await go(p, 'settings');
  ok('master: This location has Trial…, Licence portal, Pause and Delete business', await p.locator('#pqThisLoc [data-action=pq-trial]').count() === 1 && await p.locator('#pqThisLoc a[href="https://license.proviewcrm.co.uk/"]').count() === 1 && await p.locator('#pqThisLoc [data-action=pq-suspend-org]').count() === 1 && await p.locator('#pqThisLoc [data-action=pq-del-org]').count() === 1);
  await done('no Locations master', x); }

// business wording (owner, 12 Nov 2026: the licence portal says Businesses)
{ const x = await boot({ email: MASTER, master: true });
  const t = await text(x.p);
  ok('master direct: "Open a business from the licence portal", businesses added and linked there', /Open a business from the licence portal/.test(t) && /Businesses are added and linked there too \(New business, Link with another business\)/.test(t) && !/Open a location/.test(t), t.slice(0, 300));
  await done('wording master', x); }
{ const x = await boot({ email: ONE, mems: [{ org: A, role: 'owner' }] }); await go(x.p, 'settings');
  ok('owner: This location says businesses are set up by Proview', /Businesses are set up and linked by Proview/.test(await view(x.p)));
  await done('wording owner', x); }

await b.close();
console.log(res.join('\n')); const f = res.filter((x) => x.startsWith('FAIL')).length; console.log(`\n${res.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
