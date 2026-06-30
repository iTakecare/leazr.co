import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, RefreshCw, Loader2, PackageX, Mail, Send } from "lucide-react";
import { swapContractEquipment } from "@/services/stockService";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";

interface SwapEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  offerId?: string | null;
  equipment: {
    id: string;
    title: string;
    serial_number?: string | null;
    purchase_price?: number | null;
    actual_purchase_price?: number | null;
  };
  onDone?: () => void;
}

interface ContractInfo {
  contract_number: string | null;
  client_name: string | null;
  monthly_payment: number | null;
  leaser_name: string | null;
  leaser_email: string | null;
}

const SwapEquipmentDialog: React.FC<SwapEquipmentDialogProps> = ({
  open,
  onOpenChange,
  contractId,
  offerId,
  equipment,
  onDone,
}) => {
  const { companyId } = useMultiTenant();
  const { user } = useAuth();

  const oldPrice = Number(equipment.actual_purchase_price ?? equipment.purchase_price ?? 0);

  const [newTitle, setNewTitle] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [swapDone, setSwapDone] = useState(false);

  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const newPriceNum = parseFloat(newPrice.replace(",", ".")) || 0;
  const delta = newPriceNum - oldPrice;

  // Charge le contexte contrat + bailleur (destinataire + infos du mail).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contracts")
        .select("contract_number, client_name, monthly_payment, leasers(name, email)")
        .eq("id", contractId)
        .maybeSingle();
      if (cancelled || !data) return;
      const leaser = (data as any).leasers as { name?: string; email?: string } | null;
      const info: ContractInfo = {
        contract_number: (data as any).contract_number ?? null,
        client_name: (data as any).client_name ?? null,
        monthly_payment: (data as any).monthly_payment ?? null,
        leaser_name: leaser?.name ?? null,
        leaser_email: leaser?.email ?? null,
      };
      setContract(info);
      setEmailTo(info.leaser_email ?? "");
    })();
    return () => { cancelled = true; };
  }, [open, contractId]);

  const emailSubject = useMemo(
    () => `Swap d'appareil — Contrat ${contract?.contract_number || ""} (${contract?.client_name || ""})`.trim(),
    [contract],
  );

  // Corps du mail régénéré tant que l'utilisateur ne l'a pas édité à la main.
  const generatedBody = useMemo(() => {
    const today = new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" });
    const lines = [
      "Bonjour,",
      "",
      `Dans le cadre du contrat ${contract?.contract_number || "—"} (${contract?.client_name || "—"}), un appareil défectueux a été remplacé :`,
      "",
      `• Appareil retiré : ${equipment.title}${equipment.serial_number ? ` (S/N ${equipment.serial_number})` : ""}`,
      `• Nouvel appareil : ${newTitle || "—"}${newSerial ? ` (S/N ${newSerial})` : ""}`,
      `• Date du swap : ${today}`,
    ];
    if (reason.trim()) lines.push(`• Motif : ${reason.trim()}`);
    if (contract?.monthly_payment) lines.push(`• Mensualité du contrat : ${formatCurrency(contract.monthly_payment)} (inchangée)`);
    lines.push(
      "",
      "La mensualité et les conditions du contrat restent inchangées. Merci de bien vouloir mettre à jour votre base de données en conséquence.",
      "",
      "Bien cordialement,",
      "iTakecare",
    );
    return lines.join("\n");
  }, [contract, equipment, newTitle, newSerial, reason]);

  useEffect(() => {
    if (!emailEdited) setEmailBody(generatedBody);
  }, [generatedBody, emailEdited]);

  const reset = () => {
    setNewTitle(""); setNewSerial(""); setNewPrice(""); setReason("");
    setSwapDone(false); setEmailSent(false); setEmailEdited(false);
  };

  const handleSubmit = async () => {
    if (!companyId || !user?.id) return;
    if (!newTitle.trim()) { toast.error("Indiquez le nouvel appareil"); return; }
    setSaving(true);
    try {
      await swapContractEquipment({
        companyId,
        contractId,
        contractEquipmentId: equipment.id,
        offerId: offerId ?? null,
        oldTitle: equipment.title,
        oldSerialNumber: equipment.serial_number ?? null,
        oldPurchasePrice: oldPrice,
        newTitle: newTitle.trim(),
        newSerialNumber: newSerial.trim() || null,
        newPurchasePrice: newPriceNum,
        reason: reason.trim(),
        userId: user.id,
      });
      toast.success("Appareil remplacé. Ancien appareil envoyé dans le stock (onglet Swap).");
      setSwapDone(true);
      onDone?.();
    } catch (e) {
      console.error("[SwapEquipmentDialog] swap error:", e);
      toast.error("Erreur lors du swap de l'appareil");
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error("Aucun e-mail bailleur"); return; }
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: { to: emailTo.trim(), subject: emailSubject, text: emailBody },
      });
      if (error) throw error;
      toast.success("E-mail envoyé au bailleur");
      setEmailSent(true);
    } catch (e) {
      console.error("[SwapEquipmentDialog] email error:", e);
      toast.error("Échec de l'envoi de l'e-mail au bailleur");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            Swap d'appareil
          </DialogTitle>
          <DialogDescription>
            Remplace l'appareil défectueux sur le contrat. L'ancien repart dans le stock (onglet Swap),
            la marge est recalculée (mensualité inchangée), et tu peux prévenir le bailleur.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">
          {/* ── Colonne gauche : le swap ── */}
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                <PackageX className="h-3.5 w-3.5" /> Appareil retiré (→ stock)
              </div>
              <p className="font-medium text-sm">{equipment.title}</p>
              <p className="text-xs text-muted-foreground">
                {equipment.serial_number ? `S/N : ${equipment.serial_number} · ` : ""}
                Prix d'achat : {formatCurrency(oldPrice)}
              </p>
            </div>

            <div className="flex justify-center -my-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
            </div>

            <div>
              <Label htmlFor="swap-title">Nouvel appareil *</Label>
              <Input id="swap-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="ex. iPhone 16 Pro Max" disabled={swapDone} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="swap-serial">Numéro de série</Label>
                <Input id="swap-serial" value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="S/N" disabled={swapDone} />
              </div>
              <div>
                <Label htmlFor="swap-price">Prix d'achat (HTVA)</Label>
                <Input id="swap-price" type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={oldPrice ? String(oldPrice) : "0.00"} disabled={swapDone} />
              </div>
            </div>
            {newPrice !== "" && (
              <p className="text-xs">
                Écart de coût :{" "}
                <span className={delta > 0 ? "text-red-600 font-medium" : delta < 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {delta > 0 ? "+" : ""}{formatCurrency(delta)}
                </span>{" "}
                <span className="text-muted-foreground">({delta > 0 ? "marge en baisse" : delta < 0 ? "marge en hausse" : "marge inchangée"})</span>
              </p>
            )}
            <div>
              <Label htmlFor="swap-reason">Raison du swap</Label>
              <Textarea id="swap-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. écran défectueux, retour SAV…" rows={2} disabled={swapDone} />
            </div>
            <Button onClick={handleSubmit} disabled={saving || swapDone || !newTitle.trim()} className="w-full gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {swapDone ? "Swap effectué ✓" : "Effectuer le swap"}
            </Button>
          </div>

          {/* ── Colonne droite : mail au bailleur ── */}
          <div className="space-y-2 md:border-l md:pl-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" /> Informer le bailleur
            </div>
            <p className="text-xs text-muted-foreground">
              {contract?.leaser_name ? `Bailleur : ${contract.leaser_name}. ` : ""}
              Le bailleur met à jour sa base avec le nouvel appareil.
            </p>
            <div>
              <Label htmlFor="mail-to" className="text-xs">Destinataire</Label>
              <Input id="mail-to" type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@bailleur.com" />
            </div>
            <div>
              <Label className="text-xs">Objet</Label>
              <Input value={emailSubject} readOnly className="bg-muted/50 text-muted-foreground" />
            </div>
            <div>
              <Label htmlFor="mail-body" className="text-xs">Message</Label>
              <Textarea
                id="mail-body"
                value={emailBody}
                onChange={(e) => { setEmailBody(e.target.value); setEmailEdited(true); }}
                rows={11}
                className="text-xs font-mono"
              />
            </div>
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailTo.trim() || emailSent}
            >
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {emailSent ? "E-mail envoyé ✓" : "Envoyer au bailleur"}
            </Button>
            {!contract?.leaser_email && (
              <p className="text-[11px] text-amber-600">Aucun e-mail bailleur enregistré — saisis-le ci-dessus.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {swapDone ? "Fermer" : "Annuler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapEquipmentDialog;
