import React, { useState } from "react";
import { useStockItems } from "@/hooks/useStockItems";
import { STOCK_STATUS_CONFIG, CONDITION_CONFIG, StockStatus, StockItem } from "@/services/stockService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil } from "lucide-react";

interface StockItemListProps {
  onEdit?: (item: StockItem) => void;
}

const StockItemList: React.FC<StockItemListProps> = ({ onEdit }) => {
  const [statusFilter, setStatusFilter] = useState<StockStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { items, isLoading } = useStockItems(statusFilter);

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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit?.(item); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
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
                    <TableCell>
                      <Badge variant="outline" className={`${statusCfg.bgColor} ${statusCfg.color} border text-xs`}>
                        {statusCfg.label}
                      </Badge>
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
    </div>
  );
};

export default StockItemList;
