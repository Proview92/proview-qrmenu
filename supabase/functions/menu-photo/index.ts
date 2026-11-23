// Proview QR Menu – AI dish photo.
// POST { site, name, desc?, section? } → { url }  (a JPEG saved in Storage bucket qrmenu under <site>/ai-…)
// The caller must be signed in and allowed to see the location (their own token, so RLS decides).
// Needs the secret OPENAI_API_KEY. Optional OPENAI_IMAGE_MODEL (default gpt-image-1) and OPENAI_IMAGE_QUALITY (low|medium|high, default medium).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pq-org",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const clean = (v: unknown, n: number) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in again." }, 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.site !== "string" || !clean(body.name, 120)) return json({ error: "Missing dish name." }, 400);

    const headers: Record<string, string> = { Authorization: auth };
    const org = req.headers.get("x-pq-org");
    if (org) headers["x-pq-org"] = org;
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers } });
    const { data: u } = await db.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);
    const { data: site } = await db.from("pq_sites").select("id").eq("id", body.site).maybeSingle();
    if (!site) return json({ error: "You don't have access to this location." }, 403);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "AI photos aren't switched on yet. Ask Proview to add the OpenAI key.", code: "not_configured" }, 503);

    const name = clean(body.name, 120), desc = clean(body.desc, 300), section = clean(body.section, 60);
    const prompt = `Professional restaurant menu photograph of "${name}"${section ? ` (${section})` : ""}${desc ? `: ${desc}` : ""}. ` +
      `Appetising, realistic, served as a restaurant would plate or pour it, natural soft light, shallow depth of field, ` +
      `clean neutral background, 45-degree angle, the dish fills most of the frame. No text, no labels, no logos, no people, no hands.`;

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1",
        prompt, n: 1, size: "1024x1024",
        quality: Deno.env.get("OPENAI_IMAGE_QUALITY") || "medium",
        output_format: "jpeg", output_compression: 85,
      }),
    });
    const out = await r.json().catch(() => null);
    if (!r.ok) {
      console.error("openai", r.status, JSON.stringify(out).slice(0, 500));
      const msg = out?.error?.code === "billing_hard_limit_reached" || /billing|quota/i.test(out?.error?.message || "")
        ? "The OpenAI account is out of credit. Top it up at platform.openai.com → Billing."
        : out?.error?.code === "moderation_blocked" ? "That dish name was blocked by the image AI. Try editing the name."
        : "The AI couldn't make this photo right now. Please try again.";
      return json({ error: msg }, 502);
    }
    const b64 = out?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "The AI didn't return a photo." }, 502);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const path = `${body.site}/ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
    const up = await admin.storage.from("qrmenu").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (up.error) { console.error("storage", up.error.message); return json({ error: "Couldn't save the photo." }, 500); }
    const { data: pub } = admin.storage.from("qrmenu").getPublicUrl(path);
    return json({ url: pub.publicUrl });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong making the photo." }, 500);
  }
});
