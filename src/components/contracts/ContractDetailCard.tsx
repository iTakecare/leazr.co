
import React, { useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User, Mail, Building, Package, Truck, Calendar } from "lucide-react";
import ContractStatusBadge from "./ContractStatusBadge";
import ContractWorkflow from "./ContractWorkflow";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractDetailCardProps {
  contract: {
    id: string;
    client_name: string;
    client_id?: string;
    clients?: {
      name: string;
      email: string;
      company: string;
    } | null;
    monthly_payment: number;
    status: string;
    leaser_name: string;
    leaser_logo?: string;
    created_at: string;
    tracking_number?: string;
    estimated_delivery?: string;
    delivery_status?: string;
    equipment_description?: string;
  };
  onStatusChange: (contractId: string, status: string, reason?: string) => Promise<void>;
  onAddTrackingInfo?: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const ContractDetailCard: React.FC<ContractDetailCardProps> = ({ 
  contract, 
  onStatusChange,
  onAddTrackingInfo,
  isUpdatingStatus
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    await onStatusChange(contract.id, newStatus, reason);
  };

  const handleAddTrackingInfo = async (trackingNumber: string, estimatedDelivery?: string, carrier?: string) => {
    if (onAddTrackingInfo) {
      await onAddTrackingInfo(contract.id, trackingNumber, estimatedDelivery, carrier);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{contract.client_name}</h3>
            <div className="ml-2">
              <ContractStatusBadge status={contract.status} />
            </div>
          </div>
          
          {contract.clients?.company && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Building className="h-4 w-4 mr-1" />
              {contract.clients.company}
            </div>
          )}
          
          {contract.clients?.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="h-4 w-4 mr-1" />
              {contract.clients.email}
            </div>
          )}
          
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="bg-primary/10 text-primary py-1 px-3 rounded-full text-sm font-medium">
              {formatCurrency(contract.monthly_payment)}/mois
            </div>
            <div className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-medium flex items-center">
              <img 
                src={contract.leaser_logo || '/placeholder.svg'} 
                alt={contract.leaser_name} 
                className="h-4 w-4 mr-1 object-contain"
              />
              {contract.leaser_name}
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
          {contract.equipment_description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Équipements</h4>
              <div className="bg-muted p-3 rounded-md flex items-start">
                <Package className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                <p className="text-sm">{contract.equipment_description}</p>
              </div>
            </div>
          )}
          
          {contract.tracking_number && (
            <div className="mb-6 bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Truck className="h-4 w-4 mr-1" />
                Suivi de livraison
              </h4>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Numéro de suivi:</span>
                  <span className="text-xs font-medium">{contract.tracking_number}</span>
                </div>
                
                {contract.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Livraison estimée:</span>
                    <span className="text-xs font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(contract.estimated_delivery)}
                    </span>
                  </div>
                )}
                
                {contract.delivery_status && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Statut:</span>
                    <span className="text-xs font-medium">
                      {contract.delivery_status === 'en_attente' ? 'En attente' : contract.delivery_status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <ContractWorkflow 
            currentStatus={contract.status} 
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingStatus}
            contractId={contract.id}
            onAddTrackingInfo={handleAddTrackingInfo}
          />
        </CardContent>
      )}
    </Card>
  );
};

export default ContractDetailCard;
