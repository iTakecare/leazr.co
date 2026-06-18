import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const genPassword = () => {
  const b = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `Acces-${hex}-2026!`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await userClient.auth.getUser(token);
    const caller = claims?.user;
    if (!caller) return json({ error: "invalid_token" }, 401);

    const body = await req.json();
    const action: string = body.action || "invite";
    const client_id: string = body.client_id;
    if (!client_id) return json({ error: "client_id requis" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: client } = await admin.from("clients").select("id, company_id, user_id, name, email").eq("id", client_id).maybeSingle();
    if (!client) return json({ error: "client_introuvable" }, 404);

    // Autorisation : membre du client OU staff/admin de la société.
    const { data: callerProfile } = await admin.from("profiles").select("company_id, role").eq("id", caller.id).maybeSingle();
    const linkRow = (await admin.from("client_user_accounts").select("id").eq("client_id", client_id).eq("user_id", caller.id).maybeSingle()).data;
    const isMember = client.user_id === caller.id || !!linkRow;
    const isStaff = callerProfile?.company_id === client.company_id && ["admin", "super_admin", "ambassador", "partner"].includes(callerProfile?.role || "");
    if (!isMember && !isStaff) return json({ error: "forbidden" }, 403);

    // ── LIST : membres ayant accès (principal + liés) ──
    if (action === "list") {
      const ids = new Set<string>();
      if (client.user_id) ids.add(client.user_id);
      const links = (await admin.from("client_user_accounts").select("user_id, role").eq("client_id", client_id)).data || [];
      links.forEach((l: any) => ids.add(l.user_id));
      const idArr = [...ids];
      if (idArr.length === 0) return json({ success: true, members: [] });
      const profiles = (await admin.from("profiles").select("id, first_name, last_name, email").in("id", idArr)).data || [];
      const pById = new Map(profiles.map((p: any) => [p.id, p]));
      const members = idArr.map((id) => {
        const p: any = pById.get(id) || {};
        return {
          user_id: id,
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Utilisateur",
          email: p.email || "",
          is_primary: id === client.user_id,
          role: id === client.user_id ? "primary" : (links.find((l: any) => l.user_id === id)?.role || "member"),
        };
      });
      return json({ success: true, members });
    }

    // ── REMOVE : retirer l'accès d'un membre lié (jamais le principal) ──
    if (action === "remove") {
      const targetUserId: string = body.user_id;
      if (!targetUserId) return json({ error: "user_id requis" }, 400);
      if (targetUserId === client.user_id) return json({ error: "Impossible de retirer l'utilisateur principal" }, 400);
      await admin.from("client_user_accounts").delete().eq("client_id", client_id).eq("user_id", targetUserId);
      return json({ success: true });
    }

    // ── INVITE (défaut) ──
    const cleanEmail = String(body.email || "").trim().toLowerCase();
    if (!cleanEmail) return json({ error: "email requis" }, 400);
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === cleanEmail);

    let userId: string;
    let tempPassword: string | null = null;
    if (existing) {
      userId = existing.id;
    } else {
      tempPassword = genPassword();
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: body.first_name || "", last_name: body.last_name || "", role: "client" },
      });
      if (cErr || !created.user) return json({ error: "Erreur création utilisateur: " + (cErr?.message || "") }, 500);
      userId = created.user.id;
    }
    await admin.from("profiles").upsert(
      { id: userId, first_name: body.first_name || "", last_name: body.last_name || "", role: "client", company_id: client.company_id, email: cleanEmail },
      { onConflict: "id" }
    );
    await admin.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    const { error: linkErr } = await admin.from("client_user_accounts").upsert({ client_id, user_id: userId, role: "member" }, { onConflict: "client_id,user_id", ignoreDuplicates: true });
    if (linkErr) return json({ error: "Erreur de liaison: " + linkErr.message }, 500);

    return json({ success: true, user_id: userId, already_existed: !!existing, email: cleanEmail, temp_password: tempPassword });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
