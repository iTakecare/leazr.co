import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  OrderStatus,
  ORDER_STATUS_CONFIG,
  EquipmentOrderItem,
} from "@/services/equipmentOrderService";
import { exportEquipmentOrdersToExcel } from "@/services/equipmentOrderExportService";

interface SupplierInfo {
  id: string;
  name: string;
  supplier_type?: string;
}

interface ExportOrdersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EquipmentOrderItem[];
  suppliers: SupplierInfo[];
}

const ALL_STATUSES: OrderStatus[] = ['to_order', 'ordered', 'received', 'cancelled'];

/** Année (source_date) d'une ligne, ou "Inconnu" si absente */
const itemYear = (item: EquipmentOrderItem): string =>
  item.source_date ? new Date(item.source_date).getFullYear().toString() : 'Inconnu';

/** Une ligne correspond-elle au statut sélectionné (gère les lignes éclatées en unités) */
const matchesStatus = (item: EquipmentOrderItem, statuses: OrderStatus[]): boolean => {
  if (statuses.length === 0) return false;
  if (item.units && item.units.length > 0) {
    return item.units.some(u => statuses.includes(u.order_status as OrderStatus))
      || statuses.includes(item.order_status as OrderStatus);
  }
  return statuses.includes(item.order_status as OrderStatus);
};

/** Une ligne correspond-elle au fournisseur sélectionné */
const matchesSupplier = (item: EquipmentOrderItem, supplierId: string): boolean => {
  if (supplierId === 'all') return true;
  if (item.units && item.units.length > 0) {
    return item.units.some(u => u.supplier_id === supplierId) || item.supplier_id === supplierId;
  }
  return item.supplier_id === supplierId;
};

const ExportOrdersModal: React.FC<ExportOrdersModalProps> = ({ open, onOpenChange, items, suppliers }) => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([...ALL_STATUSES]);
  const [year, setYear] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [clientName, setClientName] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // Années présentes dans les données, triées décroissant ("Inconnu" en dernier)
  const years = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => set.add(itemYear(i)));
    return Array.from(set).sort((a, b) => {
      if (a === 'Inconnu') return 1;
      if (b === 'Inconnu') return -1;
      return Number(b) - Number(a);
    });
  }, [items]);

  // Tous les clients présents (liste complète, pour pouvoir exporter même l'historique)
  const clients = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.client_name) set.add(i.client_name); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const toggleStatus = (status: OrderStatus) => {
    setStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  // Lignes correspondant aux critères choisis
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (!matchesStatus(item, statuses)) return false;
      if (year !== 'all' && itemYear(item) !== year) return false;
      if (supplierId !== 'all' && !matchesSupplier(item, supplierId)) return false;
      if (clientName !== 'all' && item.client_name !== clientName) return false;
      return true;
    });
  }, [items, statuses, year, supplierId, clientName]);

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Aucun équipement ne correspond aux critères sélectionnés");
      return;
    }
    try {
      setExporting(true);
      await exportEquipmentOrdersToExcel(filtered, suppliers);
      toast.success(`${filtered.length} équipement(s) exporté(s)`);
      onOpenChange(false);
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setStatuses([...ALL_STATUSES]);
    setYear('all');
    setSupplierId('all');
    setClientName('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exporter les commandes
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les critères à inclure dans le fichier Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Statuts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Statut</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map(status => (
                <label
                  key={status}
                  className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={statuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <span className="text-sm">{ORDER_STATUS_CONFIG[status].label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Année */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Année</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fournisseur */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fournisseur</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Client</Label>
            <Select value={clientName} onValueChange={setClientName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> équipement(s) seront exportés.
          </p>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={resetFilters} disabled={exporting}>
            Réinitialiser
          </Button>
          <Button onClick={handleExport} disabled={exporting || filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Export…" : "Exporter Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportOrdersModal;
