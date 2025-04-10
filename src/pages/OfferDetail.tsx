
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  FileDown, 
  Printer, 
  User, 
  Package, 
  Activity,
  DownloadCloud,
  Send
} from "lucide-react";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { generateAndDownloadOfferPdf } from "@/services/offerService";
import { useOfferDetail } from "@/hooks/offers/useOfferDetail";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import OfferWorkflowSection from "@/components/offers/OfferWorkflowSection";
import { updateOfferStatus } from "@/services/offers/offerStatus";

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const { 
    offer, 
    loading, 
    error, 
    fetchOffer 
  } = useOfferDetail(id || "");

  const handleGoBack = () => {
    navigate("/offers");
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    
    try {
      setIsGeneratingPdf(true);
      toast.info("Génération du PDF en cours...");
      
      const filename = await generateAndDownloadOfferPdf(id);
      
      if (filename) {
        toast.success(`PDF généré avec succès: ${filename}`);
      } else {
        throw new Error("Erreur lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !offer) return;
    
    setIsUpdatingStatus(true);
    try {
      const success = await updateOfferStatus(
        id,
        newStatus,
        offer.workflow_status,
        "Statut mis à jour depuis la page de détails"
      );
      
      if (success) {
        toast.success(`Statut mis à jour avec succès`);
        fetchOffer();
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (error || !offer) {
      return (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Erreur</h2>
          <p className="text-muted-foreground mb-4">{error || "Offre non trouvée"}</p>
          <Button onClick={handleGoBack}>Retour aux offres</Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <OfferStatusBadge 
              status={offer.workflow_status || "draft"} 
              className="h-7 px-2 text-xs" 
              isConverted={offer.converted_to_contract}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Télécharger PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between">
              <span>Offre #{offer.id.substring(0, 8)}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Créée le {new Date(offer.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="details">
                  <User className="h-4 w-4 mr-2" />
                  Client
                </TabsTrigger>
                <TabsTrigger value="equipment">
                  <Package className="h-4 w-4 mr-2" />
                  Équipement
                </TabsTrigger>
                <TabsTrigger value="workflow">
                  <Activity className="h-4 w-4 mr-2" />
                  Suivi
                </TabsTrigger>
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="details">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informations client</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium">Nom</h3>
                          <p>{offer.client_name}</p>
                        </div>
                        <div>
                          <h3 className="font-medium">Email</h3>
                          <p>{offer.client_email}</p>
                        </div>
                        {offer.client_company && (
                          <div>
                            <h3 className="font-medium">Société</h3>
                            <p>{offer.client_company}</p>
                          </div>
                        )}
                        {offer.signed_at && (
                          <div>
                            <h3 className="font-medium">Signée le</h3>
                            <p>{new Date(offer.signed_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
                          </div>
                        )}
                        {offer.signer_name && (
                          <div>
                            <h3 className="font-medium">Signataire</h3>
                            <p>{offer.signer_name}</p>
                          </div>
                        )}
                        {offer.signer_ip && (
                          <div>
                            <h3 className="font-medium">IP du signataire</h3>
                            <p>{offer.signer_ip}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="mt-6 flex gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Générer un lien de signature
                        const origin = window.location.origin;
                        const signatureLink = `${origin}/client/sign/${id}`;
                        navigator.clipboard.writeText(signatureLink);
                        toast.success("Lien de signature copié dans le presse-papier");
                      }}
                    >
                      <DownloadCloud className="h-4 w-4 mr-2" />
                      Copier lien de signature
                    </Button>
                    
                    <Button
                      className="w-full"
                      onClick={() => {
                        // Simuler l'envoi d'un email (serait implémenté avec un service d'emailing dans une application réelle)
                        toast.success("Email envoyé au client");
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer par email
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="equipment">
                  <Card>
                    <CardHeader>
                      <CardTitle>Détails de l'équipement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-medium mb-2">Description</h3>
                          <div className="bg-muted p-4 rounded-md">
                            <p className="whitespace-pre-line">{offer.equipment_description}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h3 className="font-medium">Montant financé</h3>
                            <p>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.financed_amount || 0)}</p>
                          </div>
                          <div>
                            <h3 className="font-medium">Mensualité</h3>
                            <p>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.monthly_payment || 0)}</p>
                          </div>
                          <div>
                            <h3 className="font-medium">Durée</h3>
                            <p>{offer.duration || 0} mois</p>
                          </div>
                        </div>
                        
                        {offer.remarks && (
                          <div>
                            <h3 className="font-medium mb-2">Remarques</h3>
                            <p className="text-muted-foreground">{offer.remarks}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="workflow">
                  <OfferWorkflowSection 
                    offerId={offer.id}
                    currentStatus={offer.workflow_status || "draft"}
                    lastUpdated={offer.updated_at}
                    isAdmin={true}
                    onStatusChange={handleStatusChange}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-8">{renderContent()}</div>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
