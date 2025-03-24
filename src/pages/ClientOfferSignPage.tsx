
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle, 
  Loader2, 
  FileText, 
  Calendar, 
  X, 
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import SignaturePad from "@/components/ui/signature-pad";

const ClientOfferSignPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Récupérer les détails de l'offre
  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError("Identifiant de l'offre non spécifié");
          return;
        }

        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        if (!data) {
          setError("Cette offre n'existe pas ou a été supprimée");
          return;
        }

        // Vérifier si l'offre a déjà été signée
        if (data.is_signed) {
          setIsConfirmed(true);
        }
        
        setOffer(data);
      } catch (error) {
        console.error("Erreur lors du chargement de l'offre:", error);
        setError("Impossible de charger les détails de l'offre");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferDetails();
  }, [id]);

  // Gérer la sauvegarde de la signature
  const handleSaveSignature = (signatureData: string) => {
    setSignature(signatureData);
  };

  // Finaliser la signature de l'offre
  const handleSignOffer = async () => {
    if (!signature) {
      toast.error("Veuillez d'abord signer l'offre");
      return;
    }

    try {
      setIsSigning(true);

      // Mettre à jour la base de données avec la signature
      const { error } = await supabase
        .from('offers')
        .update({
          is_signed: true,
          signature_date: new Date().toISOString(),
          signature_data: signature,
          status: 'accepted',
          workflow_status: 'client_signed'
        })
        .eq('id', id);

      if (error) throw error;

      // Afficher le dialogue de succès
      setIsConfirmed(true);
      setShowSignatureDialog(false);
      setShowSuccessDialog(true);

    } catch (error) {
      console.error("Erreur lors de la signature:", error);
      toast.error("Une erreur est survenue lors de la signature de l'offre");
    } finally {
      setIsSigning(false);
    }
  };

  // État chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-xl">Chargement de votre offre...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="text-xl text-center text-red-600">
              <X className="h-10 w-10 mx-auto mb-2" />
              Offre non disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>{error || "Cette offre n'existe pas ou a été supprimée."}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière avec statut */}
      <div className={`py-3 px-4 text-center text-white ${isConfirmed ? 'bg-green-600' : 'bg-blue-600'}`}>
        {isConfirmed ? (
          <div className="flex items-center justify-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Cette offre a été signée le {format(new Date(offer.signature_date || new Date()), 'dd MMMM yyyy', { locale: fr })}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <FileText className="h-5 w-5 mr-2" />
            <span>Veuillez consulter et signer votre offre</span>
          </div>
        )}
      </div>

      {/* En-tête de la page */}
      <header className="bg-white border-b shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Offre iTakecare</h1>
              <p className="text-sm text-muted-foreground">
                Offre #{id?.substring(0, 8)} | Émise le {format(new Date(offer.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              <Badge className={`${isConfirmed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {isConfirmed ? 'Signée' : 'En attente de signature'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Corps de la page */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Aperçu de l'offre - largeur principale */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Votre offre</h2>
            <div className="border rounded-lg overflow-hidden">
              {/* Ici, nous pourrions intégrer un composant PDFCanvas.tsx simplifié pour montrer l'offre */}
              <div className="bg-gray-100 p-6 min-h-[600px] flex flex-col items-center">
                <div className="bg-white shadow-md w-full h-[800px] relative overflow-auto">
                  <div className="text-lg font-bold text-center p-6 border-b">
                    Offre de leasing iTakecare
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-4">Informations client</h3>
                    <div className="mb-6 p-4 bg-gray-50 rounded-md">
                      <p><strong>Nom:</strong> {offer.client_name}</p>
                      <p><strong>Email:</strong> {offer.client_email}</p>
                      {offer.client_company && <p><strong>Société:</strong> {offer.client_company}</p>}
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4">Détails de l'équipement</h3>
                    <div className="mb-6 p-4 bg-gray-50 rounded-md whitespace-pre-line">
                      {offer.equipment_description}
                    </div>
                    
                    <h3 className="text-lg font-bold mb-4">Conditions financières</h3>
                    <div className="mb-6 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Montant total</p>
                          <p className="text-lg font-bold">{formatCurrency(offer.amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Loyer mensuel</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(offer.monthly_payment)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Zone de signature */}
                    <div className="mt-8 p-4 border rounded-md">
                      <h3 className="text-center font-bold">Bon pour accord</h3>
                      
                      {isConfirmed ? (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Date: {format(new Date(offer.signature_date || new Date()), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="border p-2 rounded-md bg-gray-50">
                            {offer.signature_data && (
                              <img 
                                src={offer.signature_data} 
                                alt="Signature" 
                                className="max-h-[100px] mx-auto"
                              />
                            )}
                          </div>
                          <p className="text-center text-xs text-gray-500 mt-2">
                            Document signé électroniquement
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 flex justify-center">
                          <Button onClick={() => setShowSignatureDialog(true)}>
                            Signer cette offre
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="mt-8 p-4 border-t text-center text-xs text-gray-500">
                    <p className="font-bold mb-1">Cette offre est valable 30 jours à compter de sa date d'émission.</p>
                    <p>iTakecare - Avenue du Général Michel 1E, 6000 Charleroi, Belgique</p>
                    <p>TVA: BE 0795.642.894 - Tel: +32 471 511 121 - Email: hello@itakecare.be</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Résumé et actions - barre latérale */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Résumé de l'offre</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{offer.client_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="font-medium">{formatCurrency(offer.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mensualité</p>
                      <p className="font-medium text-primary">{formatCurrency(offer.monthly_payment)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(offer.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col">
                {!isConfirmed ? (
                  <Button 
                    className="w-full" 
                    onClick={() => setShowSignatureDialog(true)}
                  >
                    Signer cette offre
                  </Button>
                ) : (
                  <div className="flex items-center justify-center p-2 bg-green-50 text-green-700 rounded-md w-full">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Offre signée
                  </div>
                )}
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Besoin d'aide?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour toute question sur cette offre, contactez directement votre conseiller ou notre service client.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">Email: support@itakecare.be</p>
                  <p className="text-sm">Téléphone: +32 471 511 121</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialog de signature */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signez votre offre</DialogTitle>
            <DialogDescription>
              Utilisez votre souris ou votre doigt pour signer dans le cadre ci-dessous.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <SignaturePad
              width={400}
              height={200}
              onSave={handleSaveSignature}
              className="mx-auto"
            />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              En signant, vous acceptez les conditions générales de cette offre.
            </p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowSignatureDialog(false)}
            >
              Annuler
            </Button>
            <Button 
              type="button"
              onClick={handleSignOffer}
              disabled={!signature || isSigning}
            >
              {isSigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                'Confirmer la signature'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-green-600">
              <CheckCircle className="h-6 w-6 mr-2" />
              Signature confirmée !
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <p>Votre offre a été signée avec succès.</p>
            <p className="text-muted-foreground mt-2">
              Une copie du document signé sera envoyée à votre adresse email.
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              className="w-full"
              onClick={() => setShowSuccessDialog(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientOfferSignPage;
