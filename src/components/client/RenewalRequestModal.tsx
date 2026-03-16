import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface RenewalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    equipment_description?: string;
    contract_duration?: number;
    monthly_payment: number;
    client_name: string;
  };
  clientId: string;
  companyId: string;
}

function parseEquipment(desc?: string): Array<{ title: string; quantity: number }> {
  if (!desc) return [];
  try {
    const data = JSON.parse(desc);
    if (Array.isArray(data)) return data.map((d: any) => ({ title: d.title || "Équipement", quantity: d.quantity || 1 }));
  } catch {
    return [{ title: desc, quantity: 1 }];
  }
  return [];
}

const RenewalRequestModal = ({ open, onOpenChange, contract, clientId, companyId }: RenewalRequestModalProps) => {
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const equipment = parseEquipment(contract.equipment_description);

  const fetchSuggestions = async () => {
    setLoadingSuggestion(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/suggest-renewal-equipment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          equipment,
          contractDuration: contract.contract_duration || 36,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erreur");
      }

      const data = await resp.json();
      setSuggestion(data.suggestion);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la récupération des suggestions");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const equipmentDesc = equipment.length > 0
        ? JSON.stringify(equipment)
        : contract.equipment_description || "Renouvellement";

      const { error } = await supabase.from("offers").insert({
        client_name: contract.client_name,
        client_id: clientId,
        company_id: companyId,
        equipment_description: equipmentDesc,
        monthly_payment: contract.monthly_payment,
        amount: 0,
        status: "pending",
        type: "client_request",
        workflow_status: "draft",
        remarks: `Demande de renouvellement\n\nÉquipement actuel:\n${equipment.map(e => `- ${e.title} (x${e.quantity})`).join("\n")}\n\nMessage du client:\n${message}\n\n${suggestion ? `Suggestions IA:\n${suggestion}` : ""}`,
        renewal_source_contract_id: contract.id,
      });

      if (error) throw error;

      toast.success("Demande de renouvellement envoyée avec succès !");
      onOpenChange(false);
      setMessage("");
      setSuggestion("");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Renouveler mon matériel</DialogTitle>
          <DialogDescription>
            Faites une demande de renouvellement pour votre équipement actuel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current equipment */}
          <div>
            <Label className="text-sm font-medium">Équipement actuel</Label>
            <div className="mt-1.5 space-y-1.5">
              {equipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 text-sm">
                  <span className="font-medium">{eq.title}</span>
                  <span className="text-muted-foreground">x{eq.quantity}</span>
                </div>
              ))}
              {equipment.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun équipement détecté</p>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">Suggestions IA</Label>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-xl text-xs"
                onClick={fetchSuggestions}
                disabled={loadingSuggestion}
              >
                {loadingSuggestion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loadingSuggestion ? "Chargement..." : "Obtenir des suggestions"}
              </Button>
            </div>
            {suggestion && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{suggestion}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="renewal-message" className="text-sm font-medium">
              Votre message (optionnel)
            </Label>
            <Textarea
              id="renewal-message"
              placeholder="Précisez vos besoins, le type d'équipement souhaité..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 rounded-xl min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 rounded-xl">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenewalRequestModal;
