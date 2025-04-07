
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOfferForClient, saveOfferSignature, isOfferSigned } from "@/services/offers/offerSignature";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SignaturePad from "@/components/signature/SignaturePad";
import EquipmentDisplay from "@/components/offers/EquipmentDisplay";
import OfferHeader from "@/components/offers/OfferHeader";
import { Info, X, Check, AlertCircle, Loader2 } from "lucide-react";

interface OfferData {
  id: string;
  client_name: string;
  client_email: string;
  equipment_description?: string;
  amount?: number;
  monthly_payment?: number;
  workflow_status?: string;
  signature_data?: string;
  signed_at?: string;
}

const PublicSignOffer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) {
        setError("ID d'offre manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Vérifier si l'offre est déjà signée
        const signed = await isOfferSigned(id);
        if (signed) {
          setAlreadySigned(true);
        }
        
        // Charger les données de l'offre
        const offerData = await getOfferForClient(id);
        console.log("Données de l'offre récupérées:", offerData);
        
        if (offerData) {
          setOffer(offerData);
          // Préremplir le nom du signataire avec le nom du client
          if (offerData.client_name) {
            setSignerName(offerData.client_name);
          }
        } else {
          setError("Offre non trouvée");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'offre:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue lors du chargement de l'offre");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  const handleSignatureChange = (data: string) => {
    setSignatureData(data);
  };

  const handleSignerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignerName(e.target.value);
  };

  const handleSubmit = async () => {
    if (!id || !signatureData || !signerName.trim()) {
      toast.error("Veuillez fournir votre signature et votre nom complet.");
      return;
    }

    try {
      setIsSaving(true);
      const success = await saveOfferSignature(id, signatureData, signerName);
      
      if (success) {
        toast.success("Offre signée avec succès");
        setAlreadySigned(true);
      } else {
        toast.error("Erreur lors de la signature de l'offre");
      }
    } catch (err) {
      console.error("Erreur lors de la signature de l'offre:", err);
      toast.error("Erreur lors de la signature de l'offre");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Chargement de l'offre...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-2xl w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.href = '/'}
        >
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-2xl w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Offre non trouvée</AlertTitle>
          <AlertDescription>
            L'offre que vous recherchez n'existe pas ou n'est plus disponible.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.href = '/'}
        >
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {alreadySigned ? "Offre signée" : "Signer votre offre"}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.href = '/'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {alreadySigned 
              ? "Cette offre a déjà été signée avec succès."
              : "Veuillez vérifier les détails et signer l'offre ci-dessous."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Détails du client</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <p><strong>Nom :</strong> {offer.client_name}</p>
              <p><strong>Email :</strong> {offer.client_email}</p>
            </div>
          </div>

          {offer.equipment_description && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Équipement</h3>
              <EquipmentDisplay equipmentDescription={offer.equipment_description} />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Détails financiers</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <p><strong>Montant total :</strong> {offer.amount?.toLocaleString('fr-FR')} €</p>
              <p><strong>Mensualité :</strong> {offer.monthly_payment?.toLocaleString('fr-FR')} €</p>
            </div>
          </div>

          {alreadySigned ? (
            <Alert className="bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>Offre signée</AlertTitle>
              <AlertDescription>
                Cette offre a été signée le {new Date(offer.signed_at || new Date()).toLocaleDateString('fr-FR')}. 
                Un email de confirmation a été envoyé.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Signature électronique</h3>
                
                <div className="flex flex-col space-y-2">
                  <label htmlFor="signerName" className="text-sm font-medium">
                    Votre nom complet
                  </label>
                  <input
                    id="signerName"
                    type="text"
                    value={signerName}
                    onChange={handleSignerNameChange}
                    className="border rounded-md p-2"
                    placeholder="Entrez votre nom complet"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Votre signature
                  </label>
                  <SignaturePad 
                    onChange={handleSignatureChange}
                    className="border rounded-md h-40 bg-white"
                  />
                  <p className="text-xs text-gray-500">
                    Utilisez votre souris ou votre doigt pour dessiner votre signature.
                  </p>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    En signant électroniquement ce document, vous acceptez les conditions 
                    générales et vous vous engagez à respecter les termes du contrat.
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {alreadySigned ? (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              Retour à l'accueil
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSaving || !signatureData || !signerName.trim()}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Signer l'offre
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PublicSignOffer;
