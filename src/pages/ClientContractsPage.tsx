import React, { useState, useEffect } from "react";
import { useClientContracts, ClientContract } from "@/hooks/useClientContracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Package,
  Building,
  Calendar,
  RefreshCw,
  Loader2,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ClientContractsPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { contracts, loading, error, refresh } = useClientContracts();

  const handleRefresh = () => {
    setActiveTab("all");
    refresh();
    // Give the impression that the refresh takes a bit of time
    setTimeout(() => {
      toast.success("Contrats actualisés");
    }, 800);
  };

  const filteredContracts = contracts?.filter((contract) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      contract.client_name.toLowerCase().includes(searchTerm) ||
      contract.id.toLowerCase().includes(searchTerm) ||
      (contract.equipment_description && contract.equipment_description.toLowerCase().includes(searchTerm))
    );
  });

  const getStatusBadge = (status) => {
    if (status === "Actif" || status === "active") {
      return <Badge className="bg-green-500">Actif</Badge>;
    } else if (status === "En attente de validation" || status === "pending") {
      return <Badge className="bg-yellow-500">En attente</Badge>;
    } else {
      return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-full p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vos Contrats
          </h1>
          <p className="text-muted-foreground">
            Gérez et suivez vos contrats iTakecare.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Rechercher un contrat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <FileText className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
          >
            Tous
          </Button>
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
          >
            Actifs
          </Button>
          <Button
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
          >
            En attente
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des contrats</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 bg-muted/30 rounded-lg">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                Erreur lors du chargement des contrats
              </p>
            </div>
          ) : filteredContracts && filteredContracts.length > 0 ? (
            <ScrollArea className="rounded-md border">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="[&_th]:px-4 [&_th]:py-2 [&_th]:text-left">
                    <tr>
                      <th>Contrat #</th>
                      <th>Date de création</th>
                      <th>Client</th>
                      <th>Paiement mensuel</th>
                      <th>Statut</th>
                      <th>Équipement</th>
                      <th>Transporteur</th>
                      <th>Livraison estimée</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:p-4 divide-y">
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id}>
                        <td>{contract.id.substring(0, 8)}</td>
                        <td>{format(new Date(contract.created_at), 'dd/MM/yyyy', { locale: fr })}</td>
                        <td>{contract.client_name}</td>
                        <td>{formatCurrency(contract.monthly_payment)}</td>
                        <td>{getStatusBadge(contract.status)}</td>
                        <td>
                          {contract.equipment_data && contract.equipment_data.length > 0 ? (
                            <ul>
                              {contract.equipment_data.map((item, index) => (
                                <li key={index}>{item.name}</li>
                              ))}
                            </ul>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          {contract.leaser_logo ? (
                            <img src={contract.leaser_logo} alt={contract.leaser_name} className="h-8" />
                          ) : (
                            <span className="text-sm text-muted-foreground">{contract.leaser_name || 'N/A'}</span>
                          )}
                        </td>
                        <td>
                          {contract.estimated_delivery ? 
                            format(new Date(contract.estimated_delivery), 'dd/MM/yyyy') : 
                            'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-10 bg-muted/30 rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                Aucun contrat trouvé
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientContractsPage;
