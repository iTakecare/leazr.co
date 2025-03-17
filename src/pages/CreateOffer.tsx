import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { useCalculator } from "@/hooks/useCalculator";
import { useClients } from "@/hooks/useClients";
import { useLeasers } from "@/hooks/useLeasers";
import { Client } from "@/types/client";
import { Leaser } from "@/types/leaser";
import { Equipment } from "@/types/equipment";
import { createOffer } from "@/services/offerService";
import { getClientIdForUser } from "@/utils/clientUserAssociation";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import ClientSelector from "@/components/offer/ClientSelector";
import LeaserButton from "@/components/offer/LeaserButton";
import LeaserSelector from "@/components/ui/LeaserSelector";
import EquipmentList from "@/components/offer/EquipmentList";
import CalculatorOutput from "@/components/offer/CalculatorOutput";
import MarginAdjuster from "@/components/offer/MarginAdjuster";

const CreateOffer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { calculate, calculator } = useCalculator();
  const { clients, isLoading: isLoadingClients, error: errorClients } = useClients();
  const { leasers, isLoading: isLoadingLeasers, error: errorLeasers } = useLeasers();

  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedLeaser, setSelectedLeaser] = useState<Leaser | null>(null);
  const [equipmentDescription, setEquipmentDescription] = useState<string>('');
  const [equipmentListText, setEquipmentListText] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [leaserSelectorOpen, setLeaserSelectorOpen] = useState(false);
  const [equipment, setEquipment] = useState<Equipment>({ items: [] });

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.id) return;
      try {
        const id = await getClientIdForUser(user.id, user.email || null);
        if (id) {
          setClientId(id);
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Erreur lors de la récupération des données client");
      }
    };

    fetchClientData();
  }, [user]);

  useEffect(() => {
    if (clients && clientId) {
      const client = clients.find(c => c.id === clientId);
      setSelectedClient(client || null);
    }
  }, [clients, clientId]);

  const openClientSelector = () => setClientSelectorOpen(true);
  const closeClientSelector = () => setClientSelectorOpen(false);
  const openLeaserSelector = () => setLeaserSelectorOpen(true);
  const closeLeaserSelector = () => setLeaserSelectorOpen(false);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    closeClientSelector();
  };

  const handleLeaserSelect = (leaser: Leaser) => {
    setSelectedLeaser(leaser);
    closeLeaserSelector();
  };

  const handleEquipmentChange = (newEquipment: Equipment) => {
    setEquipment(newEquipment);
    const totalAmount = newEquipment.items.reduce((sum, item) => sum + item.total_price, 0);
    calculate({ equipmentAmount: totalAmount });
  };

  const saveEditing = () => {
    console.log('Saving edit...');
  };
  
  const updateMargin = (value: number) => {
    console.log('Updating margin:', value);
  };

  const createOffer = async () => {
    if (!selectedClient) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    if (!selectedLeaser) {
      toast.error("Veuillez sélectionner un partenaire financier");
      return;
    }

    if (!calculator.finalAmount || calculator.finalAmount <= 0) {
      toast.error("Le montant total doit être supérieur à zéro");
      return;
    }

    setIsSubmitting(true);

    try {
      const offerData = {
        clientId,
        client_name: selectedClient?.name || '',
        client_email: selectedClient?.email || '',
        leaser_id: selectedLeaser?.id || '',
        amount: calculator.finalAmount,
        coefficient: calculator.coefficient,
        equipment_description: equipmentDescription,
        equipment_text: equipmentListText,
        monthly_payment: calculator.monthlyPayment,
        commission: calculator.commission,
        additional_info: additionalInfo,
        user_id: user?.id || ''
      };

      const newOffer = await createOffer(offerData);

      if (newOffer) {
        toast.success("Offre créée avec succès !");
        navigate(`/offers/${newOffer.id}`);
      } else {
        toast.error("Erreur lors de la création de l'offre");
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'offre:", error);
      toast.error("Une erreur s'est produite lors de la création de l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <h1 className="text-2xl font-bold mb-6">Créer une nouvelle offre</h1>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Client</Label>
                  <ClientSelector
                    selectedClient={selectedClient}
                    onSelect={openClientSelector}
                  />
                </div>

                <div>
                  <Label htmlFor="leaser">Partenaire Financier</Label>
                  <LeaserButton 
                    selectedLeaser={selectedLeaser} 
                    onSelect={openLeaserSelector} 
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="equipmentDescription">Description de l'équipement</Label>
                <Input
                  id="equipmentDescription"
                  value={equipmentDescription}
                  onChange={(e) => setEquipmentDescription(e.target.value)}
                  placeholder="Description concise de l'équipement"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Liste d'équipement</CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentList equipment={equipment} onChange={handleEquipmentChange} />
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Calculateur</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <CalculatorOutput calculator={calculator} />
              <MarginAdjuster 
                calculator={calculator}
                updateMargin={updateMargin}
                saveEditing={saveEditing}
              />
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="equipmentListText">Texte de la liste d'équipement</Label>
                <Textarea
                  id="equipmentListText"
                  value={equipmentListText}
                  onChange={(e) => setEquipmentListText(e.target.value)}
                  placeholder="Liste détaillée de l'équipement pour l'offre"
                  className="h-24"
                />
              </div>

              <div>
                <Label htmlFor="additionalInfo">Informations supplémentaires</Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Informations supplémentaires à inclure dans l'offre"
                  className="h-24"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button disabled={isSubmitting} onClick={createOffer}>
              {isSubmitting ? "Création en cours..." : "Créer l'offre"}
            </Button>
          </div>

          <ClientSelector
            isOpen={clientSelectorOpen}
            onClose={closeClientSelector}
            onSelect={handleClientSelect}
            clients={clients || []}
          />

          <LeaserSelector
            isOpen={leaserSelectorOpen}
            onClose={closeLeaserSelector}
            selectedLeaser={selectedLeaser}
            onSelect={handleLeaserSelect}
            leasers={leasers || []}
          />
        </div>
      </Container>
    </PageTransition>
  );
};

export default CreateOffer;
