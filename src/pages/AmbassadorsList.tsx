
import React, { useState } from 'react';
import AmbassadorsList from "@/components/crm/AmbassadorsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HeartHandshake, BadgePercent } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import PartnersList from "@/components/crm/PartnersList";

const AmbassadorsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("ambassadors");
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Handle navigation based on tab selection
    if (value === "clients") {
      navigate("/clients");
    } else if (value === "partners") {
      navigate("/partners");
    } else if (value === "ambassadors") {
      navigate("/ambassadors");
    }
  };

  return (
    <div className="container py-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Clients</span>
              </TabsTrigger>
              <TabsTrigger value="ambassadors" className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4" />
                <span>Ambassadeurs</span>
              </TabsTrigger>
              <TabsTrigger value="partners" className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4" />
                <span>Partenaires</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ambassadors" className="mt-0">
              <CardTitle className="text-2xl font-bold">Ambassadeurs</CardTitle>
              <CardDescription>
                Gérez vos ambassadeurs et suivez leurs performances
              </CardDescription>
            </TabsContent>
            
            <TabsContent value="partners" className="mt-0">
              <CardTitle className="text-2xl font-bold">Partenaires</CardTitle>
              <CardDescription>
                Gérez vos relations partenaires
              </CardDescription>
            </TabsContent>
            
            <TabsContent value="clients" className="mt-0">
              <CardTitle className="text-2xl font-bold">Clients</CardTitle>
              <CardDescription>
                Gérez vos clients
              </CardDescription>
            </TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent>
          {activeTab === "ambassadors" && <AmbassadorsList />}
          {activeTab === "partners" && <PartnersList />}
        </CardContent>
      </Card>
    </div>
  );
};

export default AmbassadorsListPage;
