// Headless tests of Proview QR Menu (web/site) against a mocked Supabase: master direct, master opened from the licence
// portal (biz), reload, switch, old link, gone business, owner / manager unchanged. Usage: node ui.mjs <web/site> [shots dir]
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
const MASTER = 'altun@proviewtech.co.uk';
const A = '11111111-2222-4333-8444-555555555555', B = '22222222-2222-4333-8444-555555555555';
const ORGS = [{ id: A, name: 'Burger Barn', suspended: false }, { id: B, name: 'Pizza Palace', suspended: false }];
const SITES = [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', org_id: A, name: 'Camden' }, { id: 'aaaaaaaa-0000-4000-8000-000000000002', org_id: A, name: 'Soho' }, { id: 'bbbbbbbb-0000-4000-8000-000000000001', org_id: B, name: 'Leeds' }]
  .map((s) => ({ ...s, archived: false, created_at: iso(-60), license_type: 'lifetime', starts_at: iso(-60), expires_at: null, last_seen: iso(0) }));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function boot(o) {
  const EM = o.email, s = sess(EM); const seen = []; const st = { sso: null, reply: o.reply, hdrs: [] };
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route(/supabase\.co|jsdelivr|cdnjs/, (r) => { const u = new URL(r.request().url()), p = u.pathname;
    if (!/supabase\.co/.test(u.host)) return r.continue();
    if (r.request().method() === 'OPTIONS') return json(r, {});
    const body = JSON.parse(r.request().postData() || '{}'); seen.push(r.request().method() + ' ' + p + u.search + ' ' + JSON.stringify(body));
    // migration 011: the master only gets the business named in x-pq-org
    const hdr = r.request().headers()['x-pq-org'] || ''; if (/\/rest\/v1\//.test(p)) st.hdrs.push(hdr);
    const deny = o.master && /\/rest\/v1\/(rpc\/pq_sites_of|pq_orgs)$/.test(p) && (body.p_org || (u.searchParams.get('id') || '').replace('eq.', '')) !== hdr;
    if (deny) return json(r, p.includes('rpc') ? [] : null);
    if (p === '/functions/v1/sso-login') { st.sso = body; return json(r, st.reply.body, st.reply.status || 200); }
    if (p === '/auth/v1/verify') return json(r, s);
    if (p === '/rest/v1/rpc/pq_whoami') return json(r, o.master ? { email: EM, master: true, trial_used: false, memberships: [] }
      : { email: EM, master: false, trial_used: false, memberships: [{ org_id: A, org_name: 'Burger Barn', role: o.role, site_ids: o.role === 'manager' ? [SITES[0].id] : [], features: {}, suspended: false }] });
    if (p === '/rest/v1/rpc/pq_orgs_list') return json(r, ORGS);
    if (p === '/rest/v1/rpc/pq_sites_of') { const L = SITES.filter((x) => x.org_id === body.p_org); return json(r, o.role === 'manager' ? L.filter((x) => x.id === SITES[0].id) : L); }
    if (p === '/rest/v1/pq_orgs') { const id = (u.searchParams.get('id') || '').replace('eq.', ''); return json(r, ORGS.find((x) => x.id === id) || null); }
    if (p === '/rest/v1/pq_sites') return json(r, SITES);
    if (p === '/rest/v1/pq_state') { const one = (u.searchParams.get('site_id') || '').startsWith('eq.'); return json(r, one ? { data: { menus: [{ id: 'm1', name: 'Secret ' + (u.searchParams.get('site_id').includes('bbbb') ? 'Pizza' : 'Burger') + ' Menu', on: true, sections: [] }] }, updated_at: iso(0) } : []); }
    if (p === '/rest/v1/rpc/pq_plans') return json(r, {});
    if (p === '/rest/v1/rpc/pq_inbox_take') return json(r, []);
    if (p === '/rest/v1/rpc/pq_save_state') return json(r, null);
    if (p === '/rest/v1/pq_members') return json(r, []);
    if (p.startsWith('/auth/v1/user')) return json(r, s.user);
    if (p.startsWith('/auth/v1/logout')) return r.fulfill({ status: 204 });
    return json(r, []); });
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('__i')) { sessionStorage.setItem('__i', 1); localStorage.clear(); localStorage.setItem('sb-yblafwttmqaqvfvedaoc-auth-token', JSON.stringify(s)); } }, s);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + 'index.html' + (o.url || '')); await p.waitForTimeout(2200);
  return { ctx, p, errs, seen, st };
}
const text = (p) => p.evaluate(() => document.body.innerText);
const html = (p) => p.evaluate(() => document.documentElement.outerHTML + Object.entries(localStorage).join('\n') + Object.entries(sessionStorage).join('\n'));
const master = (seen) => seen.filter((x) => /pq_orgs_list|\/rest\/v1\/pq_sites |\/rest\/v1\/pq_sites\?/.test(x));

