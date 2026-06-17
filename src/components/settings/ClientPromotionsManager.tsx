import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import {
  listPromotions, createPromotion, updatePromotion, deletePromotion,
} from "@/services/promotionService";
import type { ClientPromotion, ClientPromotionInput, PromotionPlacement } from "@/types/promotion";

const emptyForm = (): ClientPromotionInput => ({
  placement: "top",
  title: "",
  description: "",
  image_url: "",
  cta_label: "",
  link_url: "",
  background: "",
  is_active: true,
  sort_order: 0,
  starts_at: null,
  ends_at: null,
});

const ClientPromotionsManager: React.FC = () => {
  const { companyId } = useMultiTenant();
  const [items, setItems] = useState<ClientPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientPromotionInput>(emptyForm());

  const reload = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setItems(await listPromotions(companyId));
    } catch (e: any) {
      toast.error("Erreur de chargement : " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { reload(); }, [reload]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (p: ClientPromotion) => {
    setEditingId(p.id);
    setForm({
      placement: p.placement, title: p.title, description: p.description || "",
      image_url: p.image_url || "", cta_label: p.cta_label || "", link_url: p.link_url || "",
      background: p.background || "", is_active: p.is_active, sort_order: p.sort_order,
      starts_at: p.starts_at || null, ends_at: p.ends_at || null,
    });
    setDialogOpen(true);
  };

  const set = <K extends keyof ClientPromotionInput>(k: K, v: ClientPromotionInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!companyId) return;
    if (!form.title.trim()) { toast.error("Le titre est requis."); return; }
    setSaving(true);
    try {
      const payload: ClientPromotionInput = {
        ...form,
        description: form.description?.trim() || null,
        image_url: form.image_url?.trim() || null,
        cta_label: form.cta_label?.trim() || null,
        link_url: form.link_url?.trim() || null,
        background: form.background?.trim() || null,
      };
      if (editingId) {
        await updatePromotion(editingId, payload);
        toast.success("Bannière mise à jour");
      } else {
        await createPromotion(companyId, payload);
        toast.success("Bannière créée");
      }
      setDialogOpen(false);
      reload();
    } catch (e: any) {
      toast.error("Échec de l'enregistrement : " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: ClientPromotion) => {
    try {
      await updatePromotion(p.id, { is_active: !p.is_active });
      setItems((arr) => arr.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
    } catch (e: any) {
      toast.error("Erreur : " + (e?.message || ""));
    }
  };

  const remove = async (p: ClientPromotion) => {
    if (!confirm(`Supprimer la bannière « ${p.title} » ?`)) return;
    try {
      await deletePromotion(p.id);
      setItems((arr) => arr.filter((x) => x.id !== p.id));
      toast.success("Bannière supprimée");
    } catch (e: any) {
      toast.error("Erreur de suppression : " + (e?.message || ""));
    }
  };

  const placementLabel = (pl: PromotionPlacement) => (pl === "top" ? "Haut (bandeau)" : "Colonne droite");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Publicités de l'espace client
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Bannières promotionnelles affichées sur le tableau de bord de vos clients (nouveaux produits,
            prestataires externes, offres…). Placement en haut ou dans la colonne de droite.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nouvelle bannière
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-xl p-10 text-center text-muted-foreground">
          <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Aucune bannière</p>
          <p className="text-xs mt-1">Créez votre première bannière publicitaire pour vos clients.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-xl border bg-card">
              <div
                className="w-14 h-14 rounded-lg shrink-0 bg-cover bg-center flex items-center justify-center text-white"
                style={{ background: p.image_url ? `url(${p.image_url}) center/cover` : (p.background || "linear-gradient(120deg,#2D55E5,#7C3AED)") }}
              >
                {!p.image_url && <Megaphone className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{p.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{placementLabel(p.placement)}</Badge>
                  {!p.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                {p.link_url && (
                  <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> {p.link_url}
                  </p>
                )}
              </div>
              <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la bannière" : "Nouvelle bannière"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emplacement</Label>
                <Select value={form.placement} onValueChange={(v) => set("placement", v as PromotionPlacement)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Haut (bandeau large)</SelectItem>
                    <SelectItem value="sidebar">Colonne droite (carte)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" className="mt-1.5" value={form.sort_order}
                  onChange={(e) => set("sort_order", parseInt(e.target.value || "0", 10))} />
              </div>
            </div>
            <div>
              <Label>Titre *</Label>
              <Input className="mt-1.5" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. Nouveaux MacBook reconditionnés" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5" rows={2} value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Texte court accrocheur" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Texte du bouton</Label>
                <Input className="mt-1.5" value={form.cta_label || ""} onChange={(e) => set("cta_label", e.target.value)} placeholder="Découvrir" />
              </div>
              <div>
                <Label>Lien (URL ou route interne)</Label>
                <Input className="mt-1.5" value={form.link_url || ""} onChange={(e) => set("link_url", e.target.value)} placeholder="products ou https://…" />
              </div>
            </div>
            <div>
              <Label>Image (URL)</Label>
              <Input className="mt-1.5" value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…/visuel.jpg" />
            </div>
            <div>
              <Label>Fond (dégradé CSS, si pas d'image)</Label>
              <Input className="mt-1.5" value={form.background || ""} onChange={(e) => set("background", e.target.value)} placeholder="linear-gradient(120deg,#2D55E5,#7C3AED)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Début (optionnel)</Label>
                <Input type="date" className="mt-1.5"
                  value={form.starts_at ? form.starts_at.slice(0, 10) : ""}
                  onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
              <div>
                <Label>Fin (optionnel)</Label>
                <Input type="date" className="mt-1.5"
                  value={form.ends_at ? form.ends_at.slice(0, 10) : ""}
                  onChange={(e) => set("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              <Label className="cursor-pointer">Active (visible par les clients)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPromotionsManager;
