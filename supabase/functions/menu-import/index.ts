// Proview QR Menu – AI menu import.
// POST { site, kind: 'file', name, type, data (base64) }  or  { site, kind: 'url', url }
// The caller must be signed in and allowed to see the location (checked with their own token, so RLS decides).
// Reads the menu with Claude and returns { sections: [{ name, items: [{ name, desc, price, options:[{name,price}] }] }] }.
// Needs the secret ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets). Optional MENU_AI_MODEL.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pq-org",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const MAX_B64 = 14_000_000; // ≈10 MB file
const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const TOOL = {
  name: "save_menu",
  description: "Save every section and item found on the restaurant menu.",
  input_schema: {
    type: "object",
    properties: {
      currency: { type: "string", description: "Currency symbol or code shown on the menu, if any" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  desc: { type: "string", description: "Description or ingredients as printed; empty if none" },
                  price: { type: "number", description: "Main price as a number, 0 if not shown" },
                  options: {
                    type: "array",
                    description: "Size/variant prices when an item has more than one price (e.g. Small/Large, Glass/Bottle)",
                    items: { type: "object", properties: { name: { type: "string" }, price: { type: "number" } }, required: ["name", "price"] },
                  },
                },
                required: ["name", "price"],
              },
            },
          },
          required: ["name", "items"],
        },
      },
    },
    required: ["sections"],
  },
};

const PROMPT = `This is a restaurant menu. Read it carefully and call save_menu with every section and every item, in the order they appear.
Rules:
- Keep names exactly as printed (fix obvious OCR spacing only). Use the menu's own section headings; if there are none, group sensibly (e.g. "Mains", "Drinks").
- price is a plain number without currency (e.g. 12.5). If an item has several prices (sizes, glass/bottle, single/double), put each in options and set price to the lowest.
- desc is the printed description/ingredients, otherwise "".
- Ignore addresses, opening hours, allergen keys, footers and marketing text that are not dishes.
- If this is not a menu at all, call save_menu with an empty sections list.`;

function htmlToText(h: string) {
  return h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&pound;/g, "£")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 120_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.site !== "string") return json({ error: "Missing location." }, 400);

    // access: the person's own token, so the same rules as the app decide
    const headers: Record<string, string> = { Authorization: auth };
    const org = req.headers.get("x-pq-org");
    if (org) headers["x-pq-org"] = org;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers } });
    const { data: u } = await db.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: site } = await db.from("pq_sites").select("id").eq("id", body.site).maybeSingle();
    if (!site) return json({ error: "You don't have access to this location." }, 403);

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "AI menu import isn't switched on yet. Ask Proview to add the AI key.", code: "not_configured" }, 503);

    // build the content block
    let block: unknown;
    if (body.kind === "url") {
      let url: URL;
      try { url = new URL(String(body.url)); } catch { return json({ error: "That link doesn't look right." }, 400); }
      if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname)) return json({ error: "That link can't be read." }, 400);
      const r = await fetch(url, { headers: { "user-agent": "ProviewQRMenu/1.0 (menu import)" }, redirect: "follow" }).catch(() => null);
      if (!r || !r.ok) return json({ error: "We couldn't open that page. Check the link, or upload a photo or PDF instead." }, 422);
      const ct = r.headers.get("content-type") || "";
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.length > 10_000_000) return json({ error: "That page is too large." }, 413);
      if (ct.includes("pdf")) block = { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64(buf) } };
      else if (IMG.some((t) => ct.includes(t))) block = { type: "image", source: { type: "base64", media_type: ct.split(";")[0], data: b64(buf) } };
      else block = { type: "text", text: "Menu web page text:\n" + htmlToText(new TextDecoder().decode(buf)) };
    } else {
      const type = String(body.type || "").toLowerCase(), data = String(body.data || "");
      if (!data) return json({ error: "No file received." }, 400);
      if (data.length > MAX_B64) return json({ error: "That file is over 10 MB. Try a smaller photo or PDF." }, 413);
      if (type === "application/pdf") block = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
      else if (IMG.includes(type)) block = { type: "image", source: { type: "base64", media_type: type, data } };
      else if (/csv|text|xml/.test(type) || /\.(csv|txt|xml)$/i.test(String(body.name || ""))) {
        block = { type: "text", text: "Menu file " + String(body.name || "") + ":\n" + new TextDecoder().decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0))).slice(0, 120_000) };
      } else return json({ error: "Upload a photo (JPG or PNG), a PDF, or a CSV file." }, 415);
    }

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("MENU_AI_MODEL") || "claude-sonnet-5-5",
        max_tokens: 16000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "save_menu" },
        messages: [{ role: "user", content: [block, { type: "text", text: PROMPT }] }],
      }),
    });
    const out = await ai.json().catch(() => null);
    if (!ai.ok) {
      console.error("anthropic", ai.status, JSON.stringify(out).slice(0, 500));
      return json({ error: "The AI couldn't read this menu right now. Please try again in a minute." }, 502);
    }
    const use = (out?.content || []).find((c: { type: string }) => c.type === "tool_use");
    const sections = (use?.input?.sections || [])
      .map((s: any) => ({
        name: String(s?.name || "Menu").slice(0, 80),
        items: (s?.items || []).filter((i: any) => i && i.name).slice(0, 300).map((i: any) => ({
          name: String(i.name).slice(0, 120),
          desc: String(i.desc || "").slice(0, 500),
          price: Number.isFinite(+i.price) ? Math.max(0, +i.price) : 0,
          options: (i.options || []).filter((o: any) => o && o.name).slice(0, 10).map((o: any) => ({ name: String(o.name).slice(0, 40), price: Math.max(0, +o.price || 0) })),
        })),
      }))
      .filter((s: any) => s.items.length);
    return json({ sections, currency: use?.input?.currency || "" });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong reading the menu." }, 500);
  }
});

function b64(buf: Uint8Array) {
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
