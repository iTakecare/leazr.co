
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import { contractStatuses } from "@/services/contractService";

const ContractSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [autoConvertOffers, setAutoConvertOffers] = useState(true);
  const [defaultContractStatus, setDefaultContractStatus] = useState(contractStatuses.CONTRACT_SENT);
  const [autoNotifyClient, setAutoNotifyClient] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);
  
  // Templates et clauses pour les contrats
  const [templates, setTemplates] = useState([
    { id: 1, name: "Contrat Standard", isDefault: true },
    { id: 2, name: "Contrat Premium", isDefault: false }
  ]);
  
  const [clauses, setClauses] = useState([
    { id: 1, title: "Clause de résiliation", content: "Le contrat peut être résilié avec un préavis de 30 jours..." }
  ]);
  
  const [newClause, setNewClause] = useState({ title: "", content: "" });
  
  const handleSaveGeneralSettings = () => {
    // Ici, vous implémenterez la sauvegarde des paramètres généraux
    toast.success("Paramètres des contrats enregistrés avec succès");
  };
  
  const handleAddClause = () => {
    if (newClause.title.trim() === "" || newClause.content.trim() === "") {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setClauses([...clauses, { id: Date.now(), ...newClause }]);
    setNewClause({ title: "", content: "" });
    toast.success("Clause ajoutée avec succès");
  };
  
  const handleDeleteClause = (id: number) => {
    setClauses(clauses.filter(clause => clause.id !== id));
    toast.success("Clause supprimée avec succès");
  };
  
  const handleTemplateAsDefault = (templateId: number) => {
    setTemplates(templates.map(tpl => ({
      ...tpl, 
      isDefault: tpl.id === templateId
    })));
    toast.success("Template par défaut mis à jour");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="general">Paramètres Généraux</TabsTrigger>
          <TabsTrigger value="templates">Templates & Clauses</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid gap-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="auto-convert" className="flex flex-col space-y-1">
                <span>Conversion automatique des offres</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Convertir automatiquement les offres financées en contrats
                </span>
              </Label>
              <Switch
                id="auto-convert"
                checked={autoConvertOffers}
                onCheckedChange={setAutoConvertOffers}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-status">Statut par défaut des nouveaux contrats</Label>
              <Select 
                value={defaultContractStatus} 
                onValueChange={setDefaultContractStatus}
              >
                <SelectTrigger id="default-status">
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={contractStatuses.CONTRACT_SENT}>Contrat Envoyé</SelectItem>
                  <SelectItem value={contractStatuses.CONTRACT_SIGNED}>Contrat Signé</SelectItem>
                  <SelectItem value={contractStatuses.EQUIPMENT_ORDERED}>Équipement Commandé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSaveGeneralSettings}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les paramètres
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de contrats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.isDefault && (
                        <span className="text-xs text-green-600">Par défaut</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!template.isDefault && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTemplateAsDefault(template.id)}
                        >
                          Définir par défaut
                        </Button>
                      )}
                      <Button variant="outline" size="sm">Modifier</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Clauses contractuelles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clauses.map(clause => (
                  <div key={clause.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{clause.title}</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteClause(clause.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{clause.content}</p>
                  </div>
                ))}
                
                <div className="space-y-4 border-t pt-4 mt-4">
                  <h3 className="font-medium">Ajouter une nouvelle clause</h3>
                  <div className="space-y-2">
                    <Label htmlFor="clause-title">Titre de la clause</Label>
                    <Input 
                      id="clause-title"
                      value={newClause.title}
                      onChange={(e) => setNewClause({...newClause, title: e.target.value})}
                      placeholder="Ex: Clause de résiliation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clause-content">Contenu de la clause</Label>
                    <Textarea 
                      id="clause-content"
                      value={newClause.content}
                      onChange={(e) => setNewClause({...newClause, content: e.target.value})}
                      placeholder="Saisissez le contenu de la clause..."
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleAddClause}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter la clause
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <div className="grid gap-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="auto-notify" className="flex flex-col space-y-1">
                <span>Notification automatique au client</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Notifier automatiquement le client lors de la création d'un contrat
                </span>
              </Label>
              <Switch
                id="auto-notify"
                checked={autoNotifyClient}
                onCheckedChange={setAutoNotifyClient}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reminder-days">Rappel de signature (jours)</Label>
              <Input 
                id="reminder-days"
                type="number"
                min="1"
                value={reminderDays}
                onChange={(e) => setReminderDays(parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Nombre de jours avant d'envoyer un rappel pour la signature du contrat
              </p>
            </div>
            
            <Button onClick={handleSaveGeneralSettings}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les paramètres
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractSettings;
