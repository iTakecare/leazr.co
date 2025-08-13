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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, Mail, Phone, MapPin, FileText, Clock, User, CheckCircle, 
  AlertCircle, Info, Loader2, Save, Edit3, Calendar, Package, Globe
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaboratorForm from "./CollaboratorForm";
import CollaboratorsList from "./CollaboratorsList";
import EquipmentDragDropManager from "@/components/equipment/EquipmentDragDropManager";
import ClientSubdomainManager from "./ClientSubdomainManager";
import ClientUserAccount from "./ClientUserAccount";
import { PostalCodeInput } from "@/components/form/PostalCodeInput";

import { ClientLogoUploader } from "./ClientLogoUploader";

interface UnifiedClientViewProps {
  client: Client;
  onClientUpdate?: (updatedClient: Client) => void;
  readOnly?: boolean;
  initialEditMode?: boolean;
}

const UnifiedClientView: React.FC<UnifiedClientViewProps> = ({
  client: initialClient,
  onClientUpdate,
  readOnly = false,
  initialEditMode = false
}) => {
  const [client, setClient] = useState<Client>(initialClient);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isSaving, setIsSaving] = useState(false);

  console.log('🎯 UNIFIED CLIENT VIEW - Component rendering:', {
    isEditing,
    readOnly,
    initialEditMode,
    clientId: client.id,
    clientName: client.name,
    timestamp: new Date().toISOString()
  });

  // Fetch leasers for the default leaser selector
  const { data: leasers = [] } = useQuery({
    queryKey: ["leasers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leasers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
  // Helper function to parse existing name into first/last name
  const parseExistingName = (client: Client) => {
    // If first_name and last_name exist, use them
    if (client.first_name || client.last_name) {
      return {
        first_name: client.first_name || "",
        last_name: client.last_name || ""
      };
    }
    
    // Otherwise, try to parse contact_name or name
    const nameToparse = client.contact_name || client.name || "";
    const nameParts = nameToparse.trim().split(' ');
    
    if (nameParts.length >= 2) {
      return {
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ')
      };
    } else {
      return {
        first_name: nameToparse,
        last_name: ""
      };
    }
  };

  const parsedName = parseExistingName(client);

  const [formData, setFormData] = useState({
    name: client.name || "",
    first_name: parsedName.first_name,
    last_name: parsedName.last_name,
    email: client.email || "",
    company: client.company || "",
    phone: client.phone || "",
    address: client.address || "",
    city: client.city || "",
    postal_code: client.postal_code || "",
    country: client.country || "",
    billing_address: client.billing_address || client.address || "",
    billing_city: client.billing_city || client.city || "",
    billing_postal_code: client.billing_postal_code || client.postal_code || "",
    billing_country: client.billing_country || client.country || "",
    delivery_address: client.delivery_address || client.address || "",
    delivery_city: client.delivery_city || client.city || "",
    delivery_postal_code: client.delivery_postal_code || client.postal_code || "",
    delivery_country: client.delivery_country || client.country || "",
    delivery_same_as_billing: client.delivery_same_as_billing ?? true,
    vat_number: client.vat_number || "",
    contact_name: client.contact_name || "",
    notes: client.notes || "",
    status: client.status || "active",
    default_leaser_id: client.default_leaser_id || "",
  });

  useEffect(() => {
    setClient(initialClient);
    const parsedName = parseExistingName(initialClient);
    setFormData({
      name: initialClient.name || "",
      first_name: parsedName.first_name,
      last_name: parsedName.last_name,
      email: initialClient.email || "",
      company: initialClient.company || "",
      phone: initialClient.phone || "",
      address: initialClient.address || "",
      city: initialClient.city || "",
      postal_code: initialClient.postal_code || "",
      country: initialClient.country || "",
      billing_address: initialClient.billing_address || initialClient.address || "",
      billing_city: initialClient.billing_city || initialClient.city || "",
      billing_postal_code: initialClient.billing_postal_code || initialClient.postal_code || "",
      billing_country: initialClient.billing_country || initialClient.country || "",
      delivery_address: initialClient.delivery_address || initialClient.address || "",
      delivery_city: initialClient.delivery_city || initialClient.city || "",
      delivery_postal_code: initialClient.delivery_postal_code || initialClient.postal_code || "",
      delivery_country: initialClient.delivery_country || initialClient.country || "",
      delivery_same_as_billing: initialClient.delivery_same_as_billing ?? true,
      vat_number: initialClient.vat_number || "",
      contact_name: initialClient.contact_name || "",
      notes: initialClient.notes || "",
      status: initialClient.status || "active",
      default_leaser_id: initialClient.default_leaser_id || "",
    });
  }, [initialClient]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Si delivery_same_as_billing change à true, copier les adresses de facturation
      if (field === 'delivery_same_as_billing' && value === true) {
        updated.delivery_address = prev.billing_address;
        updated.delivery_city = prev.billing_city;
        updated.delivery_postal_code = prev.billing_postal_code;
        updated.delivery_country = prev.billing_country;
      }
      
      // Si on modifie une adresse de facturation et que delivery_same_as_billing est true
      if (['billing_address', 'billing_city', 'billing_postal_code', 'billing_country'].includes(field) && 
          prev.delivery_same_as_billing) {
        const fieldMap: Record<string, string> = {
          'billing_address': 'delivery_address',
          'billing_city': 'delivery_city',
          'billing_postal_code': 'delivery_postal_code',
          'billing_country': 'delivery_country'
        };
        const deliveryField = fieldMap[field];
        if (deliveryField) {
          (updated as any)[deliveryField] = value;
        }
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Generate the full name from first_name and last_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      
      const updateData = {
        ...formData,
        name: fullName,
        contact_name: fullName,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim()
      };
      
      const updatedClient = await updateClient(client.id, updateData);
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
    const parsedName = parseExistingName(client);
    setFormData({
      name: client.name || "",
      first_name: parsedName.first_name,
      last_name: parsedName.last_name,
      email: client.email || "",
      company: client.company || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      postal_code: client.postal_code || "",
      country: client.country || "",
      billing_address: client.billing_address || client.address || "",
      billing_city: client.billing_city || client.city || "",
      billing_postal_code: client.billing_postal_code || client.postal_code || "",
      billing_country: client.billing_country || client.country || "",
      delivery_address: client.delivery_address || client.address || "",
      delivery_city: client.delivery_city || client.city || "",
      delivery_postal_code: client.delivery_postal_code || client.postal_code || "",
      delivery_country: client.delivery_country || client.country || "",
      delivery_same_as_billing: client.delivery_same_as_billing ?? true,
      vat_number: client.vat_number || "",
      contact_name: client.contact_name || "",
      notes: client.notes || "",
      status: client.status || "active",
      default_leaser_id: client.default_leaser_id || "",
    });
    setIsEditing(false);
  };

  const handleAccountUpdate = async () => {
    // Recharger les données du client depuis la base de données
    try {
      const { data: updatedClient, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();
      
      if (error) {
        console.error('Erreur lors du rechargement des données client:', error);
        return;
      }
      
      if (updatedClient) {
        // Mettre à jour le state local
        setClient(updatedClient);
        // Notifier le parent
        onClientUpdate?.(updatedClient);
      }
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
    }
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
                  {options?.filter(option => option.value && option.value.trim() !== "").map((option) => (
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
                checked={Boolean(formData[field as keyof typeof formData])}
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
        <h1 className="text-3xl font-bold tracking-tight">
          {client.first_name && client.last_name 
            ? `${client.first_name} ${client.last_name}`
            : client.contact_name || client.name}
        </h1>
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
              <Button onClick={() => {
                console.log('🔥 MODIFY BUTTON CLICKED - Before:', {
                  isEditing,
                  timestamp: new Date().toISOString()
                });
                setIsEditing(true);
                console.log('🔥 MODIFY BUTTON CLICKED - After setIsEditing(true):', {
                  newIsEditing: true,
                  timestamp: new Date().toISOString()
                });
              }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Onglets avec contenu principal */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informations générales
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Collaborateurs
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logo
          </TabsTrigger>
          <TabsTrigger value="subdomain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domaine
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
                  {renderField("Prénom", "first_name", 
                    isEditing ? formData.first_name : (client.first_name || parseExistingName(client).first_name)
                  )}
                  {renderField("Nom de famille", "last_name", 
                    isEditing ? formData.last_name : (client.last_name || parseExistingName(client).last_name)
                  )}
                  {renderField("Email", "email", client.email, "email")}
                  {renderField("Société", "company", client.company)}
                  {renderField("Téléphone", "phone", client.phone, "tel")}
                  {renderField("Numéro de TVA", "vat_number", client.vat_number)}
                  {renderField("Statut", "status", client.status, "select", [
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" },
                    { value: "lead", label: "Prospect" }
                  ])}
                </div>

                {/* Leaser par défaut */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Configuration financière
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {renderField(
                      "Leaser par défaut", 
                      "default_leaser_id", 
                      isEditing 
                        ? formData.default_leaser_id
                        : leasers.find(l => l.id === client.default_leaser_id)?.name || "Aucun",
                      "select", 
                      leasers
                        .filter(leaser => leaser.id && leaser.id.trim() !== "")
                        .map(leaser => ({
                          value: leaser.id,
                          label: leaser.name
                        }))
                    )}
                  </div>
                </div>
                
                {/* Adresses de facturation et livraison */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Adresses
                  </h3>
                  
                  {/* Onglets pour les adresses */}
                  <Tabs defaultValue="billing" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="billing">Facturation</TabsTrigger>
                      <TabsTrigger value="delivery">Livraison</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="billing" className="space-y-4 mt-4">
                      <div className="bg-muted/20 p-4 rounded-md space-y-4">
                        <h4 className="text-sm font-medium text-primary">Adresse de facturation</h4>
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="billing_address">Adresse</Label>
                              <Input
                                id="billing_address"
                                value={formData.billing_address}
                                onChange={(e) => handleInputChange('billing_address', e.target.value)}
                                placeholder="Adresse complète"
                              />
                            </div>
                            <PostalCodeInput
                              postalCode={formData.billing_postal_code}
                              city={formData.billing_city}
                              country={formData.billing_country}
                              onPostalCodeChange={(value) => handleInputChange('billing_postal_code', value)}
                              onCityChange={(value) => handleInputChange('billing_city', value)}
                              onCountryChange={(value) => handleInputChange('billing_country', value)}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderField("Adresse", "billing_address", client.billing_address || client.address)}
                            {renderField("Ville", "billing_city", client.billing_city || client.city)}
                            {renderField("Code postal", "billing_postal_code", client.billing_postal_code || client.postal_code)}
                            {renderField("Pays", "billing_country", client.billing_country || client.country)}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="delivery" className="space-y-4 mt-4">
                      <div className="bg-muted/20 p-4 rounded-md space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-primary">Adresse de livraison</h4>
                          {isEditing && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="delivery_same_as_billing"
                                checked={formData.delivery_same_as_billing}
                                onCheckedChange={(checked) => handleInputChange('delivery_same_as_billing', checked)}
                              />
                              <Label htmlFor="delivery_same_as_billing" className="text-sm text-muted-foreground">
                                Identique à la facturation
                              </Label>
                            </div>
                          )}
                        </div>
                        
                        {isEditing && !formData.delivery_same_as_billing ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="delivery_address">Adresse</Label>
                              <Input
                                id="delivery_address"
                                value={formData.delivery_address}
                                onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                                placeholder="Adresse complète"
                              />
                            </div>
                            <PostalCodeInput
                              postalCode={formData.delivery_postal_code}
                              city={formData.delivery_city}
                              country={formData.delivery_country}
                              onPostalCodeChange={(value) => handleInputChange('delivery_postal_code', value)}
                              onCityChange={(value) => handleInputChange('delivery_city', value)}
                              onCountryChange={(value) => handleInputChange('delivery_country', value)}
                            />
                          </div>
                        ) : (
                          <div>
                            {isEditing && formData.delivery_same_as_billing ? (
                              <p className="text-sm text-muted-foreground italic">
                                Adresse identique à l'adresse de facturation
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderField("Adresse", "delivery_address", 
                                  client.delivery_address || 
                                  (client.delivery_same_as_billing ? (client.billing_address || client.address) : client.address)
                                )}
                                {renderField("Ville", "delivery_city", 
                                  client.delivery_city || 
                                  (client.delivery_same_as_billing ? (client.billing_city || client.city) : client.city)
                                )}
                                {renderField("Code postal", "delivery_postal_code", 
                                  client.delivery_postal_code || 
                                  (client.delivery_same_as_billing ? (client.billing_postal_code || client.postal_code) : client.postal_code)
                                )}
                                {renderField("Pays", "delivery_country", 
                                  client.delivery_country || 
                                  (client.delivery_same_as_billing ? (client.billing_country || client.country) : client.country)
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
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

                {!readOnly && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Compte utilisateur
                    </h3>
                    <ClientUserAccount 
                      client={client} 
                      onAccountCreated={handleAccountUpdate} 
                    />
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

        <TabsContent value="logo" className="space-y-6">
          {/* Upload de logo */}
          <Card className="shadow-md border-none bg-gradient-to-br from-card to-background">
            <CardHeader className="bg-muted/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Logo du client
              </CardTitle>
              <CardDescription>Gérez le logo utilisé dans les documents PDF</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ClientLogoUploader 
                clientId={client.id}
                initialLogoUrl={client.logo_url}
                onLogoUploaded={(logoUrl) => {
                  setClient(prev => ({ ...prev, logo_url: logoUrl }));
                  onClientUpdate?.({ ...client, logo_url: logoUrl });
                }}
                onLogoRemoved={() => {
                  setClient(prev => ({ ...prev, logo_url: null }));
                  onClientUpdate?.({ ...client, logo_url: null });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subdomain">
          <ClientSubdomainManager 
            clientId={client.id}
            companyName={client.company || client.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedClientView;