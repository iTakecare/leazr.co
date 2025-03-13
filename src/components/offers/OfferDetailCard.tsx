
import React, { useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User, Mail, Building, CreditCard } from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";
import OfferWorkflow from "./OfferWorkflow";
import { Textarea } from "@/components/ui/textarea";

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
}

const OfferDetailCard: React.FC<OfferDetailCardProps> = ({ 
  offer, 
  onStatusChange,
  isUpdatingStatus
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comment, setComment] = useState("");
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddComment = () => {
    if (comment.trim()) {
      // Ici, on pourrait ajouter le commentaire
      console.log("Commentaire ajouté:", comment);
      setComment("");
    }
  };

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    await onStatusChange(offer.id, newStatus, reason);
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
            <div className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-medium">
              Commission: {formatCurrency(offer.commission)}
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleExpand}
          className="ml-2"
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 pt-0 border-t">
          <OfferWorkflow 
            currentStatus={offer.workflow_status || "draft"} 
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingStatus}
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
