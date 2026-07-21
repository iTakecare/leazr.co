import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Pencil, Trash2, Loader2, RefreshCw, Laptop, Send, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientColors, ClientCard, ClientEmptyState } from "@/components/client/clientUi";

interface OwnedEquipment {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  supplier: string | null;
  amortization_years: number;
  condition: string;
  collaborator_id: string | null;
  notes: string | null;
}

const CATEGORIES = [
  { value: "laptop", label: "PC portable" },
  { value: "desktop", label: "PC fixe / tout-en-un" },
  { value: "phone", label: "Smartphone" },
  { value: "tablet", label: "Tablette" },
  { value: "screen", label: "Écran" },
  { value: "printer", label: "Imprimante" },
  { value: "other", label: "Autre" },
];

const CONDITIONS = [
  { value: "good", label: "Bon état" },
  { value: "average", label: "État moyen" },
  { value: "defective", label: "Défectueux" },
];

const EMPTY_FORM = {
  title: "",
  brand: "",
  category: "laptop",
  serial_number: "",
  purchase_date: "",
  purchase_price: "",
  supplier: "",
  amortization_years: "3",
  condition: "good",
  collaborator_id: "none",
  notes: "",
};

/** Âge en années (décimal) depuis la date d'achat. */
const ageYears = (purchaseDate: string | null): number | null => {
  if (!purchaseDate) return null;
  const ms = Date.now() - new Date(purchaseDate).getTime();
  return ms / (365.25 * 24 * 3600 * 1000);
};

