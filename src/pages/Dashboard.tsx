import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import CompanyDashboard from "@/components/dashboard/CompanyDashboard";
import CommercialDashboard from "@/components/dashboard/CommercialDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDashboardPage } from "@/components/mobile/pages";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { preferences, isLoading } = useUserPreferences();
  const [activeTab, setActiveTab] = useState<string>('financial');

  useEffect(() => {
    if (!isLoading && preferences?.default_dashboard) {
      setActiveTab(preferences.default_dashboard);
    }
  }, [preferences, isLoading]);

  // Mobile rendering
  if (isMobile) {
    return <MobileDashboardPage />;
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="financial" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Financier
          </TabsTrigger>
          <TabsTrigger value="commercial" className="gap-2">
            <Users className="h-4 w-4" />
            Commercial
          </TabsTrigger>
        </TabsList>
        
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
