import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Receipt, FileText, AlertCircle } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getAccountingReport, type FiscalYearReport } from "@/services/accountingReportService";
import { formatCurrency } from "@/lib/utils";

export const AccountingReportTab: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [reports, setReports] = useState<FiscalYearReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await getAccountingReport(companyId);
        setReports(data);
      } catch (err: any) {
        console.error('Erreur lors de la récupération du rapport:', err);
        setError(err.message || 'Erreur lors du chargement du rapport');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erreur</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune donnée</h3>
        <p className="text-muted-foreground">
          Aucune facture n'a été trouvée pour générer un rapport comptable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé global */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Synthèse globale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background rounded-lg shadow-sm">
              <div className="text-2xl font-bold">
                {formatCurrency(reports.reduce((sum, r) => sum + r.invoices.total, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total facturé</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(reports.reduce((sum, r) => sum + r.invoices.paid, 0))}
              </div>
              <div className="text-sm text-green-600">Total payé</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                -{formatCurrency(reports.reduce((sum, r) => sum + r.invoices.credited, 0))}
              </div>
              <div className="text-sm text-purple-600">Total crédité</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(reports.reduce((sum, r) => sum + r.invoices.netRevenue, 0))}
              </div>
              <div className="text-sm text-muted-foreground">CA Net total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rapport par exercice */}
      {reports.map(report => {
        const creditRatio = report.invoices.total > 0 
          ? ((report.invoices.credited / report.invoices.total) * 100).toFixed(1)
          : '0';
        const paidRatio = report.invoices.total > 0 
          ? ((report.invoices.paid / report.invoices.total) * 100).toFixed(1)
          : '0';

        return (
          <Card key={report.year}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Exercice {report.year}
                </span>
                <Badge variant="outline" className="text-lg px-4 py-1">
                  CA Net: {formatCurrency(report.invoices.netRevenue)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistiques principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{formatCurrency(report.invoices.total)}</div>
                  <div className="text-sm text-muted-foreground">
                    Total facturé ({report.invoices.count} factures)
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(report.invoices.paid)}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-500">
                    Payé ({report.invoices.paidCount}) - {paidRatio}%
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {formatCurrency(report.invoices.unpaid)}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-500">
                    En attente ({report.invoices.unpaidCount})
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingDown className="h-4 w-4 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                      -{formatCurrency(report.invoices.credited)}
                    </span>
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-500">
                    Crédité ({report.invoices.creditedCount}) - {creditRatio}%
                  </div>
                </div>
              </div>

              {/* Notes de crédit */}
              {report.creditNotes.count > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Notes de crédit émises pour cet exercice
                    </span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    {report.creditNotes.count} note(s) de crédit pour un montant total de {formatCurrency(report.creditNotes.total)}
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-600 mt-1">
                    Les notes de crédit sont comptabilisées sur l'exercice de la facture originale, quelle que soit leur date d'émission.
                  </p>
                </div>
              )}

              {/* Barre de progression visuelle */}
              <div className="h-4 rounded-full overflow-hidden bg-muted flex">
                {report.invoices.total > 0 && (
                  <>
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(report.invoices.paid / report.invoices.total) * 100}%` }}
                      title={`Payé: ${formatCurrency(report.invoices.paid)}`}
                    />
                    <div 
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${(report.invoices.unpaid / report.invoices.total) * 100}%` }}
                      title={`En attente: ${formatCurrency(report.invoices.unpaid)}`}
                    />
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${(report.invoices.credited / report.invoices.total) * 100}%` }}
                      title={`Crédité: ${formatCurrency(report.invoices.credited)}`}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" /> Payé
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500" /> En attente
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500" /> Crédité
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AccountingReportTab;
