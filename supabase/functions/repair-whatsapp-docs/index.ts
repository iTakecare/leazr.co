// =====================================================================
// repair-whatsapp-docs — fonction ONE-SHOT de réparation.
//
// Contexte : attachChatMediaToOffer (frontend) uploadait les pièces
// jointes WhatsApp vers offer-documents avec le client supabase dont le
// header global "Content-Type: application/json" écrasait le multipart.
// Résultat : le bucket contient l'enveloppe multipart brute
// (------WebKitFormBoundary…) au lieu du fichier.
//
// Cette fonction scanne offer_documents (file_path contenant "whatsapp"),
// détecte les objets corrompus, extrait les vrais octets du fichier de
// l'enveloppe multipart et ré-uploade (upsert) avec le bon content-type.
//
// À SUPPRIMER après exécution. Invocation :
//   POST avec header x-repair-secret (dry_run=true par défaut).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const REPAIR_SECRET = "d6db6cf40aa3bfd4de4085c53e6906c1aad4dcc474cc2fc3";

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = haystack.length - needle.length; i >= 0; i--) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

const enc = new TextEncoder();
const CRLF2 = enc.encode("\r\n\r\n");

// Extrait { bytes, contentType } de l'enveloppe multipart, ou null si le
// fichier n'est pas une enveloppe multipart (donc sain).
function extractFromMultipart(bytes: Uint8Array): { data: Uint8Array; contentType: string | null } | null {
  if (bytes.length < 4 || bytes[0] !== 0x2d || bytes[1] !== 0x2d) return null; // ne commence pas par "--"
  const headStr = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 2000)));
  const firstLineEnd = headStr.indexOf("\r\n");
  if (firstLineEnd < 0) return null;
  const boundary = headStr.slice(0, firstLineEnd); // ex. ------WebKitFormBoundaryXXXX
  if (!/^--[-A-Za-z0-9'()+_,./:=? ]{1,120}$/.test(boundary)) return null;
  if (!headStr.includes("Content-Disposition: form-data")) return null;

  // Partie fichier = celle qui contient filename=
  const fnIdx = indexOfBytes(bytes, enc.encode("filename="));
  if (fnIdx < 0) return null;
  const headerEnd = indexOfBytes(bytes, CRLF2, fnIdx);
  if (headerEnd < 0) return null;
  const start = headerEnd + 4;

  // Content-Type de la partie fichier
  const partHeader = new TextDecoder("latin1").decode(bytes.slice(fnIdx, headerEnd));
  const ctMatch = partHeader.match(/Content-Type:\s*([^\r\n]+)/i);
  const contentType = ctMatch ? ctMatch[1].trim() : null;

  // Fin = dernier "\r\n<boundary>" (boundary de clôture "--" incluse après)
  const closing = lastIndexOfBytes(bytes, enc.encode(`\r\n${boundary}`));
  if (closing < 0 || closing <= start) return null;

  return { data: bytes.slice(start, closing), contentType };
}

serve(async (req) => {
  if (req.headers.get("x-repair-secret") !== REPAIR_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // dry-run par défaut

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await admin
    .from("offer_documents")
    .select("id, offer_id, file_path, file_name, mime_type")
    .ilike("file_path", "%whatsapp%");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: unknown[] = [];
  for (const row of rows ?? []) {
    const r: Record<string, unknown> = { id: row.id, file_path: row.file_path };
    try {
      const { data: blob, error: dlErr } = await admin.storage
        .from("offer-documents").download(row.file_path);
      if (dlErr || !blob) { r.status = "download_failed"; r.detail = dlErr?.message; results.push(r); continue; }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const extracted = extractFromMultipart(bytes);
      if (!extracted) { r.status = "sain"; results.push(r); continue; }

      const contentType = extracted.contentType || row.mime_type || "application/octet-stream";
      r.status = dryRun ? "corrompu (dry-run, non modifié)" : "réparé";
      r.original_size = bytes.length;
      r.repaired_size = extracted.data.length;
      r.content_type = contentType;

      if (!dryRun) {
        const { error: upErr } = await admin.storage
          .from("offer-documents")
          .upload(row.file_path, extracted.data, { contentType, upsert: true });
        if (upErr) { r.status = "upload_failed"; r.detail = upErr.message; results.push(r); continue; }
        await admin.from("offer_documents")
          .update({ file_size: extracted.data.length, mime_type: contentType })
          .eq("id", row.id);
      }
    } catch (e) {
      r.status = "error";
      r.detail = e instanceof Error ? e.message : String(e);
    }
    results.push(r);
  }

  return new Response(JSON.stringify({ dry_run: dryRun, count: results.length, results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
