import React, { createContext, useContext, useEffect, useState } from "react";
import { useSoftphone, type UseSoftphoneResult } from "@/hooks/useSoftphone";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { supabase } from "@/integrations/supabase/client";

export interface IncomingClient {
  id: string;
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface IncomingOffer {
  id: string;
  dossier_number: string | null;
  offer_number: string | null;
  workflow_status: string | null;
  monthly_payment: number | null;
  created_at: string | null;
}

interface VoiceContextValue {
  /** L'API softphone Twilio (partagée globalement — un seul Device). */
  sp: UseSoftphoneResult;
  /** Client identifié sur l'appel entrant en cours (via clientId du TwiML). */
  incomingClient: IncomingClient | null;
  /** Dernière demande/offre du client appelant. */
  incomingOffer: IncomingOffer | null;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * Provider GLOBAL du softphone : monté au-dessus des routes (App.tsx), il ne se
 * démonte JAMAIS à la navigation. C'est ce qui permet de naviguer dans Leazr
 * sans raccrocher l'appel (le Device Twilio survit aux changements d'écran).
 * Gère aussi la présence « en ligne » et le rapatriement du contexte appelant.
 */
export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const { companyId } = useMultiTenant();

  // Actif dès qu'un admin est connecté (les sociétés sans Twilio Voice
  // configuré échouent silencieusement côté token → aucun device, aucun impact).
  const enabled = !!user?.id && isAdmin() && !!companyId;

  const sp = useSoftphone(enabled, { receiveIncoming: true });

  const [incomingClient, setIncomingClient] = useState<IncomingClient | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);

  // PRÉSENCE : tant que le softphone est actif, l'agent est « en ligne » pour
  // recevoir les appels, sur toutes les pages (pas seulement le Centre d'appels).
  useEffect(() => {
    if (!enabled || !user?.id || !companyId || !sp.identity) return;
    const upsert = async () => {
      await supabase.from("voice_presence").upsert(
        {
          user_id: user.id,
          company_id: companyId,
          identity: sp.identity,
          online: true,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };
    upsert();
    const interval = setInterval(upsert, 30000);
    return () => {
      clearInterval(interval);
      supabase
        .from("voice_presence")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    };
  }, [enabled, user?.id, companyId, sp.identity]);

  // Appel entrant : rapatrier le client + sa DERNIÈRE demande pour les afficher
  // dans le widget flottant, où que l'on soit dans l'application.
  useEffect(() => {
    let cancelled = false;
    const clientId = sp.incoming?.params?.clientId;
    if (!sp.incoming || !clientId) {
      setIncomingClient(null);
      setIncomingOffer(null);
      return;
    }
    (async () => {
      const [{ data: client }, { data: offers }] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, company_name, email, phone")
          .eq("id", clientId)
          .maybeSingle(),
        supabase
          .from("offers")
          .select("id, dossier_number, offer_number, workflow_status, monthly_payment, created_at")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setIncomingClient((client as IncomingClient) ?? null);
      setIncomingOffer(((offers as IncomingOffer[])?.[0]) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [sp.incoming]);

  return (
    <VoiceContext.Provider value={{ sp, incomingClient, incomingOffer }}>
      {children}
    </VoiceContext.Provider>
  );
};

/**
 * Accès au softphone global. Renvoie null si appelé hors VoiceProvider
 * (ex. pages publiques) — les appelants doivent gérer ce cas.
 */
export const useVoice = (): VoiceContextValue | null => useContext(VoiceContext);
