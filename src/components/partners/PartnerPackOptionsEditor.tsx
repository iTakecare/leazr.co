import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, GripVertical, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  fetchPartners,
  fetchPartnerPacks,
  fetchPartnerPackOptions,
  upsertPartnerPackOption,
  deletePartnerPackOption,
} from "@/services/partnerService";
import { getProducts } from "@/services/catalogService";
import { useCategories } from "@/hooks/products/useCategories";
import type { PartnerPackOption } from "@/types/partner";

interface PartnerPackOptionsEditorProps {
  partnerPackId: string;
  partnerId: string;
  companyId: string;
  packName: string;
}

interface OptionFormData {
  category_name: string;
  is_required: boolean;
  max_quantity: number;
  allowed_product_ids: string[];
}

const emptyForm: OptionFormData = {
  category_name: "",
  is_required: false,
  max_quantity: 1,
  allowed_product_ids: [],
};

const PartnerPackOptionsEditor: React.FC<PartnerPackOptionsEditorProps> = ({
  partnerPackId,
  partnerId,
  companyId,
  packName,
}) => {
  const queryClient = useQueryClient();
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [form, setForm] = useState<OptionFormData>(emptyForm);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [copySourcePartnerId, setCopySourcePartnerId] = useState<string>("");
  const [copySourcePackId, setCopySourcePackId] = useState<string>("");
  const [isCopying, setIsCopying] = useState(false);

  const { data: options = [], isLoading: loadingOptions } = useQuery({
    queryKey: ["partner-pack-options", partnerPackId],
    queryFn: () => fetchPartnerPackOptions(partnerPackId),
  });

  const { data: categories = [] } = useCategories();

  // Fetch other packs from the same partner for "copy options" feature
  const { data: partnerPacks = [] } = useQuery({
    queryKey: ["partner-packs", partnerId],
    queryFn: () => fetchPartnerPacks(partnerId),
  });

  const otherPacks = partnerPacks.filter((pp) => pp.id !== partnerPackId);

  const handleCopyOptions = async () => {
    if (!copySourcePackId) return;
    setIsCopying(true);
    try {
      const sourceOptions = await fetchPartnerPackOptions(copySourcePackId);
      if (sourceOptions.length === 0) {
        toast.error("Ce pack n'a aucune option à copier");
        return;
      }
      for (const option of sourceOptions) {
        await upsertPartnerPackOption({
          partner_pack_id: partnerPackId,
          category_name: option.category_name,
          is_required: option.is_required,
          max_quantity: option.max_quantity,
          position: option.position,
          allowed_product_ids: (option.allowed_product_ids || []).map(
            (id: string) => id.startsWith("vprice_") ? id.replace("vprice_", "") : id
          ),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["partner-pack-options", partnerPackId] });
      setCopySourcePackId("");
      toast.success(`${sourceOptions.length} option(s) copiée(s) avec succès`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la copie");
    } finally {
      setIsCopying(false);
    }
  };

  const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products-for-options"],
    queryFn: () => getProducts({ includeAdminOnly: true }),
  });

  const filteredProducts = selectedCategory
    ? allProducts.filter((p: any) => p.category_id === selectedCategory || p.category === (categories as any[]).find((c: any) => c.id === selectedCategory)?.name)
    : allProducts;

  const upsertMutation = useMutation({
    mutationFn: (data: Omit<PartnerPackOption, "id"> & { id?: string }) => upsertPartnerPackOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-pack-options", partnerPackId] });
      resetForm();
      toast.success(editingOption ? "Option mise a jour" : "Option ajoutee");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartnerPackOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-pack-options", partnerPackId] });
      toast.success("Option supprimee");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingOption(null);
    setShowAddForm(false);
    setSelectedCategory("");
  };

  const startEditing = (option: PartnerPackOption) => {
    setEditingOption(option.id);
    setForm({
      category_name: option.category_name,
      is_required: option.is_required,
      max_quantity: option.max_quantity,
      allowed_product_ids: (option.allowed_product_ids || []).map(
        (id: string) => id.startsWith("vprice_") ? id.replace("vprice_", "") : id
      ),
    });
    const matchingCat = (categories as any[]).find((c: any) => c.name === option.category_name);
    setSelectedCategory(matchingCat?.id || "");
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!form.category_name.trim()) {
      toast.error("Le nom de la categorie est requis");
      return;
    }

    const payload: any = {
      partner_pack_id: partnerPackId,
      category_name: form.category_name,
      is_required: form.is_required,
      max_quantity: form.max_quantity,
      allowed_product_ids: form.allowed_product_ids,
      position: editingOption
        ? options.find((o) => o.id === editingOption)?.position ?? 0
        : options.length,
    };

    if (editingOption) {
      payload.id = editingOption;
    }

    upsertMutation.mutate(payload);
  };

  const toggleProductId = (id: string) => {
    setForm((prev) => ({
      ...prev,
      allowed_product_ids: prev.allowed_product_ids.includes(id)
        ? prev.allowed_product_ids.filter((x) => x !== id)
        : [...prev.allowed_product_ids, id],
    }));
  };

  const toggleAllVariants = (variantIds: string[]) => {
    setForm((prev) => {
      const allSelected = variantIds.every((id) => prev.allowed_product_ids.includes(id));
      const newIds = allSelected
        ? prev.allowed_product_ids.filter((id) => !variantIds.includes(id))
        : [...new Set([...prev.allowed_product_ids, ...variantIds])];
      return { ...prev, allowed_product_ids: newIds };
    });
  };

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const formatAttributes = (attrs: Record<string, any>): string => {
    return Object.entries(attrs)
      .map(([, val]) => String(val))
      .join(" / ");
  };

  return (
    <div className="space-y-4">
      {otherPacks.length > 0 && (
        <div className="flex items-center gap-2">
          <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={copySourcePackId} onValueChange={setCopySourcePackId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Copier les options d'un autre pack..." />
            </SelectTrigger>
            <SelectContent>
              {otherPacks.map((pp) => (
                <SelectItem key={pp.id} value={pp.id}>
                  {pp.pack?.name || "Pack inconnu"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyOptions}
            disabled={!copySourcePackId || isCopying}
          >
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Copier"}
          </Button>
        </div>
      )}

      {loadingOptions ? (
          <div className="text-center py-6 text-muted-foreground">Chargement...</div>
        ) : options.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune categorie d'option configuree pour ce pack.
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((option) => (
              <Card key={option.id} className="border">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{option.category_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {option.is_required && <Badge variant="secondary" className="text-xs">Obligatoire</Badge>}
                        <span>Qte max : {option.max_quantity}</span>
                        <span>{option.allowed_product_ids?.length || 0} produit(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEditing(option)}>
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer cette option ?")) {
                          deleteMutation.mutate(option.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator />

        {showAddForm ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {editingOption ? "Modifier l'option" : "Nouvelle option"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la categorie</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCategory}
                    onValueChange={(catId) => {
                      setSelectedCategory(catId);
                      const cat = (categories as any[]).find((c: any) => c.id === catId);
                      if (cat) {
                        setForm((prev) => ({ ...prev, category_name: cat.name }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir une categorie existante..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories as any[]).map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground self-center">ou</span>
                  <Input
                    placeholder="Nom libre..."
                    value={form.category_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, category_name: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_required"
                    checked={form.is_required}
                    onCheckedChange={(v) => setForm((prev) => ({ ...prev, is_required: v }))}
                  />
                  <Label htmlFor="is_required">Obligatoire</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="max_qty">Qte max</Label>
                  <Input
                    id="max_qty"
                    type="number"
                    min={1}
                    max={99}
                    value={form.max_quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, max_quantity: parseInt(e.target.value) || 1 }))}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produits autorises ({form.allowed_product_ids.length} selectionne(s))</Label>
                {loadingProducts ? (
                  <div className="text-sm text-muted-foreground">Chargement des produits...</div>
                ) : (
                  <div className="border rounded-md max-h-64 overflow-y-auto p-2 space-y-0.5">
                    {filteredProducts.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2 text-center">
                        Aucun produit trouve{selectedCategory ? " dans cette categorie" : ""}
                      </div>
                    ) : (
                      (filteredProducts as any[]).map((product: any) => {
                        const variants = product.variant_combination_prices || product.product_variant_prices || [];
                        const hasVariants = variants.length > 0;
                        const isExpanded = expandedProducts.has(product.id);

                        if (!hasVariants) {
                          // Simple product - single checkbox
                          return (
                            <label
                              key={product.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={form.allowed_product_ids.includes(product.id)}
                                onChange={() => toggleProductId(product.id)}
                                className="rounded border-input"
                              />
                              <span className="truncate flex-1">{product.name}</span>
                              {product.brand && (
                                <span className="text-xs text-muted-foreground shrink-0">{product.brand}</span>
                              )}
                              {product.monthly_price != null && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {Number(product.monthly_price).toFixed(2)} EUR/mois
                                </span>
                              )}
                            </label>
                          );
                        }

                        // Product with variants - tree view
                        const variantIds = variants.map((v: any) => v.id);
                        const selectedCount = variantIds.filter((id: string) => form.allowed_product_ids.includes(id)).length;
                        const allSelected = selectedCount === variantIds.length;

                        return (
                          <div key={product.id} className="border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 rounded">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(product.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                              <span className="font-medium text-sm truncate flex-1">{product.name}</span>
                              {product.brand && (
                                <span className="text-xs text-muted-foreground shrink-0">{product.brand}</span>
                              )}
                              <Badge variant="outline" className="text-xs shrink-0">
                                {selectedCount}/{variants.length}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => toggleAllVariants(variantIds)}
                                className="text-xs text-primary hover:underline shrink-0"
                              >
                                {allSelected ? "Tout deselectionner" : "Tout selectionner"}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="ml-6 space-y-0.5 pb-1">
                                {variants.map((variant: any) => {
                                  const vid = variant.id;
                                  const attrs = variant.attributes || {};
                                  return (
                                    <label
                                      key={vid}
                                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={form.allowed_product_ids.includes(vid)}
                                        onChange={() => toggleProductId(vid)}
                                        className="rounded border-input"
                                      />
                                      <span className="truncate flex-1 text-muted-foreground">
                                        {formatAttributes(attrs) || "Variante"}
                                      </span>
                                      {variant.monthly_price != null && (
                                        <span className="text-xs text-muted-foreground shrink-0">
                                          {Number(variant.monthly_price).toFixed(2)} EUR/mois
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {editingOption ? "Mettre a jour" : "Ajouter"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une categorie d'option
          </Button>
        )}
    </div>
  );
};

export default PartnerPackOptionsEditor;
