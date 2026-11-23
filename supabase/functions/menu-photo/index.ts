// Proview QR Menu – AI dish photo.
// POST { site, name, desc?, section? } → { url }  (a JPEG saved in Storage bucket qrmenu under <site>/ai-…)
// The caller must be signed in and allowed to see the location (their own token, so RLS decides).
// Free first: Cloudflare Workers AI (FLUX.1 schnell) with secrets CF_ACCOUNT_ID + CF_API_TOKEN (10,000 free neurons/day ≈ 150+ photos).
// Optional backup when Cloudflare's free amount is used up or fails: OpenAI with secret OPENAI_API_KEY
// (OPENAI_IMAGE_MODEL default gpt-image-1, OPENAI_IMAGE_QUALITY low|medium|high default medium). CF_IMAGE_MODEL overrides the Cloudflare model.
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

    const cfAcc = Deno.env.get("CF_ACCOUNT_ID"), cfTok = Deno.env.get("CF_API_TOKEN"), oaKey = Deno.env.get("OPENAI_API_KEY");
    if (!(cfAcc && cfTok) && !oaKey) return json({ error: "AI photos aren't switched on yet. Ask Proview to add the Cloudflare keys.", code: "not_configured" }, 503);

    const name = clean(body.name, 120), desc = clean(body.desc, 300), section = clean(body.section, 60);
    const prompt = `Professional restaurant menu photograph of "${name}"${section ? ` (${section})` : ""}${desc ? `: ${desc}` : ""}. ` +
      `Appetising, realistic, served as a restaurant would plate or pour it, natural soft light, shallow depth of field, ` +
      `clean neutral background, 45-degree angle, the dish fills most of the frame. No text, no labels, no logos, no people, no hands.`;

    let b64 = "", why = "";
    // 1) Cloudflare Workers AI (free daily allocation)
    if (cfAcc && cfTok) {
      const model = Deno.env.get("CF_IMAGE_MODEL") || "@cf/black-forest-labs/flux-1-schnell";
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAcc}/ai/run/${model}`, {
        method: "POST",
        headers: { authorization: `Bearer ${cfTok}`, "content-type": "application/json" },
        body: JSON.stringify({ prompt, steps: 6 }),
      }).catch(() => null);
      const out = r ? await r.json().catch(() => null) : null;
      if (r && r.ok && out?.result?.image) b64 = out.result.image;
      else {
        const errTxt = JSON.stringify(out?.errors || out || "").slice(0, 400);
        console.error("cloudflare", r?.status, errTxt);
        why = /4006|daily|allocation|neuron/i.test(errTxt) ? "limit" : /auth|10000|token|permission|403|401/i.test(errTxt + (r?.status || "")) ? "auth" : "fail";
      }
    }
    // 2) OpenAI backup, only if its key is set
    if (!b64 && oaKey) {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { authorization: `Bearer ${oaKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1",
          prompt, n: 1, size: "1024x1024",
          quality: Deno.env.get("OPENAI_IMAGE_QUALITY") || "medium",
          output_format: "jpeg", output_compression: 85,
        }),
      });
      const out = await r.json().catch(() => null);
      if (r.ok && out?.data?.[0]?.b64_json) b64 = out.data[0].b64_json;
      else {
        console.error("openai", r.status, JSON.stringify(out).slice(0, 500));
        if (!why) why = /billing|quota/i.test(out?.error?.message || "") || out?.error?.code === "billing_hard_limit_reached" ? "oa_billing" : "fail";
      }
    }
    if (!b64) {
      const msg = why === "limit" ? "Today's free AI photos are used up. They reset every day at 00:00 UTC (4am in Dubai, midnight in London) – try again then."
        : why === "auth" ? "The Cloudflare key isn't working. Check CF_ACCOUNT_ID and CF_API_TOKEN (the token needs Workers AI access)."
        : why === "oa_billing" ? "The OpenAI account is out of credit. Top it up at platform.openai.com → Billing."
        : "The AI couldn't make this photo right now. Please try again.";
      return json({ error: msg, code: why || "fail" }, 502);
    }
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
