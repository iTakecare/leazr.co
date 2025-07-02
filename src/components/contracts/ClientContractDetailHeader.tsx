import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, User, Package, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contract } from "@/services/contractService";
import { getEquipmentSummary } from "@/utils/clientEquipmentFormatter";
import ContractStatusBadge from "./ContractStatusBadge";

interface ClientContractDetailHeaderProps {
  contract: Contract;
}

const ClientContractDetailHeader: React.FC<ClientContractDetailHeaderProps> = ({ contract }) => {
  const navigate = useNavigate();
  const equipmentSummary = getEquipmentSummary(contract.equipment_description);

  return (
    <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/client/contracts')}
              className="hover:bg-background/80"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Mon Contrat de Financement
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Démarré le {formatDate(contract.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              Contrat Actif
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background/60 backdrop-blur rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Équipements</span>
            </div>
            <p className="font-semibold">{equipmentSummary.description}</p>
            <p className="text-sm text-muted-foreground">
              {equipmentSummary.count} {equipmentSummary.count === 1 ? 'unité' : 'unités'}
            </p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Mensualité</span>
            </div>
            <p className="font-semibold text-lg">{formatCurrency(contract.monthly_payment)}</p>
            <p className="text-sm text-muted-foreground">Financement en cours</p>
          </div>

          <div className="bg-background/60 backdrop-blur rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Bailleur</span>
            </div>
            <p className="font-semibold">{contract.leaser_name}</p>
            <p className="text-sm text-muted-foreground">Partenaire financier</p>
          </div>
        </div>

        {contract.tracking_number && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-blue-800">📦 Suivi de livraison</span>
            </div>
            <p className="font-semibold text-blue-900">{contract.tracking_number}</p>
            {contract.delivery_carrier && (
              <p className="text-sm text-blue-700">Transporteur: {contract.delivery_carrier}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientContractDetailHeader;