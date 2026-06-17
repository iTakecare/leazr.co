/**
 * Fondation visuelle de l'espace client Leazr (refonte 2026).
 *
 * Palette & primitives partagées par toutes les pages client pour garantir
 * un rendu cohérent fidèle à la maquette "Espace Client Leazr" :
 *   - canvas gris clair #F3F4F7
 *   - sidebar navy #0E1A30, accent indigo #2D55E5 (dégradé #3D6BFF → #2D55E5)
 *   - cartes blanches, bord #EAECF1, radius 16px, ombre douce
 *   - typo Inter
 *
 * Ces primitives sont volontairement "présentationnelles" : elles n'embarquent
 * aucune logique data — chaque page conserve ses hooks existants.
 */
import React from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────  Palette  ──────────────────────────── */

export const clientColors = {
  canvas: "#F3F4F7",
  navy: "#0E1A30",
  navyHi: "#16243F",
  navyAlt: "#1A2C5C",
  ink: "#0F172A",
  muted: "#667085",
  faint: "#94A0B4",
  border: "#EAECF1",
  borderSoft: "#EEF0F4",
  surface: "#FAFBFC",
  indigo: "#2D55E5",
  indigoBright: "#3D6BFF",
  violet: "#7C3AED",
  emerald: "#059669",
  orange: "#EA580C",
  pink: "#DB2777",
  cyan: "#0891B2",
} as const;

export const CLIENT_GRADIENT = "linear-gradient(135deg,#3D6BFF,#2D55E5)";
export const CLIENT_GRADIENT_VIOLET = "linear-gradient(135deg,#3D6BFF,#7C3AED)";

/* ────────────────────────────  Layout  ──────────────────────────── */

/** Conteneur de page : centre le contenu, applique padding + fade d'entrée. */
export const ClientPage: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { maxWidth?: number }
> = ({ maxWidth = 1180, className, style, children, ...rest }) => (
  <div
    className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", className)}
    style={{
      maxWidth,
      margin: "0 auto",
      padding: "28px 28px 56px",
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

/** En-tête de page : titre + sous-titre. */
export const ClientPageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div
    className={cn("flex items-start justify-between gap-4 flex-wrap", className)}
    style={{ marginBottom: 22 }}
  >
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: 0,
          color: clientColors.ink,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13.5, color: clientColors.muted, margin: "4px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

/* ────────────────────────────  Surfaces  ──────────────────────────── */

/** Carte blanche maquette (bord clair, radius 16, ombre douce). */
export const ClientCard: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { radius?: number; pad?: number | string }
> = ({ radius = 16, pad, className, style, children, ...rest }) => (
  <div
    className={className}
    style={{
      background: "#fff",
      border: `1px solid ${clientColors.border}`,
      borderRadius: radius,
      boxShadow: "0 1px 2px rgba(16,24,40,.04)",
      ...(pad !== undefined ? { padding: pad } : {}),
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

/* ────────────────────────────  KPI  ──────────────────────────── */

export const KpiCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  value: React.ReactNode;
  label: string;
}> = ({ icon, iconBg, value, label }) => (
  <ClientCard pad={18}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
    </div>
    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: clientColors.ink }}>
      {value}
    </div>
    <div style={{ fontSize: 12.5, color: clientColors.muted, marginTop: 2 }}>{label}</div>
  </ClientCard>
);

/* ────────────────────────────  Badges de statut  ──────────────────────────── */

type BadgeTone = { bg: string; fg: string };

const STATUS_TONES: Record<string, BadgeTone> = {
  // contrats
  active: { bg: "#E7F6F0", fg: "#047857" },
  signed: { bg: "#F2EBFE", fg: "#6D28D9" },
  contract_signed: { bg: "#F2EBFE", fg: "#6D28D9" },
  contract_sent: { bg: "#FEF3C7", fg: "#B45309" },
  equipment_ordered: { bg: "#E8EBFD", fg: "#4338CA" },
  delivered: { bg: "#EAF0FF", fg: "#1D4ED8" },
  completed: { bg: "#EEF0F4", fg: "#667085" },
  extended: { bg: "#EAF0FF", fg: "#1D4ED8" },
  cancelled: { bg: "#FEEFEF", fg: "#B91C1C" },
  // demandes
  pending: { bg: "#FFF0E6", fg: "#C2540B" },
  approved: { bg: "#E7F6F0", fg: "#047857" },
  // tickets
  open: { bg: "#EAF0FF", fg: "#1D4ED8" },
  in_progress: { bg: "#FEF3C7", fg: "#B45309" },
  resolved: { bg: "#E7F6F0", fg: "#047857" },
  closed: { bg: "#EEF0F4", fg: "#667085" },
};

export const badgeStyle = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 20,
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
});

export const StatusBadge: React.FC<{
  status: string;
  label?: string;
  tone?: BadgeTone;
}> = ({ status, label, tone }) => {
  const t = tone || STATUS_TONES[status] || { bg: "#EEF0F4", fg: "#667085" };
  return <span style={badgeStyle(t.bg, t.fg)}>{label ?? status}</span>;
};

/** Pastille catégorie d'équipement (chip coloré pâle). */
export const categoryTone: Record<string, string> = {
  Informatique: "#2D55E5",
  Ordinateurs: "#2D55E5",
  Téléphonie: "#DB2777",
  Smartphones: "#DB2777",
  Écrans: "#0891B2",
  Tablettes: "#7C3AED",
  Accessoires: "#475569",
};

export const equipChipStyle = (cat?: string): React.CSSProperties => {
  const c = (cat && categoryTone[cat]) || "#475569";
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 10.5,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    color: c,
    background: `${c}18`,
    whiteSpace: "nowrap",
  };
};

/* ────────────────────────────  Boutons  ──────────────────────────── */

export const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 40,
  padding: "0 16px",
  border: 0,
  borderRadius: 11,
  background: CLIENT_GRADIENT,
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(45,85,229,.32)",
};

export const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 36,
  padding: "0 13px",
  border: "1px solid #E2E5EC",
  background: "#fff",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 600,
  color: "#475569",
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
};

/* ────────────────────────────  État vide  ──────────────────────────── */

export const ClientEmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <ClientCard pad={48} style={{ textAlign: "center" }}>
    {icon && <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, opacity: 0.45 }}>{icon}</div>}
    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: clientColors.ink }}>{title}</h3>
    {description && (
      <p style={{ fontSize: 13, color: clientColors.muted, margin: "6px 0 0" }}>{description}</p>
    )}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </ClientCard>
);
