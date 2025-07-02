import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Client } from "@/types/client";
import { updateClient } from "@/services/clientService";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, User, CheckCircle, 
  AlertCircle, Info, Loader2, Save, Edit3, Calendar, Package
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "./CollaboratorForm";
import CollaboratorsList from "./CollaboratorsList";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";

interface UnifiedClientViewProps {
  client: Client;
  onClientUpdate?: (updatedClient: Client) => void;
  readOnly?: boolean;
}

const UnifiedClientView: React.FC<UnifiedClientViewProps> = ({
  client: initialClient,
  onClientUpdate,
  readOnly = false
}) => {
  const [client, setClient] = useState<Client>(initialClient);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name || "",
    email: client.email || "",
    company: client.company || "",
    phone: client.phone || "",
    address: client.address || "",
    city: client.city || "",
    postal_code: client.postal_code || "",
    country: client.country || "",
    vat_number: client.vat_number || "",
    contact_name: client.contact_name || "",
    notes: client.notes || "",
    status: client.status || "active",
    has_different_shipping_address: client.has_different_shipping_address || false,
    shipping_address: client.shipping_address || "",
    shipping_city: client.shipping_city || "",
    shipping_postal_code: client.shipping_postal_code || "",
    shipping_country: client.shipping_country || "",
  });

  useEffect(() => {
    setClient(initialClient);
    setFormData({
      name: initialClient.name || "",
      email: initialClient.email || "",
      company: initialClient.company || "",
      phone: initialClient.phone || "",
      address: initialClient.address || "",
      city: initialClient.city || "",
      postal_code: initialClient.postal_code || "",
      country: initialClient.country || "",
      vat_number: initialClient.vat_number || "",
      contact_name: initialClient.contact_name || "",
      notes: initialClient.notes || "",
      status: initialClient.status || "active",
      has_different_shipping_address: initialClient.has_different_shipping_address || false,
      shipping_address: initialClient.shipping_address || "",
      shipping_city: initialClient.shipping_city || "",
      shipping_postal_code: initialClient.shipping_postal_code || "",
      shipping_country: initialClient.shipping_country || "",
    });
  }, [initialClient]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedClient = await updateClient(client.id, formData);
      if (updatedClient) {
        setClient(updatedClient);
        setIsEditing(false);
        onClientUpdate?.(updatedClient);
        toast.success("Client mis à jour avec succès");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du client");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: client.name || "",
      email: client.email || "",
      company: client.company || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      postal_code: client.postal_code || "",
      country: client.country || "",
      vat_number: client.vat_number || "",
      contact_name: client.contact_name || "",
      notes: client.notes || "",
      status: client.status || "active",
      has_different_shipping_address: client.has_different_shipping_address || false,
      shipping_address: client.shipping_address || "",
      shipping_city: client.shipping_city || "",
      shipping_postal_code: client.shipping_postal_code || "",
      shipping_country: client.shipping_country || "",
    });
    setIsEditing(false);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return "Date invalide";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'lead':
        return <Badge variant="outline">Prospect</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderField = (label: string, field: string, value: any, type: string = "text", options?: Array<{value: string, label: string}>) => {
    if (isEditing) {
      switch (type) {
        case "select":
          return (
            <div className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Select value={formData[field as keyof typeof formData] as string} onValueChange={(value) => handleInputChange(field, value)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Sélectionner ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        case "textarea":
          return (
            <div className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Textarea
                id={field}
                value={formData[field as keyof typeof formData] as string}
                onChange={(e) => handleInputChange(field, e.target.value)}
                rows={3}
              />
            </div>
          );
        case "switch":
          return (
            <div className="flex items-center space-x-2">
              <Switch
                id={field}
                checked={formData[field as keyof typeof formData] as boolean}
                onCheckedChange={(checked) => handleInputChange(field, checked)}
              />
              <Label htmlFor={field}>{label}</Label>
            </div>
          );
        default:
          return (
            <div className="space-y-2">
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                type={type}
                value={formData[field as keyof typeof formData] as string}
                onChange={(e) => handleInputChange(field, e.target.value)}
              />
            </div>
          );
      }
    } else {
      if (type === "switch") {
        return (
          <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="text-sm font-medium">{label}</h3>
              <p className="text-sm">{value ? "Oui" : "Non"}</p>
            </div>
          </div>
        );
      }
      return value ? (
        <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="text-sm font-medium">{label}</h3>
            <p className="text-sm whitespace-pre-line">{value}</p>
          </div>
        </div>
      ) : null;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec informations principales */}
      <div className="flex justify-between items-start bg-muted/30 p-4 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground text-lg">{client.company}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(client.status || 'active')}
            {client.has_user_account && (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte actif
              </Badge>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Onglets avec contenu principal */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informations générales
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Collaborateurs
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Équipements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <Card className="lg:col-span-2 shadow-md border-none bg-gradient-to-br from-card to-background">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informations générales
                </CardTitle>
                <CardDescription>Coordonnées et détails du client</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField("Nom", "name", client.name)}
                  {renderField("Email", "email", client.email, "email")}
                  {renderField("Société", "company", client.company)}
                  {renderField("Téléphone", "phone", client.phone, "tel")}
                  {renderField("Nom du contact", "contact_name", client.contact_name)}
                  {renderField("Numéro de TVA", "vat_number", client.vat_number)}
                  {renderField("Statut", "status", client.status, "select", [
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" },
                    { value: "lead", label: "Prospect" }
                  ])}
                </div>
                
                {/* Adresse de facturation */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Adresse de facturation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField("Adresse", "address", client.address)}
                    {renderField("Ville", "city", client.city)}
                    {renderField("Code postal", "postal_code", client.postal_code)}
                    {renderField("Pays", "country", client.country)}
                  </div>
                </div>

                {/* Adresse de livraison */}
                <div className="border-t pt-4">
                  <div className="mb-3">
                    {renderField("Adresse de livraison différente", "has_different_shipping_address", client.has_different_shipping_address, "switch")}
                  </div>
                  
                  {(isEditing ? formData.has_different_shipping_address : client.has_different_shipping_address) && (
                    <>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Adresse de livraison
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField("Adresse de livraison", "shipping_address", client.shipping_address)}
                        {renderField("Ville de livraison", "shipping_city", client.shipping_city)}
                        {renderField("Code postal de livraison", "shipping_postal_code", client.shipping_postal_code)}
                        {renderField("Pays de livraison", "shipping_country", client.shipping_country)}
                      </div>
                    </>
                  )}
                </div>

                {/* Notes */}
                <div className="border-t pt-4">
                  {renderField("Notes", "notes", client.notes, "textarea")}
                </div>
              </CardContent>
            </Card>

            {/* Informations système */}
            <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Informations système
                </CardTitle>
                <CardDescription>Dates et statuts</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Créé le</h3>
                    <p className="text-sm">{formatDate(client.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 bg-muted/20 p-3 rounded-md">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Dernière mise à jour</h3>
                    <p className="text-sm">{formatDate(client.updated_at)}</p>
                  </div>
                </div>

                {client.has_user_account && (
                  <div className="flex items-start space-x-3 bg-green-50 p-3 rounded-md border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">Compte utilisateur actif</h3>
                      {client.user_account_created_at && (
                        <p className="text-xs text-green-700">
                          Créé le {formatDate(client.user_account_created_at)}
                        </p>
                      )}
                      {client.user_id && (
                        <p className="text-xs text-green-700">
                          ID: {client.user_id}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collaborators">
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Collaborateurs
              </CardTitle>
              <CardDescription>Personnes à contacter chez ce client</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!readOnly && (
                <CollaboratorForm 
                  clientId={client.id} 
                  onSuccess={() => {
                    toast.success("Collaborateur ajouté avec succès");
                  }} 
                />
              )}
              <CollaboratorsList 
                clientId={client.id} 
                initialCollaborators={client.collaborators}
                onRefreshNeeded={() => {
                  // Rafraîchir si nécessaire
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentDragDropManager 
            clientId={client.id} 
            readOnly={readOnly}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedClientView;