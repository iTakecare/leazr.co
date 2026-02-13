import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Truck, ExternalLink, Filter, ChevronDown, SplitSquareHorizontal, Pencil, Check, X } from "lucide-react";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useNavigate, useLocation } from "react-router-dom";
import {
  OrderStatus,
  ORDER_STATUS_CONFIG,
  EquipmentOrderItem,
  fetchAllEquipmentOrders,
  fetchSuppliers,
  updateOfferEquipmentOrder,
  updateContractEquipmentOrder,
  splitEquipmentIntoUnits,
  updateEquipmentUnit,
  syncUnitPricesToParent,
} from "@/services/equipmentOrderService";
import { EquipmentOrderUnit } from "@/types/offerEquipment";
import SupplierSelectOrCreate from "@/components/equipment/SupplierSelectOrCreate";

// Inline editable price component
const EditablePrice: React.FC<{
  value: number;
  onSave: (newPrice: number) => void;
}> = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  const handleSave = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(parsed);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        className="inline-flex items-center gap-1 hover:text-primary transition-colors group"
        onClick={(e) => { e.stopPropagation(); setDraft(value.toString()); setEditing(true); }}
        title="Modifier le prix"
      >
        {formatCurrency(value)}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        className="h-7 w-24 text-xs"
        autoFocus
      />
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
        <X className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
};

