import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Building, Clock, User, Mail, Calendar, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Offer } from "@/hooks/offers/useFetchOffers";
import MobileSwipeCard, {
  createCallAction,
  createEmailAction,
  createDeleteAction,
  createMarkDoneAction,
  SwipeAction,
} from "../MobileSwipeCard";
import OfferTypeTag from "@/components/offers/OfferTypeTag";
import { cn } from "@/lib/utils";

interface MobileOfferCardProps {
  offer: Offer;
  onCall?: (phone: string) => void;
  onEmail?: (email: string) => void;
  onDelete?: () => void;
  onMarkDone?: () => void;
  onClick?: () => void;
}

const MobileOfferCard: React.FC<MobileOfferCardProps> = ({
  offer,
  onCall,
  onEmail,
  onDelete,
  onMarkDone,
  onClick,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };

  // Build swipe actions
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  const clientPhone = (offer.clients as any)?.phone;
  const clientEmail = offer.clients?.email || offer.client_email;

  if (clientPhone) {
    leftActions.push(
      createCallAction(clientPhone, "Appeler")
    );
  }

  if (clientEmail) {
    leftActions.push(
      createEmailAction(clientEmail, "Email")
    );
  }

  if (onMarkDone) {
    rightActions.push(
      createMarkDoneAction(onMarkDone, "Traité")
    );
  }

  if (onDelete) {
    rightActions.push(
      createDeleteAction(onDelete, "Supprimer")
    );
  }

  const isConverted = offer.converted_to_contract;

  return (
    <MobileSwipeCard
      leftActions={leftActions}
      rightActions={rightActions}
      className="mb-3"
    >
      <div 
        onClick={onClick}
        className={cn(
          "p-4",
          isConverted && "bg-primary/5"
        )}
      >
        {/* Header: Reference & Type */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono">
              #{offer.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <OfferTypeTag 
            type={offer.type} 
            source={offer.source} 
            hasCustomPacks={offer.offer_custom_packs && offer.offer_custom_packs.length > 0}
            size="sm" 
          />
        </div>

        {/* Client Info */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{offer.client_name}</span>
          </div>
          
          {offer.clients?.company && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {offer.clients.company}
              </span>
            </div>
          )}
          
          {clientEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {clientEmail}
              </span>
            </div>
          )}
        </div>

        {/* Financial Info */}
        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Montant</span>
          </div>
          <span className="font-semibold text-sm">
            {formatCurrency(offer.amount || 0)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {offer.duration || 36} mois
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-primary">
              {formatCurrency(offer.monthly_payment || 0)}/mois
            </span>
          </div>
        </div>

        {/* Footer: Date & Status */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(offer.created_at)}</span>
          </div>
          
          {isConverted && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Convertie
            </span>
          )}
        </div>
      </div>
    </MobileSwipeCard>
  );
};

export default MobileOfferCard;
