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
  Calendar,
  User, 
  Package, 
  Activity,
  DownloadCloud,
  Send,
  Building,
  Clock,
  Banknote,
  MessageSquare,
  CheckCircle,
  BarChart3
} from "lucide-react";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { generateAndDownloadOfferPdf } from "@/services/offerService";
import { useOfferDetail } from "@/hooks/offers/useOfferDetail";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import OfferWorkflowSection from "@/components/offers/OfferWorkflowSection";
import { updateOfferStatus } from "@/services/offers/offerStatus";
import { formatCurrency } from "@/utils/formatters";
import ClientInformation from "@/components/offers/ClientInformation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import EquipmentDetailTable from "@/components/offers/EquipmentDetailTable";

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", { 
      dateStyle: "long",
      timeZone: "Europe/Paris" 
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-muted-foreground">Chargement des détails...</span>
        </div>
      );
    }

    if (error || !offer) {
      return (
        <div className="text-center py-12 px-6 bg-red-50 rounded-lg border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-700">Erreur</h2>
          <p className="text-red-600 mb-6">{error || "Offre non trouvée"}</p>
          <Button onClick={handleGoBack} variant="outline" className="bg-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux offres
          </Button>
        </div>
      );
    }

    const totalMargin = offer.margin ? parseFloat(offer.margin.toString()) : 0;
    const marginDifference = offer.margin_difference || 0;
    const totalMarginWithDifference = offer.total_margin_with_difference 
      ? parseFloat(offer.total_margin_with_difference.toString()) 
      : totalMargin + marginDifference;

    const financed_amount = offer.financed_amount || (offer.coefficient && offer.monthly_payment 
      ? parseFloat((offer.coefficient * offer.monthly_payment).toFixed(2))
      : 0);

    const totalMonthly = offer.monthly_payment || 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Offre #{offer.id.substring(0, 8)}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Créée le {formatDate(offer.created_at)}</span>
              <OfferStatusBadge 
                status={offer.workflow_status || "draft"} 
                isConverted={offer.converted_to_contract}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGoBack}
              className="bg-white/80 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-white/80 hover:bg-white"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center justify-between">
                  <span>Détails de l'offre</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 rounded-none border-b bg-muted/20">
                    <TabsTrigger value="details" className="rounded-none data-[state=active]:bg-background">
                      <User className="h-4 w-4 mr-2" />
                      Client
                    </TabsTrigger>
                    <TabsTrigger value="equipment" className="rounded-none data-[state=active]:bg-background">
                      <Package className="h-4 w-4 mr-2" />
                      Équipement
                    </TabsTrigger>
                    <TabsTrigger value="workflow" className="rounded-none data-[state=active]:bg-background">
                      <Activity className="h-4 w-4 mr-2" />
                      Suivi
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="p-6">
                    <TabsContent value="details">
                      <ClientInformation 
                        clientName={offer.client_name}
                        clientEmail={offer.client_email}
                        clientCompany={offer.client_company}
                      />
                      
                      {(offer.signed_at || offer.signer_name || offer.signer_ip) && (
                        <Card className="mb-6 border border-green-100 bg-green-50">
                          <CardHeader className="pb-2 bg-green-100/50">
                            <CardTitle className="text-base flex items-center text-green-800">
                              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                              Informations de signature
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 text-green-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {offer.signed_at && (
                                <div>
                                  <p className="text-sm font-medium text-green-700">Date de signature</p>
                                  <p>{formatDate(offer.signed_at)}</p>
                                </div>
                              )}
                              {offer.signer_name && (
                                <div>
                                  <p className="text-sm font-medium text-green-700">Signataire</p>
                                  <p>{offer.signer_name}</p>
                                </div>
                              )}
                              {offer.signer_ip && (
                                <div>
                                  <p className="text-sm font-medium text-green-700">Adresse IP</p>
                                  <p className="font-mono text-sm">{offer.signer_ip}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <Button
                          variant="outline"
                          className="w-full bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-700"
                          onClick={() => {
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
                            toast.success("Email envoyé au client");
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer par email
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="equipment">
                      <div className="space-y-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-md p-4 flex flex-col items-center justify-center border border-blue-100">
                              <Banknote className="h-6 w-6 text-blue-600 mb-2" />
                              <h3 className="text-sm font-medium text-gray-500">Montant financé</h3>
                              <p className="text-lg font-bold text-blue-700">{formatCurrency(financed_amount)}</p>
                            </div>
                            <div className="bg-white rounded-md p-4 flex flex-col items-center justify-center border border-blue-100">
                              <Clock className="h-6 w-6 text-indigo-600 mb-2" />
                              <h3 className="text-sm font-medium text-gray-500">Mensualité</h3>
                              <p className="text-lg font-bold text-indigo-700">{formatCurrency(offer.monthly_payment || 0)}</p>
                            </div>
                            <div className="bg-white rounded-md p-4 flex flex-col items-center justify-center border border-blue-100">
                              <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                              <h3 className="text-sm font-medium text-gray-500">Durée</h3>
                              <p className="text-lg font-bold text-purple-700">{offer.duration || 36} mois</p>
                            </div>
                          </div>
                        </div>
                        
                        {offer.parsedEquipment && offer.parsedEquipment.length > 0 ? (
                          <EquipmentDetailTable 
                            equipment={offer.parsedEquipment} 
                            totalMonthly={totalMonthly}
                            totalMargin={totalMargin}
                            totalMarginWithDifference={totalMarginWithDifference}
                          />
                        ) : offer.equipment_description ? (
                          <div>
                            <h3 className="font-medium mb-2 flex items-center">
                              <Package className="h-4 w-4 mr-2 text-blue-600" />
                              Description de l'équipement
                            </h3>
                            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                              <p className="whitespace-pre-line">{offer.equipment_description}</p>
                            </div>
                          </div>
                        ) : null}
                        
                        {offer.remarks && (
                          <div>
                            <h3 className="font-medium mb-2 flex items-center">
                              <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                              Remarques
                            </h3>
                            <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
                              <p className="text-amber-800">{offer.remarks}</p>
                            </div>
                          </div>
                        )}
                      </div>
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
          
          <div className="md:col-span-1">
            <div className="space-y-4">
              <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="text-base">Résumé</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Status</span>
                      <OfferStatusBadge 
                        status={offer.workflow_status || "draft"} 
                        isConverted={offer.converted_to_contract}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Client</span>
                      <span className="font-medium">{offer.client_name}</span>
                    </div>
                    
                    {offer.client_company && (
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Entreprise</span>
                        <span className="font-medium">{offer.client_company}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Montant financé</span>
                      <span className="font-medium text-blue-700">{formatCurrency(financed_amount)}</span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Montant mensuel</span>
                      <span className="font-medium text-blue-700">{formatCurrency(offer.monthly_payment || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Montant total</span>
                      <span className="font-medium text-blue-700">{formatCurrency((offer.monthly_payment || 0) * (offer.duration || 36))}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Marge générée</span>
                      <span className="font-medium text-green-600">{formatCurrency(totalMarginWithDifference || totalMargin)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Date de création</span>
                      <span className="font-medium">{formatDate(offer.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {offer.signed_at && (
                <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader className="pb-3 bg-green-100">
                    <CardTitle className="text-base text-green-800">Offre signée</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-center p-2 bg-green-50 rounded-full w-16 h-16 mx-auto mb-3">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-center text-green-700">
                      Cette offre a été signée le {formatDate(offer.signed_at)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageTransition>
      <Container>
        <div className="py-6">{renderContent()}</div>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
