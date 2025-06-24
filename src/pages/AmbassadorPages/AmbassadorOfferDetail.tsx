
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getOfferById, updateOffer, getWorkflowLogs, getOfferNotes } from "@/services/offerService";
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
  Euro,
  History,
  StickyNote,
  MessageSquare
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
import { calculateFinancedAmount } from "@/utils/calculator";
import { translateOfferType, hasCommission } from "@/utils/offerTypeTranslator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import EquipmentDisplay from "@/components/offers/EquipmentDisplay";
import { Timeline, TimelineItem, TimelineItemContent, TimelineItemIndicator, TimelineItemTitle } from "@/components/ui/timeline";
import { sendOfferReadyEmail } from "@/services/emailService";

const AmbassadorOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState("status");
  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [offerNotes, setOfferNotes] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  
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
        
        fetchWorkflowLogs(id);
        fetchOfferNotes(id);
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
  
  const shareSignatureLink = async () => {
    if (offer.workflow_status !== 'sent' && offer.workflow_status !== 'draft') {
      toast.info("Cette offre a déjà été " + (offer.workflow_status === 'approved' ? "signée" : "traitée"));
      return;
    }
    
    try {
      if (offer.workflow_status === 'draft') {
        const { error } = await supabase
          .from('offers')
          .update({ workflow_status: 'sent' })
          .eq('id', id);
          
        if (error) {
          console.error("Error updating offer status:", error);
          toast.error("Erreur lors de la mise à jour du statut de l'offre");
          return;
        }
        
        setOffer({ ...offer, workflow_status: 'sent' });
      }
      
      console.log("Tentative d'envoi d'email depuis AmbassadorOfferDetail pour:", offer.client_email);
      
      const success = await sendOfferReadyEmail(
        offer.client_email,
        offer.client_name,
        {
          id: offer.id,
          description: offer.equipment_description || "Votre équipement",
          amount: offer.amount || 0,
          monthlyPayment: offer.monthly_payment || 0
        }
      );
      
      if (success) {
        toast.success("Lien de signature envoyé au client avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de l'email au client");
        return;
      }
      
    } catch (error) {
      console.error("Error sending offer ready email:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    }
  };
  
  const fetchWorkflowLogs = async (offerId: string) => {
    try {
      setLogsLoading(true);
      const logs = await getWorkflowLogs(offerId);
      setWorkflowLogs(logs);
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };
  
  const fetchOfferNotes = async (offerId: string) => {
    try {
      setNotesLoading(true);
      const notes = await getOfferNotes(offerId);
      setOfferNotes(notes);
    } catch (error) {
      console.error("Erreur lors du chargement des notes:", error);
    } finally {
      setNotesLoading(false);
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

  const shouldShowCommission = (offer: any): boolean => {
    if (!offer) return false;
    return hasCommission(offer.type);
  };

  const isAdmin = useCallback(() => {
    return user?.role === 'admin';
  }, [user]);

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
  const equipmentDisplayText = formatEquipmentDisplay(offer.equipment_description || offer.equipment_data);

  const calculatedMargin = offer?.amount && offer?.financed_amount 
    ? offer.amount - offer.financed_amount 
    : 0;
  
  const marginPercentage = offer?.amount && offer?.financed_amount && offer?.amount > 0
    ? ((calculatedMargin / offer.financed_amount) * 100).toFixed(2)
    : 0;

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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                    Mensualité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(offer.monthly_payment)}
                    <span className="text-sm font-normal text-blue-500">/mois</span>
                  </p>
                </CardContent>
              </Card>
              {shouldShowCommission(offer) && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Star className="h-4 w-4 mr-2 text-green-600" />
                      Votre commission
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(offer.commission || 0)}
                    </p>
                    {offer.commission_status && (
                      <div className="mt-1">{getCommissionStatusBadge(offer.commission_status)}</div>
                    )}
                  </CardContent>
                </Card>
              )}
              {isAdmin() && !shouldShowCommission(offer) && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Star className="h-4 w-4 mr-2 text-green-600" />
                      Marge générée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculatedMargin || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {marginPercentage}%
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <History className="h-4 w-4 mr-2 text-indigo-600" />
                      Historique des modifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Chargement de l'historique...</span>
                      </div>
                    ) : workflowLogs.length > 0 ? (
                      <Timeline>
                        {workflowLogs.map((log) => (
                          <TimelineItem key={log.id}>
                            <TimelineItemIndicator />
                            <TimelineItemContent>
                              <TimelineItemTitle>
                                <span className="font-medium">
                                  {log.profiles?.first_name 
                                    ? `${log.profiles.first_name} ${log.profiles.last_name}` 
                                    : "Système"}
                                </span>
                                
                                <span className="text-sm text-muted-foreground ml-2">
                                  {formatDate(log.created_at)}
                                </span>
                              </TimelineItemTitle>
                              <div>
                                <span className="text-sm">
                                  Statut changé de{' '}
                                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                    {log.previous_status}
                                  </Badge>
                                  {' '}à{' '}
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                    {log.new_status}
                                  </Badge>
                                </span>
                                {log.reason && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Raison: {log.reason}
                                  </p>
                                )}
                              </div>
                            </TimelineItemContent>
                          </TimelineItem>
                        ))}
                      </Timeline>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p>Aucun historique disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-1">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <StickyNote className="h-4 w-4 mr-2 text-amber-600" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notesLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Chargement des notes...</span>
                      </div>
                    ) : offerNotes.length > 0 ? (
                      <div className="space-y-4">
                        {offerNotes.map((note) => (
                          <div key={note.id} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                            <div className="flex justify-between mb-2">
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 text-gray-500 mr-2" />
                                <span className="text-sm font-medium">
                                  {note.profiles?.first_name 
                                    ? `${note.profiles.first_name} ${note.profiles.last_name}` 
                                    : "Admin"}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-line">{note.content}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {note.type === 'admin_note' ? 'Note admin' : 'Note interne'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <StickyNote className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p>Aucune note disponible</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <div>
                <Card>
                  <CardHeader className="border-b">
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={shareSignatureLink}
                        >
                          <SendHorizontal className="h-4 w-4 mr-2" />
                          Envoyer lien de signature
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="status">Suivi</TabsTrigger>
                        <TabsTrigger value="details">Détails</TabsTrigger>
                        <TabsTrigger value="equipment">Équipement</TabsTrigger>
                      </TabsList>
                      
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
                            <div className="p-4 border rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 space-y-3 border border-blue-100">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Paiement mensuel:</span>
                                <span className="font-semibold text-lg text-blue-700">{formatCurrency(offer.monthly_payment)}</span>
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
                                    {formatCurrency(offer.commission || 0)}
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
                      </TabsContent>
                      
                      <TabsContent value="equipment" className="mt-4">
                        <EquipmentDisplay 
                          equipmentDisplay={equipmentDisplayText} 
                          monthlyPayment={offer.monthly_payment} 
                          remarks={offer.remarks}
                        />
                        
                        {equipmentData && equipmentData.length > 0 ? (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium mb-4">Détails des équipements</h3>
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
                    </Tabs>
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
