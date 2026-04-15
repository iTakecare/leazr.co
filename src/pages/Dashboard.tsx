import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Star } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import CompanyDashboard from "@/components/dashboard/CompanyDashboard";
import CommercialDashboard from "@/components/dashboard/CommercialDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDashboardPage } from "@/components/mobile/pages";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { preferences, isLoading, updateDefaultDashboard } = useUserPreferences();
  const [activeTab, setActiveTab] = useState<string>('financial');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && preferences?.default_dashboard) {
      setActiveTab(preferences.default_dashboard);
    }
  }, [preferences, isLoading]);

  const isCurrentDefault = activeTab === (preferences?.default_dashboard ?? 'financial');

  const handleSetDefault = async () => {
    setSaving(true);
    const ok = await updateDefaultDashboard(activeTab as 'financial' | 'commercial');
    setSaving(false);
    if (ok) {
      toast.success(`Dashboard ${activeTab === 'financial' ? 'Financier' : 'Commercial'} défini par défaut`);
    } else {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Mobile rendering
  if (isMobile) {
    return <MobileDashboardPage />;
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <TabsList>
            <TabsTrigger value="financial" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Financier
            </TabsTrigger>
            <TabsTrigger value="commercial" className="gap-2">
              <Users className="h-4 w-4" />
              Commercial
            </TabsTrigger>
          </TabsList>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 gap-1.5 text-xs ${isCurrentDefault ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={handleSetDefault}
                  disabled={saving || isCurrentDefault}
                >
                  <Star className={`h-3.5 w-3.5 ${isCurrentDefault ? 'fill-amber-400' : ''}`} />
                  {isCurrentDefault ? 'Par défaut' : 'Définir par défaut'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCurrentDefault
                  ? `Ce dashboard s'affiche en premier à l'ouverture`
                  : `Afficher ce dashboard en premier à l'ouverture`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <TabsContent value="financial" className="mt-0">
          <CompanyDashboard />
        </TabsContent>

        <TabsContent value="commercial" className="mt-0">
          <CommercialDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
