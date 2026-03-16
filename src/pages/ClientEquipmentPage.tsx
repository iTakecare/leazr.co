import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Users, AlertCircle, Search, FileText, Cpu, MapPin, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientData } from "@/hooks/useClientData";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";
import LocationManager from "@/components/equipment/LocationManager";
import SoftwareDeploymentWizard from "@/components/equipment/SoftwareDeploymentWizard";
import ClientSoftwareTab from "@/components/equipment/ClientSoftwareTab";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientEquipmentPage = ({ defaultTab = "by-contract" }: { defaultTab?: string }) => {
  const { clientData, loading, error } = useClientData();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deployWizardOpen, setDeployWizardOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);

  // Fetch real equipment from contract_equipment table
  const { data: contractEquipmentRaw = [] } = useQuery({
    queryKey: ["client-contract-equipment", clientData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_equipment")
        .select(`
          id, title, quantity, serial_number, monthly_payment, purchase_price,
          collaborator_id, contract_id,
          contracts!inner(id, client_name, status, tracking_number, contract_number, monthly_payment, created_at, client_id)
        `)
        .eq("contracts.client_id", clientData!.id)
        .in("contracts.status", ["active", "signed", "delivered"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientData?.id,
  });

  // Group by contract for "Par contrat" tab
  const contractsMap = new Map<string, { id: string; client_name: string; status: string; contract_number: string | null; monthly_payment: number | null; items: any[] }>();
  contractEquipmentRaw.forEach((eq: any) => {
    const c = eq.contracts;
    if (!contractsMap.has(c.id)) {
      contractsMap.set(c.id, {
        id: c.id,
        client_name: c.client_name,
        status: c.status,
        contract_number: c.contract_number,
        monthly_payment: c.monthly_payment,
        items: [],
      });
    }
    contractsMap.get(c.id)!.items.push({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity || 1,
      serial_number: eq.serial_number,
      monthly_payment: eq.monthly_payment,
    });
  });
  const contracts = Array.from(contractsMap.values());

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-2xl w-1/3" />
          <div className="h-4 bg-muted rounded-2xl w-1/2" />
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
          <CardContent className="pt-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground mb-2">Aucune information client trouvée</p>
              <p className="text-sm text-muted-foreground">
                Veuillez contacter l'administrateur pour créer votre fiche client.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detect equipment category from title
  const detectCategory = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes("macbook") || t.includes("laptop") || t.includes("portable") || t.includes("pc") || t.includes("ordinateur") || t.includes("desktop") || t.includes("thinkpad") || t.includes("dell") || t.includes("hp ") || t.includes("lenovo")) return "informatique";
    if (t.includes("iphone") || t.includes("samsung") || t.includes("téléphone") || t.includes("telephone") || t.includes("smartphone") || t.includes("galaxy") || t.includes("pixel")) return "telephonie";
    if (t.includes("écran") || t.includes("ecran") || t.includes("monitor") || t.includes("asus") || t.includes("lg ") || t.includes("display")) return "ecrans";
    if (t.includes("imprimante") || t.includes("scanner") || t.includes("printer")) return "impression";
    if (t.includes("tablette") || t.includes("ipad") || t.includes("tab")) return "tablettes";
    return "autre";
  };

  const categoryLabels: Record<string, string> = {
    all: "Tous les types",
    informatique: "Informatique",
    telephonie: "Téléphonie",
    ecrans: "Écrans / Moniteurs",
    impression: "Impression",
    tablettes: "Tablettes",
    autre: "Autre",
  };

  // Build flat equipment list from contract_equipment data
  const allEquipment = contractEquipmentRaw.map((eq: any) => ({
    id: eq.id,
    name: eq.title || "Équipement",
    serial: eq.serial_number || "—",
    contractRef: eq.contracts?.contract_number || eq.contract_id?.slice(0, 8) || "—",
    contractId: eq.contract_id,
    quantity: eq.quantity || 1,
    monthlyPayment: eq.monthly_payment || null,
    category: detectCategory(eq.title || ""),
  }));

  // Collect present categories for the filter
  const presentCategories: string[] = Array.from(new Set(allEquipment.map((e) => e.category)));

  const filteredEquipment = allEquipment.filter(
    (e) =>
      (categoryFilter === "all" || e.category === categoryFilter) &&
      (e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.contractRef.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Gestion des Équipements
            </h1>
            <p className="text-muted-foreground">
              Gérez l'assignation de vos équipements aux collaborateurs et emplacements
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="by-contract" className="gap-2">
              <FileText className="h-4 w-4" />
              Par contrat
            </TabsTrigger>
            <TabsTrigger value="by-equipment" className="gap-2">
              <Cpu className="h-4 w-4" />
              Par équipement
            </TabsTrigger>
            <TabsTrigger value="assign" className="gap-2">
              <Users className="h-4 w-4" />
              Assignation
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              Emplacements
            </TabsTrigger>
            <TabsTrigger value="software" className="gap-2">
              <Download className="h-4 w-4" />
              Logiciels
            </TabsTrigger>
          </TabsList>

          {/* By Contract View */}
          <TabsContent value="by-contract">
            <div className="space-y-4">
              {contracts.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">Aucun contrat actif</p>
                  </CardContent>
                </Card>
              ) : (
                contracts.map((contract) => {
                  const items = contract.items;
                  return (
                    <Card key={contract.id} className="border-0 shadow-sm rounded-2xl">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Contrat {contract.contract_number || contract.id.slice(0, 8)}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {contract.monthly_payment ? `${contract.monthly_payment.toFixed(2)} €/mois` : "—"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <Cpu className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{item.title || "Équipement"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.serial_number ? `S/N: ${item.serial_number}` : "Pas de N° de série"}
                                      {item.quantity > 1 && ` · Qté: ${item.quantity}`}
                                    </p>
                                  </div>
                                </div>
                                {item.monthly_payment && (
                                  <span className="text-xs text-muted-foreground">{Number(item.monthly_payment).toFixed(2)} €/mois</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => {
                                    setSelectedEquipment({
                                      id: item.id,
                                      name: item.title || "Équipement",
                                      contractRef: contract.tracking_number || contract.id.slice(0, 8),
                                    });
                                    setDeployWizardOpen(true);
                                  }}
                                >
                                  <Download className="h-3 w-3" /> Installer
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucun équipement assigné</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* By Equipment View */}
          <TabsContent value="by-equipment">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un équipement..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px] rounded-xl gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{categoryLabels.all}</SelectItem>
                    {presentCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat] || cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredEquipment.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="py-12 text-center">
                    <Cpu className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">Aucun équipement trouvé</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Équipement</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">N° Série</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Contrat</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Qté</th>
                          <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEquipment.map((eq) => (
                          <tr key={eq.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate max-w-[250px]">{eq.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{eq.serial}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">{eq.contractRef}</Badge>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{eq.quantity}</td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => {
                                  setSelectedEquipment({ id: eq.id, name: eq.name, contractRef: eq.contractRef });
                                  setDeployWizardOpen(true);
                                }}
                              >
                                <Download className="h-3 w-3" /> Installer
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Assignment View (existing drag-drop) */}
          <TabsContent value="assign">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b rounded-t-2xl">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-5 w-5 text-primary" />
                  Assignation aux collaborateurs
                </CardTitle>
                <CardDescription className="text-xs">
                  Assignez vos équipements contractuels à vos collaborateurs par glisser-déposer.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <EquipmentDragDropManager clientId={clientData.id} readOnly={false} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations View */}
          <TabsContent value="locations">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b rounded-t-2xl">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-5 w-5 text-primary" />
                  Gestion des emplacements
                </CardTitle>
                <CardDescription className="text-xs">
                  Définissez vos sites et emplacements pour organiser vos équipements.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <LocationManager clientId={clientData.id} companyId={(clientData as any).company_id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Software Tab */}
          <TabsContent value="software">
            <ClientSoftwareTab
              clientId={clientData.id}
              companyId={(clientData as any).company_id}
              equipment={allEquipment}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {selectedEquipment && (
        <SoftwareDeploymentWizard
          open={deployWizardOpen}
          onOpenChange={setDeployWizardOpen}
          equipment={selectedEquipment}
        />
      )}
    </motion.div>
  );
};

export default ClientEquipmentPage;
