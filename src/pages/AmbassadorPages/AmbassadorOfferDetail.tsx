
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, updateOffer } from "@/services/offers/offerDetail";
import { formatCurrency } from "@/utils/formatters";
import { format, differenceInMonths } from "date-fns";
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
import { calculateFinancedAmount, calculateCommissionByLevel } from "@/utils/calculator";
import { translateOfferType } from "@/utils/offerTypeTranslator";
import { TooltipProvider } from "@/components/ui/tooltip";

const AmbassadorOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState("status");  // Changé de "details" à "status" (pour la vue ambassador)
  const [recalculatingCommission, setRecalculatingCommission] = useState(false);
  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  
  useEffect(() => {
    const fetchOfferDetails = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        
        if (!offerData || offerData.user_id !== user.id) {
          setError("Vous n'avez pas accès à cette offre");
          toast.error("Vous n'avez pas accès à cette offre");
          return;
        }
        
        setOffer(offerData);
        
        if (offerData.converted_to_contract) {
          try {
            const { data: contractData } = await supabase
              .from('contracts')
              .select('created_at')
              .eq('offer_id', id)
              .single();
            
            if (contractData) {
              const startDate = new Date(contractData.created_at);
              const endDate = new Date(startDate);
              endDate.setMonth(startDate.getMonth() + 36);
              setContractEndDate(endDate);
            }
          } catch (err) {
            console.error("Erreur lors de la récupération du contrat:", err);
          }
        }
        
        if (offerData.type === 'ambassador_offer' && offerData.ambassador_id) {
          await updateCommission(offerData);
        }
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
  
  const updateCommission = async (offerData: any) => {
    try {
      setRecalculatingCommission(true);
      
      if (!offerData.ambassador_id || !offerData.monthly_payment || !offerData.coefficient) {
        console.log("Impossible de recalculer la commission: données insuffisantes");
        return;
      }
      
      const { data: ambassador } = await supabase
        .from('ambassadors')
        .select('*, commission_levels(name, id)')
        .eq('id', offerData.ambassador_id)
        .single();
      
      if (!ambassador || !ambassador.commission_level_id) {
        console.log("Impossible de recalculer la commission: données d'ambassadeur manquantes");
        return;
      }
      
      const financedAmount = calculateFinancedAmount(
        Number(offerData.monthly_payment), 
        Number(offerData.coefficient)
      );
      
      if (financedAmount <= 0) {
        console.log("Impossible de recalculer la commission: montant financé invalide");
        return;
      }
      
      const commissionData = await calculateCommissionByLevel(
        financedAmount,
        ambassador.commission_level_id,
        'ambassador',
        offerData.ambassador_id
      );
      
      if (commissionData && typeof commissionData.amount === 'number') {
        if (Math.abs(commissionData.amount - offerData.commission) > 0.01) {
          console.log(`Mise à jour de la commission: ${offerData.commission}€ -> ${commissionData.amount}€`);
          
          const { error } = await updateOffer(offerData.id, {
            commission: commissionData.amount
          });
          
          if (!error) {
            setOffer({
              ...offerData,
              commission: commissionData.amount
            });
            console.log(`Commission mise à jour avec succès: ${commissionData.amount}€ (${commissionData.rate}%)`);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la commission:", error);
    } finally {
      setRecalculatingCommission(false);
    }
  };
  
  const handleSendEmail = async () => {
    if (!offer || !offer.id) {
      toast.error("Impossible d'envoyer l'email");
      return;
    }
    
    try {
      setSendingEmail(true);
      
      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', offer.id)
          .eq('user_id', user?.id);
          
        if (error) throw error;
        
        setOffer({ ...offer, workflow_status: 'sent' });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Email envoyé au client avec succès");
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'email:", err);
      toast.error("Impossible d'envoyer l'email");
    } finally {
      setSendingEmail(false);
    }
  };
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Date inconnue";
    try {
      return format(new Date(dateString), "dd MMMM yyyy, HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };
  
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

  const getStepStatus = (stepId: string) => {
    const currentStatusIndex = workflowStatuses.findIndex(status => status.id === offer.workflow_status);
    const stepIndex = workflowStatuses.findIndex(status => status.id === stepId);
    
    if (stepIndex < currentStatusIndex) return 'completed';
    if (stepIndex === currentStatusIndex) return 'active';
    return 'pending';
  };

  const getCommissionStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payée</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Annulée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status || 'Non défini'}</Badge>;
    }
  };

  const getCommissionBoxColor = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return "bg-green-50 border-green-200";
      case 'pending':
        return "bg-amber-50 border-amber-200";
      case 'cancelled':
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getCommissionIconColor = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return "text-green-700";
      case 'pending':
        return "text-amber-700";
      case 'cancelled':
        return "text-red-700";
      default:
        return "text-gray-700";
    }
  };
  
  const getRemainingMonths = () => {
    if (!contractEndDate) return null;
    
    const now = new Date();
    const remaining = differenceInMonths(contractEndDate, now);
    return remaining > 0 ? remaining : 0;
  };

  const remainingMonths = getRemainingMonths();

  return (
    <PageTransition>
      <Container>
        <TooltipProvider>
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
                        
                        <div className="mt-6">
                          <h3 className="font-medium mb-2">Votre commission</h3>
                          <div className={`p-4 border rounded-md shadow-sm ${getCommissionBoxColor(offer.commission_status)}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`h-10 w-10 rounded-full ${offer.commission_status === 'paid' ? 'bg-green-100' : offer.commission_status === 'pending' ? 'bg-amber-100' : 'bg-gray-100'} flex items-center justify-center mr-3`}>
                                  <Euro className={`h-5 w-5 ${getCommissionIconColor(offer.commission_status)}`} />
                                </div>
                                <div>
                                  <p className={`text-sm ${getCommissionIconColor(offer.commission_status)}`}>Commission pour cette offre</p>
                                  <p className="text-2xl font-bold text-gray-700">
                                    {recalculatingCommission ? (
                                      <span className="flex items-center">
                                        <span className="animate-pulse">Calcul en cours...</span>
                                      </span>
                                    ) : (
                                      formatCurrency(offer.commission || 0)
                                    )}
                                  </p>
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
                        
                        <div className="mt-6">
                          <h3 className="font-medium mb-2">Type d'offre</h3>
                          <div className="p-3 bg-slate-50 rounded-md">
                            <p>{translateOfferType(offer.type)}</p>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="equipment" className="mt-4">
                        {equipmentData && equipmentData.length > 0 ? (
                          <div className="space-y-4">
                            {equipmentData.map((item: any, index: number) => (
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
                                  
                                  {item.variants && Object.keys(item.variants).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <h4 className="text-xs uppercase text-gray-500 mb-2">Spécifications</h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(item.variants).map(([key, value]: [string, any]) => (
                                          <div key={key} className="flex flex-col">
                                            <span className="text-xs text-gray-600">{key}</span>
                                            <span className="font-medium text-sm">{String(value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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
                          
                          {offer.converted_to_contract && remainingMonths !== null && (
                            <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
                              <div className="flex items-center">
                                <CalendarIcon className="h-5 w-5 mr-3 text-blue-600" />
                                <div>
                                  <p className="font-medium text-blue-800">
                                    Contrat en cours
                                  </p>
                                  <p className="text-sm text-blue-700">
                                    {remainingMonths} mois restants jusqu'à échéance
                                  </p>
                                  {contractEndDate && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Date de fin: {format(contractEndDate, "dd MMMM yyyy", { locale: fr })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {remainingMonths <= 3 && (
                                <div className="mt-3 p-2 bg-amber-100 rounded text-sm text-amber-800">
                                  <span className="font-medium">Action recommandée:</span> Contacter le client pour discuter du renouvellement
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div>
                            <h3 className="font-medium mb-3">Processus de validation</h3>
                            
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
                                        <status.icon className="h-6 w-6" />
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
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Commission</h3>
                      <div className={`p-3 border rounded-md ${getCommissionBoxColor(offer.commission_status)}`}>
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
        </TooltipProvider>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorOfferDetail;
