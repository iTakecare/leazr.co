import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Code } from "lucide-react";
import IframeSettings from "./IframeSettings";
import CatalogApiSettings from "./CatalogApiSettings";

const PublicCatalogSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration du catalogue</h2>
        <p className="text-muted-foreground">
          Configurez l'intégration de votre catalogue via iFrame ou API JSON
        </p>
      </div>
      
      <Tabs defaultValue="iframe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="iframe" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            iFrame
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            API JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iframe">
          <IframeSettings />
        </TabsContent>

        <TabsContent value="api">
          <CatalogApiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PublicCatalogSettings;