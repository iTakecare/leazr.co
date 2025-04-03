
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { 
  Building, Clock, PenLine, Trash2, User, CreditCard, Check, X, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import OfferStatusBadge from "./OfferStatusBadge";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { calculateFinancedAmount } from "@/utils/calculator";

interface OfferCardProps {
  offer: Offer;
  onDelete: () => void;
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ 
  offer, 
  onDelete,
  onStatusChange,
  isUpdatingStatus 
}) => {
  const navigate = useNavigate();
  const [financedAmount, setFinancedAmount] = useState<number>(0);
  
  useEffect(() => {
    if (offer && offer.monthly_payment && offer.coefficient) {
      const amount = calculateFinancedAmount(
        Number(offer.monthly_payment),
        Number(offer.coefficient)
      );
      setFinancedAmount(amount);
    }
  }, [offer]);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };
  
  const handleEditOffer = () => {
    navigate(`/create-offer?id=${offer.id}`);
  };
  
  const openOnlineOffer = () => {
    const link = generateSignatureLink(offer.id);
    window.open(link, '_blank', 'noopener,noreferrer');
  };
  
  const isConverted = offer.converted_to_contract;

  // Calculer le montant total correct si l'équipement est disponible
  const getTotalAmount = () => {
    try {
      if (offer.equipment_description) {
        let equipmentList;
        
        if (typeof offer.equipment_description === 'string') {
          equipmentList = JSON.parse(offer.equipment_description);
        } else if (typeof offer.equipment_description === 'object') {
          equipmentList = offer.equipment_description;
        }
        
        if (Array.isArray(equipmentList) && equipmentList.length > 0) {
          return equipmentList.reduce((total, item) => {
            const priceWithMargin = item.purchasePrice * (1 + (item.margin / 100));
            return total + (priceWithMargin * (item.quantity || 1));
          }, 0);
        }
      }
    } catch (e) {
      console.error("Erreur lors du calcul du montant total:", e);
    }
    
    return offer.amount;
  };

  return (
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
          </div>
          
          <div className="ml-2">
            {offer.type === 'client_request' ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                <User className="h-3 w-3 mr-1" />
                Demande
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                <Building className="h-3 w-3 mr-1" />
                Admin
              </Badge>
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
        
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center">
            <CreditCard className="h-3 w-3 mr-1" />
            <span>Montant total: {formatCurrency(getTotalAmount())}</span>
          </div>
        </div>
        
        {isConverted && (
          <div className="bg-green-100 text-green-800 rounded-md p-1.5 text-xs mt-2">
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
  );
};

export default OfferCard;
