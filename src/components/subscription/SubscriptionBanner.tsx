import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

/**
 * Bandeau de fin d'essai (blocage doux).
 * - Essai en cours : rappel discret du nombre de jours restants.
 * - Essai expiré sans abonnement : bandeau bloquant avec CTA d'upgrade.
 *
 * Le passage effectif en lecture seule s'appuie sur `isReadOnly`
 * (useSubscriptionStatus) au niveau des écrans/mutations.
 */
const SubscriptionBanner: React.FC = () => {
  const navigate = useNavigate();
  const { loading, isExpired, isTrial, trialDaysLeft } = useSubscriptionStatus();

  if (loading) return null;

  if (isExpired) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Votre période d'essai est terminée. Votre compte est en{" "}
            <strong>lecture seule</strong> — choisissez un plan pour réactiver l'écriture.
          </span>
        </div>
        <Button size="sm" variant="destructive" onClick={() => navigate("/settings/subscription")}>
          Choisir un plan
        </Button>
      </div>
    );
  }

  if (isTrial && trialDaysLeft <= 7) {
    return (
      <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {trialDaysLeft > 0
              ? `Votre essai se termine dans ${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""}.`
              : "Votre essai se termine aujourd'hui."}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/settings/subscription")}>
          S'abonner
        </Button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
