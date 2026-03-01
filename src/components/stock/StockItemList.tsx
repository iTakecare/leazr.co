import React, { useState } from "react";
import { useStockItems } from "@/hooks/useStockItems";
import { STOCK_STATUS_CONFIG, CONDITION_CONFIG, StockStatus, StockItem } from "@/services/stockService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateStockItem, createMovement } from "@/services/stockService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface StockItemListProps {
  onEdit?: (item: StockItem) => void;
}

const StockItemList: React.FC<StockItemListProps> = ({ onEdit }) => {
  const [statusFilter, setStatusFilter] = useState<StockStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { items, isLoading } = useStockItems(statusFilter);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useMultiTenant();

  const handleStatusChange = async (item: StockItem, newStatus: StockStatus) => {
    if (newStatus === item.status || !companyId) return;
    try {
      const oldStatus = item.status;
      await updateStockItem(item.id, { status: newStatus });
      await createMovement({
        company_id: companyId,
        stock_item_id: item.id,
        movement_type: 'reception',
        from_status: oldStatus,
        to_status: newStatus,
        performed_by: user?.id || null,
        notes: `Changement rapide: ${STOCK_STATUS_CONFIG[oldStatus]?.label} → ${STOCK_STATUS_CONFIG[newStatus]?.label}`,
      });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success(`Statut changé en "${STOCK_STATUS_CONFIG[newStatus].label}"`);
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Impossible de changer le statut"));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      // Delete related movements first, then the item
      await supabase.from('stock_movements' as any).delete().eq('stock_item_id', deleteItem.id);
      const { error } = await supabase.from('stock_items' as any).delete().eq('id', deleteItem.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success("Article supprimé");
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Impossible de supprimer"));
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  };

  const filtered = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(s) ||
      (item.serial_number || '').toLowerCase().includes(s) ||
      (item.serial_numbers || []).some(sn => sn.toLowerCase().includes(s)) ||
      (item.supplier?.name || '').toLowerCase().includes(s) ||
      (item.category || '').toLowerCase().includes(s) ||
      (item.brand || '').toLowerCase().includes(s) ||
      (item.model || '').toLowerCase().includes(s) ||
      (item.cpu || '').toLowerCase().includes(s) ||
      (item.grade || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher (titre, N° série, fournisseur)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? undefined : v as StockStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STOCK_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun article en stock</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Article</TableHead>
                <TableHead>N° série</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const statusCfg = STOCK_STATUS_CONFIG[item.status] || STOCK_STATUS_CONFIG.in_stock;
                const condCfg = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.new;
                return (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit?.(item)}>
                    <TableCell className="p-1">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit?.(item); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteItem(item); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.serial_numbers && item.serial_numbers.length > 0
                        ? item.serial_numbers.length > 2
                          ? <span title={item.serial_numbers.join(', ')}>{item.serial_numbers[0]}... ({item.serial_numbers.length})</span>
                          : item.serial_numbers.join(', ')
                        : item.serial_number || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{item.category || '-'}</TableCell>
                    <TableCell className="text-xs">{item.brand || '-'}</TableCell>
                    <TableCell className="text-xs">{item.model || '-'}</TableCell>
                    <TableCell className="text-right text-xs">{item.quantity || 1}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={item.status} onValueChange={v => handleStatusChange(item, v as StockStatus)}>
                        <SelectTrigger className={`h-7 w-auto min-w-[120px] text-xs border ${statusCfg.bgColor} ${statusCfg.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STOCK_STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">{condCfg.label}</TableCell>
                    <TableCell className="text-xs">{item.supplier?.name || '-'}</TableCell>
                    <TableCell className="text-right text-xs">{(item.unit_price || item.purchase_price)?.toFixed(2)} €</TableCell>
                    <TableCell className="text-right text-xs font-medium">{item.purchase_price?.toFixed(2)} €</TableCell>
                    <TableCell className="text-xs">
                      {item.contract ? `${item.contract.contract_number} - ${item.contract.client_name}` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.reception_date ? format(new Date(item.reception_date), 'dd/MM/yyyy', { locale: fr }) :
                       item.purchase_date ? format(new Date(item.purchase_date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article <strong>"{deleteItem?.title}"</strong> sera supprimé définitivement ainsi que son historique de mouvements. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockItemList;
