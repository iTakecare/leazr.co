
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, updateOffer } from "@/services/offers/offerDetail";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PageTransition from "@/components/layout/PageTransition";
import Container from "@/components/layout/Container";
import {
  AlertCircle,
  ArrowLeft,
  Mail,
  Eye,
  Check,
  Info,
  CalendarIcon,
  Clock,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";
import PriceDetailsDisplay from "@/components/offer/PriceDetailsDisplay";

const AmbassadorOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  useEffect(() => {
    const fetchOfferDetails = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        
        // Vérifier que l'offre appartient bien à l'ambassadeur connecté
        if (!offerData || offerData.user_id !== user.id) {
          setError("Vous n'avez pas accès à cette offre");
          toast.error("Vous n'avez pas accès à cette offre");
          return;
        }
        
        setOffer(offerData);
      } catch (err) {
        console.error("Erreur lors du chargement de l'offre:", err);
        setError("Impossible de charger les détails de l'offre");
        toast.error("Erreur lors du chargement des détails de l'offre");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfferDetails();
  }, [id, user]);
  
  const handleSendEmail = async () => {
    if (!offer || !offer.id) {
      toast.error("Impossible d'envoyer l'email");
      return;
    }
    
    try {
      setSendingEmail(true);
      
      // Si l'offre est en brouillon, on la passe à "sent" avant l'envoi
      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', offer.id)
          .eq('user_id', user?.id);
          
        if (error) throw error;
        
        // Mettre à jour l'état local
        setOffer({ ...offer, workflow_status: 'sent' });
      }
      
      // Simuler l'envoi d'un email (à remplacer par un vrai envoi d'email)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Email envoyé au client avec succès");
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'email:", err);
      toast.error("Impossible d'envoyer l'email");
    } finally {
      setSendingEmail(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "Date inconnue";
    try {
      return format(new Date(dateString), "dd MMMM yyyy, HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };
  
  // Fonction pour obtenir la description de l'état du workflow
  const getWorkflowDescription = (status) => {
    switch (status) {
      case 'draft':
        return "L'offre est en cours de rédaction";
      case 'sent':
        return "L'offre a été envoyée au client";
      case 'viewed':
        return "Le client a consulté l'offre";
      case 'client_accepted':
        return "Le client a accepté l'offre";
      case 'client_rejected':
        return "Le client a refusé l'offre";
      case 'client_waiting':
        return "En attente de réponse du client";
      case 'admin_review':
        return "En cours d'examen par l'administrateur";
      case 'approved':
        return "L'offre a été approuvée";
      case 'rejected':
        return "L'offre a été rejetée";
      default:
        return "Statut inconnu";
    }
  };
  
  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des détails de l'offre...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (error) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate("/ambassador/offers")}>
              Retour aux offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (!offer) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-64">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
            <p className="text-gray-600 mb-4">Cette offre n'existe pas ou a été supprimée.</p>
            <Button onClick={() => navigate("/ambassador/offers")}>
              Retour aux offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  // Extraire les données d'équipement si disponibles
  let equipmentData = [];
  try {
    if (offer.equipment_description) {
      equipmentData = typeof offer.equipment_data === 'object' ? 
        offer.equipment_data : 
        JSON.parse(offer.equipment_description);
    }
  } catch (e) {
    console.log("Erreur de parsing des données d'équipement:", e);
  }

  return (
    <PageTransition>
      <Container>
        <div className="p-4 md:p-6">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/ambassador/offers")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Détail de l'offre</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center mb-2">
                        <h2 className="text-xl font-semibold">
                          Offre pour {offer.client_name}
                        </h2>
                        <OfferStatusBadge status={offer.workflow_status} className="ml-3" />
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        Créée le {formatDate(offer.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSendEmail}
                        disabled={sendingEmail || (offer.workflow_status !== 'draft' && offer.workflow_status !== 'sent')}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {sendingEmail ? 'Envoi...' : "Envoyer au client"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">Détails</TabsTrigger>
                      <TabsTrigger value="equipment">Équipement</TabsTrigger>
                      <TabsTrigger value="status">Suivi</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium mb-2">Informations client</h3>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">{offer.client_name}</span>
                            </div>
                            {offer.client_email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{offer.client_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-2">Détails de paiement</h3>
                          <div className="p-3 bg-slate-50 rounded-md">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Mensualité</p>
                              <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(offer.monthly_payment)}
                                <span className="text-sm font-normal text-gray-500">/mois</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {offer.remarks && (
                        <div className="mt-6">
                          <h3 className="font-medium mb-2">Remarques</h3>
                          <div className="p-3 bg-slate-50 rounded-md">
                            <p className="whitespace-pre-line">{offer.remarks}</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="equipment" className="mt-4">
                      {equipmentData && equipmentData.length > 0 ? (
                        <div className="space-y-4">
                          {equipmentData.map((item, index) => (
                            <Card key={index} className="overflow-hidden">
                              <CardContent className="p-4">
                                <h3 className="font-semibold mb-2">{item.title}</h3>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-gray-500">Quantité</p>
                                    <p className="font-medium">{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Mensualité unitaire</p>
                                    <p className="font-medium text-blue-700">
                                      {formatCurrency(item.monthlyPayment || 0)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-md bg-gray-50">
                          <Info className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-gray-500">Aucune information d'équipement disponible</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="status" className="mt-4">
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-medium mb-3">État actuel</h3>
                          <div className="p-4 border rounded-md bg-slate-50">
                            <div className="flex items-center">
                              <Clock className="h-5 w-5 mr-3 text-blue-600" />
                              <div>
                                <p className="font-medium">
                                  {getWorkflowDescription(offer.workflow_status)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Dernière mise à jour: {formatDate(offer.updated_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium mb-3">Processus de validation</h3>
                          <ol className="relative border-l border-gray-200 ml-3">
                            <li className="mb-6 ml-6">
                              <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${
                                ['draft', 'sent'].includes(offer.workflow_status) ? 'bg-blue-100 ring-blue-100 ring-4' : 'bg-green-100 ring-green-100 ring-4'
                              }`}>
                                {['draft', 'sent'].includes(offer.workflow_status) ? 
                                  <Clock className="w-3 h-3 text-blue-800" /> : 
                                  <Check className="w-3 h-3 text-green-800" />
                                }
                              </span>
                              <h3 className="font-medium">Création de l'offre</h3>
                              <p className="text-sm text-gray-500">
                                {offer.workflow_status === 'draft' ? "En cours" : "Complété"}
                              </p>
                            </li>
                            
                            <li className="mb-6 ml-6">
                              <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${
                                offer.workflow_status === 'draft' ? 'bg-gray-100 ring-gray-100 ring-4' : 
                                offer.workflow_status === 'sent' ? 'bg-blue-100 ring-blue-100 ring-4' : 
                                'bg-green-100 ring-green-100 ring-4'
                              }`}>
                                {offer.workflow_status === 'draft' ? 
                                  <span className="w-3 h-3 text-gray-800">2</span> :
                                  offer.workflow_status === 'sent' ? 
                                  <Mail className="w-3 h-3 text-blue-800" /> : 
                                  <Check className="w-3 h-3 text-green-800" />
                                }
                              </span>
                              <h3 className="font-medium">Envoi au client</h3>
                              <p className="text-sm text-gray-500">
                                {offer.workflow_status === 'draft' ? "En attente" : 
                                 offer.workflow_status === 'sent' ? "En cours" : "Complété"}
                              </p>
                            </li>
                            
                            <li className="mb-6 ml-6">
                              <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${
                                ['draft', 'sent'].includes(offer.workflow_status) ? 'bg-gray-100 ring-gray-100 ring-4' : 
                                ['viewed', 'client_waiting'].includes(offer.workflow_status) ? 'bg-blue-100 ring-blue-100 ring-4' : 
                                'bg-green-100 ring-green-100 ring-4'
                              }`}>
                                {['draft', 'sent'].includes(offer.workflow_status) ? 
                                  <span className="w-3 h-3 text-gray-800">3</span> :
                                  ['viewed', 'client_waiting'].includes(offer.workflow_status) ? 
                                  <Eye className="w-3 h-3 text-blue-800" /> : 
                                  <Check className="w-3 h-3 text-green-800" />
                                }
                              </span>
                              <h3 className="font-medium">Consultation par le client</h3>
                              <p className="text-sm text-gray-500">
                                {['draft', 'sent'].includes(offer.workflow_status) ? "En attente" : 
                                 ['viewed', 'client_waiting'].includes(offer.workflow_status) ? "En cours" : "Complété"}
                              </p>
                            </li>
                            
                            <li className="ml-6">
                              <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${
                                !['client_accepted', 'approved'].includes(offer.workflow_status) ? 'bg-gray-100 ring-gray-100 ring-4' : 
                                'bg-green-100 ring-green-100 ring-4'
                              }`}>
                                {!['client_accepted', 'approved'].includes(offer.workflow_status) ? 
                                  <span className="w-3 h-3 text-gray-800">4</span> :
                                  <Check className="w-3 h-3 text-green-800" />
                                }
                              </span>
                              <h3 className="font-medium">Acceptation</h3>
                              <p className="text-sm text-gray-500">
                                {!['client_accepted', 'approved'].includes(offer.workflow_status) ? 
                                 "En attente" : "Complété"}
                              </p>
                            </li>
                          </ol>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    onClick={handleSendEmail}
                    disabled={sendingEmail || (offer.workflow_status !== 'draft' && offer.workflow_status !== 'sent')}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer au client
                  </Button>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Statut actuel</h3>
                    <div className="p-3 bg-slate-50 rounded-md flex items-center">
                      <OfferStatusBadge status={offer.workflow_status} />
                      <span className="ml-2 text-sm">
                        {getWorkflowDescription(offer.workflow_status)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorOfferDetail;
