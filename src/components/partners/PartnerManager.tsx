import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Globe, Eye, EyeOff } from "lucide-react";
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

const PartnerManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
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
              <p className="text-xs text-muted-foreground mt-1">
                Accessible via : itakecare.be/{form.slug || "..."}
              </p>
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
              <Label>URL du logo</Label>
              <Input
                value={form.logo_url || ""}
                onChange={(e) => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://..."
              />
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
    </div>
  );
};

export default PartnerManager;
