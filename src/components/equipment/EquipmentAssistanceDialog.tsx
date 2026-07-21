import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Headset, Wrench, RefreshCw, HelpCircle, Loader2, Send, Laptop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientColors } from "@/components/client/clientUi";

export interface AssistanceEquipment {
  id: string;
  name: string;
  serial?: string | null;
  contractRef?: string | null;
}

interface EquipmentAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: AssistanceEquipment | null;
  clientId: string;
  companyId: string;
}

const REQUEST_TYPES = [
  {
    value: "remote",
    label: "Assistance à distance",
    hint: "Un technicien vous aide en prise en main à distance",
    icon: Headset,
    category: "technical",
    priority: "medium",
  },
  {
    value: "hardware",
    label: "Panne matérielle (SAV)",
    hint: "L'équipement est défectueux ou endommagé",
    icon: Wrench,
    category: "technical",
    priority: "high",
  },
  {
    value: "replacement",
    label: "Demande de remplacement",
    hint: "Échanger cet équipement (casse, évolution des besoins…)",
    icon: RefreshCw,
    category: "modification",
    priority: "medium",
  },
  {
    value: "other",
    label: "Autre demande",
    hint: "Toute autre question liée à cet équipement",
    icon: HelpCircle,
    category: "other",
    priority: "medium",
  },
] as const;

const EquipmentAssistanceDialog: React.FC<EquipmentAssistanceDialogProps> = ({
  open,
  onOpenChange,
  equipment,
  clientId,
  companyId,
}) => {
  const [requestType, setRequestType] = useState<string>("remote");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const selectedType = REQUEST_TYPES.find((t) => t.value === requestType) ?? REQUEST_TYPES[0];

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!equipment) throw new Error("Aucun équipement sélectionné");
      const serialPart = equipment.serial && equipment.serial !== "—" ? ` (S/N ${equipment.serial})` : "";
      const contextLines = [
        `Type de demande : ${selectedType.label}`,
        `Équipement : ${equipment.name}${serialPart}`,
        equipment.contractRef ? `Contrat : ${equipment.contractRef}` : null,
        "",
        description.trim(),
      ].filter((l): l is string => l !== null);

      const { error } = await supabase.from("support_tickets").insert({
        client_id: clientId,
        company_id: companyId,
        subject: `${selectedType.label} — ${equipment.name}${serialPart}`,
        category: selectedType.category,
        description: contextLines.join("\n"),
        status: "open",
        priority: selectedType.priority,
        created_by_client: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tickets"] });
      toast.success("Demande d'assistance envoyée", {
        description: "Notre équipe vous recontacte au plus vite. Suivez votre demande dans l'onglet Support.",
      });
      setDescription("");
      setRequestType("remote");
      onOpenChange(false);
    },
    onError: () => toast.error("Erreur lors de l'envoi de la demande"),
  });

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Headset style={{ width: 18, height: 18, color: clientColors.indigo }} />
            Demande d'assistance
          </DialogTitle>
          <DialogDescription asChild>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
              <Laptop style={{ width: 14, height: 14, color: clientColors.faint, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>
                {equipment.name}
                {equipment.serial && equipment.serial !== "—" ? ` · S/N ${equipment.serial}` : ""}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "6px 0 2px" }}>
          {REQUEST_TYPES.map((t) => {
            const Icon = t.icon;
            const active = requestType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setRequestType(t.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 13px",
                  borderRadius: 12,
                  border: `1.5px solid ${active ? clientColors.indigo : clientColors.borderSoft}`,
                  background: active ? "rgba(79,70,229,0.06)" : clientColors.surface,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon style={{ width: 17, height: 17, color: active ? clientColors.indigo : clientColors.faint, flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: clientColors.ink }}>{t.label}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: clientColors.muted, marginTop: 1 }}>{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted, display: "block", marginBottom: 6 }}>
            Décrivez votre besoin
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : l'écran reste noir au démarrage, besoin d'une intervention rapide…"
            rows={3}
            className="rounded-xl"
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => createTicket.mutate()}
            disabled={!description.trim() || createTicket.isPending}
            className="gap-2"
          >
            {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentAssistanceDialog;
