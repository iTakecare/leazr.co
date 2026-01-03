
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { 
  Building, Clock, PenLine, Trash2, Check, ExternalLink, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import OfferTypeTag from "./OfferTypeTag";
import { generateSignatureLink } from "@/services/offerService";
import ReminderIndicator from "./ReminderIndicator";
import SendReminderModal from "./SendReminderModal";
import { useOfferReminders, ReminderStatus } from "@/hooks/useOfferReminders";

interface OfferCardProps {
  offer: Offer;
  onDelete: () => void;
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
  sentReminders?: Array<{
    id: string;
    offer_id: string;
    reminder_type: string;
    reminder_level: number;
    sent_at: string | null;
    created_at: string;
  }>;
  onReminderSent?: () => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ 
  offer, 
  onDelete,
  onStatusChange,
  isUpdatingStatus,
  sentReminders,
  onReminderSent
}) => {
  const navigate = useNavigate();
  const [showReminderModal, setShowReminderModal] = useState(false);
  
  // Calculate reminder status
  const reminderStatus = useOfferReminders(offer, sentReminders);
  
  // Formatage de la date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };
  
  const handleEditOffer = () => {
    navigate(`/admin/create-offer?id=${offer.id}`);
  };
  
  const openOnlineOffer = () => {
    const link = generateSignatureLink(offer.id);
    const isAccessible = ['sent', 'approved', 'info_requested', 'valid_itc', 'leaser_review', 'financed'].includes(offer.workflow_status || '');
    
    if (isAccessible) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      // Naviguer vers la page pour montrer le message d'erreur approprié
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReminderClick = () => {
    if (reminderStatus) {
      setShowReminderModal(true);
    }
  };

  const handleReminderSuccess = () => {
    onReminderSent?.();
  };
  
  const isConverted = offer.converted_to_contract;

  return (
    <>
      <Card className={cn(
        "transition-all",
        isConverted ? "border-green-300 bg-green-50" : ""
      )}>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium line-clamp-1">{offer.client_name}</h3>
              {offer.clients?.company && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Building className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[140px]">{offer.clients.company}</span>
                </div>
              )}
              {offer.ambassador_id && (
                <div className="flex items-center text-xs text-purple-600">
                  <Users className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[140px]">Ambassadeur: {offer.ambassador_id}</span>
                </div>
              )}
            </div>
            
            <div className="ml-2 flex flex-col items-end gap-1">
              <OfferTypeTag 
                type={offer.type} 
                source={offer.source} 
                hasCustomPacks={offer.offer_custom_packs && offer.offer_custom_packs.length > 0}
                size="sm" 
              />
              {/* Reminder Indicator */}
              {reminderStatus && (
                <ReminderIndicator 
                  reminder={reminderStatus} 
                  onClick={handleReminderClick}
                  compact
                />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              {formatCurrency(offer.monthly_payment)}
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(offer.created_at)}
            </div>
          </div>
          
          {isConverted && (
            <div className="bg-green-100 text-green-800 rounded-md p-1.5 text-xs mb-2">
              <div className="flex items-center">
                <Check className="h-3 w-3 mr-1" />
                <span>Convertie en contrat</span>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between p-2 pt-0">
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              onClick={handleEditOffer}
            >
              <PenLine className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Éditer</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
              onClick={openOnlineOffer}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">En ligne</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Supprimer</span>
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Reminder Modal */}
      {reminderStatus && (
        <SendReminderModal
          open={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          offer={offer}
          reminder={reminderStatus}
          onSuccess={handleReminderSuccess}
        />
      )}
    </>
  );
};

export default OfferCard;
