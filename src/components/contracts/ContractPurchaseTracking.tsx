import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Check, TrendingUp, Save, Calendar, ChevronDown, SplitSquareHorizontal } from "lucide-react";
import { ORDER_STATUS_CONFIG, OrderStatus, updateContractEquipmentOrder, fetchSuppliers, splitEquipmentIntoUnits, updateEquipmentUnit, fetchEquipmentUnits } from "@/services/equipmentOrderService";
import { EquipmentOrderUnit } from "@/types/offerEquipment";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractEquipment {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  actual_purchase_price: number | null;
  actual_purchase_date: string | null;
  purchase_notes: string | null;
  order_status: string | null;
  supplier_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
  supplier_type: string | null;
}

interface ContractPurchaseTrackingProps {
  contractId: string;
  onUpdate?: () => void;
}

const ContractPurchaseTracking: React.FC<ContractPurchaseTrackingProps> = ({
  contractId,
  onUpdate
}) => {
  const { companyId } = useMultiTenant();
  const [equipment, setEquipment] = useState<ContractEquipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingDates, setEditingDates] = useState<Record<string, string>>({});
  const [equipmentUnits, setEquipmentUnits] = useState<Record<string, EquipmentOrderUnit[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEquipment();
  }, [contractId]);

  useEffect(() => {
    if (companyId) {
      fetchSuppliers(companyId).then(setSuppliers).catch(console.error);
    }
  }, [companyId]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date, purchase_notes, order_status, supplier_id')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const eqs = data || [];
      setEquipment(eqs);

      // Fetch units for all equipment
      const unitsMap: Record<string, EquipmentOrderUnit[]> = {};
      for (const eq of eqs) {
        if (eq.quantity > 1) {
          try {
            const units = await fetchEquipmentUnits('contract', eq.id);
            if (units.length > 0) unitsMap[eq.id] = units;
          } catch { /* ignore */ }
        }
      }
      setEquipmentUnits(unitsMap);
    } catch (error) {
      console.error('Erreur chargement équipements:', error);
      toast.error("Erreur lors du chargement des équipements");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (equipmentId: string, newStatus: OrderStatus) => {
    try {
      const updateData: Record<string, any> = { order_status: newStatus };
      if (newStatus === 'ordered' && !equipment.find(e => e.id === equipmentId)?.actual_purchase_date) {
        updateData.order_date = new Date().toISOString();
      }
      if (newStatus === 'received') {
        updateData.reception_date = new Date().toISOString();
      }
      await updateContractEquipmentOrder(equipmentId, updateData);
      toast.success("Statut mis à jour");
      fetchEquipment();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleSupplierChange = async (equipmentId: string, supplierId: string) => {
    try {
      const newId = supplierId === '_none' ? null : supplierId;
      await updateContractEquipmentOrder(equipmentId, { supplier_id: newId });
      toast.success("Fournisseur mis à jour");
      fetchEquipment();
      onUpdate?.();
    } catch (error) {
      console.error('Erreur mise à jour fournisseur:', error);
      toast.error("Erreur lors de la mise à jour du fournisseur");
    }
  };

  const handleSplitIntoUnits = async (eq: ContractEquipment) => {
    try {
      await splitEquipmentIntoUnits('contract', eq.id, eq.quantity, eq.supplier_id, null);
      toast.success(`${eq.quantity} unités créées pour "${eq.title}"`);
      setExpandedItems(prev => new Set(prev).add(eq.id));
      fetchEquipment();
    } catch (err) {
      console.error('Error splitting:', err);
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
      fetchEquipment();
      onUpdate?.();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleUnitSupplierChange = async (unit: EquipmentOrderUnit, supplierId: string) => {
    try {
      const newId = supplierId === '_none' ? null : supplierId;
      await updateEquipmentUnit(unit.id, { supplier_id: newId } as any);
      toast.success("Fournisseur de l'unité mis à jour");
      fetchEquipment();
      onUpdate?.();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    return suppliers.find(s => s.id === supplierId)?.name || null;
  };

  const handleSavePurchase = async (equipmentId: string) => {
    const priceStr = editingPrices[equipmentId];
    const notes = editingNotes[equipmentId];
    const dateStr = editingDates[equipmentId];
    
    if (!priceStr) {
      toast.error("Veuillez saisir un prix d'achat");
      return;
    }

    const actualPrice = parseFloat(priceStr.replace(',', '.'));
    if (isNaN(actualPrice) || actualPrice < 0) {
      toast.error("Prix invalide");
      return;
    }

    setSaving(equipmentId);
    try {
      const updateData: {
        actual_purchase_price: number;
        supplier_price: number;
        purchase_notes: string | null;
        actual_purchase_date?: string | null;
      } = {
        actual_purchase_price: actualPrice,
        supplier_price: actualPrice,
        purchase_notes: notes || null
      };

      if (dateStr) {
        updateData.actual_purchase_date = new Date(dateStr).toISOString();
      }

      const { error } = await supabase
        .from('contract_equipment')
        .update(updateData)
        .eq('id', equipmentId);

      if (error) throw error;

      toast.success("Prix d'achat enregistré");
      fetchEquipment();
      onUpdate?.();
      
      setEditingPrices(prev => { const { [equipmentId]: _, ...rest } = prev; return rest; });
      setEditingNotes(prev => { const { [equipmentId]: _, ...rest } = prev; return rest; });
      setEditingDates(prev => { const { [equipmentId]: _, ...rest } = prev; return rest; });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getUnitsSummary = (units: EquipmentOrderUnit[]) => {
    const statusCounts: Record<string, number> = {};
    units.forEach(u => { statusCounts[u.order_status] = (statusCounts[u.order_status] || 0) + 1; });
    return Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${ORDER_STATUS_CONFIG[status as OrderStatus]?.label || status}`)
      .join(', ');
  };

  // Calculs des totaux
  const totalEstimated = equipment.reduce((sum, eq) => sum + (eq.purchase_price * eq.quantity), 0);
  const totalActual = equipment.reduce((sum, eq) => {
    const price = eq.actual_purchase_price ?? eq.purchase_price;
    return sum + (price * eq.quantity);
  }, 0);
  const totalSavings = equipment.reduce((sum, eq) => {
    if (eq.actual_purchase_price !== null) {
      return sum + ((eq.purchase_price - eq.actual_purchase_price) * eq.quantity);
    }
    return sum;
  }, 0);
  const purchasedCount = equipment.filter(eq => eq.actual_purchase_price !== null).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (equipment.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Suivi des achats</CardTitle>
          </div>
          <Badge variant={purchasedCount === equipment.length ? "default" : "secondary"}>
            {purchasedCount}/{equipment.length} achetés
          </Badge>
        </div>
        <CardDescription>
          Enregistrez les prix d'achat réels pour calculer la marge effective
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé des économies */}
        {totalSavings !== 0 && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${totalSavings > 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <TrendingUp className={`h-5 w-5 ${totalSavings > 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className={`font-medium ${totalSavings > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {totalSavings > 0 ? 'Économies réalisées' : 'Dépassement de budget'}
              </p>
              <p className={`text-2xl font-bold ${totalSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalSavings > 0 ? '+' : ''}{formatCurrency(totalSavings)}
              </p>
            </div>
          </div>
        )}

        {/* Tableau des équipements */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Équipement</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut commande</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead className="text-right">Prix estimé</TableHead>
                <TableHead className="text-right">Prix réel</TableHead>
                <TableHead className="text-right">Économie</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => {
                const isEditing = editingPrices[eq.id] !== undefined;
                const isPurchased = eq.actual_purchase_price !== null;
                const savings = isPurchased 
                  ? (eq.purchase_price - eq.actual_purchase_price!) * eq.quantity 
                  : 0;
                const currentStatus = (eq.order_status || 'to_order') as OrderStatus;
                const units = equipmentUnits[eq.id];
                const hasUnits = units && units.length > 0;
                const isExpanded = expandedItems.has(eq.id);

                return (
                  <React.Fragment key={eq.id}>
                    <TableRow className={hasUnits ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={hasUnits ? () => toggleExpanded(eq.id) : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hasUnits && (
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                          )}
                          {isPurchased && !hasUnits && <Check className="h-4 w-4 text-green-600" />}
                          <span className="font-medium">{eq.title}</span>
                        </div>
                        {hasUnits && (
                          <div className="text-xs text-primary mt-1 ml-6">
                            {getUnitsSummary(units)}
                          </div>
                        )}
                        {eq.quantity > 1 && !hasUnits && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 px-2 mt-1 text-primary"
                            onClick={(e) => { e.stopPropagation(); handleSplitIntoUnits(eq); }}
                          >
                            <SplitSquareHorizontal className="h-3 w-3 mr-1" />
                            Gérer par unité
                          </Button>
                        )}
                        {eq.actual_purchase_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(eq.actual_purchase_date), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        )}
                        {eq.purchase_notes && (
                          <p className="text-xs text-muted-foreground mt-1">{eq.purchase_notes}</p>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!hasUnits ? (
                          <Select
                            value={eq.supplier_id || '_none'}
                            onValueChange={(value) => handleSupplierChange(eq.id, value)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue placeholder="Non défini" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-md z-50">
                              <SelectItem value="_none">
                                <span className="text-muted-foreground italic">Non défini</span>
                              </SelectItem>
                              {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Voir unités</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!hasUnits ? (
                          <Select
                            value={currentStatus}
                            onValueChange={(value) => handleStatusChange(eq.id, value as OrderStatus)}
                          >
                            <SelectTrigger className={`w-[140px] h-8 text-xs font-medium border ${ORDER_STATUS_CONFIG[currentStatus].bgColor} ${ORDER_STATUS_CONFIG[currentStatus].color}`}>
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
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Voir unités</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{eq.quantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(eq.purchase_price)} × {eq.quantity}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(eq.purchase_price * eq.quantity)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {isPurchased && !isEditing ? (
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(eq.actual_purchase_price!)} × {eq.quantity}
                            </div>
                            <div className="font-medium">
                              {formatCurrency(eq.actual_purchase_price! * eq.quantity)}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder="Prix unitaire"
                              className="w-28 text-right h-8"
                              value={editingPrices[eq.id] ?? ''}
                              onChange={(e) => setEditingPrices(prev => ({ ...prev, [eq.id]: e.target.value }))}
                            />
                            <Input
                              type="date"
                              placeholder="Date d'achat"
                              className="w-28 text-xs h-7"
                              value={editingDates[eq.id] ?? ''}
                              onChange={(e) => setEditingDates(prev => ({ ...prev, [eq.id]: e.target.value }))}
                            />
                            <Input
                              type="text"
                              placeholder="Notes (optionnel)"
                              className="w-28 text-xs h-7"
                              value={editingNotes[eq.id] ?? ''}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [eq.id]: e.target.value }))}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPurchased && (
                          <span className={`font-medium ${savings > 0 ? 'text-green-600' : savings < 0 ? 'text-red-600' : ''}`}>
                            {savings > 0 ? '+' : ''}{formatCurrency(savings)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(isEditing || !isPurchased) && !hasUnits && (
                          <Button
                            size="sm"
                            onClick={() => handleSavePurchase(eq.id)}
                            disabled={saving === eq.id || !editingPrices[eq.id]}
                          >
                            {saving === eq.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {isPurchased && !isEditing && !hasUnits && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPrices(prev => ({ ...prev, [eq.id]: eq.actual_purchase_price!.toString() }));
                              setEditingDates(prev => ({ ...prev, [eq.id]: eq.actual_purchase_date ? format(new Date(eq.actual_purchase_date), 'yyyy-MM-dd') : '' }));
                              setEditingNotes(prev => ({ ...prev, [eq.id]: eq.purchase_notes || '' }));
                            }}
                          >
                            Modifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Unit sub-rows */}
                    {hasUnits && isExpanded && units.map(unit => {
                      const unitStatus = (unit.order_status || 'to_order') as OrderStatus;
                      const unitStatusConfig = ORDER_STATUS_CONFIG[unitStatus];
                      return (
                        <TableRow key={unit.id} className="bg-muted/30">
                          <TableCell className="pl-10">
                            <span className="text-xs text-muted-foreground">Unité {unit.unit_index}</span>
                            {unit.serial_number && (
                              <span className="text-xs text-muted-foreground ml-2">S/N: {unit.serial_number}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={unit.supplier_id || '_none'}
                              onValueChange={(value) => handleUnitSupplierChange(unit, value)}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder="Non défini" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-md z-50">
                                <SelectItem value="_none">
                                  <span className="text-muted-foreground italic">Non défini</span>
                                </SelectItem>
                                {suppliers.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={unitStatus}
                              onValueChange={(value) => handleUnitStatusChange(unit, value as OrderStatus)}
                            >
                              <SelectTrigger className={`w-[140px] h-8 text-xs font-medium border ${unitStatusConfig.bgColor} ${unitStatusConfig.color}`}>
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
                          <TableCell className="text-center text-xs text-muted-foreground">1</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {unit.supplier_price ? formatCurrency(unit.supplier_price) : '-'}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total estimé</p>
            <p className="font-semibold">{formatCurrency(totalEstimated)}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total réel</p>
            <p className="font-semibold">{formatCurrency(totalActual)}</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${totalSavings > 0 ? 'bg-green-100 dark:bg-green-950/30' : totalSavings < 0 ? 'bg-red-100 dark:bg-red-950/30' : 'bg-muted/50'}`}>
            <p className="text-xs text-muted-foreground">Économies</p>
            <p className={`font-semibold ${totalSavings > 0 ? 'text-green-600' : totalSavings < 0 ? 'text-red-600' : ''}`}>
              {totalSavings > 0 ? '+' : ''}{formatCurrency(totalSavings)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractPurchaseTracking;
