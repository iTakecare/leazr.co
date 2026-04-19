/**
 * Content script — injecté sur les sites fournisseurs.
 * Responsabilités :
 *  1. Détecter si on est sur une page produit (via adapter)
 *  2. Extraire l'offre
 *  3. Afficher un badge flottant "🦎 Leazr — Ajouter à la commande"
 *  4. Au clic, envoyer l'offre au background (qui la POST à l'edge function)
 */
import { findAdapter } from "./adapters";
import type { CapturedOffer, SourcingContext } from "../lib/types";

const BADGE_ID = "leazr-sourcing-badge";

async function getContext(): Promise<SourcingContext | null> {
  const r = await chrome.storage.local.get("sourcing_context");
  const ctx = r.sourcing_context as SourcingContext | undefined;
  if (!ctx) return null;
  // Expiration 24h
  if (new Date(ctx.expires_at).getTime() < Date.now()) return null;
  return ctx;
}

function renderBadge(offer: CapturedOffer, context: SourcingContext | null) {
  const existing = document.getElementById(BADGE_ID);
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.id = BADGE_ID;
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    width: 320px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #1e293b;
    font-size: 13px;
    line-height: 1.5;
    animation: leazr-slide-in 0.3s ease-out;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes leazr-slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #${BADGE_ID} button { font-family: inherit; }
  `;
  document.head.appendChild(style);

  const priceEur = (offer.price_cents / 100).toFixed(2).replace(".", ",");
  const deliveryLabel =
    offer.delivery_days_min || offer.delivery_days_max
      ? `Livré en ${offer.delivery_days_min ?? "?"}${
          offer.delivery_days_max && offer.delivery_days_max !== offer.delivery_days_min
            ? `-${offer.delivery_days_max}`
            : ""
        } j`
      : "";
  const stockLabel =
    offer.stock_status === "in_stock"
      ? "✅ En stock"
      : offer.stock_status === "limited"
      ? "⚠️ Stock limité"
      : offer.stock_status === "out_of_stock"
      ? "❌ Rupture"
      : "";

  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-size:18px">🦎</span>
      <strong style="font-size:13px;color:#3730a3">Leazr Sourcing</strong>
      <button id="leazr-close-badge" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#64748b;font-size:16px">✕</button>
    </div>
    <div style="font-weight:600;margin-bottom:6px;line-height:1.3">${escapeHtml(
      offer.title.length > 80 ? offer.title.slice(0, 80) + "…" : offer.title
    )}</div>
    <div style="color:#475569;margin-bottom:10px">
      <span style="font-weight:700;font-size:15px;color:#1e293b">${priceEur} €</span>
      ${deliveryLabel ? ` · ${deliveryLabel}` : ""}
      ${stockLabel ? ` · ${stockLabel}` : ""}
    </div>
    ${
      context
        ? `<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:#3730a3">
             <div style="font-weight:600;margin-bottom:2px">Commande en cours</div>
             <div>${escapeHtml(context.label)}${context.order_label ? ` · ${escapeHtml(context.order_label)}` : ""}</div>
           </div>`
        : `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:#92400e">
             Aucune commande sélectionnée dans Leazr. Ouvrez la popup pour choisir un contexte.
           </div>`
    }
    <button id="leazr-submit-btn" ${context ? "" : "disabled"} style="
      width:100%;padding:10px;
      background:${context ? "#4f46e5" : "#94a3b8"};
      color:white;border:none;border-radius:8px;
      font-weight:600;font-size:13px;
      cursor:${context ? "pointer" : "not-allowed"};
    ">
      ${context ? "+ Ajouter à la commande" : "Sélectionnez une commande"}
    </button>
    <div id="leazr-feedback" style="margin-top:8px;font-size:12px;text-align:center;min-height:16px"></div>
  `;

  document.body.appendChild(badge);

  document.getElementById("leazr-close-badge")?.addEventListener("click", () => badge.remove());

  const submitBtn = document.getElementById("leazr-submit-btn") as HTMLButtonElement | null;
  submitBtn?.addEventListener("click", async () => {
    if (!context) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi…";
    const feedback = document.getElementById("leazr-feedback");

    try {
      const resp = await chrome.runtime.sendMessage({
        type: "submit_offer",
        offer,
        context,
      });
      if (resp?.success) {
        if (feedback) {
          feedback.textContent = resp.needs_validation
            ? "✅ Proposée (en attente de validation admin)"
            : "✅ Ajoutée à Leazr";
          feedback.style.color = "#059669";
        }
        submitBtn.textContent = "Envoyée ✓";
        setTimeout(() => badge.remove(), 2500);
      } else {
        throw new Error(resp?.error ?? "Erreur inconnue");
      }
    } catch (e: any) {
      if (feedback) {
        feedback.textContent = `❌ ${e.message}`;
        feedback.style.color = "#dc2626";
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Réessayer";
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function run() {
  const url = new URL(window.location.href);
  console.log("[Leazr Sourcing] Content script actif sur", url.href);

  const adapter = findAdapter(url);
  if (!adapter) {
    console.log("[Leazr Sourcing] Aucun adapter pour ce host :", url.hostname);
    return;
  }
  console.log(`[Leazr Sourcing] Adapter "${adapter.name}" sélectionné`);

  if (!adapter.isProductPage(document, url)) {
    console.log("[Leazr Sourcing] Pas une page produit selon l'adapter");
    return;
  }
  console.log("[Leazr Sourcing] Page produit détectée, extraction en cours…");

  const result = adapter.extract(document, url);
  if (!result.ok) {
    console.warn(`[Leazr Sourcing] Échec extraction (${adapter.name}):`, result.reason);
    return;
  }

  const context = await getContext();
  console.log("[Leazr Sourcing] Contexte actuel :", context ?? "aucun");
  renderBadge(result.offer, context);
  console.log("[Leazr Sourcing] Badge affiché ✅");
}

// Premier passage : attendre 1s que les SPA aient hydraté le DOM
// Puis retry une fois après 3s si échec (JSON-LD arrive parfois tard)
setTimeout(() => {
  run().catch((e) => console.error("[Leazr Sourcing] Erreur run():", e));
}, 1000);

setTimeout(() => {
  if (!document.getElementById(BADGE_ID)) {
    console.log("[Leazr Sourcing] Retry après hydratation tardive…");
    run().catch((e) => console.error("[Leazr Sourcing] Erreur run() retry:", e));
  }
}, 3500);

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(run, 1200); // laisser le DOM se stabiliser
  }
}).observe(document, { childList: true, subtree: true });