const EquipmentOrders: React.FC = () => {
  const { companyId } = useMultiTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<EquipmentOrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; supplier_type?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilters, setStatusFilters] = useState<OrderStatus[]>(['to_order']);
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const getCompanySlug = () => {
    const match = location.pathname.match(/^\/([^/]+)\/admin/);
    return match?.[1] || '';
  };

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqItems, suppList] = await Promise.all([
        fetchAllEquipmentOrders(companyId!),
        fetchSuppliers(companyId!),
      ]);
      setItems(eqItems);
      setSuppliers(suppList);
    } catch (err) {
      console.error('Error fetching equipment orders:', err);
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (item: EquipmentOrderItem, newStatus: OrderStatus) => {
    try {
      const update: any = { order_status: newStatus };
      if (newStatus === 'ordered' && !item.order_date) update.order_date = new Date().toISOString();
      if (newStatus === 'received' && !item.reception_date) update.reception_date = new Date().toISOString();

      if (item.source_type === 'offer') {
        await updateOfferEquipmentOrder(item.id, update);
      } else {
        await updateContractEquipmentOrder(item.id, update);
      }
      toast.success(`Statut mis à jour : ${ORDER_STATUS_CONFIG[newStatus].label}`);
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleSupplierChange = async (item: EquipmentOrderItem, supplierId: string) => {
    try {
      const update: Record<string, any> = { supplier_id: supplierId };
      if (item.source_type === 'offer') {
        await updateOfferEquipmentOrder(item.id, update);
      } else {
        // Also sync actual_purchase_price for contracts
        await updateContractEquipmentOrder(item.id, update);
      }
      toast.success("Fournisseur mis à jour");
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour du fournisseur");
    }
  };

  const handleSplitIntoUnits = async (item: EquipmentOrderItem) => {
    try {
      await splitEquipmentIntoUnits(
        item.source_type!,
        item.id,
        item.quantity,
        item.supplier_id,
        item.supplier_price
      );
      toast.success(`${item.quantity} unités créées pour "${item.title}"`);
      setExpandedItems(prev => new Set(prev).add(`${item.source_type}-${item.id}`));
      fetchData();
    } catch (err) {
      console.error('Error splitting into units:', err);
      toast.error("Erreur lors de la création des unités");
    }
  };

  const handleUnitStatusChange = async (unit: EquipmentOrderUnit, newStatus: OrderStatus) => {
    try {
      const update: any = { order_status: newStatus };
      if (newStatus === 'ordered' && !unit.order_date) update.order_date = new Date().toISOString();
      if (newStatus === 'received' && !unit.reception_date) update.reception_date = new Date().toISOString();
      await updateEquipmentUnit(unit.id, update);
      toast.success(`Unité ${unit.unit_index} : ${ORDER_STATUS_CONFIG[newStatus].label}`);
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleUnitSupplierChange = async (unit: EquipmentOrderUnit, supplierId: string) => {
    try {
      await updateEquipmentUnit(unit.id, { supplier_id: supplierId } as any);
      toast.success("Fournisseur de l'unité mis à jour");
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleItemPriceChange = async (item: EquipmentOrderItem, newPrice: number) => {
    try {
      const update = { supplier_price: newPrice };
      if (item.source_type === 'offer') {
        await updateOfferEquipmentOrder(item.id, update);
      } else {
        await updateContractEquipmentOrder(item.id, update);
      }
      toast.success("Prix mis à jour");
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour du prix");
    }
  };

  const handleUnitPriceChange = async (unit: EquipmentOrderUnit, price: number) => {
    try {
      await updateEquipmentUnit(unit.id, { supplier_price: price } as any);
      // Sync average price back to parent equipment
      await syncUnitPricesToParent(unit.source_type, unit.source_equipment_id);
      toast.success("Prix de l'unité mis à jour");
      fetchData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const filteredItems = items.filter(item => {
    // For items with units, check if any unit matches the filter
    if (item.units && item.units.length > 0 && statusFilters.length > 0) {
      const hasMatchingUnit = item.units.some(u => statusFilters.includes(u.order_status as OrderStatus));
      if (!hasMatchingUnit) return false;
    } else if (statusFilters.length > 0 && !item.units) {
      if (!statusFilters.includes(item.order_status as OrderStatus)) return false;
    }
    if (supplierFilter !== 'all') {
      if (item.units && item.units.length > 0) {
        const hasMatchingSupplier = item.units.some(u => u.supplier_id === supplierFilter);
        if (!hasMatchingSupplier && item.supplier_id !== supplierFilter) return false;
      } else if (item.supplier_id !== supplierFilter) return false;
    }
    return true;
  });

  const toggleStatus = (status: OrderStatus) => {
    setStatusFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const allStatuses: OrderStatus[] = ['to_order', 'ordered', 'received', 'cancelled'];
  const allSelected = statusFilters.length === 0 || statusFilters.length === allStatuses.length;

  const totalToOrder = items.filter(i => i.order_status === 'to_order').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);
  const totalOrdered = items.filter(i => i.order_status === 'ordered').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);
  const totalReceived = items.filter(i => i.order_status === 'received').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);

  const getSupplierType = (supplierId: string | null): string => {
    if (!supplierId) return 'belgian';
    return suppliers.find(s => s.id === supplierId)?.supplier_type || 'belgian';
  };

  const calcTVAC = (itemsList: EquipmentOrderItem[]) =>
    itemsList.reduce((s, i) => {
      const priceHT = (i.supplier_price || i.purchase_price) * i.quantity;
      const supplierType = getSupplierType(i.supplier_id);
      const tva = supplierType === 'belgian' ? priceHT * 0.21 : 0;
      return s + priceHT + tva;
    }, 0);

  const totalToOrderTVAC = calcTVAC(items.filter(i => i.order_status === 'to_order'));
  const totalOrderedTVAC = calcTVAC(items.filter(i => i.order_status === 'ordered'));
  const totalReceivedTVAC = calcTVAC(items.filter(i => i.order_status === 'received'));

  const groupedByYear = useMemo(() => {
    const groups: Record<string, EquipmentOrderItem[]> = {};
    filteredItems.forEach(item => {
      const year = item.source_date ? new Date(item.source_date).getFullYear().toString() : 'Inconnu';
      if (!groups[year]) groups[year] = [];
      groups[year].push(item);
    });
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Inconnu') return 1;
      if (b === 'Inconnu') return -1;
      return Number(b) - Number(a);
    });
    return sorted;
  }, [filteredItems]);

  const defaultOpenYear = groupedByYear.length > 0 ? groupedByYear[0][0] : undefined;

  const navigateToSource = (item: EquipmentOrderItem) => {
    const slug = getCompanySlug();
    if (item.source_type === 'offer') {
      navigate(`/${slug}/admin/offers/${item.source_id}`);
    } else {
      navigate(`/${slug}/admin/contracts/${item.source_id}`);
    }
  };

  const getUnitsSummary = (units: EquipmentOrderUnit[]) => {
    const statusCounts: Record<string, number> = {};
    units.forEach(u => {
      statusCounts[u.order_status] = (statusCounts[u.order_status] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${ORDER_STATUS_CONFIG[status as OrderStatus]?.label || status}`)
      .join(', ');
  };

  const renderUnitRow = (unit: EquipmentOrderUnit, purchasePrice: number) => {
    const unitStatus = (unit.order_status || 'to_order') as OrderStatus;
    const statusConfig = ORDER_STATUS_CONFIG[unitStatus];
    const unitPrice = unit.supplier_price || purchasePrice;
    const supplierType = getSupplierType(unit.supplier_id);
    const tvaAmount = supplierType === 'belgian' ? unitPrice * 0.21 : 0;

    return (
      <TableRow key={unit.id} className="bg-muted/30">
        <TableCell className="pl-10">
          <span className="text-xs text-muted-foreground">Unité {unit.unit_index}</span>
        </TableCell>
        <TableCell></TableCell>
        <TableCell>
          {unit.serial_number && (
            <span className="text-xs text-muted-foreground">S/N: {unit.serial_number}</span>
          )}
        </TableCell>
        <TableCell>
          <SupplierSelectOrCreate
            suppliers={suppliers}
            value={unit.supplier_id}
            onValueChange={(supplierId) => handleUnitSupplierChange(unit, supplierId)}
            onSupplierCreated={(newSupplier) => {
              setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
            }}
          />
        </TableCell>
        <TableCell className="text-right text-sm font-medium">
          <EditablePrice value={unitPrice} onSave={(p) => handleUnitPriceChange(unit, p)} />
        </TableCell>
        <TableCell className="text-right text-sm">
          {supplierType === 'belgian' ? formatCurrency(tvaAmount) : <span className="text-muted-foreground">-</span>}
        </TableCell>
        <TableCell className="text-right text-sm font-medium">
          {formatCurrency(unitPrice + tvaAmount)}
        </TableCell>
        <TableCell>
          <Select
            value={unitStatus}
            onValueChange={(v) => handleUnitStatusChange(unit, v as OrderStatus)}
          >
            <SelectTrigger className={`w-36 h-8 text-xs font-semibold border ${statusConfig.bgColor} ${statusConfig.color}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={config.color}>{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell></TableCell>
      </TableRow>
    );
  };

  const renderTable = (yearItems: EquipmentOrderItem[]) => (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Équipement</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead className="text-right">Prix HTVA</TableHead>
            <TableHead className="text-right">TVA</TableHead>
            <TableHead className="text-right">Prix TVAC</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {yearItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Aucun équipement trouvé
              </TableCell>
            </TableRow>
          ) : (
            yearItems.map((item) => {
              const hasUnits = item.units && item.units.length > 0;
              const itemKey = `${item.source_type}-${item.id}`;
              const isExpanded = expandedItems.has(itemKey);
              const statusConfig = ORDER_STATUS_CONFIG[item.order_status];
              const priceHT = (item.supplier_price || item.purchase_price) * item.quantity;
              const supplierType = getSupplierType(item.supplier_id);
              const tvaAmount = supplierType === 'belgian' ? priceHT * 0.21 : 0;
              const priceTVAC = priceHT + tvaAmount;

              return (
                <React.Fragment key={itemKey}>
                  <TableRow className={hasUnits ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={hasUnits ? () => toggleExpanded(itemKey) : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasUnits && (
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        )}
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {item.source_type === 'offer' ? 'Demande' : 'Contrat'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{item.source_reference}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.client_name}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Qté: {item.quantity}
                        {hasUnits && (
                          <span className="ml-2 text-primary">({getUnitsSummary(item.units!)})</span>
                        )}
                      </div>
                      {item.quantity > 1 && !hasUnits && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 px-2 mt-1 text-primary"
                          onClick={(e) => { e.stopPropagation(); handleSplitIntoUnits(item); }}
                        >
                          <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                          Gérer par unité
                        </Button>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!hasUnits && (
                        <SupplierSelectOrCreate
                          suppliers={suppliers}
                          value={item.supplier_id}
                          onValueChange={(supplierId) => handleSupplierChange(item, supplierId)}
                          onSupplierCreated={(newSupplier) => {
                            setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
                          }}
                        />
                      )}
                      {hasUnits && <span className="text-xs text-muted-foreground italic">Voir unités</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      {!hasUnits ? (
                        <EditablePrice
                          value={(item.supplier_price || item.purchase_price)}
                          onSave={(p) => handleItemPriceChange(item, p)}
                        />
                      ) : (
                        formatCurrency(priceHT)
                      )}
                      {!hasUnits && item.quantity > 1 && (
                        <div className="text-xs text-muted-foreground">× {item.quantity} = {formatCurrency((item.supplier_price || item.purchase_price) * item.quantity)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {supplierType === 'belgian' ? formatCurrency(tvaAmount) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(priceTVAC)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!hasUnits && (
                        <Select
                          value={item.order_status}
                          onValueChange={(v) => handleStatusChange(item, v as OrderStatus)}
                        >
                          <SelectTrigger className={`w-36 h-8 text-xs font-semibold border ${statusConfig.bgColor} ${statusConfig.color}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className={config.color}>{config.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {hasUnits && <span className="text-xs text-muted-foreground italic">Voir unités</span>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigateToSource(item); }}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {hasUnits && isExpanded && item.units!.map(unit => renderUnitRow(unit, item.purchase_price))}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Commandes fournisseurs</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">À commander (HTVA)</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalToOrder)}</p>
            <p className="text-xs text-muted-foreground">TVAC : {formatCurrency(totalToOrderTVAC)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'to_order').length} équipement(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Commandé (HTVA)</p>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalOrdered)}</p>
            <p className="text-xs text-muted-foreground">TVAC : {formatCurrency(totalOrderedTVAC)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'ordered').length} équipement(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Reçu (HTVA)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-muted-foreground">TVAC : {formatCurrency(totalReceivedTVAC)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'received').length} équipement(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={allSelected ? "default" : "outline"}
            onClick={() => setStatusFilters(allSelected ? ['to_order'] : [])}
            className="text-xs"
          >
            Tous
          </Button>
          {allStatuses.map(status => {
            const config = ORDER_STATUS_CONFIG[status];
            const isActive = statusFilters.includes(status);
            return (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() => toggleStatus(status)}
                className={`text-xs border ${isActive ? `${config.bgColor} ${config.color} font-semibold` : 'opacity-60'}`}
              >
                {config.label}
              </Button>
            );
          })}
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fournisseurs</SelectItem>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accordion by year */}
      {groupedByYear.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun équipement trouvé
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible defaultValue={defaultOpenYear}>
          {groupedByYear.map(([year, yearItems]) => {
            const yearTotal = yearItems.reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);
            return (
              <AccordionItem key={year} value={year}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">{year}</span>
                    <Badge variant="secondary">{yearItems.length} équipement(s)</Badge>
                    <span className="text-sm text-muted-foreground">{formatCurrency(yearTotal)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {renderTable(yearItems)}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default EquipmentOrders;
