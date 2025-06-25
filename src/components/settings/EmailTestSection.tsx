
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SmtpSettings from "./SmtpSettings";
import ResendDocumentTest from "./ResendDocumentTest";

const EmailTestSection = () => {
  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">Configuration Email</TabsTrigger>
        <TabsTrigger value="test">Test Documents</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-4">
        <SmtpSettings />
      </TabsContent>
      
      <TabsContent value="test" className="space-y-4">
        <ResendDocumentTest />
      </TabsContent>
    </Tabs>
  );
};

export default EmailTestSection;
