import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Truck, ExternalLink, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
} from "@/services/equipmentOrderService";

const EquipmentOrders: React.FC = () => {
  const { companyId } = useMultiTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<EquipmentOrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('to_order');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

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

  const filteredItems = items.filter(item => {
    if (statusFilter !== 'all' && item.order_status !== statusFilter) return false;
    if (supplierFilter !== 'all' && item.supplier_id !== supplierFilter) return false;
    return true;
  });

  const totalToOrder = items.filter(i => i.order_status === 'to_order').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);
  const totalOrdered = items.filter(i => i.order_status === 'ordered').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);
  const totalReceived = items.filter(i => i.order_status === 'received').reduce((s, i) => s + (i.supplier_price || i.purchase_price) * i.quantity, 0);

  const navigateToSource = (item: EquipmentOrderItem) => {
    const slug = getCompanySlug();
    if (item.source_type === 'offer') {
      navigate(`/${slug}/admin/offers/${item.source_id}`);
    } else {
      navigate(`/${slug}/admin/contracts/${item.source_id}`);
    }
  };

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
            <p className="text-sm text-muted-foreground">À commander</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalToOrder)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'to_order').length} équipement(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Commandé</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOrdered)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'ordered').length} équipement(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Reçu</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.order_status === 'received').length} équipement(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Équipement</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun équipement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const statusConfig = ORDER_STATUS_CONFIG[item.order_status];
                    const supplierName = suppliers.find(s => s.id === item.supplier_id)?.name;
                    return (
                      <TableRow key={`${item.source_type}-${item.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.source_type === 'offer' ? 'Demande' : 'Contrat'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{item.source_reference}</div>
                        </TableCell>
                        <TableCell className="text-sm">{item.client_name}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-muted-foreground">Qté: {item.quantity}</div>
                        </TableCell>
                        <TableCell className="text-sm">{supplierName || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency((item.supplier_price || item.purchase_price) * item.quantity)}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => navigateToSource(item)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentOrders;
