import React, { useState } from "react";
import { Phone, Voicemail, PhoneMissed, PhoneCall, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createCallLog } from "@/services/callLogService";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface CallLogButtonProps {
  offerId: string;
  onCallLogged?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}

const CALLBACK_OPTIONS = [
  { label: "Demain", days: 1 },
  { label: "2 jours", days: 2 },
  { label: "3 jours", days: 3 },
  { label: "1 semaine", days: 7 },
  { label: "2 semaines", days: 14 },
];

const STATUS_OPTIONS = [
  { value: 'voicemail' as const, label: 'Messagerie vocale', icon: Voicemail, color: 'amber' },
  { value: 'no_answer' as const, label: 'Pas de réponse', icon: PhoneMissed, color: 'red' },
  { value: 'reached' as const, label: 'Client joint', icon: PhoneCall, color: 'green' },
];

export const CallLogButton: React.FC<CallLogButtonProps> = ({
  offerId,
  onCallLogged,
  variant = "outline",
  size = "sm",
  className,
}) => {
  const { companyId } = useMultiTenant();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'voicemail' | 'no_answer' | 'reached'>('voicemail');
  const [callbackDays, setCallbackDays] = useState<number | null>(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Impossible de déterminer l'entreprise");
      return;
    }

    setSaving(true);
    try {
      let callbackDate: string | null = null;
      if (status !== 'reached' && callbackDays !== null) {
        callbackDate = format(addDays(new Date(), callbackDays), 'yyyy-MM-dd');
      }

      const result = await createCallLog({
        offer_id: offerId,
        company_id: companyId,
        status,
        callback_date: callbackDate,
        notes: notes.trim() || undefined,
      });

      if (result) {
        toast.success(
          status === 'reached'
            ? "Appel enregistré — Client joint"
            : `Rappel programmé ${callbackDays === 1 ? 'pour demain' : `dans ${callbackDays} jours`}`
        );
        setOpen(false);
        setNotes("");
        setStatus('voicemail');
        setCallbackDays(1);
        onCallLogged?.();
      } else {
        toast.error("Erreur lors de l'enregistrement de l'appel");
      }
    } catch (error) {
      console.error("Error saving call log:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={
          className ??
          "w-full justify-start text-sm h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200"
        }
        onClick={() => setOpen(true)}
      >
        <Phone className="w-4 h-4 mr-2" />
        <span>Appel client</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-sky-600" />
              Enregistrer un appel client
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Résultat de l'appel */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Résultat de l'appel</Label>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatus(opt.value);
                        if (opt.value === 'reached') setCallbackDays(null);
                        else setCallbackDays(1);
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs font-medium ${
                        isSelected
                          ? opt.color === 'amber'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : opt.color === 'red'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-center leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rappeler dans X jours — seulement si pas joint */}
            {status !== 'reached' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  Rappeler dans
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CALLBACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setCallbackDays(opt.days)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        callbackDays === opt.days
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {callbackDays !== null && (
                  <p className="text-xs text-muted-foreground">
                    📅 Rappel prévu le{" "}
                    <strong>
                      {format(addDays(new Date(), callbackDays), 'EEEE dd MMMM', { locale: fr })}
                    </strong>
                  </p>
                )}
              </div>
            )}

            {/* Notes optionnelles */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Note (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Message laissé en messagerie, informations collectées..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CallLogButton;