/** Statut d'amortissement → badge (le cœur de la détection d'opportunité). */
const amortizationStatus = (eq: OwnedEquipment) => {
  const age = ageYears(eq.purchase_date);
  if (age == null) return null;
  const amort = eq.amortization_years || 3;
  const overdue = age - amort;
  if (overdue >= 1) {
    return { level: "critical" as const, label: `Amorti depuis ${overdue.toFixed(1).replace(".", ",")} an${overdue >= 2 ? "s" : ""} — à renouveler`, bg: "#FEE2E2", fg: "#B91C1C" };
  }
  if (overdue >= 0) {
    return { level: "warning" as const, label: "Amorti — renouvellement conseillé", bg: "#FFEDD5", fg: "#C2410C" };
  }
  if (overdue >= -0.5) {
    return { level: "soon" as const, label: "Bientôt amorti", bg: "#FEF9C3", fg: "#A16207" };
  }
  return { level: "ok" as const, label: `En service (${age.toFixed(1).replace(".", ",")} an${age >= 2 ? "s" : ""})`, bg: "#DCFCE7", fg: "#15803D" };
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

interface ClientOwnedEquipmentTabProps {
  clientId: string;
  companyId: string;
}

const ClientOwnedEquipmentTab: React.FC<ClientOwnedEquipmentTabProps> = ({ clientId, companyId }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OwnedEquipment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["client-owned-equipment", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_owned_equipment")
        .select("*")
        .eq("client_id", clientId)
        .order("purchase_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as OwnedEquipment[];
    },
    enabled: !!clientId,
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["client-collaborators", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select("id, name, role")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; role: string | null }[];
    },
    enabled: !!clientId,
  });

  const assign = useMutation({
    mutationFn: async ({ id, collaboratorId }: { id: string; collaboratorId: string | null }) => {
      const { error } = await supabase
        .from("client_owned_equipment")
        .update({ collaborator_id: collaboratorId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-owned-equipment", clientId] });
      toast.success(vars.collaboratorId ? "Équipement assigné" : "Équipement désassigné");
    },
    onError: () => toast.error("Erreur lors de l'assignation"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (eq: OwnedEquipment) => {
    setEditing(eq);
    setForm({
      title: eq.title,
      brand: eq.brand ?? "",
      category: eq.category ?? "other",
      serial_number: eq.serial_number ?? "",
      purchase_date: eq.purchase_date ?? "",
      purchase_price: eq.purchase_price != null ? String(eq.purchase_price) : "",
      supplier: eq.supplier ?? "",
      amortization_years: String(eq.amortization_years ?? 3),
      condition: eq.condition ?? "good",
      collaborator_id: eq.collaborator_id ?? "none",
      notes: eq.notes ?? "",
    });
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        company_id: companyId,
        title: form.title.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        serial_number: form.serial_number.trim() || null,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        supplier: form.supplier.trim() || null,
        amortization_years: Number(form.amortization_years) || 3,
        condition: form.condition,
        collaborator_id: form.collaborator_id !== "none" ? form.collaborator_id : null,
        notes: form.notes.trim() || null,
      };
      const { error } = editing
        ? await supabase.from("client_owned_equipment").update(payload).eq("id", editing.id)
        : await supabase.from("client_owned_equipment").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-owned-equipment", clientId] });
      toast.success(editing ? "Équipement mis à jour" : "Équipement ajouté à votre parc");
      setFormOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_owned_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-owned-equipment", clientId] });
      toast.success("Équipement retiré");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const requestRenewal = useMutation({
    mutationFn: async (eq: OwnedEquipment) => {
      const status = amortizationStatus(eq);
      const { error } = await supabase.from("support_tickets").insert({
        client_id: clientId,
        company_id: companyId,
        subject: `Proposition de renouvellement — ${eq.title}`,
        category: "modification",
        description: [
          "Demande d'offre de renouvellement pour un équipement hors contrat :",
          `Équipement : ${eq.title}${eq.brand ? ` (${eq.brand})` : ""}`,
          eq.serial_number ? `S/N : ${eq.serial_number}` : null,
          `Date d'achat : ${fmtDate(eq.purchase_date)}`,
          eq.purchase_price != null ? `Prix d'achat : ${eq.purchase_price} €` : null,
          status ? `Statut : ${status.label}` : null,
        ].filter((l): l is string => l !== null).join("\n"),
        status: "open",
        priority: "medium",
        created_by_client: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      toast.success("Demande d'offre envoyée", {
        description: "Nous revenons vers vous avec une proposition de renouvellement en leasing.",
      });
    },
    onError: () => toast.error("Erreur lors de l'envoi de la demande"),
  });

  return (
    <>
      <ClientCard pad={16}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: clientColors.ink, display: "flex", alignItems: "center", gap: 8 }}>
              <Package style={{ width: 18, height: 18, color: clientColors.indigo }} />
              Matériel hors contrat
            </h2>
            <p style={{ fontSize: 12.5, color: clientColors.muted, margin: "4px 0 0" }}>
              Référencez le matériel acheté ailleurs : suivez son âge et demandez une offre de
              renouvellement en leasing quand il arrive en fin de vie.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: clientColors.faint }} />
          </div>
        ) : equipment.length === 0 ? (
          <ClientEmptyState
            icon={<Package style={{ width: 40, height: 40, color: clientColors.faint }} />}
            title="Aucun matériel hors contrat"
            description="Ajoutez vos équipements existants (avec leur date d'achat) pour suivre leur amortissement."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {equipment.map((eq) => {
              const status = amortizationStatus(eq);
              const renewable = status && (status.level === "critical" || status.level === "warning");
              return (
                <div
                  key={eq.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "11px 13px",
                    borderRadius: 12,
                    background: clientColors.surface,
                    border: `1px solid ${clientColors.borderSoft}`,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: "1 1 260px" }}>
                    <Laptop style={{ width: 17, height: 17, color: clientColors.faint, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: clientColors.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {eq.title}
                        {eq.brand ? <span style={{ fontWeight: 400, color: clientColors.muted }}> · {eq.brand}</span> : null}
                      </p>
                      <p style={{ fontSize: 11.5, color: clientColors.muted, margin: "2px 0 0" }}>
                        Acheté le {fmtDate(eq.purchase_date)}
                        {eq.purchase_price != null && ` · ${Number(eq.purchase_price).toFixed(0)} €`}
                        {eq.serial_number && ` · S/N ${eq.serial_number}`}
                        {eq.supplier && ` · ${eq.supplier}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {status && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: status.bg, color: status.fg, whiteSpace: "nowrap" }}>
                        {status.label}
                      </span>
                    )}
                    <Select
                      value={eq.collaborator_id ?? "none"}
                      onValueChange={(v) => assign.mutate({ id: eq.id, collaboratorId: v === "none" ? null : v })}
                    >
                      <SelectTrigger
                        className="h-8 rounded-lg text-xs w-[170px] gap-1"
                        style={{ color: eq.collaborator_id ? clientColors.ink : clientColors.faint }}
                      >
                        <UserRound className="h-3.5 w-3.5 shrink-0" style={{ color: eq.collaborator_id ? clientColors.indigo : clientColors.faint }} />
                        <SelectValue placeholder="Non assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
                        {collaborators.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renewable && (
                      <Button
                        size="sm"
                        className="gap-1 text-xs h-8"
                        onClick={() => requestRenewal.mutate(eq)}
                        disabled={requestRenewal.isPending}
                      >
                        {requestRenewal.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Obtenir une offre
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Modifier" onClick={() => openEdit(eq)}>
                      <Pencil className="h-3.5 w-3.5" style={{ color: clientColors.muted }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Retirer"
                      onClick={() => {
                        if (window.confirm(`Retirer « ${eq.title} » de votre parc ?`)) remove.mutate(eq.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: clientColors.muted }} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ClientCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'équipement" : "Ajouter un équipement hors contrat"}</DialogTitle>
            <DialogDescription>
              Matériel acheté en dehors de vos contrats de leasing. La date d'achat permet de suivre
              l'amortissement et de vous proposer un renouvellement au bon moment.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>
                Désignation *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex : MacBook Pro 13 2019"
                className="rounded-xl"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Marque</label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Apple, Dell…" className="rounded-xl" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Catégorie</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Date d'achat *</label>
              <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Prix d'achat (€ HTVA)</label>
              <Input type="number" min="0" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="1299" className="rounded-xl" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>N° de série</label>
              <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Acheté chez</label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Fournisseur, magasin…" className="rounded-xl" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Amortissement (années)</label>
              <Select value={form.amortization_years} onValueChange={(v) => setForm({ ...form, amortization_years: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2", "3", "4", "5"].map((y) => <SelectItem key={y} value={y}>{y} ans</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>État</label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Assigné à</label>
              <Select value={form.collaborator_id} onValueChange={(v) => setForm({ ...form, collaborator_id: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.role ? ` — ${c.role}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 5 }}>Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-xl" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.purchase_date || save.isPending} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientOwnedEquipmentTab;
