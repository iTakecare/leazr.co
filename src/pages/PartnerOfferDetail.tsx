
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { ArrowLeft, FileDown, RefreshCw, Loader2, Copy, Pen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { translateOfferType, hasCommission } from "@/utils/offerTypeTranslator";
import OfferTypeTag from "@/components/offers/OfferTypeTag";
import { updateOfferStatus } from "@/services/offerService";

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">En attente</Badge>;
    case 'accepted':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Validée</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Refusée</Badge>;
    case 'info_requested':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Informations demandées</Badge>;
    case 'leaser_review':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Évaluation leaser</Badge>;
    case 'partner_created':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En attente de vérification</Badge>;
    case 'draft':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Brouillon</Badge>;
    case 'sent':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Envoyée</Badge>;
    case 'valid_itc':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Validée ITC</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approuvée</Badge>;
    case 'financed':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Financée</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const WORKFLOW_STEPS = [
  { id: 'draft', label: 'Brouillon', description: 'L\'offre est en cours de création' },
  { id: 'sent', label: 'Envoyée', description: 'L\'offre a été envoyée au client' },
  { id: 'info_requested', label: 'Infos demandées', description: 'Des informations supplémentaires ont été demandées' },
  { id: 'valid_itc', label: 'Validée ITC', description: 'L\'offre a été validée par ITC' },
  { id: 'leaser_review', label: 'Évaluation leaser', description: 'En cours d\'évaluation par le bailleur' },
  { id: 'approved', label: 'Approuvée', description: 'L\'offre a été approuvée par le client' },
  { id: 'financed', label: 'Financée', description: 'Le financement a été accordé' },
  { id: 'rejected', label: 'Rejetée', description: 'L\'offre a été rejetée' }
];

const PartnerOfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedSignature, setIsCopiedSignature] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      if (!user || !id) return;

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error("Offre non trouvée ou vous n'avez pas les droits d'accès");
        navigate('/partner/dashboard');
        return;
      }

      setOffer(data);
      
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/client/offers/${data.id}`);
      
      setSignatureUrl(generateSignatureLink(data.id));
    } catch (error) {
      console.error("Error fetching offer details:", error);
      toast.error("Erreur lors du chargement des détails de l'offre");
      setLoadError("Une erreur s'est produite");
      navigate('/partner/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferDetails();
  }, [id, user]);

  const copyToClipboard = (text: string, setStateFn: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setStateFn(true);
        toast.success("Lien copié dans le presse-papier");
        setTimeout(() => setStateFn(false), 2000);
      },
      () => {
        toast.error("Impossible de copier le lien");
      }
    );
  };

  const handleDownloadPdf = async () => {
    try {
      toast.info("Le PDF est en cours de génération...");
      // In a real app, this would call a function to generate and download the PDF
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erreur lors du téléchargement du PDF");
    }
  };

  const shareSignatureLink = () => {
    if (offer.workflow_status !== 'sent' && offer.workflow_status !== 'draft') {
      toast.info("Cette offre a déjà été " + (offer.workflow_status === 'approved' ? "signée" : "traitée"));
      return;
    }
    
    if (offer.workflow_status === 'draft') {
      supabase
        .from('offers')
        .update({ workflow_status: 'sent' })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error("Error updating offer status:", error);
            toast.error("Erreur lors de la mise à jour du statut de l'offre");
          } else {
            setOffer({ ...offer, workflow_status: 'sent' });
            toast.success("Statut de l'offre mis à jour à 'Envoyée'");
          }
        });
    }
    
    toast.success("Lien de signature envoyé au client");
  };

  const shouldShowCommission = (offer: any): boolean => {
    if (!offer) return false;
    return hasCommission(offer.type);
  };

  const handleUpdateWorkflowStatus = async (newStatus: string) => {
    if (!offer || !newStatus) return;
    
    try {
      setUpdatingStatus(true);
      
      const success = await updateOfferStatus(
        offer.id,
        newStatus,
        offer.workflow_status || 'draft',
        `Status updated by ${user?.email}`
      );
      
      if (success) {
        // Mise à jour locale de l'offre
        setOffer({ ...offer, workflow_status: newStatus });
        toast.success(`Statut mis à jour avec succès: ${getStatusLabel(newStatus)}`);
        setWorkflowDialogOpen(false);
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating workflow status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusLabel = (statusId: string): string => {
    const step = WORKFLOW_STEPS.find(step => step.id === statusId);
    return step ? step.label : statusId;
  };

  const openWorkflowDialog = (statusId: string) => {
    setSelectedStatusId(statusId);
    setWorkflowDialogOpen(true);
  };

  // Fonction pour obtenir les étapes disponibles du workflow en fonction du statut actuel
  const getAvailableNextSteps = () => {
    const currentStep = WORKFLOW_STEPS.find(step => step.id === offer.workflow_status);
    const currentIndex = currentStep ? WORKFLOW_STEPS.indexOf(currentStep) : -1;
    
    if (currentIndex === -1) return WORKFLOW_STEPS;

    // Pour les admins, on offre plus de flexibilité dans les changements d'état
    if (isAdmin()) {
      // Si l'offre est rejetée ou financée, on ne propose pas d'étapes suivantes
      if (offer.workflow_status === 'rejected' || offer.workflow_status === 'financed') {
        return [];
      }

      // Proposer les étapes précédente, suivante et rejet
      let availableSteps = [];
      
      // Étape précédente si possible
      if (currentIndex > 0) {
        availableSteps.push(WORKFLOW_STEPS[currentIndex - 1]);
      }
      
      // Étape suivante si possible
      if (currentIndex < WORKFLOW_STEPS.length - 1) {
        availableSteps.push(WORKFLOW_STEPS[currentIndex + 1]);
      }
      
      // Option de rejet toujours disponible sauf si déjà rejeté
      if (offer.workflow_status !== 'rejected') {
        const rejectStep = WORKFLOW_STEPS.find(step => step.id === 'rejected');
        if (rejectStep && !availableSteps.includes(rejectStep)) {
          availableSteps.push(rejectStep);
        }
      }
      
      return availableSteps;
    }
    
    // Pour les non-admin, limiter les transitions possibles
    return [];
  };

  if (loading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex justify-center items-center h-[70vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2">Chargement des détails de l'offre...</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (loadError) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
            <div className="mt-8 text-center">
              <p>Une erreur s'est produite lors du chargement des détails de l'offre.</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (!offer) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
            <div className="mt-8 text-center">
              <p>L'offre n'a pas été trouvée ou vous n'avez pas les droits d'accès.</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const isInternalRequest = offer.type === 'internal_offer';
  const availableNextSteps = getAvailableNextSteps();

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/partner/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Offre #{id?.substring(0, 8)}</h1>
                <p className="text-muted-foreground">
                  Créée le {format(new Date(offer.created_at), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchOfferDetails}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              {offer.status === 'accepted' && (
                <Button onClick={handleDownloadPdf}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations client</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Nom</dt>
                      <dd className="font-medium">{offer.client_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="font-medium">{offer.client_email}</dd>
                    </div>
                    {offer.client_company && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Société</dt>
                        <dd className="font-medium">{offer.client_company}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Équipement</CardTitle>
                    <OfferTypeTag type={offer.type} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{offer.equipment_description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Liens de partage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="mb-4 text-muted-foreground">
                      Partagez ce lien avec votre client pour qu'il puisse consulter l'offre.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 border rounded bg-muted truncate">
                        {shareUrl}
                      </div>
                      <Button variant="outline" onClick={() => copyToClipboard(shareUrl, setIsCopied)}>
                        {isCopied ? (
                          <span className="text-green-600">Copié!</span>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="mb-4 text-muted-foreground">
                      <strong>Lien de signature électronique :</strong> Envoyez ce lien pour permettre à votre client de signer l'offre en ligne.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 border rounded bg-muted truncate">
                        {signatureUrl}
                      </div>
                      <Button variant="outline" onClick={() => copyToClipboard(signatureUrl, setIsCopiedSignature)}>
                        {isCopiedSignature ? (
                          <span className="text-green-600">Copié!</span>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copier
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={shareSignatureLink}
                        disabled={offer.workflow_status === 'approved'}
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        {offer.workflow_status === 'approved' 
                          ? "Offre déjà signée" 
                          : "Envoyer le lien de signature au client"}
                      </Button>
                      
                      {offer.workflow_status === 'approved' && (
                        <Alert className="mt-4 bg-green-50 border-green-200">
                          <AlertTitle className="text-green-800">Offre signée</AlertTitle>
                          <AlertDescription className="text-green-700">
                            Cette offre a déjà été signée électroniquement
                            {offer.signer_name ? ` par ${offer.signer_name}` : ""}.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>État de l'offre</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Statut:</span>
                    <span>{getStatusBadge(offer.workflow_status || offer.status)}</span>
                  </div>
                  
                  {isAdmin() && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-2">Progression dans le workflow</h3>
                      <div className="space-y-3">
                        {WORKFLOW_STEPS.map((step, index) => {
                          const isCurrentStep = step.id === offer.workflow_status;
                          const isPastStep = WORKFLOW_STEPS.findIndex(s => s.id === offer.workflow_status) > index;
                          
                          return (
                            <div 
                              key={step.id} 
                              className={`p-3 rounded-lg border ${
                                isCurrentStep 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : isPastStep 
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className={`font-medium ${
                                    isCurrentStep ? 'text-blue-700' : isPastStep ? 'text-green-700' : 'text-gray-700'
                                  }`}>
                                    {step.label}
                                  </p>
                                  <p className="text-xs text-gray-500">{step.description}</p>
                                </div>
                                {isCurrentStep && (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                    Actuel
                                  </Badge>
                                )}
                                {isPastStep && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    Complété
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Modifier le statut</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {availableNextSteps.map(step => (
                            <Button 
                              key={step.id} 
                              variant="outline" 
                              className="justify-between"
                              onClick={() => openWorkflowDialog(step.id)}
                              disabled={updatingStatus}
                            >
                              <span>{step.label}</span>
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          ))}
                        </div>
                        
                        {updatingStatus && (
                          <div className="flex items-center justify-center p-2 mt-2">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span>Mise à jour en cours...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(offer.workflow_status === 'info_requested' || offer.status === 'rejected') && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Action requise</AlertTitle>
                      <AlertDescription>
                        Des informations supplémentaires sont requises pour cette offre. 
                        Veuillez contacter l'administrateur pour plus de détails.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Résumé financier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Montant financé:</span>
                      <span className="font-medium">{formatCurrency(offer.financed_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mensualité:</span>
                      <span className="font-medium">{formatCurrency(offer.monthly_payment)}</span>
                    </div>
                    
                    {shouldShowCommission(offer) && (
                      <>
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between font-medium">
                          <span>Votre commission:</span>
                          <span className="text-green-600">{formatCurrency(offer.commission)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">Signaler un problème</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Signaler un problème</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pour signaler un problème avec cette offre, veuillez contacter directement
                      l'équipe support à support@itakecare.com ou par téléphone au +32 123 456 789.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Fermer</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      window.location.href = "mailto:support@itakecare.com?subject=Problème avec l'offre " + id;
                    }}>
                      Envoyer un email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </Container>
      
      <AlertDialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le statut de l'offre</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir changer le statut de cette offre vers{' '}
              <strong>{getStatusLabel(selectedStatusId || '')}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStatusId && handleUpdateWorkflowStatus(selectedStatusId)}
              disabled={updatingStatus}
              className={selectedStatusId === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              {updatingStatus ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mise à jour...
                </div>
              ) : (
                'Confirmer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default PartnerOfferDetail;
