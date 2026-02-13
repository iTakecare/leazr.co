import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Truck, Package, Check, Ban, Save, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import SupplierSelectOrCreate from "@/components/equipment/SupplierSelectOrCreate";
import {
  OrderStatus,
  ORDER_STATUS_CONFIG,
  EquipmentOrderUpdate,
  updateOfferEquipmentOrder,
  updateContractEquipmentOrder,
  fetchSuppliers,
  fetchPreferredSupplier,
} from "@/services/equipmentOrderService";

interface EquipmentItem {
  id: string;
  title: string;
  quantity: number;
  purchase_price: number;
  order_status: OrderStatus;
  supplier_id: string | null;
  supplier_price: number | null;
  order_date: string | null;
  order_reference: string | null;
  reception_date: string | null;
  order_notes: string | null;
  product_id?: string | null;
}

interface EquipmentOrderTrackerProps {
  sourceType: 'offer' | 'contract';
  sourceId: string;
  onUpdate?: () => void;
}

const EquipmentOrderTracker: React.FC<EquipmentOrderTrackerProps> = ({
  sourceType,
  sourceId,
  onUpdate,
}) => {
  const { companyId } = useMultiTenant();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EquipmentOrderUpdate>({});
  const [saving, setSaving] = useState(false);

  const tableName = sourceType === 'offer' ? 'offer_equipment' : 'contract_equipment';
  const fkColumn = sourceType === 'offer' ? 'offer_id' : 'contract_id';

  useEffect(() => {
    fetchData();
  }, [sourceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqResult, suppResult] = await Promise.all([
        supabase
          .from(tableName)
          .select('id, title, quantity, purchase_price, product_id, order_status, supplier_id, supplier_price, order_date, order_reference, reception_date, order_notes')
          .eq(fkColumn, sourceId)
          .order('created_at', { ascending: true }),
        companyId ? fetchSuppliers(companyId) : Promise.resolve([]),
      ]);

      if (eqResult.error) throw eqResult.error;
      setEquipment((eqResult.data || []).map((eq: any) => ({
        ...eq,
        order_status: eq.order_status || 'to_order',
      })));
      setSuppliers(suppResult);
    } catch (err) {
      console.error('Error fetching equipment order data:', err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (equipmentId: string, newStatus: OrderStatus) => {
    try {
      const update: EquipmentOrderUpdate = { order_status: newStatus };
      if (newStatus === 'ordered' && !equipment.find(e => e.id === equipmentId)?.order_date) {
        update.order_date = new Date().toISOString();
      }
      if (newStatus === 'received' && !equipment.find(e => e.id === equipmentId)?.reception_date) {
        update.reception_date = new Date().toISOString();
      }

      if (sourceType === 'offer') {
        await updateOfferEquipmentOrder(equipmentId, update);
      } else {
        await updateContractEquipmentOrder(equipmentId, update);
      }
      toast.success(`Statut mis à jour : ${ORDER_STATUS_CONFIG[newStatus].label}`);
      fetchData();
      onUpdate?.();
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const startEditing = async (eq: EquipmentItem) => {
    let supplierData: EquipmentOrderUpdate = {
      supplier_id: eq.supplier_id,
      supplier_price: eq.supplier_price,
      order_reference: eq.order_reference,
      order_notes: eq.order_notes,
    };

    // Auto-fill from preferred supplier if empty and product_id exists
    if (!eq.supplier_id && eq.product_id) {
      try {
        const preferred = await fetchPreferredSupplier(eq.product_id);
        if (preferred) {
          supplierData.supplier_id = preferred.supplier_id;
          supplierData.supplier_price = preferred.unit_price;
        }
      } catch {}
    }

    setEditData(supplierData);
    setEditingId(eq.id);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      if (sourceType === 'offer') {
        await updateOfferEquipmentOrder(editingId, editData);
      } else {
        await updateContractEquipmentOrder(editingId, editData);
      }
      toast.success("Informations fournisseur enregistrées");
      setEditingId(null);
      setEditData({});
      fetchData();
      onUpdate?.();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const total = equipment.length;
  const ordered = equipment.filter(e => e.order_status === 'ordered').length;
  const received = equipment.filter(e => e.order_status === 'received').length;
  const toOrder = equipment.filter(e => e.order_status === 'to_order').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (equipment.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Suivi commandes fournisseurs</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-red-100 text-red-700 border-red-200">{toOrder} à commander</Badge>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">{ordered} commandé(s)</Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200">{received} reçu(s)</Badge>
          </div>
        </div>
        <CardDescription>{received}/{total} équipements reçus</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Équipement</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Prix fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => {
                const isEditing = editingId === eq.id;
                const statusConfig = ORDER_STATUS_CONFIG[eq.order_status];
                const supplierName = suppliers.find(s => s.id === eq.supplier_id)?.name;

                return (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <div className="font-medium">{eq.title}</div>
                      <div className="text-xs text-muted-foreground">Qté: {eq.quantity} · PA: {formatCurrency(eq.purchase_price)}</div>
                      {eq.order_date && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Commandé le {format(new Date(eq.order_date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <SupplierSelectOrCreate
                          suppliers={suppliers}
                          value={editData.supplier_id || null}
                          onValueChange={(v) => setEditData(prev => ({ ...prev, supplier_id: v || null }))}
                          onSupplierCreated={(newSupplier) => {
                            setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
                          }}
                        />
                      ) : (
                        <span className="text-sm">{supplierName || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-28 h-8 text-right"
                          value={editData.supplier_price ?? ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, supplier_price: e.target.value ? parseFloat(e.target.value) : null }))}
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {eq.supplier_price != null ? formatCurrency(eq.supplier_price) : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={eq.order_status}
                        onValueChange={(v) => handleStatusChange(eq.id, v as OrderStatus)}
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
                    <TableCell>
                      {isEditing ? (
                        <Input
                          className="w-32 h-8 text-xs"
                          placeholder="Réf. commande"
                          value={editData.order_reference ?? ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, order_reference: e.target.value }))}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{eq.order_reference || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEditing(eq)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentOrderTracker;
