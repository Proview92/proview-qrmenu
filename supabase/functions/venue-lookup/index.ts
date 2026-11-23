// Proview QR Menu – fill in a venue's details from its website or Google listing.
// POST { site, query } where query is a website address, a Google Maps / Business link, or the business name and town.
// Websites are read directly (structured data, meta tags and page text); Google links and plain names are looked up
// with Claude's web search. Returns { found: { name, address, city, zip, country, phone, email, website, description,
// hours: { Monday: { open, close, closed } … }, social: { Instagram, Facebook, … }, logo } } – nothing is saved here;
// the back office shows a review list first. A logo is copied into Storage so the menu doesn't depend on the other site.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pq-org",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const env = (k: string) => (Deno.env.get(k) || "").replace(/^\s*Bearer\s+/i, "").replace(/\s+/g, "");
const UA = "Mozilla/5.0 (compatible; ProviewQRMenu/1.0; +https://qrmenu.proviewcrm.co.uk)";

const SHAPE = `{"name":"","address":"street address only","city":"","zip":"","country":"","phone":"","email":"","website":"https://…","description":"one short sentence about the venue",
"hours":{"Monday":{"open":"08:00","close":"16:00","closed":false}, … all seven days …},
"social":{"Instagram":"https://…","Facebook":"https://…","Tiktok":"https://…","X":"https://…","Trip Advisor":"https://…","WhatsApp":"https://wa.me/…","Yelp":"","Linktree":""},
"logo":"https://… direct image URL of the venue's logo if you saw one"}`;
const RULES = `Return ONLY JSON in exactly this shape (use "" or omit what you can't find, never guess):\n${SHAPE}
- Times in 24h HH:MM. A day the venue is shut: {"closed":true}. If hours differ by season, use the current ones.
- Phone in the local format shown by the venue. Country as a full name (e.g. United Kingdom).
- Only facts about THIS venue (the exact business and branch asked about), from its own site or listing.`;

function pageFacts(html: string, base: string) {
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim()).join("\n").slice(0, 20000);
  const meta = [...html.matchAll(/<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi)]
    .filter((m) => /og:|description|twitter:|geo\.|business:/i.test(m[1])).map((m) => `${m[1]}: ${m[2]}`).join("\n").slice(0, 4000);
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1])
    .filter((h) => /instagram|facebook|tiktok|twitter\.com|x\.com|tripadvisor|wa\.me|whatsapp|yelp|linktr|tel:|mailto:/i.test(h)).slice(0, 40).join("\n");
  const icons = [...html.matchAll(/<(?:img|link)[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi)].map((m) => m[0])
    .filter((t) => /logo|apple-touch-icon|icon/i.test(t)).slice(0, 12).map((t) => (t.match(/(?:src|href)=["']([^"']+)["']/i) || [])[1])
    .map((u) => { try { return new URL(u!, base).href; } catch { return ""; } }).filter(Boolean).join("\n");
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|footer|section)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 30000);
  return `PAGE: ${base}\n\nSTRUCTURED DATA:\n${ld}\n\nMETA:\n${meta}\n\nLINKS:\n${links}\n\nLOGO/ICON CANDIDATES:\n${icons}\n\nTEXT:\n${text}`;
}

