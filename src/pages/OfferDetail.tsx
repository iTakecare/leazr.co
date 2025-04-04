import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { ArrowLeft, FileDown, RefreshCw, Loader2, Copy, Pen, Euro, CalendarIcon, Star, Building } from "lucide-react";
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
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { generateSignatureLink } from "@/services/offers/offerSignature";
import { translateOfferType } from "@/utils/offerTypeTranslator";
import OfferTypeTag from "@/components/offers/OfferTypeTag";
import OfferStatusBadge from "@/components/offers/OfferStatusBadge";

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
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
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

const OfferDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedSignature, setIsCopiedSignature] = useState(false);

  // Check if this is an internal offer (no commission)
  const isInternalOffer = offer?.type === 'internal_offer';

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      if (!id) return;

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setOffer(data);
      
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/client/offers/${data.id}`);
      
      setSignatureUrl(generateSignatureLink(data.id));
    } catch (error) {
      console.error("Error fetching offer details:", error);
      toast.error("Erreur lors du chargement des détails de l'offre");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferDetails();
  }, [id]);

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

  if (!offer) {
    return (
      <PageTransition>
        <Container>
          <div className="py-8">
            <Button variant="outline" onClick={() => navigate("/offers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
            <div className="mt-8 text-center">
              <p>L'offre n'a pas été trouvée.</p>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/offers")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Offre #{id?.substring(0, 8)}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    Créée le {format(new Date(offer.created_at), 'dd/MM/yyyy')}
                  </p>
                  {offer.type && <OfferTypeTag type={offer.type} />}
                </div>
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

          {/* Financial summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <Euro className="h-4 w-4 mr-2 text-blue-600" />
                  Montant financé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(offer.financed_amount || 0)}</p>
              </CardContent>
            </Card>
            
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
            
            {!isInternalOffer ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Star className="h-4 w-4 mr-2 text-green-600" />
                    Commission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(offer.commission || 0)}</p>
                  {offer.commission_status && (
                    <div className="mt-1">
                      {getCommissionStatusBadge(offer.commission_status)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm bg-indigo-50 border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Building className="h-4 w-4 mr-2 text-indigo-600" />
                    Offre interne
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-md text-indigo-700">Sans commission</p>
                </CardContent>
              </Card>
            )}
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
                  <CardTitle>Équipement</CardTitle>
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
                    <div className="flex items-center gap-2">
                      <span>{getStatusBadge(offer.workflow_status || offer.status)}</span>
                      {offer.type && <OfferTypeTag type={offer.type} size="sm" />}
                    </div>
                  </div>
                  
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
                    
                    {/* Only show commission if this is not an internal offer */}
                    {!isInternalOffer && (
                      <>
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between font-medium">
                          <span>Votre commission:</span>
                          <span className="text-green-600">{formatCurrency(offer.commission)}</span>
                        </div>
                      </>
                    )}

                    {isInternalOffer && (
                      <>
                        <div className="border-t my-2"></div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Type:</span>
                          <OfferTypeTag type={offer.type} />
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
    </PageTransition>
  );
};

export default OfferDetail;
