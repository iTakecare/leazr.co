// Export Excel du rapport « Analyste KPI » : même mécanique que les exports
// existants (offersExportService/stockExportService : ExcelJS + blob).
// Une feuille « Synthèse » (KPIs + recommandations) puis une feuille par
// section contenant un tableau.
import type { KpiReport } from "@/services/kpiService";

const HEADER_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF1B2A4A" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

// Nettoie un intitulé pour en faire un nom de feuille Excel valide (31 car. max)
const sheetName = (raw: string, index: number, used: Set<string>): string => {
  let name = (raw || `Section ${index + 1}`).replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 28) || `Section ${index + 1}`;
  let candidate = name;
  let n = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${name} (${n++})`;
  used.add(candidate.toLowerCase());
  return candidate;
};

// « 12 500 € » / « 38 % » / « 41,8 j » → nombre + format Excel ; sinon texte tel quel
const smartCell = (value: string): { value: string | number; numFmt?: string } => {
  const raw = (value ?? "").toString().trim();
  const m = raw.match(/^-?[\d  \s.,]+\s*(€|%|j|jours)?$/i);
  if (!m) return { value: raw };
  const num = parseFloat(raw.replace(/[  \s€%]|jours?|j$/gi, "").replace(/\./g, (d, i, s) => (s.indexOf(",") > -1 ? "" : d)).replace(",", "."));
  if (isNaN(num)) return { value: raw };
  const unit = (m[1] || "").toLowerCase();
  if (unit === "€") return { value: num, numFmt: '#,##0.00 "€"' };
  if (unit === "%") return { value: num, numFmt: '0.0 "%"' };
  if (unit) return { value: num, numFmt: `0.0 "${unit}"` };
  return { value: num };
};

export const downloadKpiReportExcel = async (report: KpiReport) => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Leazr — Analyste KPI";
  workbook.created = new Date();

  const used = new Set<string>();

  // ---------- Feuille Synthèse ----------
  const synth = workbook.addWorksheet(sheetName("Synthèse", 0, used));
  synth.columns = [{ width: 42 }, { width: 24 }, { width: 50 }];

  const titleRow = synth.addRow([report.title]);
  titleRow.font = { bold: true, size: 14 };
  synth.addRow([report.subtitle || ""]);
  synth.addRow([`Période : ${report.period}`, `Généré le ${new Date().toLocaleDateString("fr-BE")}`]);
  synth.addRow([]);

  const kpiHeader = synth.addRow(["Indicateur", "Valeur", "Précision"]);
  kpiHeader.font = HEADER_FONT;
  kpiHeader.eachCell((c) => { c.fill = HEADER_FILL; });
  for (const k of report.kpis || []) {
    const cell = smartCell(k.value);
    const row = synth.addRow([k.label, cell.value, k.hint || ""]);
    if (cell.numFmt) row.getCell(2).numFmt = cell.numFmt;
  }

  if (report.recommendations?.length) {
    synth.addRow([]);
    const recHeader = synth.addRow(["Recommandations"]);
    recHeader.font = HEADER_FONT;
    recHeader.getCell(1).fill = HEADER_FILL;
    report.recommendations.forEach((r, i) => synth.addRow([`${i + 1}. ${r}`]));
  }

  // ---------- Une feuille par section ----------
  (report.sections || []).forEach((section, i) => {
    const ws = workbook.addWorksheet(sheetName(section.heading, i + 1, used));

    const head = ws.addRow([section.heading]);
    head.font = { bold: true, size: 12 };
    if (section.text) {
      const txt = ws.addRow([section.text]);
      txt.getCell(1).alignment = { wrapText: true, vertical: "top" };
    }
    for (const b of section.bullets || []) ws.addRow([`• ${b}`]);
    ws.addRow([]);

    if (section.table?.columns?.length) {
      const headerRow = ws.addRow(section.table.columns);
      headerRow.font = HEADER_FONT;
      headerRow.eachCell((c) => { c.fill = HEADER_FILL; });
      for (const r of section.table.rows || []) {
        const cells = r.map((v) => smartCell(v));
        const row = ws.addRow(cells.map((c) => c.value));
        cells.forEach((c, ci) => {
          if (c.numFmt) row.getCell(ci + 1).numFmt = c.numFmt;
        });
      }
      // Largeur de colonnes selon le contenu
      section.table.columns.forEach((col, ci) => {
        const maxLen = Math.max(col.length, ...(section.table!.rows || []).map((r) => (r[ci] || "").length));
        ws.getColumn(ci + 1).width = Math.min(Math.max(maxLen + 4, 12), 50);
      });
    } else {
      ws.getColumn(1).width = 100;
    }
  });

  // ---------- Téléchargement ----------
  const slug = report.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "rapport-kpi";
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
