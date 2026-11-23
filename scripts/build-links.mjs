// Builds a real page for every business link before the site is published:
//   web/site/<slug>/index.html  and  web/site/<slug>/<1..N>/index.html  (tables)
// plus the same pages for the no-hyphen spelling (/bragsandbrams). Each page is the guest menu with the business's own
// title and preview photo, so links open with a normal "200 OK" and show a preview card in WhatsApp, iMessage etc.
// Links not built yet (a business added since the last build) still work through 404.html.
// Data: the public RPC pq_public_links (active locations only). Run: node scripts/build-links.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SITE = "web/site", ORIGIN = "https://qrmenu.proviewcrm.co.uk";
const URL_ = "https://yblafwttmqaqvfvedaoc.supabase.co/rest/v1/rpc/pq_public_links";
const KEY = "sb_publishable_mcs45XaG9XHMWbyXO_PyCw_NQaQ08MR"; // publishable (browser) key
const DEFAULT_IMG = ORIGIN + "/img/tpl/958545.jpg";
const RESERVED = new Set(["m", "css", "js", "img", "icons", "404.html", "index.html", "CNAME"]);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const shell = readFileSync(join(SITE, "404.html"), "utf8");
let links = [];
try {
  const r = await fetch(URL_, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: "{}" });
  links = r.ok ? await r.json() : [];
  if (!r.ok) console.warn("pq_public_links", r.status);
} catch (e) { console.warn("could not load links – publishing without them", e.message); }

let pages = 0;
for (const l of links || []) {
  if (!l?.slug || !/^[a-z0-9-]+$/.test(l.slug)) continue;
  const name = l.name || l.slug, img = /^https:\/\//.test(l.image || "") ? l.image : DEFAULT_IMG;
  const tables = Math.min(Math.max(+l.tables || 0, 30), 200); // at least tables 1–30, more if the floor plan has them
  const spellings = [...new Set([l.slug, l.slug.replace(/-/g, "")])].filter((s) => !RESERVED.has(s));
  for (const slug of spellings) {
    for (let t = 0; t <= tables; t++) {
      const path = t ? `/${slug}/${t}` : `/${slug}`;
      const title = t ? `${name} · Table ${t} | Menu` : `${name} | Menu`;
      const meta = `<title>${esc(title)}</title>
<meta name="description" content="View the menu${t ? ` for Table ${t}` : ""} at ${esc(name)} – order, call a waiter and leave feedback.">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(name)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="View the menu and order at ${esc(name)}.">
<meta property="og:url" content="${ORIGIN}${path}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${ORIGIN}/${l.slug}${t ? "/" + t : ""}">`;
      const html = shell.replace(/<title>[^<]*<\/title>/, meta);
      const dir = join(SITE, slug, t ? String(t) : "");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "index.html"), html);
      pages++;
    }
  }
}
console.log(`built ${pages} link pages for ${(links || []).length} businesses`);
