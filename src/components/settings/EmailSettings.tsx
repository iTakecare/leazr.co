
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SmtpSettings from "./SmtpSettings";
import EmailTemplateEditor from "./EmailTemplateEditor";
import { Mail, PenLine } from "lucide-react";

const EmailSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("smtp");
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="smtp" className="flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            Configuration d'envoi
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <PenLine className="mr-2 h-4 w-4" />
            Personnalisation des emails
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="smtp" className="pt-6">
          <SmtpSettings />
        </TabsContent>
        
        <TabsContent value="templates" className="pt-6">
          <EmailTemplateEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
