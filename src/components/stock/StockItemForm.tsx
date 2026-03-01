import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { createStockItem, createMovement, STOCK_STATUS_CONFIG, CONDITION_CONFIG, StockStatus, StockCondition } from "@/services/stockService";
import { fetchSuppliers } from "@/services/equipmentOrderService";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface StockItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StockItemForm: React.FC<StockItemFormProps> = ({ open, onOpenChange }) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const [customCategory, setCustomCategory] = useState(false);
  const [customBrand, setCustomBrand] = useState(false);

  const [form, setForm] = useState({
    title: '',
    serial_numbers: '',
    status: 'in_stock' as StockStatus,
    condition: 'new' as StockCondition,
    quantity: '1',
    unit_price: '',
    supplier_id: '',
    order_reference: '',
    purchase_date: '',
    reception_date: '',
    location: '',
    notes: '',
    category: '',
    brand: '',
    model: '',
    warranty_end_date: '',
    cpu: '',
    memory: '',
    storage: '',
    color: '',
    grade: '',
  });

  useEffect(() => {
    if (open && companyId) {
      fetchSuppliers(companyId).then(setSuppliers).catch(() => {});
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !form.title) return;

    setLoading(true);
    try {
      const serialNumbers = form.serial_numbers.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      const item = await createStockItem({
        company_id: companyId,
        title: form.title,
        serial_number: serialNumbers[0] || null,
        serial_numbers: serialNumbers,
        status: form.status,
        condition: form.condition,
        quantity: parseInt(form.quantity) || 1,
        unit_price: parseFloat(form.unit_price) || 0,
        purchase_price: (parseInt(form.quantity) || 1) * (parseFloat(form.unit_price) || 0),
        supplier_id: form.supplier_id || null,
        order_reference: form.order_reference || null,
        purchase_date: form.purchase_date || null,
        reception_date: form.reception_date || null,
        location: form.location || null,
        notes: form.notes || null,
        category: form.category || null,
        brand: form.brand || null,
        model: form.model || null,
        warranty_end_date: form.warranty_end_date || null,
        cpu: form.cpu || null,
        memory: form.memory || null,
        storage: form.storage || null,
        color: form.color || null,
        grade: form.grade || null,
      });

      await createMovement({
        company_id: companyId,
        stock_item_id: item.id,
        movement_type: 'reception',
        from_status: null,
        to_status: form.status,
        performed_by: user?.id || null,
        notes: 'Création manuelle',
      });

      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success("Article ajouté au stock");
      onOpenChange(false);
      setForm({ title: '', serial_numbers: '', status: 'in_stock', condition: 'new', quantity: '1', unit_price: '', supplier_id: '', order_reference: '', purchase_date: '', reception_date: '', location: '', notes: '', category: '', brand: '', model: '', warranty_end_date: '', cpu: '', memory: '', storage: '', color: '', grade: '' });
      setCustomCategory(false);
      setCustomBrand(false);
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || 'Impossible de créer l\'article'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un article au stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titre / Description *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <Label>N° de série (séparés par virgule si plusieurs)</Label>
              <Input value={form.serial_numbers} onChange={e => setForm(f => ({ ...f, serial_numbers: e.target.value }))} placeholder="SN001, SN002, SN003..." />
            </div>
            <div>
              <Label>Quantité</Label>
              <Input type="number" min="1" step="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <Label>Prix unitaire HT (€)</Label>
              <Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div>
              <Label>Prix total HT</Label>
              <Input type="text" readOnly value={((parseInt(form.quantity) || 1) * (parseFloat(form.unit_price) || 0)).toFixed(2) + ' €'} className="bg-muted" />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as StockStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STOCK_STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>État</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as StockCondition }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fournisseur</Label>
              <Select value={form.supplier_id || 'none'} onValueChange={v => setForm(f => ({ ...f, supplier_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Réf. commande</Label>
              <Input value={form.order_reference} onChange={e => setForm(f => ({ ...f, order_reference: e.target.value }))} />
            </div>
            <div>
              <Label>Date d'achat</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <Label>Date de réception</Label>
              <Input type="date" value={form.reception_date} onChange={e => setForm(f => ({ ...f, reception_date: e.target.value }))} />
            </div>
            <div>
              <Label>Emplacement</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <Label>Catégorie</Label>
              {customCategory ? (
                <div className="flex gap-2">
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Saisir une catégorie..." className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCustomCategory(false); setForm(f => ({ ...f, category: '' })); }}>Liste</Button>
                </div>
              ) : (
                <Select value={form.category || '__none__'} onValueChange={v => {
                  if (v === '__other__') { setCustomCategory(true); setForm(f => ({ ...f, category: '' })); }
                  else if (v === '__none__') { setForm(f => ({ ...f, category: '' })); }
                  else { setForm(f => ({ ...f, category: v })); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Aucune —</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>{c.translation || c.name}</SelectItem>
                    ))}
                    <SelectItem value="__other__">✏️ Autre (saisie libre)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Marque</Label>
              {customBrand ? (
                <div className="flex gap-2">
                  <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Saisir une marque..." className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCustomBrand(false); setForm(f => ({ ...f, brand: '' })); }}>Liste</Button>
                </div>
              ) : (
                <Select value={form.brand || '__none__'} onValueChange={v => {
                  if (v === '__other__') { setCustomBrand(true); setForm(f => ({ ...f, brand: '' })); }
                  else if (v === '__none__') { setForm(f => ({ ...f, brand: '' })); }
                  else { setForm(f => ({ ...f, brand: v })); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Aucune —</SelectItem>
                    {brands.map((b: any) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                    <SelectItem value="__other__">✏️ Autre (saisie libre)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Modèle</Label>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Ex: Latitude 5540..." />
            </div>
            <div>
              <Label>Fin de garantie</Label>
              <Input type="date" value={form.warranty_end_date} onChange={e => setForm(f => ({ ...f, warranty_end_date: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t pt-3 mt-1">
              <Label className="text-sm font-semibold">Attributs techniques</Label>
            </div>
            <div>
              <Label>CPU</Label>
              <Input value={form.cpu} onChange={e => setForm(f => ({ ...f, cpu: e.target.value }))} placeholder="Ex: Intel i7-1365U" />
            </div>
            <div>
              <Label>Mémoire</Label>
              <Input value={form.memory} onChange={e => setForm(f => ({ ...f, memory: e.target.value }))} placeholder="Ex: 16 Go" />
            </div>
            <div>
              <Label>Stockage</Label>
              <Input value={form.storage} onChange={e => setForm(f => ({ ...f, storage: e.target.value }))} placeholder="Ex: 512 Go SSD" />
            </div>
            <div>
              <Label>Couleur</Label>
              <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Ex: Noir, Argent..." />
            </div>
            <div>
              <Label>Grade</Label>
              <Input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="Ex: A, B, C..." />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockItemForm;
