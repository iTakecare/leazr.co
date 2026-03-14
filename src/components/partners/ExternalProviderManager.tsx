import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, ChevronDown, ChevronUp, Upload, X, Loader2, Copy } from "lucide-react";
import { cleanFileUpload } from "@/services/cleanFileUploadService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  fetchExternalProviders,
  createExternalProvider,
  updateExternalProvider,
  deleteExternalProvider,
  fetchProviderProducts,
  createProviderProduct,
  updateProviderProduct,
  deleteProviderProduct,
} from "@/services/externalProviderService";
import type { ExternalProvider, CreateExternalProviderData, ExternalProviderProduct, CreateExternalProviderProductData, BILLING_PERIOD_LABELS } from "@/types/partner";

const PERIOD_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
  one_time: "Unique",
};

const ExternalProviderManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ExternalProvider | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ExternalProviderProduct | null>(null);
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [providerForm, setProviderForm] = useState<CreateExternalProviderData>({
    name: "",
    logo_url: "",
    website_url: "",
    description: "",
    is_active: true,
  });

  const [productForm, setProductForm] = useState<Omit<CreateExternalProviderProductData, 'provider_id'>>({
    name: "",
    description: "",
    price_htva: 0,
    billing_period: "monthly",
    is_active: true,
    position: 0,
  });

  useEffect(() => {
    const loadCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        if (profile?.company_id) setCompanyId(profile.company_id);
      }
    };
    loadCompanyId();
  }, []);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["external_providers", companyId],
    queryFn: () => fetchExternalProviders(companyId!),
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["provider_products", expandedProvider],
    queryFn: () => fetchProviderProducts(expandedProvider!),
    enabled: !!expandedProvider,
  });

  // Provider mutations
  const createProviderMut = useMutation({
    mutationFn: (data: CreateExternalProviderData) => createExternalProvider(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external_providers"] });
      toast.success("Prestataire créé");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProviderMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExternalProviderData> }) => updateExternalProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external_providers"] });
      toast.success("Prestataire mis à jour");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProviderMut = useMutation({
    mutationFn: deleteExternalProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external_providers"] });
      toast.success("Prestataire supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Product mutations
  const createProductMut = useMutation({
    mutationFn: (data: CreateExternalProviderProductData) => createProviderProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider_products"] });
      toast.success("Produit ajouté");
      setProductDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProductMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateExternalProviderProductData> }) => updateProviderProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider_products"] });
      toast.success("Produit mis à jour");
      setProductDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProductMut = useMutation({
    mutationFn: deleteProviderProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider_products"] });
      toast.success("Produit supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProviderForm({ name: "", logo_url: "", website_url: "", description: "", is_active: true });
    setDialogOpen(true);
  };

  const openEditProvider = (provider: ExternalProvider) => {
    setEditingProvider(provider);
    setProviderForm({
      name: provider.name,
      logo_url: provider.logo_url || "",
      website_url: provider.website_url || "",
      description: provider.description || "",
      is_active: provider.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmitProvider = () => {
    if (!providerForm.name.trim()) {
      toast.error("Nom requis");
      return;
    }
    if (editingProvider) {
      updateProviderMut.mutate({ id: editingProvider.id, data: providerForm });
    } else {
      createProviderMut.mutate(providerForm);
    }
  };

  const openCreateProduct = (providerId: string) => {
    setCurrentProviderId(providerId);
    setEditingProduct(null);
    setProductForm({ name: "", description: "", price_htva: 0, billing_period: "monthly", is_active: true, position: 0 });
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: ExternalProviderProduct) => {
    setCurrentProviderId(product.provider_id);
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price_htva: product.price_htva,
      billing_period: product.billing_period,
      is_active: product.is_active,
      position: product.position,
    });
    setProductDialogOpen(true);
  };

  const handleSubmitProduct = () => {
    if (!productForm.name.trim() || !currentProviderId) {
      toast.error("Nom requis");
      return;
    }
    if (editingProduct) {
      updateProductMut.mutate({ id: editingProduct.id, data: productForm });
    } else {
      createProductMut.mutate({ ...productForm, provider_id: currentProviderId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prestataires externes</h2>
          <p className="text-muted-foreground">Gérez les prestataires et leurs produits/services</p>
        </div>
        <Button onClick={openCreateProvider}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un prestataire
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun prestataire externe. Cliquez sur "Ajouter un prestataire" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <Collapsible
              key={provider.id}
              open={expandedProvider === provider.id}
              onOpenChange={(open) => setExpandedProvider(open ? provider.id : null)}
            >
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {provider.logo_url && (
                        <img src={provider.logo_url} alt={provider.name} className="h-8 w-8 rounded object-contain" />
                      )}
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        {provider.website_url && (
                          <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">
                            {provider.website_url}
                          </a>
                        )}
                      </div>
                      <Badge variant={provider.is_active ? "default" : "secondary"}>
                        {provider.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditProvider(provider)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm(`Supprimer "${provider.name}" ?`)) deleteProviderMut.mutate(provider.id);
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {expandedProvider === provider.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Produits / Services</h4>
                      <Button size="sm" variant="outline" onClick={() => openCreateProduct(provider.id)}>
                        <Plus className="mr-1 h-3 w-3" /> Ajouter
                      </Button>
                    </div>
                    {products.length === 0 && expandedProvider === provider.id ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun produit</p>
                    ) : expandedProvider === provider.id ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Prix HTVA</TableHead>
                            <TableHead>Période</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.price_htva.toFixed(2)} €</TableCell>
                              <TableCell>
                                <Badge variant="outline">{PERIOD_LABELS[product.billing_period] || product.billing_period}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={product.is_active ? "default" : "secondary"}>
                                  {product.is_active ? "Actif" : "Inactif"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => {
                                    if (confirm(`Supprimer "${product.name}" ?`)) deleteProductMut.mutate(product.id);
                                  }}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : null}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Provider Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Modifier le prestataire" : "Nouveau prestataire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={providerForm.name} onChange={(e) => setProviderForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Proximus" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={providerForm.description || ""} onChange={(e) => setProviderForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Logo</Label>
              {providerForm.logo_url ? (
                <div className="flex items-center gap-3 mt-1">
                  <img src={providerForm.logo_url} alt="Logo" className="h-16 w-16 rounded border object-contain bg-background" />
                  <Button variant="outline" size="sm" onClick={() => setProviderForm(p => ({ ...p, logo_url: "" }))}>
                    <X className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploading(true);
                      try {
                        const url = await cleanFileUpload(file, "site-settings", "providers");
                        if (url) {
                          setProviderForm(p => ({ ...p, logo_url: url }));
                        }
                      } finally {
                        setIsUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {isUploading ? "Upload..." : "Choisir un logo"}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={providerForm.website_url || ""} onChange={(e) => setProviderForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={providerForm.is_active} onCheckedChange={(v) => setProviderForm(p => ({ ...p, is_active: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitProvider}>{editingProvider ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifier le produit" : "Nouveau produit/service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Abonnement mobile" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={productForm.description || ""} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix HTVA (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price_htva}
                  onChange={(e) => setProductForm(p => ({ ...p, price_htva: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Période de facturation</Label>
                <Select value={productForm.billing_period} onValueChange={(v) => setProductForm(p => ({ ...p, billing_period: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                    <SelectItem value="one_time">Unique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={productForm.is_active} onCheckedChange={(v) => setProductForm(p => ({ ...p, is_active: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitProduct}>{editingProduct ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalProviderManager;
