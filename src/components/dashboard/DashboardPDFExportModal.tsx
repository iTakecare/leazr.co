import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, FileText, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useCompanyBranding } from '@/context/CompanyBrandingContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DashboardPDFContent, {
  type PDFYearData,
  type PDFSections,
  type PDFCharts,
  type PDFMonthlyData,
  type PDFContractStats,
} from './DashboardPDFContent';

interface DashboardPDFExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryYearData: PDFYearData;
  availableYears: number[];
  selectedYear: number;
}

const DashboardPDFExportModal = ({
  open,
  onOpenChange,
  primaryYearData,
  availableYears,
  selectedYear,
}: DashboardPDFExportModalProps) => {
  const { branding } = useCompanyBranding();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Selected years for comparison (primary year always included)
  const [comparisonYears, setComparisonYears] = useState<number[]>([]);

  // Sections
  const [sections, setSections] = useState<PDFSections>({
    kpiCards: true,
    monthlyTable: true,
    statusStats: true,
    overdueInvoices: true,
  });

  // Charts
  const [charts, setCharts] = useState<PDFCharts>({
    barRevenueMargin: true,
    lineMarginPercent: true,
    pieRevenue: true,
    stackedBarType: true,
  });

  // Fetch comparison years data
  const compYear1 = comparisonYears[0];
  const compYear2 = comparisonYears[1];
  const { metrics: compMetrics1, overdueInvoices: compOverdue1 } = useCompanyDashboard(compYear1 || 0);
  const { metrics: compMetrics2, overdueInvoices: compOverdue2 } = useCompanyDashboard(compYear2 || 0);

  const buildYearData = useCallback((metrics: any, overdueInvoices: any, year: number): PDFYearData | null => {
    if (!metrics?.monthly_data) return null;

    const monthlyData: PDFMonthlyData[] = metrics.monthly_data.map((month: any) => ({
      month: month.month_name,
      ca: Number(month.revenue || 0) + Number(month.direct_sales_revenue || 0) + Number(month.self_leasing_revenue || 0),
      caLeasing: Number(month.revenue || 0),
      selfLeasing: Number(month.self_leasing_revenue || 0),
      directSales: Number(month.direct_sales_revenue || 0),
      achats: Number(month.purchases || 0),
      marge: Number(month.margin || 0),
      margePercent: Number(month.margin_percentage || 0),
      creditNotes: Number(month.credit_notes_amount || 0),
    }));

    const totals = {
      ca: monthlyData.reduce((s, m) => s + m.ca, 0),
      caLeasing: monthlyData.reduce((s, m) => s + m.caLeasing, 0),
      selfLeasing: monthlyData.reduce((s, m) => s + m.selfLeasing, 0),
      directSales: monthlyData.reduce((s, m) => s + m.directSales, 0),
      achats: monthlyData.reduce((s, m) => s + m.achats, 0),
      marge: monthlyData.reduce((s, m) => s + m.marge, 0),
      creditNotes: monthlyData.reduce((s, m) => s + m.creditNotes, 0),
    };

    const len = monthlyData.length || 1;
    const moyennes = {
      ca: totals.ca / len,
      caLeasing: totals.caLeasing / len,
      selfLeasing: totals.selfLeasing / len,
      directSales: totals.directSales / len,
      achats: totals.achats / len,
      marge: totals.marge / len,
      margePercent: totals.ca > 0 ? (totals.marge / totals.ca) * 100 : 0,
    };

    const contractStats = metrics.contract_stats || [];
    const findStat = (status: string) => contractStats.find((s: any) => s.status === status) as PDFContractStats | undefined;

    return {
      year,
      monthlyData,
      totals,
      moyennes,
      contractStats: {
        realized: findStat('realized'),
        pending: findStat('pending'),
        refused: findStat('refused'),
        directSales: findStat('direct_sales'),
      },
      overdueInvoices: overdueInvoices || { overdue_count: 0, overdue_amount: 0 },
    };
  }, []);

  const toggleYear = (year: number) => {
    setComparisonYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : prev.length < 2 ? [...prev, year] : prev
    );
  };

  const handleGenerate = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    try {
      // Wait for charts to render
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let yPos = margin;
      let remainingHeight = imgHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const pageContentHeight = pdfHeight - margin * 2;
        const sliceHeight = Math.min(remainingHeight, pageContentHeight);
        const sliceRatio = sliceHeight / imgHeight;

        // Add page slice
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPos,
          contentWidth,
          imgHeight,
          undefined,
          'FAST',
          0
        );

        remainingHeight -= pageContentHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          yPos = margin - (imgHeight - remainingHeight);
        }
      }

      const yearLabel = [selectedYear, ...comparisonYears].join('-');
      pdf.save(`rapport-financier-${yearLabel}.pdf`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Build all years data
  const allYearsData: PDFYearData[] = [primaryYearData];
  if (compYear1 && compMetrics1) {
    const d = buildYearData(compMetrics1, compOverdue1, compYear1);
    if (d) allYearsData.push(d);
  }
  if (compYear2 && compMetrics2) {
    const d = buildYearData(compMetrics2, compOverdue2, compYear2);
    if (d) allYearsData.push(d);
  }

  const sectionItems = [
    { key: 'kpiCards' as const, label: 'KPI Cards', icon: TrendingUp },
    { key: 'monthlyTable' as const, label: 'Tableau mensuel', icon: FileText },
    { key: 'statusStats' as const, label: 'Stats par statut', icon: BarChart3 },
    { key: 'overdueInvoices' as const, label: 'Factures en retard', icon: FileText },
  ];

  const chartItems = [
    { key: 'barRevenueMargin' as const, label: 'Barres CA / Achats / Marge', icon: BarChart3 },
    { key: 'lineMarginPercent' as const, label: 'Courbe marge %', icon: TrendingUp },
    { key: 'pieRevenue' as const, label: 'Camembert répartition CA', icon: PieChart },
    { key: 'stackedBarType' as const, label: 'Barres empilées par type', icon: BarChart3 },
  ];

  const otherYears = availableYears.filter(y => y !== selectedYear);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exporter le Rapport PDF
            </DialogTitle>
            <DialogDescription>
              Choisissez les sections, graphiques et années à inclure dans votre rapport.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sections */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Sections</h3>
              <div className="grid grid-cols-2 gap-3">
                {sectionItems.map(item => (
                  <label
                    key={item.key}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      sections[item.key] ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={sections[item.key]}
                      onCheckedChange={(checked) =>
                        setSections(prev => ({ ...prev, [item.key]: checked === true }))
                      }
                    />
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Graphiques</h3>
              <div className="grid grid-cols-2 gap-3">
                {chartItems.map(item => (
                  <label
                    key={item.key}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      charts[item.key] ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={charts[item.key]}
                      onCheckedChange={(checked) =>
                        setCharts(prev => ({ ...prev, [item.key]: checked === true }))
                      }
                    />
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Years */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Comparaison multi-années
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Année principale : <Badge variant="secondary">{selectedYear}</Badge> — Sélectionnez jusqu'à 2 années supplémentaires.
              </p>
              <div className="flex flex-wrap gap-2">
                {otherYears.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm border transition-colors",
                      comparisonYears.includes(year)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted/50 text-foreground"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Générer le PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden PDF content for capture */}
      <DashboardPDFContent
        ref={contentRef}
        yearsData={allYearsData}
        sections={sections}
        charts={charts}
        companyName={branding?.company_name || ''}
      />
    </>
  );
};

export default DashboardPDFExportModal;
