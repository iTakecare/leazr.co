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
  User,
  Pencil,
  SendHorizontal,
  Sparkle,
  Building,
  Star,
  Euro
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OfferStatusBadge, { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import PriceDetailsDisplay from "@/components/offer/PriceDetailsDisplay";
import { Progress } from "@/components/ui/progress";

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
        
        // La commission est maintenant correctement calculée dans getOfferById
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
  
  // Tableau des statuts dans l'ordre du workflow
  const workflowStatuses = [
    { 
      id: OFFER_STATUSES.DRAFT.id, 
      label: 'Brouillon', 
      icon: Pencil, 
      color: 'bg-green-100',
      textColor: 'text-green-700',
      ringColor: 'ring-green-100',
      iconColor: 'text-green-800'
    },
    { 
      id: OFFER_STATUSES.SENT.id, 
      label: 'Envoyée', 
      icon: SendHorizontal, 
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
      ringColor: 'ring-blue-100',
      iconColor: 'text-blue-800'
    },
    { 
      id: OFFER_STATUSES.VALID_ITC.id, 
      label: 'Valid. ITC', 
      icon: Sparkle, 
      color: 'bg-purple-100',
      textColor: 'text-purple-700',
      ringColor: 'ring-purple-100',
      iconColor: 'text-purple-800'
    },
    { 
      id: OFFER_STATUSES.APPROVED.id, 
      label: 'Approuvée', 
      icon: Check, 
      color: 'bg-emerald-100',
      textColor: 'text-emerald-700',
      ringColor: 'ring-emerald-100',
      iconColor: 'text-emerald-800'
    },
    { 
      id: OFFER_STATUSES.LEASER_REVIEW.id, 
      label: 'Valid. bailleur', 
      icon: Building, 
      color: 'bg-indigo-100',
      textColor: 'text-indigo-700',
      ringColor: 'ring-indigo-100',
      iconColor: 'text-indigo-800'
    },
    { 
      id: OFFER_STATUSES.FINANCED.id, 
      label: 'Financée', 
      icon: Star, 
      color: 'bg-green-100',
      textColor: 'text-green-700',
      ringColor: 'ring-green-100',
      iconColor: 'text-green-800'
    }
  ];
  
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

  // Fonction pour déterminer si une étape est active, complétée ou en attente
  const getStepStatus = (stepId) => {
    const currentStatusIndex = workflowStatuses.findIndex(status => status.id === offer.workflow_status);
    const stepIndex = workflowStatuses.findIndex(status => status.id === stepId);
    
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'active';
    return 'pending';
  };

  // Determine commission status display
  const getCommissionStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Annulée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status || 'Non défini'}</Badge>;
    }
  };

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
                      
                      {/* Nouveau bloc pour afficher la commission */}
                      <div className="mt-6">
                        <h3 className="font-medium mb-2">Votre commission</h3>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Euro className="h-5 w-5 text-green-700" />
                              </div>
                              <div>
                                <p className="text-sm text-green-800">Commission pour cette offre</p>
                                <p className="text-2xl font-bold text-green-700">{formatCurrency(offer.commission || 0)}</p>
                              </div>
                            </div>
                            <div>
                              {getCommissionStatusBadge(offer.commission_status)}
                              {offer.commission_paid_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Payée le {formatDate(offer.commission_paid_at)}
                                </p>
                              )}
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
                                  {OFFER_STATUSES[offer.workflow_status.toUpperCase()]?.label || "Statut inconnu"}
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
                          
                          {/* Workflow Steps Visualization - Desktop */}
                          <div className="hidden md:flex justify-between mb-4">
                            {workflowStatuses.map((status, index) => {
                              const stepStatus = getStepStatus(status.id);
                              return (
                                <div key={status.id} className="flex flex-col items-center">
                                  <div 
                                    className={`flex items-center justify-center w-16 h-16 rounded-full mb-2 ${
                                      stepStatus === 'completed' ? 'bg-green-100' : 
                                      stepStatus === 'active' ? status.color : 
                                      'bg-gray-100'
                                    }`}
                                  >
                                    {stepStatus === 'completed' ? (
                                      <Check className="h-6 w-6 text-green-700" />
                                    ) : (
                                      status.id === 'sent' ? (
                                        <span className="text-xl font-medium">E</span>
                                      ) : status.id === 'valid_itc' ? (
                                        <span className="text-xl font-medium">V</span>
                                      ) : status.id === 'approved' ? (
                                        <span className="text-xl font-medium">A</span>
                                      ) : status.id === 'leaser_review' ? (
                                        <span className="text-xl font-medium">V</span>
                                      ) : status.id === 'financed' ? (
                                        <span className="text-xl font-medium">F</span>
                                      ) : (
                                        <status.icon className="h-6 w-6" />
                                      )
                                    )}
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    stepStatus === 'active' ? 'text-blue-700' :
                                    stepStatus === 'completed' ? 'text-green-700' : 
                                    'text-gray-500'
                                  }`}>
                                    {status.label}
                                  </span>
                                  {index < workflowStatuses.length - 1 && (
                                    <div className="absolute hidden md:block" style={{
                                      left: `calc(${(index + 0.5) * (100 / workflowStatuses.length)}%)`,
                                      width: `calc(${100 / workflowStatuses.length}%)`,
                                      top: '2.5rem',
                                      height: '2px',
                                      backgroundColor: stepStatus === 'completed' ? '#22c55e' : '#e5e7eb'
                                    }}></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Workflow Steps Visualization - Mobile */}
                          <div className="md:hidden">
                            <ol className="relative border-l border-gray-200 ml-3">
                              {workflowStatuses.map((status, index) => {
                                const stepStatus = getStepStatus(status.id);
                                return (
                                  <li key={status.id} className="mb-6 ml-6">
                                    <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ${
                                      stepStatus === 'completed' ? 'bg-green-100 ring-green-100 ring-4' : 
                                      stepStatus === 'active' ? `${status.color} ${status.ringColor} ring-4` : 
                                      'bg-gray-100 ring-gray-100 ring-4'
                                    }`}>
                                      {stepStatus === 'completed' ? 
                                        <Check className="w-3 h-3 text-green-800" /> : 
                                        stepStatus === 'active' ?
                                        <status.icon className={`w-3 h-3 ${status.iconColor}`} /> :
                                        <span className="w-3 h-3 text-gray-800">{index + 1}</span>
                                      }
                                    </span>
                                    <h3 className="font-medium">{status.label}</h3>
                                    <p className="text-sm text-gray-500">
                                      {stepStatus === 'completed' ? "Complété" : 
                                      stepStatus === 'active' ? "En cours" : "En attente"}
                                    </p>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                          
                          {/* Status Progress Bar */}
                          <div className="mt-4">
                            <Progress 
                              value={OFFER_STATUSES[offer.workflow_status.toUpperCase()]?.progressValue || 0} 
                              className="h-2"
                            />
                            <p className="text-xs text-gray-500 mt-1 text-right">
                              {OFFER_STATUSES[offer.workflow_status.toUpperCase()]?.progressValue || 0}% complété
                            </p>
                          </div>
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
                      <OfferStatusBadge status={offer.workflow_status} className="mr-2" />
                    </div>
                  </div>
                  
                  {/* Affichage de la commission dans la sidebar */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Commission</h3>
                    <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatCurrency(offer.commission || 0)}</span>
                        {getCommissionStatusBadge(offer.commission_status)}
                      </div>
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
