import React, { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wallet, LineChart, Bot, BookOpen, ShoppingCart, LayoutDashboard, Building2, Globe } from "lucide-react";
import OverviewTab from "@/components/gestion/OverviewTab";
import ProfitabilityTab from "@/components/gestion/ProfitabilityTab";
import CfoAiTab from "@/components/gestion/CfoAiTab";
import YukiComptaTab from "@/components/gestion/YukiComptaTab";
import SupplierInvoicesTab from "@/components/invoicing/SupplierInvoicesTab";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { getCostCenters, CostCenter } from "@/services/costCenterService";

const CONSOLIDATED = "__all__";

const CostManagementPage: React.FC = () => {
  const { companyId } = useMultiTenant();
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>(CONSOLIDATED);

  useEffect(() => {
    if (!companyId) return;
    getCostCenters(companyId).then(setCenters).catch(() => setCenters([]));
  }, [companyId]);

  const costCenterId = selectedCenter === CONSOLIDATED ? null : selectedCenter;
  const multiSite = centers.length > 1;

  return (
    <PageTransition>
      <Container>
        <div className="py-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gestion & pilotage</h1>
                <p className="text-muted-foreground text-sm">Revenus, dépenses, rentabilité par contrat, CFO IA & comptabilité</p>
              </div>
            </div>
            <div className="flex items-end gap-3">
              {multiSite && (
                <div>
                  <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Comptoir</Label>
                  <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                    <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CONSOLIDATED}>
                        <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Vue consolidée (groupe)</span>
                      </SelectItem>
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.is_headquarters ? "★" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="cost-from" className="text-xs">Depuis le</Label>
                <Input id="cost-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9" />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => navigate(`${companySlug ? `/${companySlug}` : ""}/admin/comptoirs`)}>
                <Building2 className="h-4 w-4" /> Comptoirs
              </Button>
            </div>
          </div>

          {costCenterId && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Building2 className="h-3 w-3 mr-1" />
              Vue filtrée : {centers.find((c) => c.id === costCenterId)?.name}
            </Badge>
          )}

          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Factures d'achat
              </TabsTrigger>
              <TabsTrigger value="profitability" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" /> Rentabilité
              </TabsTrigger>
              <TabsTrigger value="cfo" className="flex items-center gap-2">
                <Bot className="h-4 w-4" /> CFO IA
              </TabsTrigger>
              <TabsTrigger value="compta" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Comptabilité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewTab fromDate={fromDate} costCenterId={costCenterId} />
            </TabsContent>
            <TabsContent value="purchases" className="mt-4">
              <SupplierInvoicesTab costCenterId={costCenterId} />
            </TabsContent>
            <TabsContent value="profitability" className="mt-4">
              <ProfitabilityTab costCenterId={costCenterId} />
            </TabsContent>
            <TabsContent value="cfo" className="mt-4">
              <CfoAiTab />
            </TabsContent>
            <TabsContent value="compta" className="mt-4">
              <YukiComptaTab />
            </TabsContent>
          </Tabs>
        </div>
      </Container>
    </PageTransition>
  );
};

export default CostManagementPage;
