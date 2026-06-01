// Diagnostic: report this edge function's OUTBOUND (egress) IP as seen by the
// public internet. Used to discover which Supabase IP needs to be allowed at
// the Hostinger VPS edge (it was blackholing the grenke-proxy traffic).
//
// Public on purpose (verify_jwt=false, no secret): it leaks nothing sensitive,
// only the egress IP. Safe to remove once the network issue is resolved.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function probe(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const text = (await r.text()).trim();
    return text || null;
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Query several independent echo services so a single outage doesn't blind us.
  const [ipify, icanhaz, aws] = await Promise.all([
    probe("https://api.ipify.org"),
    probe("https://icanhazip.com"),
    probe("https://checkip.amazonaws.com"),
  ]);

  return new Response(
    JSON.stringify({ egress_ip: { ipify, icanhazip: icanhaz, aws_checkip: aws }, at: new Date().toISOString() }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
