
import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { Contract } from "@/services/contractService";
import { 
  Building, ChevronDown, ChevronUp, Truck, Package, Calendar, Info, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import ContractStatusBadge from "./ContractStatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractCardProps {
  contract: Contract;
  onStatusChange: (contractId: string, newStatus: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const ContractCard: React.FC<ContractCardProps> = ({
  contract,
  onStatusChange,
  onAddTrackingInfo,
  isUpdatingStatus
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [carrier, setCarrier] = useState("bpost");
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleTrackingSubmit = async () => {
    if (trackingNumber) {
      await onAddTrackingInfo(contract.id, trackingNumber, estimatedDelivery, carrier);
      setTrackingDialogOpen(false);
      setTrackingNumber("");
      setEstimatedDelivery("");
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

  const openTrackingDialog = () => {
    setTrackingDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium line-clamp-1">{contract.client_name}</h3>
              {contract.clients?.company && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Building className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[140px]">{contract.clients.company}</span>
                </div>
              )}
            </div>
            
            <div className="ml-2">
              <ContractStatusBadge status={contract.status} />
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              {formatCurrency(contract.monthly_payment)}
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
            <div className="text-xs flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
              <img 
                src={contract.leaser_logo || '/placeholder.svg'} 
                alt={contract.leaser_name} 
                className="h-3 w-3 mr-1 object-contain"
              />
              {contract.leaser_name}
            </div>
          </div>
          
          {isExpanded && (
            <>
              {contract.tracking_number && (
                <div className="bg-blue-50 text-blue-800 rounded-md p-2 text-xs mb-2">
                  <div className="flex items-center mb-1">
                    <Truck className="h-3 w-3 mr-1" />
                    <span className="font-medium">Informations de livraison</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>Suivi :</div>
                    <div className="font-medium">{contract.tracking_number}</div>
                    
                    {contract.estimated_delivery && (
                      <>
                        <div>Livraison estimée :</div>
                        <div className="font-medium">{formatDate(contract.estimated_delivery)}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {contract.equipment_description && (
                <div className="bg-gray-50 text-gray-800 rounded-md p-2 text-xs">
                  <div className="flex items-center mb-1">
                    <Package className="h-3 w-3 mr-1" />
                    <span className="font-medium">Équipement</span>
                  </div>
                  <p className="line-clamp-2">{contract.equipment_description}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between p-2 pt-0">
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2"
              onClick={openTrackingDialog}
            >
              <Truck className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Suivi</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2"
              onClick={toggleExpand}
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Détails</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des informations de livraison</DialogTitle>
            <DialogDescription>
              Ajoutez un numéro de suivi et une date de livraison estimée pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Select
                value={carrier}
                onValueChange={setCarrier}
              >
                <SelectTrigger id="carrier">
                  <SelectValue placeholder="Sélectionner un transporteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bpost">bpost</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tracking">Numéro de suivi</Label>
              <Input
                id="tracking"
                placeholder="123456789ABCDEF"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Date de livraison estimée</Label>
              <Input
                id="delivery-date"
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleTrackingSubmit}
              disabled={!trackingNumber}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractCard;
