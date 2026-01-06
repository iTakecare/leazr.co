import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Check, TrendingUp, Save, Calendar } from "lucide-react";
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
}

interface ContractPurchaseTrackingProps {
  contractId: string;
  onUpdate?: () => void;
}

const ContractPurchaseTracking: React.FC<ContractPurchaseTrackingProps> = ({
  contractId,
  onUpdate
}) => {
  const [equipment, setEquipment] = useState<ContractEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEquipment();
  }, [contractId]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_equipment')
        .select('id, title, quantity, purchase_price, actual_purchase_price, actual_purchase_date, purchase_notes')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Erreur chargement équipements:', error);
      toast.error("Erreur lors du chargement des équipements");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePurchase = async (equipmentId: string) => {
    const priceStr = editingPrices[equipmentId];
    const notes = editingNotes[equipmentId];
    
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
      const { error } = await supabase
        .from('contract_equipment')
        .update({
          actual_purchase_price: actualPrice,
          actual_purchase_date: new Date().toISOString(),
          purchase_notes: notes || null
        })
        .eq('id', equipmentId);

      if (error) throw error;

      toast.success("Prix d'achat enregistré");
      fetchEquipment();
      onUpdate?.();
      
      // Clear editing state
      setEditingPrices(prev => {
        const { [equipmentId]: _, ...rest } = prev;
        return rest;
      });
      setEditingNotes(prev => {
        const { [equipmentId]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
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

                return (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isPurchased && <Check className="h-4 w-4 text-green-600" />}
                        <span className="font-medium">{eq.title}</span>
                      </div>
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
                    <TableCell className="text-center">{eq.quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(eq.purchase_price)} × {eq.quantity}
                      </div>
                      <div className="font-medium">
                        {formatCurrency(eq.purchase_price * eq.quantity)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
                            onChange={(e) => setEditingPrices(prev => ({
                              ...prev,
                              [eq.id]: e.target.value
                            }))}
                          />
                          <Input
                            type="text"
                            placeholder="Notes (optionnel)"
                            className="w-28 text-xs h-7"
                            value={editingNotes[eq.id] ?? ''}
                            onChange={(e) => setEditingNotes(prev => ({
                              ...prev,
                              [eq.id]: e.target.value
                            }))}
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
                    <TableCell>
                      {(isEditing || !isPurchased) && editingPrices[eq.id] && (
                        <Button
                          size="sm"
                          onClick={() => handleSavePurchase(eq.id)}
                          disabled={saving === eq.id}
                        >
                          {saving === eq.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {isPurchased && !isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPrices(prev => ({
                              ...prev,
                              [eq.id]: eq.actual_purchase_price!.toString()
                            }));
                            setEditingNotes(prev => ({
                              ...prev,
                              [eq.id]: eq.purchase_notes || ''
                            }));
                          }}
                        >
                          Modifier
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
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
