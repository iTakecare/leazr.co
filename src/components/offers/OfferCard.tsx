import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { 
  Building, Clock, PenLine, Trash2, User, CreditCard, Check, X, ExternalLink, Users, Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import OfferStatusBadge from "./OfferStatusBadge";
import { generateSignatureLink } from "@/services/offerService";

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
  
  // Formatage de la date
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

  // Calcul de la marge
  const calculateMargin = () => {
    // Si la marge est déjà stockée dans l'offre
    if (offer.margin !== undefined) {
      return offer.margin;
    }
    
    // Si nous avons les montants nécessaires pour calculer
    if (offer.financed_amount !== undefined && offer.amount) {
      const margin = offer.financed_amount - offer.amount;
      return margin > 0 ? margin : 0;
    }
    
    // Si on a le montant mensuel et le coef, on peut estimer
    if (offer.monthly_payment && offer.coefficient !== undefined) {
      const financedAmount = offer.monthly_payment * (offer.coefficient || 36);
      const margin = financedAmount - (offer.amount || 0);
      return margin > 0 ? margin : 0;
    }
    
    return 0; // Valeur par défaut
  };

  const getOfferTypeBadge = () => {
    switch(offer.type) {
      case 'ambassador_offer':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
            <Users className="h-3 w-3 mr-1" />
            Ambassadeur
          </Badge>
        );
      case 'partner_offer':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
            <Building className="h-3 w-3 mr-1" />
            Partenaire
          </Badge>
        );
      case 'client_request':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
            <User className="h-3 w-3 mr-1" />
            Demande client
          </Badge>
        );
      case 'internal_offer':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
            <Factory className="h-3 w-3 mr-1" />
            Interne
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs">
            <Building className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
    }
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
            {offer.ambassador_name && (
              <div className="flex items-center text-xs text-purple-600">
                <Users className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[140px]">{offer.ambassador_name}</span>
              </div>
            )}
          </div>
          
          <div className="ml-2">
            {getOfferTypeBadge()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
          <div className="text-sm font-medium">
            {formatCurrency(offer.monthly_payment)}
            <span className="text-xs text-muted-foreground">/mois</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-end">
            <Clock className="h-3 w-3 mr-1" />
            {formatDate(offer.created_at)}
          </div>
          <div className="text-xs text-green-600 font-medium">
            Marge: {formatCurrency(calculateMargin())}
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
  );
};

export default OfferCard;