// 1. master signed in directly
{ const { ctx, p, errs, seen } = await boot({ email: MASTER, master: true, url: '#locations' });
  const t = await text(p);
  ok('master direct: "Open a customer from the licence portal" page', /Open a customer from the licence portal/.test(t), t.slice(0, 300));
  ok('master direct: button to the licence portal', (await p.getAttribute('#pqToPortal', 'href')) === 'https://license.proviewcrm.co.uk/');
  ok('master direct: no business list or location data requested', !seen.some((x) => /pq_orgs_list|pq_sites|pq_orgs|pq_state|pq_sites_of/.test(x)), seen.join('\n'));
  ok('master direct: no business on the page', !/Burger Barn|Pizza Palace|Camden|Leeds/.test(await html(p)));
  ok('master direct: no Locations item, every page greyed, no dropdown', await p.locator('#nav a[href="#locations"]').count() === 0 && await p.evaluate(() => [...document.querySelectorAll('#nav a')].every((a) => a.dataset.grey)) && await p.evaluate(() => document.querySelector('.hdr-pick').hidden));
  await p.click('#nav a[data-grey]', { force: true }); await p.waitForTimeout(150);
  ok('master direct: greyed page says open from the portal', /Open a customer from the licence portal first/.test(await p.evaluate(() => document.querySelector('#toast').textContent)));
  await p.evaluate(() => { location.hash = 'orders'; }); await p.waitForTimeout(300);
  ok('master direct: other pages go back to the portal page', /#portal$/.test(p.url()));
  await p.screenshot({ path: SHOTS + '/qr-master-direct.png' });
  ok('master direct: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }

// 2. master opened from the licence portal (Burger Barn), then reload, then another customer, then an old link
{ const { ctx, p, errs, seen, st } = await boot({ email: MASTER, master: true, url: `?open=${B}#pv_sso=TOKEN1`, reply: { body: { token_hash: 'h1', email: MASTER, open: A } } });
  ok('master biz: hand-off posted to sso-login', st.sso && st.sso.assertion === 'TOKEN1');
  ok('master biz: address cleaned', !/open=|pv_sso/.test(p.url()), p.url());
  const t = await text(p);
  ok('master biz: banner "Viewing Burger Barn as Proview" + Back to licence portal', /Viewing Burger Barn as Proview/.test(t) && (await p.getAttribute('.pq-master-bar a', 'href')) === 'https://license.proviewcrm.co.uk/', t.slice(0, 300));
  ok('master biz: lands on the business\'s Locations (All my locations)', /#locations$/.test(p.url()) && /Every location of Burger Barn/.test(t));
  const opts = await p.$$eval('#hdr-site option', (o) => o.map((x) => x.textContent));
  ok('master biz: dropdown = the business\'s locations as its owner sees them', JSON.stringify(opts) === JSON.stringify(['All my locations (2)', 'Camden', 'Soho']), JSON.stringify(opts));
  ok('master biz: no every-business list requested (pq_orgs_list / all pq_sites)', !master(seen).length, master(seen).join('\n'));
  ok('master biz: every database request names Burger Barn (x-pq-org)', st.hdrs.length > 0 && st.hdrs.every((h) => h === A), JSON.stringify([...new Set(st.hdrs)]));
  ok('master biz: only Burger Barn asked for', seen.some((x) => x.includes(A)) && !seen.some((x) => x.includes(B) || x.includes('bbbbbbbb')), seen.join('\n'));
  ok('master biz: no Add business, no All businesses', !/Add business|All businesses/.test(t));
  ok('master biz: Trial… (master tool) on each location', await p.locator('[data-action=pq-trial]').count() === 2);
  ok('master biz: pause / delete this business kept in ⋯', await p.evaluate(() => !!document.querySelector('.pv-ph [data-action=pq-suspend-org]') && !!document.querySelector('.pv-ph [data-action=pq-del-org]')));
  await p.screenshot({ path: SHOTS + '/qr-master-biz.png' });
  await p.selectOption('#hdr-site', SITES[0].id); await p.waitForTimeout(600); await p.evaluate(() => { location.hash = 'dashboard'; }); await p.waitForTimeout(500);
  ok('master biz: a location opens as for the owner', /Viewing Burger Barn as Proview/.test(await text(p)) && /#dashboard$/.test(p.url()));
  ok('master biz: Users page available (acts as Owner)', await p.locator('#nav a[href="#users"]').count() === 1);
  seen.length = 0; await p.reload(); await p.waitForTimeout(2200);
  ok('master biz: reload stays in Burger Barn, same location', /Viewing Burger Barn as Proview/.test(await text(p)) && (await p.$eval('#hdr-site', (s) => s.options[s.selectedIndex].textContent)) === 'Camden' && !seen.some((x) => x.includes(B)));
  // the portal opens another customer in the same tab
  st.reply = { body: { token_hash: 'h2', email: MASTER, open: B } }; seen.length = 0;
  await p.goto(base + 'index.html#pv_sso=TOKEN2'); await p.waitForTimeout(2200);
  const t2 = await text(p), h2 = await html(p);
  ok('master switch: now inside Pizza Palace', /Viewing Pizza Palace as Proview/.test(t2) && /Leeds/.test(t2), t2.slice(0, 200));
  ok('master switch: nothing of Burger Barn on the page', !/Burger Barn|Camden|Soho/.test(await p.evaluate(() => document.documentElement.outerHTML)));
  ok('master switch: Burger Barn not requested', !seen.some((x) => x.includes(A) || x.includes('aaaaaaaa')));
  // old link: a hand-off without a business
  st.reply = { body: { token_hash: 'h3', email: MASTER } };
  await p.goto(base + 'index.html#pv_sso=TOKEN3'); await p.waitForTimeout(2200);
  ok('master old link: portal page, no business', /Open a customer from the licence portal/.test(await text(p)) && !/Pizza Palace|Leeds|Burger Barn/.test(await p.evaluate(() => document.documentElement.outerHTML)));
  ok('master biz: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }

// 3. a business that is gone (sso-login said open, the business isn't there): portal page and a message
{ const { ctx, p, errs } = await boot({ email: MASTER, master: true, url: '#pv_sso=T', reply: { body: { token_hash: 'h', email: MASTER, open: '33333333-2222-4333-8444-555555555555' } } });
  await p.waitForTimeout(400);
  ok('gone business: portal page', /Open a customer from the licence portal/.test(await text(p)));
  ok('gone business: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }

// 4. sso-login refuses: the reason on the sign-in page
{ const { ctx, p, errs } = await boot({ email: MASTER, master: true, url: '#pv_sso=T', reply: { status: 404, body: { error: 'That business no longer exists in Proview QR Menu. Refresh the licence portal and try again.' } } });
  ok('sso refused: reason shown', /That business no longer exists in Proview QR Menu/.test(await text(p)));
  ok('sso refused: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }

// 5. owner unchanged
{ const { ctx, p, errs, seen, st } = await boot({ email: 'own@bb.test', role: 'owner', url: '#locations' });
  ok('owner: no x-pq-org header sent', st.hdrs.length > 0 && st.hdrs.every((h) => h === ''));
  const t = await text(p);
  ok('owner: Locations of their business, no banner', /Each location with its licence/.test(t) && await p.locator('.pq-master-bar').count() === 0, t.slice(0, 300));
  ok('owner: dropdown All my locations (2)', JSON.stringify(await p.$$eval('#hdr-site option', (o) => o.map((x) => x.textContent))) === JSON.stringify(['All my locations (2)', 'Camden', 'Soho']));
  ok('owner: no Trial… / pause / delete', await p.locator('[data-action=pq-trial],[data-action=pq-suspend-org],[data-action=pq-del-org]').count() === 0);
  ok('owner: buy / renew in each location\'s ⋯', await p.locator('[data-action=pq-buy-loc]').count() === 2);
  ok('owner: Add location', await p.locator('[data-action=pq-add-site]').count() === 1);
  await p.screenshot({ path: SHOTS + '/qr-owner.png' });
  ok('owner: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }
// 6. owner arriving with Sign in with Proview account: no open in the reply, nothing changes
{ const { ctx, p, errs } = await boot({ email: 'own@bb.test', role: 'owner', url: '#pv_sso=T', reply: { body: { token_hash: 'h', email: 'own@bb.test' } } });
  ok('owner sso: their business, no banner', /Each location with its licence/.test(await text(p)) && await p.locator('.pq-master-bar').count() === 0);
  ok('owner sso: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }
// 7. manager unchanged: one location, dashboard
{ const { ctx, p, errs } = await boot({ email: 'mgr@bb.test', role: 'manager', url: '' });
  ok('manager: their one location (disabled box)', await p.$eval('#hdr-site', (s) => s.disabled && s.textContent.trim() === 'Camden'));
  ok('manager: no Users, no banner', await p.locator('#nav a[href="#users"]').count() === 0 && await p.locator('.pq-master-bar').count() === 0);
  ok('manager: no page errors', !errs.length, errs.join(' | ')); await ctx.close(); }

await b.close();
console.log(res.join('\n')); const f = res.filter((x) => x.startsWith('FAIL')).length; console.log(`\n${res.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
