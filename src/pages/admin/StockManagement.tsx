import React, { useState } from "react";
import { StockItem } from "@/services/stockService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import StockDashboard from "@/components/stock/StockDashboard";
import StockItemList from "@/components/stock/StockItemList";
import StockMovementHistory from "@/components/stock/StockMovementHistory";
import StockRepairList from "@/components/stock/StockRepairList";
import StockItemForm from "@/components/stock/StockItemForm";
import StockValuationReport from "@/components/stock/StockValuationReport";
import StockImportDialog from "@/components/stock/StockImportDialog";
import { exportStockToExcel } from "@/services/stockExportService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { toast } from "sonner";

const StockManagement: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { companyId } = useMultiTenant();

  const handleExport = async () => {
    if (!companyId) return;
    setExporting(true);
    try {
      await exportStockToExcel(companyId);
      toast.success("Export Excel téléchargé");
    } catch (err: any) {
      toast.error("Erreur lors de l'export: " + (err.message || "Erreur inconnue"));
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion du Stock</h1>
          <p className="text-muted-foreground text-sm">Suivi du cycle de vie des équipements physiques</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Export...' : 'Exporter Excel'}
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button onClick={() => { setEditingItem(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel article
          </Button>
        </div>
      </div>

      <StockDashboard />

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">Articles</TabsTrigger>
          <TabsTrigger value="movements">Mouvements</TabsTrigger>
          <TabsTrigger value="repairs">Réparations</TabsTrigger>
          <TabsTrigger value="valuation">Valorisation</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-4">
          <StockItemList onEdit={(item) => { setEditingItem(item); setFormOpen(true); }} />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <StockMovementHistory />
        </TabsContent>
        <TabsContent value="repairs" className="mt-4">
          <StockRepairList />
        </TabsContent>
        <TabsContent value="valuation" className="mt-4">
          <StockValuationReport />
        </TabsContent>
      </Tabs>

      <StockItemForm open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingItem(null); }} editItem={editingItem} />
      <StockImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
};

export default StockManagement;
