
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useClientContracts } from "@/hooks/useClientContracts";

const ClientContractsPage = () => {
  const { user } = useAuth();
  const { contracts, loading, error } = useClientContracts(user?.email);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatEquipmentDescription = (description?: string) => {
    if (!description) return 'Équipement non spécifié';
    
    try {
      const equipmentData = JSON.parse(description);
      if (Array.isArray(equipmentData) && equipmentData.length > 0) {
        const titles = equipmentData.map(item => item.title).filter(Boolean);
        if (titles.length > 0) {
          return titles.length > 1 
            ? `${titles[0]} et ${titles.length - 1} autre(s) équipement(s)`
            : titles[0];
        }
      }
    } catch {
      return description;
    }
    return description;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Actif</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      case 'contract_sent':
        return <Badge variant="outline" className="border-blue-300 text-blue-600">Contrat envoyé</Badge>;
      case 'equipment_ordered':
        return <Badge variant="outline" className="border-purple-300 text-purple-600">Équipement commandé</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-300 text-orange-600">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Erreur lors du chargement des contrats : {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes Contrats</h1>
        <p className="text-muted-foreground">
          Consultez et gérez vos contrats de financement
        </p>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-lg">
                      {formatEquipmentDescription(contract.equipment_description)} - Contrat
                    </CardTitle>
                    <CardDescription>
                      Créé le {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(contract.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensualité</p>
                  <p className="text-lg font-semibold">{formatAmount(contract.monthly_payment)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bailleur</p>
                  <p className="text-sm">{contract.leaser_name || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut livraison</p>
                  <p className="text-sm">{contract.delivery_status || 'En attente'}</p>
                </div>
                <div className="flex items-end space-x-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Voir
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
              {contract.tracking_number && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    Numéro de suivi : {contract.tracking_number}
                  </p>
                  {contract.delivery_carrier && (
                    <p className="text-sm text-blue-600">
                      Transporteur : {contract.delivery_carrier}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun contrat</h3>
            <p className="text-muted-foreground text-center">
              Vous n'avez pas encore de contrats de financement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientContractsPage;
