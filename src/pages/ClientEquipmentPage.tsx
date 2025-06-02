
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Monitor, Laptop, Smartphone } from "lucide-react";

const ClientEquipmentPage = () => {
  // Mock data for demonstration
  const equipment = [
    {
      id: "1",
      name: "MacBook Pro M3 16'",
      category: "laptop",
      status: "active",
      monthlyPayment: "104€",
      remainingMonths: 18,
      totalMonths: 24,
      acquiredDate: "2024-01-15"
    },
    {
      id: "2",
      name: "Dell Monitor 27'",
      category: "monitor", 
      status: "active",
      monthlyPayment: "35€",
      remainingMonths: 12,
      totalMonths: 24,
      acquiredDate: "2023-06-10"
    },
    {
      id: "3",
      name: "iPhone 15 Pro",
      category: "smartphone",
      status: "completed",
      monthlyPayment: "45€",
      remainingMonths: 0,
      totalMonths: 24,
      acquiredDate: "2022-09-15"
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'laptop':
        return <Laptop className="h-5 w-5 text-blue-500" />;
      case 'monitor':
        return <Monitor className="h-5 w-5 text-green-500" />;
      case 'smartphone':
        return <Smartphone className="h-5 w-5 text-purple-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">En cours</Badge>;
      case 'completed':
        return <Badge variant="secondary">Terminé</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-300 text-orange-600">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgressPercentage = (remaining: number, total: number) => {
    return ((total - remaining) / total) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon Équipement</h1>
        <p className="text-muted-foreground">
          Consultez vos équipements en cours de financement
        </p>
      </div>

      <div className="grid gap-4">
        {equipment.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(item.category)}
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>
                      Acquis le {new Date(item.acquiredDate).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensualité</p>
                  <p className="text-lg font-semibold">{item.monthlyPayment}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paiements restants</p>
                  <p className="text-lg font-semibold">{item.remainingMonths} / {item.totalMonths}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progression</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(item.remainingMonths, item.totalMonths)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(getProgressPercentage(item.remainingMonths, item.totalMonths))}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {equipment.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun équipement</h3>
            <p className="text-muted-foreground text-center">
              Vous n'avez pas encore d'équipements en cours de financement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientEquipmentPage;
