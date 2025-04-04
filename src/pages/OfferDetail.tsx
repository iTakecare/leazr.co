import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOfferById } from '@/services/offers/offerDetail';
import { getWorkflowLogs } from '@/services/offers/offerWorkflow';
import { updateOfferStatus } from '@/services/offerService';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { translateOfferType } from '@/utils/offerTypeTranslator';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, ArrowLeft, Loader2, Clock, User, Check, X, 
  Building, FileText, Calendar, CreditCard, Edit, Send, 
  CheckCircle2, Ban, Info
} from 'lucide-react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OfferStatusBadge from '@/components/offers/OfferStatusBadge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Workflow management states
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Define workflow steps with more detailed information
  const workflowSteps = [
    { 
      id: 'draft', 
      label: 'Brouillon', 
      description: 'L\'offre est en cours de création',
      icon: Edit,
      color: 'bg-gray-100 border-gray-300 hover:bg-gray-200'
    },
    { 
      id: 'sent', 
      label: 'Envoyée', 
      description: 'L\'offre a été envoyée au client',
      icon: Send,
      color: 'bg-blue-100 border-blue-300 hover:bg-blue-200'
    },
    { 
      id: 'valid_itc', 
      label: 'Validée ITC',
      description: 'L\'offre a été validée par ITC', 
      icon: CheckCircle2,
      color: 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200'
    },
    { 
      id: 'info_requested', 
      label: 'Info demandées',
      description: 'Des informations supplémentaires ont été demandées', 
      icon: Info,
      color: 'bg-amber-100 border-amber-300 hover:bg-amber-200'
    },
    { 
      id: 'approved', 
      label: 'Approuvée',
      description: 'L\'offre a été approuvée', 
      icon: Check,
      color: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200'
    },
    { 
      id: 'leaser_review', 
      label: 'Revue bailleur',
      description: 'L\'offre est en cours de revue par le bailleur', 
      icon: Building,
      color: 'bg-purple-100 border-purple-300 hover:bg-purple-200'
    },
    { 
      id: 'financed', 
      label: 'Financée',
      description: 'L\'offre a été financée', 
      icon: CreditCard,
      color: 'bg-green-100 border-green-300 hover:bg-green-200'
    },
    { 
      id: 'rejected', 
      label: 'Rejetée',
      description: 'L\'offre a été rejetée', 
      icon: Ban,
      color: 'bg-red-100 border-red-300 hover:bg-red-200'
    }
  ];

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getOfferById(id);
        
        if (!data) {
          setError('Offre non trouvée');
          return;
        }
        
        setOffer(data);

        // Load workflow logs
        const logs = await getWorkflowLogs(id);
        setWorkflowLogs(logs);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'offre:', err);
        setError('Impossible de charger les détails de l\'offre');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  const handleChangeStatus = (status: string) => {
    setSelectedStatus(status);
    setShowWorkflowDialog(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!id || !selectedStatus) return;

    try {
      setUpdatingStatus(true);
      const success = await updateOfferStatus(
        id,
        selectedStatus,
        offer.workflow_status,
        statusReason || undefined
      );

      if (success) {
        setOffer({ ...offer, workflow_status: selectedStatus });
        
        // Reload workflow logs
        const logs = await getWorkflowLogs(id);
        setWorkflowLogs(logs);
        
        toast.success(`Statut mis à jour avec succès: ${workflowSteps.find(step => step.id === selectedStatus)?.label}`);
        setShowWorkflowDialog(false);
        setStatusReason("");
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-lg">Chargement des détails de l'offre...</span>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !offer) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error || 'Offre non trouvée'}</p>
            <Button onClick={() => navigate('/offers')}>
              Retour à la liste des offres
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date non disponible';
    }
  };

  // Formater la date et l'heure pour l'affichage
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: fr });
    } catch (e) {
      return 'Date non disponible';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getStepStatus = (stepId: string) => {
    const stepIndex = workflowSteps.findIndex(step => step.id === stepId);
    const currentStepIndex = workflowSteps.findIndex(step => step.id === offer.workflow_status);
    
    if (stepIndex < currentStepIndex) {
      return 'completed';
    } else if (stepIndex === currentStepIndex) {
      return 'current';
    } else {
      return 'upcoming';
    }
  };

  // Analyser les données d'équipement si elles existent
  let equipmentData = [];
  try {
    if (offer.equipment_description) {
      const parsedData = typeof offer.equipment_data === 'object' 
        ? offer.equipment_data 
        : JSON.parse(offer.equipment_description);
      
      if (Array.isArray(parsedData)) {
        equipmentData = parsedData;
      }
    }
  } catch (e) {
    console.error('Erreur lors du parsing des données d\'équipement:', e);
  }

  // Calculer le pourcentage de progression dans le workflow
  const calculateProgressPercentage = () => {
    const currentIndex = workflowSteps.findIndex(step => step.id === offer.workflow_status);
    if (currentIndex === -1) return 0;
    
    // Si c'est rejeté, montrer une progression à 100% mais dans un style différent
    if (offer.workflow_status === 'rejected') return 100;
    
    return Math.round((currentIndex / (workflowSteps.length - 2)) * 100); // -2 pour exclure rejected
  };

  const progressPercentage = calculateProgressPercentage();

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/offers')} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux offres
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-sm px-3 py-1 rounded-full bg-gray-100">
                <span className="text-gray-700 font-medium">Type: </span>
                <span className="font-bold text-primary">{translateOfferType(offer.type)}</span>
              </div>
              <OfferStatusBadge status={offer.workflow_status || offer.status} className="capitalize px-3 py-1" />
            </div>
          </div>

          <div className="grid gap-6">
            {/* Header Card with Key Info */}
            <Card className="border-none shadow-md bg-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">
                      Offre #{id?.substring(0, 6)}
                    </h1>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Créée le {formatDate(offer.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.workflow_status !== 'rejected' && (
                      <div className="hidden sm:block">
                        <div className="text-xs text-gray-500 mb-1">Progression</div>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={progressPercentage} 
                            className={`h-2 w-32 ${offer.workflow_status === 'rejected' ? 'bg-red-100' : ''}`}
                            status={offer.workflow_status === 'rejected' ? 'rejected' : undefined}
                          />
                          <span className="text-xs font-medium">{progressPercentage}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                      Détails de l'offre
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="mb-4 w-full grid grid-cols-3">
                        <TabsTrigger value="details">Informations</TabsTrigger>
                        <TabsTrigger value="equipment">Équipements</TabsTrigger>
                        <TabsTrigger value="workflow">Workflow</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Client</h3>
                              <div className="p-4 rounded-lg bg-gray-50 space-y-3">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 mr-3 bg-primary">
                                    <AvatarFallback>{getInitials(offer.client_name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{offer.client_name}</p>
                                    <p className="text-sm text-muted-foreground">{offer.client_email}</p>
                                  </div>
                                </div>
                                {offer.client_company && (
                                  <div className="flex items-center">
                                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <p>{offer.client_company}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Date de création</h3>
                              <div className="p-4 rounded-lg bg-gray-50">
                                <div className="flex items-center">
                                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                                  <p className="font-medium">{formatDate(offer.created_at)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-sm font-medium text-gray-500 mb-3">Détails financiers</h3>
                              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 space-y-3 border border-blue-100">
                                <div className="flex justify-between items-center pb-3 border-b border-blue-100">
                                  <span className="text-sm text-gray-600">Montant financé:</span>
                                  <span className="font-semibold text-lg">{formatCurrency(offer.financed_amount || 0)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Paiement mensuel:</span>
                                  <span className="font-semibold text-lg text-blue-700">{formatCurrency(offer.monthly_payment)}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Coefficient:</span>
                                  <span className="font-medium">{offer.coefficient}</span>
                                </div>
                                
                                <div className="flex justify-between items-center pt-3 border-t border-blue-100">
                                  <span className="text-sm text-gray-600">Commission:</span>
                                  <span className="font-medium text-green-600">{formatCurrency(offer.commission)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="equipment">
                        {equipmentData.length > 0 ? (
                          <div className="space-y-4">
                            {equipmentData.map((item: any, index: number) => (
                              <div key={index} className="border p-4 rounded-md hover:shadow-md transition-shadow bg-white">
                                <h3 className="font-medium text-lg border-b pb-2 mb-3">{item.title}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-500 mb-1">Prix d'achat:</p>
                                    <p className="font-medium text-blue-700">{formatCurrency(item.price)}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-500 mb-1">Quantité:</p>
                                    <p className="font-medium">{item.quantity}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-sm text-gray-500 mb-1">Marge:</p>
                                    <p className="font-medium text-green-600">{item.margin ? `${item.margin}%` : 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-gray-50 rounded-lg">
                            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">
                              {offer.equipment_description || 'Aucun équipement spécifié'}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="workflow">
                        <div className="grid gap-6">
                          <div>
                            <h3 className="text-sm font-medium mb-4">Progression du workflow</h3>
                            
                            {/* Workflow progress steps - desktop version */}
                            <div className="hidden md:block">
                              <div className="relative mb-6">
                                <div className="absolute top-5 left-0 w-full h-1 bg-gray-200"></div>
                                <div className="flex justify-between relative">
                                  {workflowSteps
                                    .filter(step => step.id !== 'rejected') // Exclude rejected from the timeline
                                    .map((step, index) => {
                                      const status = getStepStatus(step.id);
                                      return (
                                        <Tooltip key={step.id}>
                                          <TooltipTrigger asChild>
                                            <div className="flex flex-col items-center z-10">
                                              <div 
                                                className={`w-10 h-10 rounded-full flex items-center justify-center
                                                  ${status === 'completed' ? 'bg-green-500 text-white' : 
                                                    status === 'current' ? 'bg-blue-500 text-white' : 
                                                    'bg-gray-200 text-gray-400'}
                                                `}
                                              >
                                                {status === 'completed' ? (
                                                  <Check className="h-5 w-5" />
                                                ) : (
                                                  <step.icon className="h-5 w-5" />
                                                )}
                                              </div>
                                              <span className={`mt-2 text-xs font-medium ${
                                                status === 'completed' ? 'text-green-600' : 
                                                status === 'current' ? 'text-blue-600' : 
                                                'text-gray-400'
                                              }`}>
                                                {step.label}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>{step.description}</TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                            
                            {/* Workflow progress steps - mobile version */}
                            <div className="md:hidden space-y-3">
                              {workflowSteps.map((step) => {
                                const status = getStepStatus(step.id);
                                return (
                                  <div 
                                    key={step.id} 
                                    className={`flex items-center p-3 rounded-md
                                      ${status === 'completed' ? 'bg-green-50 border border-green-100' : 
                                        status === 'current' ? 'bg-blue-50 border border-blue-100' : 
                                        'bg-gray-50 border border-gray-100'}
                                    `}
                                  >
                                    <div 
                                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-3
                                        ${status === 'completed' ? 'bg-green-500 text-white' : 
                                          status === 'current' ? 'bg-blue-500 text-white' : 
                                          'bg-gray-200 text-gray-400'}
                                      `}
                                    >
                                      {status === 'completed' ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <step.icon className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div>
                                      <p className={`font-medium ${
                                        status === 'completed' ? 'text-green-700' : 
                                        status === 'current' ? 'text-blue-700' : 
                                        'text-gray-500'
                                      }`}>
                                        {step.label}
                                      </p>
                                      <p className="text-xs text-gray-500">{step.description}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          <Card className="overflow-hidden">
                            <CardHeader className="bg-gray-50 pb-3 border-b">
                              <CardTitle className="text-base flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Changer le statut du workflow
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {workflowSteps.map((step) => (
                                  <Button 
                                    key={step.id}
                                    variant={offer.workflow_status === step.id ? "default" : "outline"}
                                    className={`w-full text-xs sm:text-sm flex items-center gap-2 ${
                                      offer.workflow_status !== step.id ? step.color : ''
                                    }`}
                                    onClick={() => handleChangeStatus(step.id)}
                                    disabled={offer.workflow_status === step.id}
                                  >
                                    <step.icon className="h-3 w-3" />
                                    {step.label}
                                  </Button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        
                          <div>
                            <h3 className="text-sm font-medium mb-4 flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              Historique du workflow
                            </h3>
                            {workflowLogs.length > 0 ? (
                              <div className="space-y-4">
                                {workflowLogs.map((log) => (
                                  <div key={log.id} className="border rounded-md p-4 hover:shadow-sm transition-shadow bg-white">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start">
                                        <Avatar className="h-8 w-8 mr-3">
                                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {getInitials(`${log.profiles?.first_name} ${log.profiles?.last_name}`)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium">
                                            {log.previous_status !== log.new_status ? (
                                              <>
                                                Status changé: <Badge variant="outline" className="ml-1 mr-1">{log.previous_status || 'draft'}</Badge> 
                                                {' → '} 
                                                <Badge variant="outline" className="ml-1">{log.new_status}</Badge>
                                              </>
                                            ) : (
                                              <>Action sur {log.new_status}</>
                                            )}
                                          </p>
                                          {log.reason && (
                                            <p className="text-sm mt-1 bg-gray-50 p-2 rounded italic">"{log.reason}"</p>
                                          )}
                                          <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                            <User className="h-3 w-3 mr-1" />
                                            {log.profiles?.first_name} {log.profiles?.last_name}
                                            <span className="mx-2">•</span>
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatDateTime(log.created_at)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 bg-gray-50 rounded-lg">
                                <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">
                                  Aucun historique de workflow disponible
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Statut actuel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className={`
                        flex items-center p-4 rounded-md ${
                          offer.workflow_status === 'rejected' ? 'bg-red-50 text-red-700' :
                          offer.workflow_status === 'financed' ? 'bg-green-50 text-green-700' :
                          'bg-blue-50 text-blue-700'
                        }
                      `}>
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                            offer.workflow_status === 'rejected' ? 'bg-red-100' :
                            offer.workflow_status === 'financed' ? 'bg-green-100' :
                            'bg-blue-100'
                          }
                        `}>
                          {(() => {
                            const step = workflowSteps.find(s => s.id === offer.workflow_status);
                            const StepIcon = step ? step.icon : Clock;
                            return <StepIcon className="h-5 w-5" />;
                          })()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {workflowSteps.find(step => step.id === offer.workflow_status)?.label || offer.workflow_status}
                          </p>
                          <p className="text-xs opacity-90">
                            Mis à jour le {formatDate(offer.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Actions rapides</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full flex items-center gap-2 justify-center"
                          onClick={() => navigate(`/offers/${id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                          Modifier
                        </Button>
                        <Button 
                          variant="default" 
                          className="w-full flex items-center gap-2 justify-center"
                          onClick={() => setActiveTab("workflow")}
                        >
                          <Check className="h-4 w-4" />
                          Workflow
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog pour confirmer le changement de statut */}
        <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Changer le statut de l'offre</DialogTitle>
              <DialogDescription>
                Vous êtes sur le point de changer le statut de l'offre de 
                "{workflowSteps.find(step => step.id === offer?.workflow_status)?.label || offer?.workflow_status}" 
                à "{workflowSteps.find(step => step.id === selectedStatus)?.label || selectedStatus}".
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Raison du changement (optionnel)
                </label>
                <Textarea 
                  id="reason" 
                  placeholder="Entrez la raison du changement de statut..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowWorkflowDialog(false)}
                disabled={updatingStatus}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button 
                onClick={handleConfirmStatusChange}
                disabled={updatingStatus}
                className="gap-2"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default OfferDetail;
