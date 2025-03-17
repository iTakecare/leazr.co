
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { useAuth } from "@/context/AuthContext";
import {
  getOfferById,
  updateOfferStatus,
  sendInfoRequest,
  processInfoResponse,
} from "@/services/offerService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCheck, ChevronsUpDown } from "lucide-react";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";

const OfferDetail = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [infoRequestOpen, setInfoRequestOpen] = useState(false);
  const [infoRequestMessage, setInfoRequestMessage] = useState("");

  useEffect(() => {
    if (!offerId) {
      setError("Offer ID is missing");
      setLoading(false);
      return;
    }

    const fetchOffer = async () => {
      setLoading(true);
      setError(null);

      try {
        const offerData = await getOfferById(offerId);
        // Convert offerData to match our Offer interface
        if (offerData) {
          const convertedOffer: Offer = {
            ...offerData,
            type: offerData.type || 'admin_offer',
            // Ensure these properties exist even if they're undefined in the API response
            equipment_description: offerData.equipment_description || '',
            additional_info: offerData.additional_info || '',
          };
          setOffer(convertedOffer);
        } else {
          setOffer(null);
        }
      } catch (err) {
        console.error("Error fetching offer:", err);
        setError("Failed to load offer");
        toast.error("Erreur lors du chargement de l'offre");
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      // Cast newStatus to a valid offer status type
      const success = await updateOfferStatus(offerId, newStatus as any);
    
      if (success) {
        setOffer(prev => prev ? { ...prev, workflow_status: newStatus } : null);
        toast.success("Statut de l'offre mis à jour avec succès");
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating offer status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestInfo = async (message: string) => {
    try {
      setIsRequesting(true);
    
      // Correction: Utiliser seulement offerId et message
      const success = await sendInfoRequest(offerId, message);
    
      if (success) {
        setOffer(prev => (prev ? { ...prev, workflow_status: 'info_requested' } : null));
        toast.success("Demande d'informations envoyée avec succès");
        setInfoRequestOpen(false);
      } else {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } catch (error) {
      console.error("Error requesting additional info:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleProcessInfoResponse = async (approve: boolean) => {
    try {
      setIsProcessing(true);
    
      // Convertir le booléen en string pour l'API
      const responseStatus = approve ? "approved" : "rejected";
      const success = await processInfoResponse(offerId, responseStatus);
    
      if (success) {
        const newStatus = approve ? 'leaser_review' : 'rejected';
        setOffer(prev => (prev ? { ...prev, workflow_status: newStatus } : null));
      
        toast.success(approve 
          ? "L'offre a été approuvée et envoyée au bailleur" 
          : "L'offre a été rejetée"
        );
      } else {
        toast.error("Erreur lors du traitement de la réponse");
      }
    } catch (error) {
      console.error("Error processing info response:", error);
      toast.error("Erreur lors du traitement de la réponse");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div>Loading offer details...</div>;
  }

  if (error || !offer) {
    return <div>Error: {error || "Offer not found"}</div>;
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate("/offers")}>
              Retour à la liste des offres
            </Button>
          </div>

          <h1 className="text-2xl font-bold mb-4">Détails de l'offre</h1>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label>Client</Label>
                <p className="font-medium">{offer.client_name}</p>
                <p className="text-sm text-muted-foreground">{offer.clients?.email}</p>
                <p className="text-sm text-muted-foreground">{offer.clients?.company}</p>
              </div>
              <div>
                <Label>Montant</Label>
                <p className="font-medium">{formatCurrency(offer.amount)}</p>
              </div>
              <div>
                <Label>Mensualité</Label>
                <p className="font-medium">{formatCurrency(offer.monthly_payment)}</p>
              </div>
              <div>
                <Label>Commission</Label>
                <p className="font-medium">{formatCurrency(offer.commission)}</p>
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={offer.workflow_status || ""}
                  onValueChange={handleUpdateStatus}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OFFER_STATUSES).map(
                      ([key, status]) => (
                        <SelectItem key={key} value={status.id}>
                          {status.label}
                          {offer.workflow_status === status.id && (
                            <CheckCheck className="ml-auto h-4 w-4" />
                          )}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Description de l'équipement</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{offer.equipment_description}</p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{offer.additional_info}</p>
            </CardContent>
          </Card>

          {offer.workflow_status === "pending" && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Dialog open={infoRequestOpen} onOpenChange={setInfoRequestOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Demander des informations complémentaires</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Demande d'informations</DialogTitle>
                      <DialogDescription>
                        Entrez votre message pour demander des informations
                        complémentaires au client.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={infoRequestMessage}
                          onChange={(e) => setInfoRequestMessage(e.target.value)}
                          placeholder="Entrez votre message ici"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={() => handleRequestInfo(infoRequestMessage)}
                        disabled={isRequesting}
                      >
                        {isRequesting ? "Envoi en cours..." : "Envoyer la demande"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {offer.workflow_status === "info_requested" && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Réponse du client</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p>Le client a répondu à votre demande d'informations.</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleProcessInfoResponse(true)}
                    disabled={isProcessing}
                  >
                    Approuver l'offre
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleProcessInfoResponse(false)}
                    disabled={isProcessing}
                  >
                    Rejeter l'offre
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
