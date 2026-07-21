// Génération du PDF « Analyste KPI » : rapport structuré (titre, KPIs, sections
// avec tableaux, recommandations) mis en page avec jsPDF + jspdf-autotable
// (texte sélectionnable, tableaux natifs — pas de capture d'écran).
import type { KpiReport } from "@/services/kpiService";

const NAVY: [number, number, number] = [27, 42, 74];
const BLUE: [number, number, number] = [59, 130, 246];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

export const downloadKpiReportPdf = async (report: KpiReport, companyName?: string) => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 18) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ---------- Bandeau d'en-tête ----------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(doc.splitTextToSize(report.title, CONTENT_W - 40), MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (report.subtitle) doc.text(doc.splitTextToSize(report.subtitle, CONTENT_W - 40), MARGIN, 22);
  doc.setFontSize(9);
  doc.setTextColor(180, 197, 225);
  const meta = `${report.period}  •  généré le ${new Date().toLocaleDateString("fr-BE")}${companyName ? `  •  ${companyName}` : ""}`;
  doc.text(meta, MARGIN, 29);
  y = 42;

  // ---------- KPIs ----------
  const kpis = report.kpis || [];
  if (kpis.length) {
    const perRow = kpis.length <= 3 ? kpis.length : 4;
    const boxW = (CONTENT_W - (perRow - 1) * 4) / perRow;
    const boxH = 20;
    kpis.forEach((k, i) => {
      const col = i % perRow;
      if (col === 0 && i > 0) y += boxH + 4;
      ensureSpace(boxH + 4);
      const x = MARGIN + col * (boxW + 4);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(String(k.value), x + 3, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const label = k.hint ? `${k.label} — ${k.hint}` : k.label;
      doc.text(doc.splitTextToSize(label, boxW - 6), x + 3, y + 14);
    });
    y += 20 + 8;
  }

  // ---------- Sections ----------
  for (const section of report.sections || []) {
    ensureSpace(20);
    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y - 3.5, 1.6, 5, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.heading, MARGIN + 4, y);
    y += 6;

    if (section.text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(50, 60, 80);
      const lines = doc.splitTextToSize(section.text, CONTENT_W);
      ensureSpace(lines.length * 4.5 + 3);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.5 + 2;
    }

    if (section.bullets?.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(50, 60, 80);
      for (const b of section.bullets) {
        const lines = doc.splitTextToSize(b, CONTENT_W - 6);
        ensureSpace(lines.length * 4.5 + 1.5);
        doc.setFillColor(...BLUE);
        doc.circle(MARGIN + 1.5, y - 1.2, 0.8, "F");
        doc.text(lines, MARGIN + 5, y);
        y += lines.length * 4.5 + 1.5;
      }
      y += 1;
    }

    if (section.table?.columns?.length) {
      ensureSpace(24);
      autoTable(doc, {
        head: [section.table.columns],
        body: section.table.rows || [],
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [50, 60, 80] },
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: "plain",
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      y += 3;
    }
  }

  // ---------- Recommandations ----------
  if (report.recommendations?.length) {
    ensureSpace(20);
    doc.setFillColor(...BLUE);
    doc.rect(MARGIN, y - 3.5, 1.6, 5, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Recommandations", MARGIN + 4, y);
    y += 6;
    doc.setFontSize(9.5);
    report.recommendations.forEach((r, i) => {
      const lines = doc.splitTextToSize(r, CONTENT_W - 8);
      ensureSpace(lines.length * 4.5 + 2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(`${i + 1}.`, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 60, 80);
      doc.text(lines, MARGIN + 7, y);
      y += lines.length * 4.5 + 2;
    });
  }

  // ---------- Pied de page ----------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Leazr — Analyste KPI (IA)", MARGIN, PAGE_H - 8);
    doc.text(`Page ${p} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const slug = report.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "rapport-kpi";
  doc.save(`${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
};
