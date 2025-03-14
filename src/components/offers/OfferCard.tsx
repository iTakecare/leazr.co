
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { 
  Building, Clock, PenLine, Trash2, User, CreditCard, Check, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import OfferStatusBadge from "./OfferStatusBadge";

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
  
  const isConverted = offer.converted_to_contract;

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
