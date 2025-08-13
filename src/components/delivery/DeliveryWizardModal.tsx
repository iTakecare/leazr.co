import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft, Package, MapPin, User, Building } from "lucide-react";
import { ContractEquipment } from "@/services/contractService";
import { Collaborator } from "@/types/client";
import { DeliverySite } from "@/types/deliverySite";
import { updateContractEquipmentLegacyDelivery } from "@/services/deliveryService";
import { createCollaborator, getClientCollaborators } from "@/services/clientService";
import { createDeliverySite, getClientDeliverySites } from "@/services/deliverySiteService";
import { toast } from "sonner";

interface DeliveryConfig {
  equipmentId: string;
  deliveryType: 'main_client' | 'collaborator' | 'predefined_site' | 'specific_address';
  collaboratorId?: string;
  deliverySiteId?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryCountry?: string;
  deliveryContactName?: string;
  deliveryContactEmail?: string;
  deliveryContactPhone?: string;
}

interface DeliveryWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: ContractEquipment[];
  clientId: string;
  contractId: string;
  onComplete: () => void;
}

const DeliveryWizardModal: React.FC<DeliveryWizardModalProps> = ({
  open,
  onOpenChange,
  equipment,
  clientId,
  contractId,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryConfigs, setDeliveryConfigs] = useState<DeliveryConfig[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [deliverySites, setDeliverySites] = useState<DeliverySite[]>([]);
  const [newCollaborator, setNewCollaborator] = useState({
    name: "", role: "", email: "", phone: "", department: ""
  });
  const [newSite, setNewSite] = useState({
    site_name: "", address: "", city: "", postal_code: "", country: "BE",
    contact_name: "", contact_email: "", contact_phone: "", notes: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Initialiser les configurations de livraison
      const configs = equipment.map(eq => ({
        equipmentId: eq.id,
        deliveryType: 'main_client' as const,
        deliveryCountry: 'BE'
      }));
      setDeliveryConfigs(configs);
      
      // Charger les collaborateurs et sites existants
      loadExistingData();
    }
  }, [open, equipment]);

  const loadExistingData = async () => {
    try {
      const [collabData, sitesData] = await Promise.all([
        getClientCollaborators(clientId),
        getClientDeliverySites(clientId)
      ]);
      setCollaborators(collabData);
      setDeliverySites(sitesData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  const updateDeliveryConfig = (equipmentId: string, updates: Partial<DeliveryConfig>) => {
    setDeliveryConfigs(prev => prev.map(config => 
      config.equipmentId === equipmentId ? { ...config, ...updates } : config
    ));
  };

  const createNewCollaborator = async () => {
    if (!newCollaborator.name || !newCollaborator.role) {
      toast.error("Nom et rôle requis pour le collaborateur");
      return;
    }

    try {
      const collaborator = await createCollaborator(clientId, newCollaborator);
      setCollaborators(prev => [...prev, collaborator]);
      setNewCollaborator({ name: "", role: "", email: "", phone: "", department: "" });
      toast.success("Collaborateur créé avec succès");
    } catch (error) {
      toast.error("Erreur lors de la création du collaborateur");
    }
  };

  const createNewDeliverySite = async () => {
    if (!newSite.site_name || !newSite.address || !newSite.city) {
      toast.error("Nom du site, adresse et ville requis");
      return;
    }

    try {
      const site = await createDeliverySite({
        client_id: clientId,
        ...newSite
      });
      setDeliverySites(prev => [...prev, site]);
      setNewSite({
        site_name: "", address: "", city: "", postal_code: "", country: "BE",
        contact_name: "", contact_email: "", contact_phone: "", notes: ""
      });
      toast.success("Site de livraison créé avec succès");
    } catch (error) {
      toast.error("Erreur lors de la création du site");
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Sauvegarder toutes les configurations de livraison
      for (const config of deliveryConfigs) {
        await updateContractEquipmentLegacyDelivery(config.equipmentId, {
          delivery_type: config.deliveryType,
          collaborator_id: config.collaboratorId,
          delivery_site_id: config.deliverySiteId,
          delivery_address: config.deliveryAddress,
          delivery_city: config.deliveryCity,
          delivery_postal_code: config.deliveryPostalCode,
          delivery_country: config.deliveryCountry,
          delivery_contact_name: config.deliveryContactName,
          delivery_contact_email: config.deliveryContactEmail,
          delivery_contact_phone: config.deliveryContactPhone
        });
      }
      
      toast.success("Configuration des livraisons sauvegardée");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Package className="h-12 w-12 mx-auto text-primary mb-2" />
        <h3 className="text-lg font-semibold">Configuration des livraisons</h3>
        <p className="text-muted-foreground">Configurons où livrer chaque équipement de ce contrat</p>
      </div>

      {equipment.map((eq) => {
        const config = deliveryConfigs.find(c => c.equipmentId === eq.id);
        return (
          <Card key={eq.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{eq.title}</h4>
                <p className="text-sm text-muted-foreground">Quantité: {eq.quantity}</p>
              </div>
            </div>
            
            <RadioGroup
              value={config?.deliveryType || 'main_client'}
              onValueChange={(value) => updateDeliveryConfig(eq.id, { deliveryType: value as any })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="main_client" id={`main_client_${eq.id}`} />
                <Label htmlFor={`main_client_${eq.id}`} className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Livrer au client principal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="collaborator" id={`collaborator_${eq.id}`} />
                <Label htmlFor={`collaborator_${eq.id}`} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Livrer à un collaborateur
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="predefined_site" id={`site_${eq.id}`} />
                <Label htmlFor={`site_${eq.id}`} className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Livrer à un site prédéfini
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific_address" id={`specific_${eq.id}`} />
                <Label htmlFor={`specific_${eq.id}`} className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Livrer à une adresse spécifique
                </Label>
              </div>
            </RadioGroup>
          </Card>
        );
      })}
    </div>
  );

  const renderStep2 = () => {
    const needsCollaborators = deliveryConfigs.some(c => c.deliveryType === 'collaborator');
    
    if (!needsCollaborators) {
      return (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Aucune livraison vers un collaborateur configurée</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Configuration des collaborateurs</h3>
          <p className="text-muted-foreground mb-4">Sélectionnez ou créez les collaborateurs pour les livraisons</p>
        </div>

        {/* Collaborateurs existants */}
        {collaborators.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Collaborateurs existants</h4>
            <div className="grid gap-2">
              {collaborators.map(collab => (
                <Card key={collab.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{collab.name}</p>
                      <p className="text-sm text-muted-foreground">{collab.role} - {collab.email}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Créer nouveau collaborateur */}
        <div>
          <h4 className="font-medium mb-3">Créer un nouveau collaborateur</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="collab_name">Nom *</Label>
              <Input
                id="collab_name"
                value={newCollaborator.name}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du collaborateur"
              />
            </div>
            <div>
              <Label htmlFor="collab_role">Rôle *</Label>
              <Input
                id="collab_role"
                value={newCollaborator.role}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Rôle/Fonction"
              />
            </div>
            <div>
              <Label htmlFor="collab_email">Email</Label>
              <Input
                id="collab_email"
                type="email"
                value={newCollaborator.email}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="collab_phone">Téléphone</Label>
              <Input
                id="collab_phone"
                value={newCollaborator.phone}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+32 XXX XX XX XX"
              />
            </div>
          </div>
          <Button onClick={createNewCollaborator} className="mt-3">
            Créer le collaborateur
          </Button>
        </div>

        {/* Attribution des équipements aux collaborateurs */}
        <div>
          <h4 className="font-medium mb-3">Attribution des équipements</h4>
          {deliveryConfigs.filter(c => c.deliveryType === 'collaborator').map(config => {
            const eq = equipment.find(e => e.id === config.equipmentId);
            return (
              <Card key={config.equipmentId} className="p-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{eq?.title}</span>
                  <select 
                    className="border rounded px-2 py-1"
                    value={config.collaboratorId || ''}
                    onChange={(e) => updateDeliveryConfig(config.equipmentId, { collaboratorId: e.target.value })}
                  >
                    <option value="">Sélectionner un collaborateur</option>
                    {collaborators.map(collab => (
                      <option key={collab.id} value={collab.id}>{collab.name} - {collab.role}</option>
                    ))}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const needsSites = deliveryConfigs.some(c => c.deliveryType === 'predefined_site');
    
    if (!needsSites) {
      return (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Aucune livraison vers un site prédéfini configurée</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Configuration des sites de livraison</h3>
          <p className="text-muted-foreground mb-4">Sélectionnez ou créez les sites pour les livraisons</p>
        </div>

        {/* Sites existants */}
        {deliverySites.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Sites existants</h4>
            <div className="grid gap-2">
              {deliverySites.map(site => (
                <Card key={site.id} className="p-3">
                  <div>
                    <p className="font-medium">{site.site_name}</p>
                    <p className="text-sm text-muted-foreground">{site.address}, {site.city}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Créer nouveau site */}
        <div>
          <h4 className="font-medium mb-3">Créer un nouveau site</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="site_name">Nom du site *</Label>
              <Input
                id="site_name"
                value={newSite.site_name}
                onChange={(e) => setNewSite(prev => ({ ...prev, site_name: e.target.value }))}
                placeholder="Bureau principal, Entrepôt, etc."
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="site_address">Adresse *</Label>
              <Input
                id="site_address"
                value={newSite.address}
                onChange={(e) => setNewSite(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rue, numéro"
              />
            </div>
            <div>
              <Label htmlFor="site_city">Ville *</Label>
              <Input
                id="site_city"
                value={newSite.city}
                onChange={(e) => setNewSite(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ville"
              />
            </div>
            <div>
              <Label htmlFor="site_postal">Code postal</Label>
              <Input
                id="site_postal"
                value={newSite.postal_code}
                onChange={(e) => setNewSite(prev => ({ ...prev, postal_code: e.target.value }))}
                placeholder="1000"
              />
            </div>
          </div>
          <Button onClick={createNewDeliverySite} className="mt-3">
            Créer le site
          </Button>
        </div>

        {/* Attribution des équipements aux sites */}
        <div>
          <h4 className="font-medium mb-3">Attribution des équipements</h4>
          {deliveryConfigs.filter(c => c.deliveryType === 'predefined_site').map(config => {
            const eq = equipment.find(e => e.id === config.equipmentId);
            return (
              <Card key={config.equipmentId} className="p-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{eq?.title}</span>
                  <select 
                    className="border rounded px-2 py-1"
                    value={config.deliverySiteId || ''}
                    onChange={(e) => updateDeliveryConfig(config.equipmentId, { deliverySiteId: e.target.value })}
                  >
                    <option value="">Sélectionner un site</option>
                    {deliverySites.map(site => (
                      <option key={site.id} value={site.id}>{site.site_name}</option>
                    ))}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Récapitulatif des livraisons</h3>
        <p className="text-muted-foreground mb-4">Vérifiez la configuration avant validation</p>
      </div>

      {equipment.map(eq => {
        const config = deliveryConfigs.find(c => c.equipmentId === eq.id);
        if (!config) return null;

        let deliveryInfo = "";
        if (config.deliveryType === 'main_client') {
          deliveryInfo = "Client principal";
        } else if (config.deliveryType === 'collaborator' && config.collaboratorId) {
          const collab = collaborators.find(c => c.id === config.collaboratorId);
          deliveryInfo = `Collaborateur: ${collab?.name} (${collab?.role})`;
        } else if (config.deliveryType === 'predefined_site' && config.deliverySiteId) {
          const site = deliverySites.find(s => s.id === config.deliverySiteId);
          deliveryInfo = `Site: ${site?.site_name}`;
        } else if (config.deliveryType === 'specific_address') {
          deliveryInfo = "Adresse spécifique (à configurer)";
        }

        return (
          <Card key={eq.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{eq.title}</h4>
                <p className="text-sm text-muted-foreground">Quantité: {eq.quantity}</p>
              </div>
              <Badge variant="outline">{deliveryInfo}</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assistant de configuration des livraisons - Étape {currentStep}/4
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step < currentStep 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step}
                </div>
                {step < 4 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          
          {currentStep < 4 ? (
            <Button onClick={nextStep}>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Sauvegarde..." : "Valider la configuration"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryWizardModal;