import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Monitor, Apple, MonitorSmartphone, Package } from "lucide-react";

interface Software {
  id: string;
  name: string;
  description: string | null;
  version: string | null;
  platform: string;
  package_url: string | null;
  silent_install_command: string | null;
  icon_url: string | null;
  category: string;
  is_active: boolean;
}

const CATEGORIES = [
  { value: "productivity", label: "Productivité" },
  { value: "security", label: "Sécurité" },
  { value: "communication", label: "Communication" },
  { value: "utilities", label: "Utilitaires" },
  { value: "other", label: "Autre" },
];

const PLATFORMS = [
  { value: "both", label: "Mac & Windows", icon: MonitorSmartphone },
  { value: "mac", label: "Mac", icon: Apple },
  { value: "windows", label: "Windows", icon: Monitor },
];

const emptySoftware = {
  name: "",
  description: "",
  version: "",
  platform: "both",
  package_url: "",
  silent_install_command: "",
  icon_url: "",
  category: "other",
  is_active: true,
};

const SoftwareCatalogManager: React.FC = () => {
  const { companyId } = useMultiTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySoftware);

  const { data: software = [], isLoading } = useQuery({
    queryKey: ["software-catalog", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software_catalog")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data as Software[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = { ...values, company_id: companyId };
      if (editingId) {
        const { error } = await supabase.from("software_catalog").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("software_catalog").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-catalog"] });
      toast({ title: editingId ? "Logiciel mis à jour" : "Logiciel ajouté" });
      closeDialog();
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("software_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-catalog"] });
      toast({ title: "Logiciel supprimé" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("software_catalog").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["software-catalog"] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptySoftware);
    setDialogOpen(true);
  };

  const openEdit = (sw: Software) => {
    setEditingId(sw.id);
    setForm({
      name: sw.name,
      description: sw.description || "",
      version: sw.version || "",
      platform: sw.platform,
      package_url: sw.package_url || "",
      silent_install_command: sw.silent_install_command || "",
      icon_url: sw.icon_url || "",
      category: sw.category,
      is_active: sw.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptySoftware);
  };

  const getPlatformIcon = (platform: string) => {
    const p = PLATFORMS.find((pl) => pl.value === platform);
    if (!p) return <MonitorSmartphone className="h-4 w-4" />;
    const Icon = p.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Catalogue de logiciels
            </CardTitle>
            <CardDescription>Gérez les logiciels disponibles pour le déploiement à distance</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : software.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun logiciel dans le catalogue</p>
            <p className="text-xs mt-1">Ajoutez des logiciels pour pouvoir les déployer sur les machines</p>
          </div>
        ) : (
          <div className="space-y-2">
            {software.map((sw) => (
              <div key={sw.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(sw.platform)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{sw.name}</span>
                      {sw.version && <Badge variant="outline" className="text-xs">{sw.version}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">{getCategoryLabel(sw.category)}</Badge>
                      {!sw.is_active && <Badge variant="destructive" className="text-xs">Inactif</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={sw.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: sw.id, is_active: checked })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(sw)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(sw.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le logiciel" : "Ajouter un logiciel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Google Chrome" />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="Ex: 120.0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description courte" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plateforme</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL du package</Label>
              <Input value={form.package_url} onChange={(e) => setForm({ ...form, package_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Commande d'installation silencieuse</Label>
              <Input value={form.silent_install_command} onChange={(e) => setForm({ ...form, silent_install_command: e.target.value })} placeholder="Ex: msiexec /i package.msi /quiet" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SoftwareCatalogManager;
