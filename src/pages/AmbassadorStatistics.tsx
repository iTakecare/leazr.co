
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  FileText, 
  FileSpreadsheet, 
  Download,
  RefreshCw
} from "lucide-react";
import { getAmbassadorClients } from "@/services/ambassadorClientService";
import { getAmbassadorCommissions, calculateTotalAmbassadorCommissions } from "@/services/ambassadorCommissionService";
import { Client } from "@/types/client";
import { AmbassadorCommission } from "@/services/ambassadorCommissionService";
import ExportClientsTable from "@/components/statistics/ExportClientsTable";
import ExportCommissionsTable from "@/components/statistics/ExportCommissionsTable";
import { generatePDF, generateExcel } from "@/utils/exportUtils";

const AmbassadorStatistics = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [commissions, setCommissions] = useState<AmbassadorCommission[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, paid: 0, total: 0 });

  useEffect(() => {
    if (user?.ambassador_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.ambassador_id) return;

    try {
      setIsLoadingClients(true);
      setIsLoadingCommissions(true);

      // Charger les clients
      const clientsData = await getAmbassadorClients(user.ambassador_id);
      setClients(clientsData);

      // Charger les commissions
      const commissionsData = await getAmbassadorCommissions(user.ambassador_id);
      setCommissions(commissionsData);

      // Calculer les totaux
      const totalsData = await calculateTotalAmbassadorCommissions(user.ambassador_id);
      setTotals(totalsData);
    } catch (error) {
      console.error("Erreur lors du chargement des données", error);
      toast.error("Impossible de charger les données");
    } finally {
      setIsLoadingClients(false);
      setIsLoadingCommissions(false);
    }
  };

  const handleExportClientsPDF = async () => {
    try {
      const title = "Liste des clients";
      const headers = ["Nom", "Email", "Entreprise", "Téléphone"];
      const data = clients.map(client => [
        client.name,
        client.email || "-",
        client.company || "-",
        client.phone || "-"
      ]);

      await generatePDF(title, headers, data);
      toast.success("Export PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF", error);
      toast.error("Échec de l'export PDF");
    }
  };

  const handleExportClientsExcel = async () => {
    try {
      const headers = ["Nom", "Email", "Entreprise", "Téléphone"];
      const data = clients.map(client => [
        client.name,
        client.email || "",
        client.company || "",
        client.phone || ""
      ]);

      await generateExcel("Clients", headers, data, "clients_export.xlsx");
      toast.success("Export Excel généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du fichier Excel", error);
      toast.error("Échec de l'export Excel");
    }
  };

  const handleExportCommissionsPDF = async () => {
    try {
      const title = "Liste des commissions";
      const headers = ["Date", "Client", "Description", "Montant", "Statut"];
      const data = commissions.map(commission => [
        new Date(commission.date).toLocaleDateString(),
        commission.clientName,
        commission.description || "-",
        `${commission.amount.toFixed(2)} €`,
        commission.status
      ]);

      await generatePDF(title, headers, data);
      toast.success("Export PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF", error);
      toast.error("Échec de l'export PDF");
    }
  };

  const handleExportCommissionsExcel = async () => {
    try {
      const headers = ["Date", "Client", "Description", "Montant", "Statut"];
      const data = commissions.map(commission => [
        new Date(commission.date).toLocaleDateString(),
        commission.clientName,
        commission.description || "",
        commission.amount,
        commission.status
      ]);

      await generateExcel("Commissions", headers, data, "commissions_export.xlsx");
      toast.success("Export Excel généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du fichier Excel", error);
      toast.error("Échec de l'export Excel");
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-8 px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <LineChart className="h-8 w-8 text-primary" />
                Statistiques
              </h1>
              <p className="text-muted-foreground mt-1">
                Consultez et exportez vos statistiques en tant qu'ambassadeur
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 md:mt-0"
              onClick={loadData}
              disabled={isLoadingClients || isLoadingCommissions}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${(isLoadingClients || isLoadingCommissions) ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clients.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Commissions en attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.pending.toFixed(2)} €</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Commissions payées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.paid.toFixed(2)} €</div>
              </CardContent>
            </Card>
          </div>

          <Tabs 
            defaultValue="clients" 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="clients" className="space-y-4">
              <Card>
                <CardHeader className="pb-0 flex flex-row items-center justify-between">
                  <CardTitle>Mes clients</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportClientsPDF}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportClientsExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ExportClientsTable 
                    clients={clients} 
                    isLoading={isLoadingClients} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="commissions" className="space-y-4">
              <Card>
                <CardHeader className="pb-0 flex flex-row items-center justify-between">
                  <CardTitle>Mes commissions</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCommissionsPDF}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCommissionsExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ExportCommissionsTable 
                    commissions={commissions} 
                    isLoading={isLoadingCommissions} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorStatistics;