// logo candidates from a page, best first: structured-data logo, header/brand <img>, og/twitter image, apple-touch-icon, icon
function logoCandidates(html: string, base: string): string[] {
  const out: string[] = [];
  const abs = (u?: string) => { if (!u) return; try { const x = new URL(u.replace(/&amp;/g, "&"), base); if (/^https?:$/.test(x.protocol)) out.push(x.href); } catch { /* skip */ } };
  for (const m of html.matchAll(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/gi)) abs(m[1]);
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) { const tag = m[0]; if (/logo|brand|site-title|header/i.test(tag)) abs((tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i) || [])[1]); }
  for (const m of html.matchAll(/<meta[^>]+(?:property|name|itemprop)=["'](?:og:image|twitter:image|image)["'][^>]*>/gi)) abs((m[0].match(/content=["']([^"']+)["']/i) || [])[1]);
  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/gi)) abs((m[0].match(/href=["']([^"']+)["']/i) || [])[1]);
  return [...new Set(out)];
}
function sniff(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49) return "image/gif";
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "image/x-icon";
  const head = new TextDecoder().decode(b.slice(0, 600));
  if (/<svg[\s>]/i.test(head)) return "image/svg+xml";
  return "";
}
async function saveLogo(src: string, site: string, url: string): Promise<string> {
  const tries = src.startsWith("http://") ? [src.replace(/^http:/, "https:"), src] : [src];
  for (const u of tries) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA, accept: "image/*" }, redirect: "follow" });
      if (!r.ok) continue;
      const buf = new Uint8Array(await r.arrayBuffer());
      const ct = sniff(buf);
      if (!ct || buf.length < 200 || buf.length > 5_000_000) continue;
      const ext = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/x-icon": "ico", "image/svg+xml": "svg" }[ct];
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const path = `${site}/logo-${Date.now()}.${ext}`;
      const up = await admin.storage.from("qrmenu").upload(path, buf, { contentType: ct, upsert: false });
      if (up.error) { console.error("logo upload", up.error.message); continue; }
      return admin.storage.from("qrmenu").getPublicUrl(path).data.publicUrl;
    } catch { /* try next */ }
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const body = await req.json().catch(() => null);
    const query = String(body?.query || "").trim().slice(0, 500);
    if (!body || typeof body.site !== "string" || !query) return json({ error: "Enter a website, a Google link or the business name." }, 400);

    const headers: Record<string, string> = { Authorization: auth };
    const org = req.headers.get("x-pq-org");
    if (org) headers["x-pq-org"] = org;
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers } });
    const { data: u } = await db.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: site } = await db.from("pq_sites").select("id").eq("id", body.site).maybeSingle();
    if (!site) return json({ error: "You don't have access to this location." }, 403);
    const key = env("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "AI isn't switched on yet. Ask Proview to add the AI key.", code: "not_configured" }, 503);

    // website → read it; Google link or a name → web search
    let target: URL | null = null;
    try { target = new URL(/^https?:\/\//i.test(query) ? query : (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(query) ? "https://" + query : "x:")); } catch { target = null; }
    const isGoogle = !!target && /(^|\.)google\.[a-z.]+$|goo\.gl$|g\.page$|maps\.app\.goo\.gl$/i.test(target.hostname);
    let content: unknown[], tools: unknown[] | undefined, pageLogos: string[] = [];
    if (target && /^https?:$/.test(target.protocol) && !isGoogle) {
      if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(target.hostname)) return json({ error: "That address can't be read." }, 400);
      const r = await fetch(target, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" }).catch(() => null);
      if (!r || !r.ok) return json({ error: "We couldn't open that website. Check the address, or type the business name and town instead." }, 422);
      const html = (await r.text()).slice(0, 1_500_000);
      pageLogos = logoCandidates(html, r.url || target.href);
      content = [{ type: "text", text: `Find this venue's details from its own website below.\n${RULES}\n\n${pageFacts(html, r.url || target.href)}` }];
    } else {
      content = [{ type: "text", text: `Look up this restaurant/café/bar and find its current details (Google Business listing, its own website, its social pages): ${query}\n${RULES}` }];
      tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
    }
    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("VENUE_AI_MODEL") || "claude-sonnet-5-5", max_tokens: 4000, ...(tools ? { tools } : {}), messages: [{ role: "user", content }] }),
    });
    const out = await ai.json().catch(() => null);
    if (!ai.ok) {
      console.error("anthropic", ai.status, JSON.stringify(out).slice(0, 500));
      return json({ error: "The AI couldn't look this up right now. Please try again in a minute." }, 502);
    }
    const txt = (out?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
    let found: any = null;
    const m = txt.match(/\{[\s\S]*\}/);
    try { if (m) found = JSON.parse(m[0]); } catch { found = null; }
    if (!found || typeof found !== "object") return json({ error: "We couldn't find details for that. Try the venue's website address." }, 404);

    // keep the logo: try the AI's pick, then logos found in the page itself, and copy the first good image into our storage
    const cands: string[] = [];
    const add = (u: unknown, base?: string) => { if (typeof u !== "string" || !u.trim() || /^data:/i.test(u)) return; try { const x = new URL(u.trim(), base || "https://x.invalid"); if (/^https?:$/.test(x.protocol) && x.hostname !== "x.invalid" && !cands.includes(x.href)) cands.push(x.href); } catch { /* skip */ } };
    add(found.logo);
    for (const c of pageLogos) add(c);
    const site0 = typeof found.website === "string" && /^https?:\/\//i.test(found.website) ? found.website : "";
    if (!pageLogos.length && site0) { // search path: read the venue's own site for its logo
      const r = await fetch(site0, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow" }).catch(() => null);
      if (r && r.ok) for (const c of logoCandidates((await r.text()).slice(0, 1_500_000), r.url || site0)) add(c);
    }
    found.logo = "";
    for (const c of cands.slice(0, 8)) {
      const saved = await saveLogo(c, body.site, url);
      if (saved) { found.logo = saved; break; }
    }
    return json({ found, source: tools ? "search" : "website" });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong looking that up." }, 500);
  }
});
