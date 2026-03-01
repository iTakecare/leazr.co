import React, { useMemo } from "react";
import { useStockItems } from "@/hooks/useStockItems";
import { STOCK_STATUS_CONFIG, StockStatus } from "@/services/stockService";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Package, BarChart3 } from "lucide-react";

const ACTIVE_STATUSES: StockStatus[] = ['ordered', 'in_stock', 'assigned', 'in_repair'];

const StockValuationReport: React.FC = () => {
  const { items, isLoading } = useStockItems();

  const { activeValue, activeCount, avgValue, byStatus, byCategory } = useMemo(() => {
    if (!items.length) return { activeValue: 0, activeCount: 0, avgValue: 0, byStatus: [], byCategory: [] };

    const totalValue = items.reduce((s, i) => s + (i.purchase_price || 0), 0);

    // By status
    const statusMap = new Map<StockStatus, { qty: number; value: number }>();
    items.forEach(item => {
      const e = statusMap.get(item.status) || { qty: 0, value: 0 };
      e.qty++;
      e.value += item.purchase_price || 0;
      statusMap.set(item.status, e);
    });
    const byStatus = Array.from(statusMap.entries()).map(([status, d]) => ({
      status,
      ...d,
      pct: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
    }));

    // By category
    const catMap = new Map<string, { qty: number; value: number }>();
    items.forEach(item => {
      const cat = item.product?.name || "Sans catégorie";
      const e = catMap.get(cat) || { qty: 0, value: 0 };
      e.qty++;
      e.value += item.purchase_price || 0;
      catMap.set(cat, e);
    });
    const byCategory = Array.from(catMap.entries())
      .map(([category, d]) => ({ category, ...d, pct: totalValue > 0 ? (d.value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    // Active totals
    const activeItems = items.filter(i => ACTIVE_STATUSES.includes(i.status));
    const activeValue = activeItems.reduce((s, i) => s + (i.purchase_price || 0), 0);
    const activeCount = activeItems.length;

    return {
      activeValue,
      activeCount,
      avgValue: activeCount > 0 ? activeValue / activeCount : 0,
      byStatus,
      byCategory,
    };
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valeur du stock actif</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(activeValue)}</div>
            <p className="text-xs text-muted-foreground">Hors vendu et rebut</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Articles actifs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">En circulation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valeur moyenne</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgValue)}</div>
            <p className="text-xs text-muted-foreground">Par article actif</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: By status */}
      <Card>
        <CardHeader>
          <CardTitle>Valorisation par statut</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Valeur totale</TableHead>
                <TableHead className="text-right">% du total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byStatus.map(row => {
                const cfg = STOCK_STATUS_CONFIG[row.status];
                return (
                  <TableRow key={row.status}>
                    <TableCell>
                      <Badge variant="outline" className={`${cfg.bgColor} ${cfg.color} border`}>
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.qty}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.value)}</TableCell>
                    <TableCell className="text-right">{row.pct.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: By category */}
      <Card>
        <CardHeader>
          <CardTitle>Valorisation par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Valeur totale</TableHead>
                <TableHead className="text-right">% du total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.map(row => (
                <TableRow key={row.category}>
                  <TableCell className="font-medium">{row.category}</TableCell>
                  <TableCell className="text-right">{row.qty}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.value)}</TableCell>
                  <TableCell className="text-right">{row.pct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {byCategory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Aucun article en stock
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockValuationReport;
