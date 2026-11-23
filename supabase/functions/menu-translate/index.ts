// Proview QR Menu – AI translation for the Translation Center.
// POST { site, lang: "French", texts: ["Eggs Benedict", "Poached eggs, hollandaise…", …] } → { lang, map: { "<source>": "<translation>" } }
// The caller must be signed in and allowed to see the location (their own token, so RLS decides).
// Provider: OpenAI when the secret OPENAI_API_KEY is set (OPENAI_TEXT_MODEL, default gpt-4o-mini), otherwise Claude with ANTHROPIC_API_KEY
// (TRANSLATE_AI_MODEL, default claude-haiku-5-5).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pq-org",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const env = (k: string) => (Deno.env.get(k) || "").replace(/^\s*Bearer\s+/i, "").replace(/\s+/g, "");

const RULES = (lang: string) => `You translate a restaurant's digital menu and its ordering screens from English into ${lang}.
Rules:
- Translate naturally for diners, short and appetising; keep the meaning exact (ingredients, allergens, sizes).
- Keep proper dish names that are known by their name (e.g. Shakshuka, Tiramisu, Eggs Benedict, Cilbir, Peroni, brand names) – translate only if diners in that language normally would; you may add nothing else.
- Keep codes and marks exactly: (V) (VG) (VS) (S) (D) (N) (GF), numbers, prices, %, £, emoji, line breaks.
- Keep the same casing style (ALL CAPS stays caps). Do not add quotes or explanations.
- Return exactly one translation for every input, in the same order.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const body = await req.json().catch(() => null);
    const lang = String(body?.lang || "").trim().slice(0, 40);
    const texts: string[] = Array.isArray(body?.texts) ? body.texts.map((t: unknown) => String(t ?? "").slice(0, 600)).slice(0, 300) : [];
    if (!body || typeof body.site !== "string" || !lang || !texts.length) return json({ error: "Nothing to translate." }, 400);

    const headers: Record<string, string> = { Authorization: auth };
    const org = req.headers.get("x-pq-org");
    if (org) headers["x-pq-org"] = org;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers } });
    const { data: u } = await db.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: site } = await db.from("pq_sites").select("id").eq("id", body.site).maybeSingle();
    if (!site) return json({ error: "You don't have access to this location." }, 403);

    const oa = env("OPENAI_API_KEY"), an = env("ANTHROPIC_API_KEY");
    if (!oa && !an) return json({ error: "AI translation isn't switched on yet. Ask Proview to add the AI key.", code: "not_configured" }, 503);

    const input = JSON.stringify(texts);
    let out: string[] | null = null, provider = "";
    if (oa) {
      provider = "openai";
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${oa}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_TEXT_MODEL") || "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: RULES(lang) + '\nAnswer as JSON: {"t": ["…", …]} with the same number of items.' },
            { role: "user", content: input },
          ],
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok) { try { out = JSON.parse(j?.choices?.[0]?.message?.content || "{}").t; } catch { /* below */ } }
      else console.error("openai", r.status, JSON.stringify(j).slice(0, 400));
    }
    if (!Array.isArray(out) && an) {
      provider = "claude";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": an, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("TRANSLATE_AI_MODEL") || "claude-haiku-5-5",
          max_tokens: 16000,
          system: RULES(lang) + '\nAnswer with only JSON: {"t": ["…", …]} with the same number of items, nothing else.',
          messages: [{ role: "user", content: input }],
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok) {
        const txt = (j?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
        const m = txt.match(/\{[\s\S]*\}/);
        try { if (m) out = JSON.parse(m[0]).t; } catch { /* below */ }
      } else console.error("anthropic", r.status, JSON.stringify(j).slice(0, 400));
    }
    if (!Array.isArray(out)) return json({ error: "The AI couldn't translate right now. Please try again in a minute." }, 502);
    const map: Record<string, string> = {};
    texts.forEach((t, i) => { const v = out![i]; if (typeof v === "string" && v.trim()) map[t] = v.trim().slice(0, 800); });
    return json({ lang, map, provider, count: Object.keys(map).length });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong translating." }, 500);
  }
});
