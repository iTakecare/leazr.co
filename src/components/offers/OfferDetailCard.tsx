
import React, { useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User, Mail, Building, CreditCard, Trash2, PenLine } from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";
import OfferWorkflow from "./OfferWorkflow";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface OfferDetailCardProps {
  offer: {
    id: string;
    client_name: string;
    client_id?: string;
    clients?: {
      name: string;
      email: string;
      company: string;
    } | null;
    amount: number;
    monthly_payment: number;
    commission: number;
    status: string;
    workflow_status?: string;
    created_at: string;
  };
  onStatusChange: (offerId: string, status: string, reason?: string) => Promise<void>;
  isUpdatingStatus: boolean;
  onDelete?: (id: string) => void;
}

const OfferDetailCard: React.FC<OfferDetailCardProps> = ({ 
  offer, 
  onStatusChange,
  isUpdatingStatus,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const navigate = useNavigate();
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddComment = () => {
    if (comment.trim()) {
      console.log("Commentaire ajouté:", comment);
      setComment("");
    }
  };

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    console.log(`Changing status for offer ${offer.id} to ${newStatus}`);
    await onStatusChange(offer.id, newStatus, reason);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const handleEditOffer = () => {
    navigate(`/create-offer?id=${offer.id}`);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{offer.client_name}</h3>
            {offer.workflow_status && (
              <div className="ml-2">
                <OfferStatusBadge status={offer.workflow_status} />
              </div>
            )}
          </div>
          
          {offer.clients?.company && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Building className="h-4 w-4 mr-1" />
              {offer.clients.company}
            </div>
          )}
          
          {offer.clients?.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="h-4 w-4 mr-1" />
              {offer.clients.email}
            </div>
          )}
          
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="bg-primary/10 text-primary py-1 px-3 rounded-full text-sm font-medium">
              {formatCurrency(offer.monthly_payment)}/mois
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Créée le {formatDate(offer.created_at)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleEditOffer}
            className="text-blue-500 hover:bg-blue-100 hover:text-blue-700"
            title="Éditer l'offre"
          >
            <PenLine className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(offer.id)}
              className="text-red-500 hover:bg-red-100 hover:text-red-700"
              title="Supprimer l'offre"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 pt-0 border-t">
          <OfferWorkflow 
            currentStatus={offer.workflow_status || "draft"} 
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingStatus}
            offerId={offer.id}
          />
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Ajouter un commentaire</h3>
            <div className="flex gap-2">
              <Textarea 
                placeholder="Votre commentaire..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <Button 
              size="sm" 
              onClick={handleAddComment} 
              className="mt-2"
              disabled={!comment.trim()}
            >
              Ajouter
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default OfferDetailCard;
