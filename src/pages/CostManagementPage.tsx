import React, { useState } from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, LineChart, Bot, BookOpen, ShoppingCart, LayoutDashboard } from "lucide-react";
import OverviewTab from "@/components/gestion/OverviewTab";
import ProfitabilityTab from "@/components/gestion/ProfitabilityTab";
import CfoAiTab from "@/components/gestion/CfoAiTab";
import YukiComptaTab from "@/components/gestion/YukiComptaTab";
import SupplierInvoicesTab from "@/components/invoicing/SupplierInvoicesTab";

const CostManagementPage: React.FC = () => {
  const [fromDate, setFromDate] = useState("2026-01-01");

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
            <div>
              <Label htmlFor="cost-from" className="text-xs">Depuis le</Label>
              <Input id="cost-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40 h-9" />
            </div>
          </div>

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
              <OverviewTab fromDate={fromDate} />
            </TabsContent>
            <TabsContent value="purchases" className="mt-4">
              <SupplierInvoicesTab />
            </TabsContent>
            <TabsContent value="profitability" className="mt-4">
              <ProfitabilityTab />
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
