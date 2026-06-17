import React from "react";
import { ArrowRight, Megaphone } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import type { ClientPromotion } from "@/types/promotion";
import { clientColors, ClientCard } from "@/components/client/clientUi";

const isExternal = (url?: string | null) => !!url && /^https?:\/\//i.test(url);

const usePromoClick = () => {
  const { navigateToClient } = useRoleNavigation();
  return (promo: ClientPromotion) => {
    if (!promo.link_url) return;
    if (isExternal(promo.link_url)) {
      window.open(promo.link_url, "_blank", "noopener");
    } else {
      navigateToClient(promo.link_url.replace(/^\/+/, ""));
    }
  };
};

/** Bannière promotionnelle horizontale, affichée en haut du tableau de bord. */
export const PromoTopBanner: React.FC<{ promo: ClientPromotion }> = ({ promo }) => {
  const onClick = usePromoClick();
  const clickable = !!promo.link_url;
  const bg = promo.background || "linear-gradient(120deg,#2D55E5,#7C3AED)";
  return (
    <div
      onClick={clickable ? () => onClick(promo) : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        background: bg,
        color: "#fff",
        padding: promo.image_url ? 0 : "18px 22px",
        cursor: clickable ? "pointer" : "default",
        display: "flex",
        alignItems: "stretch",
        minHeight: 88,
      }}
    >
      {promo.image_url && (
        <div
          style={{
            width: 150,
            flex: "none",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            borderRight: "1px solid rgba(0,0,0,.06)",
          }}
        >
          <img src={promo.image_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: promo.image_url ? "16px 22px" : 0, flex: 1, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.7)", marginBottom: 4 }}>
            <Megaphone size={13} /> À la une
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1.2 }}>{promo.title}</div>
          {promo.description && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.82)", marginTop: 3 }}>{promo.description}</div>
          )}
        </div>
        {promo.cta_label && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 38,
              padding: "0 16px",
              borderRadius: 10,
              background: "#fff",
              color: clientColors.ink,
              fontWeight: 600,
              fontSize: 13,
              flex: "none",
            }}
          >
            {promo.cta_label} <ArrowRight size={15} />
          </span>
        )}
      </div>
    </div>
  );
};

/** Carte promotionnelle verticale, affichée dans la colonne de droite. */
export const PromoSidebarCard: React.FC<{ promo: ClientPromotion }> = ({ promo }) => {
  const onClick = usePromoClick();
  const clickable = !!promo.link_url;
  return (
    <ClientCard
      style={{ overflow: "hidden", cursor: clickable ? "pointer" : "default" }}
      onClick={clickable ? () => onClick(promo) : undefined}
    >
      {promo.image_url ? (
        <div style={{ height: 140, background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, borderBottom: "1px solid #EEF0F4" }}>
          <img src={promo.image_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      ) : (
        <div style={{ height: 64, background: promo.background || "linear-gradient(120deg,#2D55E5,#7C3AED)", display: "flex", alignItems: "center", padding: "0 16px" }}>
          <Megaphone size={20} color="#fff" />
        </div>
      )}
      <div style={{ padding: "13px 15px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: clientColors.ink, lineHeight: 1.3 }}>{promo.title}</div>
        {promo.description && (
          <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 4, lineHeight: 1.45 }}>{promo.description}</div>
        )}
        {promo.cta_label && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, fontWeight: 600, color: clientColors.indigo }}>
            {promo.cta_label} <ArrowRight size={14} />
          </div>
        )}
      </div>
    </ClientCard>
  );
};
