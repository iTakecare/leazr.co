/**
 * Helper générique de healthcheck pour les sources qui ne nécessitent pas
 * d'authentification (Coolblue, Mediamarkt, Apple Refurbished, Gomibo, Chapp).
 *
 * Fait un fetch HEAD ou GET léger sur l'URL et considère la source "connectée"
 * si la réponse est OK et contient du contenu.
 */
import type { SourceConnectionStatus } from "./types";

export async function publicHealthCheck(
  url: string,
  options: { expectString?: string; timeoutMs?: number } = {}
): Promise<SourceConnectionStatus> {
  const now = new Date().toISOString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-BE,fr;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      return {
        connected: false,
        reason: resp.status === 403 || resp.status === 429 ? "blocked" : "site_down",
        message: `HTTP ${resp.status}`,
        last_checked_at: now,
      };
    }

    if (options.expectString) {
      const text = await resp.text();
      if (!text.includes(options.expectString)) {
        return {
          connected: false,
          reason: "unknown",
          message: `Contenu inattendu (manque: ${options.expectString})`,
          last_checked_at: now,
        };
      }
    }

    return { connected: true, last_checked_at: now };
  } catch (e: any) {
    clearTimeout(timeoutId);
    return {
      connected: false,
      reason: e?.name === "AbortError" ? "site_down" : "unknown",
      message: e?.message ?? "Erreur réseau",
      last_checked_at: now,
    };
  }
}
