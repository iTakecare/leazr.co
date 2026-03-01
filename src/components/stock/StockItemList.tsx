import React, { useState, useMemo } from "react";
import { useStockItems } from "@/hooks/useStockItems";
import { STOCK_STATUS_CONFIG, CONDITION_CONFIG, StockStatus, StockItem } from "@/services/stockService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateStockItem, createMovement } from "@/services/stockService";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface StockItemListProps {
  onEdit?: (item: StockItem) => void;
}

type SortKey = 'title' | 'serial_number' | 'category' | 'brand' | 'model' | 'quantity' | 'status' | 'condition' | 'supplier' | 'unit_price' | 'purchase_price' | 'date';
type SortDir = 'asc' | 'desc';
type GroupBy = 'none' | 'brand' | 'status' | 'supplier' | 'category' | 'condition';

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'Aucun' },
  { value: 'status', label: 'Statut' },
  { value: 'brand', label: 'Marque' },
  { value: 'supplier', label: 'Fournisseur' },
  { value: 'category', label: 'Catégorie' },
  { value: 'condition', label: 'État' },
];

const getGroupValue = (item: StockItem, groupBy: GroupBy): string => {
  switch (groupBy) {
    case 'brand': return item.brand || 'Sans marque';
    case 'status': return STOCK_STATUS_CONFIG[item.status]?.label || item.status;
    case 'supplier': return item.supplier?.name || 'Sans fournisseur';
    case 'category': return item.category || 'Sans catégorie';
    case 'condition': return CONDITION_CONFIG[item.condition]?.label || item.condition;
    default: return '';
  }
};

const getSortValue = (item: StockItem, key: SortKey): string | number => {
  switch (key) {
    case 'title': return item.title.toLowerCase();
    case 'serial_number': return (item.serial_number || '').toLowerCase();
    case 'category': return (item.category || '').toLowerCase();
    case 'brand': return (item.brand || '').toLowerCase();
    case 'model': return (item.model || '').toLowerCase();
    case 'quantity': return item.quantity || 1;
    case 'status': return STOCK_STATUS_CONFIG[item.status]?.label || '';
    case 'condition': return CONDITION_CONFIG[item.condition]?.label || '';
    case 'supplier': return (item.supplier?.name || '').toLowerCase();
    case 'unit_price': return item.unit_price || item.purchase_price || 0;
    case 'purchase_price': return item.purchase_price || 0;
    case 'date': return item.reception_date || item.purchase_date || '';
    default: return '';
  }
};

const StockItemList: React.FC<StockItemListProps> = ({ onEdit }) => {
  const [statusFilter, setStatusFilter] = useState<StockStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { items, isLoading } = useStockItems(statusFilter);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useMultiTenant();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

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

  const filtered = useMemo(() => {
    let result = items.filter(item => {
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

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, search, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, StockItem[]> = {};
    filtered.forEach(item => {
      const key = getGroupValue(item, groupBy);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const SortIcon: React.FC<{ column: SortKey }> = ({ column }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHead: React.FC<{ column: SortKey; children: React.ReactNode; className?: string }> = ({ column, children, className }) => (
    <TableHead className={className}>
      <button
        className="flex items-center gap-0.5 hover:text-foreground transition-colors text-left w-full"
        onClick={() => handleSort(column)}
        type="button"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  const renderRow = (item: StockItem) => {
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
  };

  const tableHeaders = (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10"></TableHead>
        <SortableHead column="title">Article</SortableHead>
        <SortableHead column="serial_number">N° série</SortableHead>
        <SortableHead column="category">Catégorie</SortableHead>
        <SortableHead column="brand">Marque</SortableHead>
        <SortableHead column="model">Modèle</SortableHead>
        <SortableHead column="quantity" className="text-right">Qté</SortableHead>
        <SortableHead column="status">Statut</SortableHead>
        <SortableHead column="condition">État</SortableHead>
        <SortableHead column="supplier">Fournisseur</SortableHead>
        <SortableHead column="unit_price" className="text-right">Prix unitaire</SortableHead>
        <SortableHead column="purchase_price" className="text-right">Total</SortableHead>
        <TableHead>Contrat</TableHead>
        <SortableHead column="date">Date</SortableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
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
        <Select value={groupBy} onValueChange={v => { setGroupBy(v as GroupBy); setCollapsedGroups(new Set()); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Grouper par..." />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.value === 'none' ? 'Pas de groupement' : `Grouper par ${opt.label}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun article en stock</div>
      ) : groupBy === 'none' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            {tableHeaders}
            <TableBody>
              {filtered.map(renderRow)}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped?.map(([group, groupItems]) => {
            const isCollapsed = collapsedGroups.has(group);
            return (
              <div key={group} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
                  onClick={() => toggleGroup(group)}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="font-medium text-sm">{group}</span>
                  <Badge variant="secondary" className="text-xs ml-1">{groupItems.length}</Badge>
                </button>
                {!isCollapsed && (
                  <Table>
                    {tableHeaders}
                    <TableBody>
                      {groupItems.map(renderRow)}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
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
