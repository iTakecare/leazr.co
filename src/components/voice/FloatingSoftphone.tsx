import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import { useVoice } from "@/context/VoiceContext";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connexion…",
  ringing: "Sonnerie…",
  in_call: "En communication",
};

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Softphone flottant, rendu une seule fois par le VoiceProvider → reste visible
 * sur TOUS les écrans pendant un appel. Permet de naviguer dans Leazr sans
 * raccrocher et affiche la dernière demande du client appelant.
 */
const FloatingSoftphone: React.FC = () => {
  const voice = useVoice();
  const navigate = useNavigate();
  const location = useLocation();
  const [muted, setMuted] = useState(false);
  const [dismissedIncoming, setDismissedIncoming] = useState(false);

  const sp = voice?.sp;
  const incoming = sp?.incoming ?? null;
  const status = sp?.status ?? "idle";
  const inCall = status === "connecting" || status === "ringing" || status === "in_call";

  // Réinitialise l'état "mute" local à chaque nouvel appel.
  useEffect(() => {
    if (!inCall) setMuted(false);
  }, [inCall]);

  useEffect(() => {
    if (incoming) setDismissedIncoming(false);
  }, [incoming]);

  if (!voice || !sp) return null;
  // Rien à afficher hors appel (le numéroteur complet reste dans /admin/phone).
  if (!incoming && !inCall) return null;

  const slug = location.pathname.match(/^\/([^/]+)\/admin/)?.[1] ?? "";
  const offer = voice.incomingOffer;
  const client = voice.incomingClient;
  const callerName = client?.name ?? incoming?.params?.clientName ?? incoming?.from ?? "Appel";

  const openOffer = () => {
    if (!offer) return;
    navigate(slug ? `/${slug}/admin/offers/${offer.id}` : `/offers/${offer.id}`);
  };

  const toggleMute = () => {
    if (!sp.toggleMute) return;
    setMuted(sp.toggleMute());
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)]">
      {/* APPEL ENTRANT (pas encore décroché) */}
      {incoming && !inCall && !dismissedIncoming && (
        <div className="rounded-xl border border-emerald-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white flex items-center gap-2">
            <PhoneIncoming className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-semibold">Appel entrant</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="font-semibold leading-tight truncate">{callerName}</p>
              {client?.company_name && (
                <p className="text-xs text-muted-foreground truncate">{client.company_name}</p>
              )}
              <p className="text-xs text-muted-foreground">{incoming.from}</p>
            </div>

            {offer ? (
              <button
                onClick={openOffer}
                className="w-full text-left rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Demande {offer.dossier_number || offer.offer_number || "—"}
                  </span>
                  {offer.workflow_status && <OfferStatusBadge status={offer.workflow_status} />}
                </div>
                {offer.monthly_payment ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {offer.monthly_payment.toLocaleString("fr-BE", { style: "currency", currency: "EUR" })}/mois
                  </p>
                ) : null}
              </button>
            ) : client ? (
              <p className="text-xs text-muted-foreground italic">Aucune demande trouvée pour ce client.</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Numéro non rattaché à un client.</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={() => sp.acceptIncoming()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              >
                <Phone className="h-4 w-4" /> Décrocher
              </Button>
              <Button variant="destructive" size="icon" onClick={() => sp.rejectIncoming()}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* APPEL EN COURS */}
      {inCall && (
        <div className="rounded-xl border bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2">
          <div
            className={cn(
              "px-4 py-3 text-white flex items-center justify-between gap-2",
              status === "in_call"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                : "bg-gradient-to-r from-amber-500 to-orange-600",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{callerName}</p>
                <p className="text-[11px] text-white/80">{STATUS_LABEL[status] ?? ""}</p>
              </div>
            </div>
            {status === "in_call" && (
              <span className="text-sm font-mono tabular-nums">{fmtDuration(sp.callDurationSec)}</span>
            )}
          </div>

          <div className="p-3 space-y-3">
            {offer && (
              <button
                onClick={openOffer}
                className="w-full text-left rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Ouvrir la demande {offer.dossier_number || offer.offer_number || ""}
                  </span>
                  {offer.workflow_status && <OfferStatusBadge status={offer.workflow_status} />}
                </div>
              </button>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant={muted ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={toggleMute}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {muted ? "Muet" : "Micro"}
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 gap-1.5" onClick={() => sp.hangup()}>
                <PhoneOff className="h-4 w-4" /> Raccrocher
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permet de masquer la bannière entrante sans refuser l'appel */}
      {incoming && !inCall && dismissedIncoming && (
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-2xl"
          onClick={() => setDismissedIncoming(false)}
        >
          <PhoneIncoming className="h-4 w-4 animate-pulse" /> Appel de {callerName}
        </Button>
      )}
    </div>
  );
};

export default FloatingSoftphone;
