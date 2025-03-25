
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ContractSettings {
  autoGenerateContract: boolean;
  defaultDeliveryTime: number;
  notifyOnContractSigning: boolean;
  defaultTermsTemplate: string;
  customClauses: string;
}

const ContractSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ContractSettings>({
    autoGenerateContract: true,
    defaultDeliveryTime: 14,
    notifyOnContractSigning: true,
    defaultTermsTemplate: "standard",
    customClauses: ""
  });
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Simuler un chargement des données depuis la base de données
        setTimeout(() => {
          setIsLoading(false);
          toast.success("Paramètres de contrat chargés");
        }, 1000);

        // Dans une implémentation réelle, vous feriez une requête à Supabase :
        // const { data, error } = await supabase
        //   .from('contract_settings')
        //   .select('*')
        //   .single();
        //
        // if (error) throw error;
        // if (data) setSettings(data);
      } catch (error) {
        console.error("Erreur lors du chargement des paramètres:", error);
        toast.error("Erreur lors du chargement des paramètres");
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simuler une sauvegarde vers la base de données
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans une implémentation réelle, vous enregistreriez les données dans Supabase :
      // const { error } = await supabase
      //   .from('contract_settings')
      //   .upsert(settings);
      //
      // if (error) throw error;

      toast.success("Paramètres de contrat enregistrés avec succès");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des paramètres:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="templates">Modèles et Clauses</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-generate" className="font-medium">
                  Génération automatique des contrats
                </Label>
                <p className="text-sm text-muted-foreground">
                  Générer automatiquement un contrat lorsqu'une offre est acceptée par le leaser
                </p>
              </div>
              <Switch
                id="auto-generate"
                checked={settings.autoGenerateContract}
                onCheckedChange={(checked) => setSettings({ ...settings, autoGenerateContract: checked })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery-time" className="font-medium">
                Délai de livraison par défaut (jours)
              </Label>
              <Input
                id="delivery-time"
                type="number"
                min={1}
                max={90}
                value={settings.defaultDeliveryTime}
                onChange={(e) => setSettings({ ...settings, defaultDeliveryTime: parseInt(e.target.value) })}
                className="max-w-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Nombre de jours par défaut pour la livraison de l'équipement
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="font-medium">Statuts des contrats</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Configurez les statuts disponibles pour le suivi des contrats
              </p>
              <div className="grid grid-cols-2 gap-4">
                {["contract_sent", "signed", "in_delivery", "delivered", "active", "completed", "cancelled"].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox id={`status-${status}`} defaultChecked />
                    <Label htmlFor={`status-${status}`}>
                      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terms-template" className="font-medium">
                Modèle de conditions générales par défaut
              </Label>
              <Select
                value={settings.defaultTermsTemplate}
                onValueChange={(value) => setSettings({ ...settings, defaultTermsTemplate: value })}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Sélectionner un modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-clauses" className="font-medium">
                Clauses personnalisées
              </Label>
              <Textarea
                id="custom-clauses"
                value={settings.customClauses}
                onChange={(e) => setSettings({ ...settings, customClauses: e.target.value })}
                placeholder="Saisissez ici vos clauses personnalisées pour les contrats..."
                className="min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Ces clauses seront ajoutées à tous les contrats générés
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notify-signing" className="font-medium">
                  Notifications de signature
                </Label>
                <p className="text-sm text-muted-foreground">
                  Envoyer une notification par email lorsqu'un contrat est signé
                </p>
              </div>
              <Switch
                id="notify-signing"
                checked={settings.notifyOnContractSigning}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnContractSigning: checked })}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-medium">Destinataires des notifications</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Sélectionnez qui doit recevoir les notifications liées aux contrats
              </p>
              <div className="space-y-2">
                {["admin", "account_manager", "sales_rep", "client"].map((recipient) => (
                  <div key={recipient} className="flex items-center space-x-2">
                    <Checkbox id={`recipient-${recipient}`} defaultChecked={recipient !== "client"} />
                    <Label htmlFor={`recipient-${recipient}`}>
                      {recipient.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert className="bg-primary/5 border-primary/20">
              <Settings className="h-4 w-4" />
              <AlertTitle>Paramètres email</AlertTitle>
              <AlertDescription>
                Les notifications utilisent les paramètres SMTP configurés dans l'onglet "Configuration Email".
                Assurez-vous que les paramètres SMTP sont correctement configurés.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les paramètres
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ContractSettings;
