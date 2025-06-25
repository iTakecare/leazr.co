import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GeneralSettings from "@/components/settings/GeneralSettings";
import UserManager from "@/components/settings/UserManager";
import UserPermissionsManager from "@/components/settings/UserPermissionsManager";
import PermissionProfilesManager from "@/components/settings/PermissionProfilesManager";
import LeaserManager from "@/components/settings/LeaserManager";
import CommissionManager from "@/components/settings/CommissionManager";
import PDFTemplateManager from "@/components/settings/PDFTemplateManager";
import DataImporter from "@/components/settings/DataImporter";
import CompanyCustomizationManager from "@/components/settings/CompanyCustomizationManager";
import EmailTestSection from "@/components/settings/EmailTestSection";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    // Persist tab selection in localStorage
    const storedTab = localStorage.getItem("settingsTab");
    if (storedTab) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("settingsTab", activeTab);
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />;
      case "users":
        return <UserManager />;
      case "permissions":
        return <UserPermissionsManager />;
      case "permission-profiles":
        return <PermissionProfilesManager />;
      case "leasers":
        return <LeaserManager />;
      case "commissions":
        return <CommissionManager />;
      case "email":
        return <EmailTestSection />;
      case "pdf":
        return <PDFTemplateManager />;
      case "data":
        return <DataImporter />;
      case "customization":
        return <CompanyCustomizationManager />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
        <TabsTrigger value="permission-profiles">Profils de Permissions</TabsTrigger>
        <TabsTrigger value="leasers">Leasers</TabsTrigger>
        <TabsTrigger value="commissions">Commissions</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="pdf">PDF</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="customization">Personnalisation</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab} className="mt-6">
        {renderTabContent()}
      </TabsContent>
    </Tabs>
  );
};

export default Settings;
