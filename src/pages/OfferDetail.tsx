
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Loader2, Clock, User, Check, X } from 'lucide-react';
import Container from '@/components/layout/Container';
import PageTransition from '@/components/layout/PageTransition';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OfferStatusBadge from '@/components/offers/OfferStatusBadge';
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

  const workflowSteps = [
    { id: 'draft', label: 'Brouillon' },
    { id: 'sent', label: 'Envoyée' },
    { id: 'valid_itc', label: 'Validée ITC' },
    { id: 'info_requested', label: 'Info demandées' },
    { id: 'approved', label: 'Approuvée' },
    { id: 'leaser_review', label: 'Revue bailleur' },
    { id: 'financed', label: 'Financée' },
    { id: 'rejected', label: 'Rejetée' }
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
        
        toast.success(`Statut mis à jour avec succès: ${selectedStatus}`);
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement des détails de l'offre...</span>
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
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
    } catch (e) {
      return 'Date non disponible';
    }
  };

  // Formater la date et l'heure pour l'affichage
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (e) {
      return 'Date non disponible';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Validée</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Refusée</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  return (
    <PageTransition>
      <Container>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/offers')} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux offres
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Type: <span className="font-medium">{translateOfferType(offer.type)}</span>
              </div>
              {getStatusBadge(offer.status)}
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Détails de l'offre</span>
                  <OfferStatusBadge status={offer.workflow_status || offer.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Informations</TabsTrigger>
                    <TabsTrigger value="equipment">Équipements</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <p className="font-medium">{offer.client_name}</p>
                          </div>
                          <p className="text-sm">{offer.client_email}</p>
                          {offer.client_company && (
                            <p className="text-sm">{offer.client_company}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Détails financiers</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Montant financé:</span>
                            <span className="font-medium">{formatCurrency(offer.financed_amount || 0)}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Paiement mensuel:</span>
                            <span className="font-medium">{formatCurrency(offer.monthly_payment)}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Coefficient:</span>
                            <span className="font-medium">{offer.coefficient}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Commission:</span>
                            <span className="font-medium">{formatCurrency(offer.commission)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Date de création</h3>
                        <p className="font-medium">{formatDate(offer.created_at)}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="equipment">
                    {equipmentData.length > 0 ? (
                      <div className="space-y-4">
                        {equipmentData.map((item: any, index: number) => (
                          <div key={index} className="border p-4 rounded-md">
                            <h3 className="font-medium text-lg">{item.title}</h3>
                            <div className="grid grid-cols-3 gap-4 mt-2">
                              <div>
                                <p className="text-sm text-gray-500">Prix d'achat:</p>
                                <p className="font-medium">{formatCurrency(item.price)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Quantité:</p>
                                <p className="font-medium">{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Marge:</p>
                                <p className="font-medium">{item.margin ? `${item.margin}%` : 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        {offer.equipment_description || 'Aucun équipement spécifié'}
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="workflow">
                    <div className="grid gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Changer le statut du workflow</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {workflowSteps.map((step) => (
                              <Button 
                                key={step.id}
                                variant={offer.workflow_status === step.id ? "default" : "outline"}
                                className="w-full text-xs sm:text-sm"
                                onClick={() => handleChangeStatus(step.id)}
                                disabled={offer.workflow_status === step.id}
                              >
                                {step.label}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    
                      <div>
                        <h3 className="text-sm font-medium mb-4">Historique du workflow</h3>
                        {workflowLogs.length > 0 ? (
                          <div className="space-y-4">
                            {workflowLogs.map((log) => (
                              <div key={log.id} className="border rounded-md p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start">
                                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground mr-2" />
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
                                      {log.reason && <p className="text-sm mt-1">{log.reason}</p>}
                                      <div className="flex items-center mt-2">
                                        <div className="text-xs text-muted-foreground">
                                          {log.profiles?.first_name} {log.profiles?.last_name} • {formatDateTime(log.created_at)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-4 text-muted-foreground">
                            Aucun historique de workflow disponible
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>

      {/* Dialog pour confirmer le changement de statut */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut de l'offre</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de changer le statut de l'offre de "{offer?.workflow_status || 'draft'}" à "{selectedStatus}".
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowWorkflowDialog(false)}
              disabled={updatingStatus}
            >
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
    </PageTransition>
  );
};

export default OfferDetail;
