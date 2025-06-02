
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientContractsPage = () => {
  // Mock data for demonstration
  const contracts = [
    {
      id: "1",
      title: "MacBook Pro M3 - Financement",
      status: "active",
      signedDate: "2024-01-15",
      amount: "2,499€",
      monthlyPayment: "104€",
      duration: "24 mois"
    },
    {
      id: "2", 
      title: "Dell XPS 13 - Leasing",
      status: "completed",
      signedDate: "2023-06-10",
      amount: "1,299€",
      monthlyPayment: "54€",
      duration: "24 mois"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Actif</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-300 text-orange-600">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
                    <CardTitle className="text-lg">{contract.title}</CardTitle>
                    <CardDescription>
                      Signé le {new Date(contract.signedDate).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(contract.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Montant Total</p>
                  <p className="text-lg font-semibold">{contract.amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensualité</p>
                  <p className="text-lg font-semibold">{contract.monthlyPayment}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Durée</p>
                  <p className="text-lg font-semibold">{contract.duration}</p>
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
