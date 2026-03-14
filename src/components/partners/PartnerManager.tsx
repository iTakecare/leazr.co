import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Loader2, X, Package, Link, Copy } from "lucide-react";
import { cleanFileUpload } from "@/services/cleanFileUploadService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchPartners,
  createPartner,
  updatePartner,
  deletePartner,
  generateSlug,
} from "@/services/partnerService";
import type { Partner, CreatePartnerData } from "@/types/partner";
import PartnerPackManager from "./PartnerPackManager";
import PartnerProviderManager from "./PartnerProviderManager";

const PartnerManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [managingPacksPartner, setManagingPacksPartner] = useState<Partner | null>(null);
  const [managingProvidersPartner, setManagingProvidersPartner] = useState<Partner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreatePartnerData>({
    name: "",
    slug: "",
    description: "",
    logo_url: "",
    website_url: "",
    is_active: true,
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

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners(companyId!),
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePartnerData) => createPartner(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partenaire créé");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePartnerData> }) => updatePartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partenaire mis à jour");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Partenaire supprimé");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingPartner(null);
    setForm({ name: "", slug: "", description: "", logo_url: "", website_url: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setForm({
      name: partner.name,
      slug: partner.slug,
      description: partner.description || "",
      logo_url: partner.logo_url || "",
      website_url: partner.website_url || "",
      is_active: partner.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPartner(null);
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: editingPartner ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nom et slug requis");
      return;
    }
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Partenaires</h2>
          <p className="text-muted-foreground">Gérez les partenaires et leurs pages dédiées</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un partenaire
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun partenaire. Cliquez sur "Ajouter un partenaire" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>URL publique</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {partner.logo_url && (
                        <img src={partner.logo_url} alt={partner.name} className="h-8 w-8 rounded object-contain" />
                      )}
                      {partner.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{partner.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">/{partner.slug}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setManagingPacksPartner(partner)} title="Gérer les packs">
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setManagingProvidersPartner(partner)} title="Prestataires externes">
                        <Link className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(partner)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Supprimer le partenaire "${partner.name}" ?`)) {
                            deleteMutation.mutate(partner.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? "Modifier le partenaire" : "Nouveau partenaire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nom du partenaire"
              />
            </div>
            <div>
              <Label>Slug (URL) *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="nom-du-partenaire"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Texte de présentation du partenaire"
                rows={3}
              />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && (
                  <div className="relative h-16 w-16 border rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                      onClick={() => setForm(prev => ({ ...prev, logo_url: "" }))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploading(true);
                      try {
                        const url = await cleanFileUpload(file, "site-settings", "partners");
                        if (url) {
                          setForm(prev => ({ ...prev, logo_url: url }));
                        }
                      } finally {
                        setIsUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }
                    }}
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Upload...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> {form.logo_url ? "Changer" : "Télécharger"}</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label>Site web</Label>
              <Input
                value={form.website_url || ""}
                onChange={(e) => setForm(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))}
              />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingPartner ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {managingPacksPartner && (
        <PartnerPackManager
          partner={managingPacksPartner}
          open={!!managingPacksPartner}
          onOpenChange={(open) => { if (!open) setManagingPacksPartner(null); }}
        />
      )}

      {managingProvidersPartner && companyId && (
        <PartnerProviderManager
          partner={managingProvidersPartner}
          companyId={companyId}
          open={!!managingProvidersPartner}
          onOpenChange={(open) => { if (!open) setManagingProvidersPartner(null); }}
        />
      )}
    </div>
  );
};

export default PartnerManager;
