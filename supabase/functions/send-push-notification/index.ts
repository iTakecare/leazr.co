/**
 * send-push-notification — Server-side Web Push (RFC 8291 + RFC 8292 VAPID)
 *
 * Body: {
 *   user_id?:    string   — send to a specific user
 *   company_id?: string   — send to all users of a company
 *   title:       string
 *   body:        string
 *   url?:        string   (default "/")
 *   tag?:        string   (default "leazr")
 *   icon?:       string
 * }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Base64url helpers ──────────────────────────────────────────────────────────
function b64uEncode(data: Uint8Array): string {
  let str = "";
  for (let i = 0; i < data.length; i++) str += String.fromCharCode(data[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64uDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const raw = atob(str);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ── VAPID JWT (ES256) ──────────────────────────────────────────────────────────
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<string> {
  const enc = new TextEncoder();

  // Parse uncompressed EC public key (0x04 || x || y) → x, y for JWK
  const pubBytes = b64uDecode(vapidPublicKey);
  const x = b64uEncode(pubBytes.slice(1, 33));
  const y = b64uEncode(pubBytes.slice(33, 65));

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: vapidPrivateKey, x, y, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200, // 12 h
    sub: subject,
  })));

  const sigInput = `${header}.${claims}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(sigInput)
  );

  return `${sigInput}.${b64uEncode(new Uint8Array(sig))}`;
}

// ── RFC 8291 payload encryption (aes128gcm) ────────────────────────────────────
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ body: Uint8Array; serverPublicKey: Uint8Array; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payload);

  const clientPubBytes = b64uDecode(p256dh); // 65-byte uncompressed key
  const authSecret = b64uDecode(auth); // 16-byte auth secret

  // Client public key for ECDH
  const clientPubKey = await crypto.subtle.importKey(
    "raw",
    clientPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Ephemeral server key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPubBuffer = await crypto.subtle.exportKey("raw", serverKP.publicKey);
  const serverPublicKey = new Uint8Array(serverPubBuffer);

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPubKey },
    serverKP.privateKey,
    256
  );

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(IKM=sharedSecret, salt=authSecret, info="WebPush: info\0" + ua_pub + as_pub, len=32)
  const authInfo = concat(
    enc.encode("WebPush: info\0"),
    clientPubBytes,
    serverPublicKey
  );
  const sharedKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: authInfo },
    sharedKey,
    256
  ));

  // CEK = HKDF(IKM=ikm, salt=salt, info="Content-Encoding: aes128gcm\0", len=16)
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cek = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: aes128gcm\0") },
    ikmKey,
    128
  ));

  // NONCE = HKDF(IKM=ikm, salt=salt, info="Content-Encoding: nonce\0", len=12)
  const nonce = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: nonce\0") },
    ikmKey,
    96
  ));

  // AES-128-GCM encrypt (plaintext + 0x02 delimiter for last record)
  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(plaintext, new Uint8Array([2])); // 0x02 = last-record delimiter
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 },
    cekKey,
    padded
  );

  return { body: new Uint8Array(encrypted), serverPublicKey, salt };
}

// ── Build aes128gcm HTTP body ──────────────────────────────────────────────────
function buildBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  // salt(16) + rs(4 BE) + idlen(1) + keyid(N) + ciphertext
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);

  return concat(salt, rsBytes, new Uint8Array([serverPublicKey.length]), serverPublicKey, encrypted);
}

// ── Send one push ──────────────────────────────────────────────────────────────
async function sendOnePush(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const audience = new URL(endpoint).origin;
    const jwt = await createVapidJwt(
      audience,
      "mailto:admin@leazr.co",
      vapidPrivateKey,
      vapidPublicKey
    );

    const { body: encBody, serverPublicKey, salt } = await encryptPayload(
      payload,
      keys.p256dh,
      keys.auth
    );
    const body = buildBody(encBody, salt, serverPublicKey);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(body.length),
        TTL: "86400",
      },
      body,
    });

    if (res.status === 201 || res.status === 200) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: text.substring(0, 200) };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error("VAPID_PRIVATE_KEY or VAPID_PUBLIC_KEY not configured");
    }

    const reqBody = await req.json();
    const {
      user_id,
      company_id,
      title,
      body: notifBody,
      url = "/",
      tag = "leazr",
      icon = "/icons/icon-192.png",
    } = reqBody;

    if (!title || !notifBody) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build subscription query
    let query = supabase.from("push_subscriptions").select("id, endpoint, subscription");
    if (user_id) {
      query = query.eq("user_id", user_id);
    } else if (company_id) {
      query = query.eq("company_id", company_id);
    }

    const { data: subs, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0, message: "No subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notification payload (parsed in sw.js push handler)
    const payload = JSON.stringify({ title, body: notifBody, url, tag, icon });

    // Send to all subscriptions concurrently
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const subData = (sub.subscription ?? {}) as Record<string, any>;
        const endpoint = subData.endpoint ?? sub.endpoint;
        const keys = (subData.keys ?? {}) as { p256dh: string; auth: string };

        if (!endpoint || !keys.p256dh || !keys.auth) {
          return { ok: false, error: "Missing endpoint or keys", subId: sub.id };
        }

        const result = await sendOnePush(endpoint, keys, payload, vapidPrivateKey, vapidPublicKey);

        // Remove expired subscriptions (410 Gone or 404)
        if (!result.ok && (result.status === 410 || result.status === 404)) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          console.log(`[push] Removed expired subscription ${sub.id}`);
        }

        return { ...result, subId: sub.id };
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).ok
    ).length;
    const failed = results.length - sent;

    console.log(`[push] Sent ${sent}/${results.length} notifications`);

    return new Response(
      JSON.stringify({ sent, failed, total: results.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-push-notification] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
