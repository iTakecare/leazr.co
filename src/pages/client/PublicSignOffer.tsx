
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, Printer, AlertCircle, CheckCircle2 } from "lucide-react";
import { getOfferForClient, saveOfferSignature, isOfferSigned, generateAndDownloadOfferPdf } from "@/services/offers/offerSignature";
import { formatCurrency } from "@/utils/formatters";
import SignaturePad from "@/components/signature/SignaturePad";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";

// Public version of the SignOffer page - does not require authentication
const PublicSignOffer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [signerName, setSignerName] = useState<string>("");
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  // Load offer data
  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) {
        setError("Identifiant d'offre manquant");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Check if the offer is already signed
        const alreadySigned = await isOfferSigned(id);
        setSigned(alreadySigned);
        
        // Get offer details
        const offerData = await getOfferForClient(id);
        
        if (!offerData) {
          setError("Cette offre n'existe pas ou n'est plus disponible");
          return;
        }
        
        setOffer(offerData);
        
        // Pre-fill signer name if available
        if (offerData.client_name) {
          setSignerName(offerData.client_name);
        }
        
        // If the offer is already signed, we need to disable signature
        if (alreadySigned && offerData.signer_name) {
          setSignerName(offerData.signer_name);
        }
        
        setDebugInfo(`Offre chargée avec succès: ${offerData.id}`);
      } catch (err: any) {
        console.error("Erreur lors du chargement de l'offre:", err);
        setError(`Erreur: ${err.message || "Impossible de charger l'offre"}`);
        setDebugInfo(`Erreur: ${JSON.stringify(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffer();
  }, [id]);
  
  // Handle signature change
  const handleSignatureChange = (data: string) => {
    setSignature(data);
  };
  
  // Handle signature submission
  const handleSignature = async () => {
    if (!id || !signature || !signerName.trim()) {
      toast.error("Veuillez fournir une signature et un nom");
      return;
    }
    
    try {
      setIsSigning(true);
      
      // Save the signature
      const success = await saveOfferSignature(id, signature, signerName);
      
      if (success) {
        toast.success("Offre signée avec succès");
        setSigned(true);
      } else {
        toast.error("Erreur lors de la signature de l'offre");
      }
    } catch (err) {
      console.error("Erreur lors de la signature:", err);
      toast.error("Une erreur est survenue lors de la signature");
    } finally {
      setIsSigning(false);
    }
  };
  
  // Handle PDF generation and download
  const handlePrintPdf = async () => {
    if (!id) return;
    
    try {
      setIsPrintingPdf(true);
      await generateAndDownloadOfferPdf(id);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsPrintingPdf(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Chargement de l'offre...</p>
      </div>
    );
  }
  
  if (error || !offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-xl text-red-700 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Erreur
            </CardTitle>
            <CardDescription className="text-red-600">
              {error || "Cette offre n'existe pas ou n'est plus disponible."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pb-6 pt-4 flex justify-center">
            <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </CardFooter>
        </Card>
        
        {debugInfo && (
          <div className="mt-8 text-xs text-gray-400 max-w-2xl overflow-auto p-4 bg-gray-100 rounded">
            <p>Détails techniques (pour le support):</p>
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    );
  }
  
  const equipmentDisplay = formatEquipmentDisplay(offer.equipment_description);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Offre #{id?.substring(0, 8).toUpperCase()}</h1>
            <p className="text-gray-500 text-sm">Veuillez lire attentivement l'offre avant de la signer</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrintPdf}
              disabled={isPrintingPdf}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrintingPdf ? 'Génération...' : 'Télécharger PDF'}
            </Button>
          </div>
        </div>
        
        {/* Signed Alert */}
        {signed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">
                Cette offre a été signée
              </p>
              <p className="text-green-700 text-sm">
                {offer.signer_name && `Signée par ${offer.signer_name}`}
                {offer.signed_at && ` le ${new Date(offer.signed_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        )}
        
        {/* Client Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informations client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-medium">{offer.client_name || 'Non spécifié'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{offer.client_email || 'Non spécifié'}</p>
              </div>
              {offer.clients?.company && (
                <div>
                  <p className="text-sm text-gray-500">Société</p>
                  <p className="font-medium">{offer.clients.company}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Equipment Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Détails de l'équipement</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(equipmentDisplay) ? (
              <div className="space-y-4">
                {equipmentDisplay.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                    <p className="font-medium">{item.title}</p>
                    {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-4">
                      {item.quantity && <span className="text-sm">Quantité: {item.quantity}</span>}
                      {item.purchasePrice && <span className="text-sm">Prix: {formatCurrency(item.purchasePrice)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">{equipmentDisplay || 'Aucun détail disponible'}</p>
            )}
            
            {offer.monthly_payment > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                <p className="font-medium text-blue-800">Mensualités</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(offer.monthly_payment)}</p>
              </div>
            )}
            
            {offer.remarks && (
              <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-100">
                <p className="font-medium text-amber-800">Remarques</p>
                <p className="text-sm text-amber-900">{offer.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {signed ? 'Document signé' : 'Signature électronique'}
            </CardTitle>
            <CardDescription>
              {signed 
                ? 'Cette offre a été signée électroniquement et ne peut plus être modifiée.' 
                : 'Veuillez signer ci-dessous pour accepter cette offre.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!signed ? (
              <>
                <div className="mb-4">
                  <Label htmlFor="signerName">Nom du signataire</Label>
                  <Input 
                    id="signerName"
                    value={signerName} 
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Entrez votre nom complet"
                    className="mt-1"
                  />
                </div>
                
                <div className="mb-4">
                  <Label>Signature</Label>
                  <div className="mt-1 border border-gray-300 rounded-md overflow-hidden">
                    <SignaturePad onSignatureChange={handleSignatureChange} className="h-48" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Utilisez votre souris ou votre doigt pour signer dans la zone ci-dessus.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                {offer.signature_data ? (
                  <div className="border border-gray-200 rounded-md p-2 bg-gray-50 w-full max-w-md">
                    <img 
                      src={offer.signature_data} 
                      alt="Signature"
                      className="max-h-32 mx-auto" 
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Signature électronique validée</p>
                )}
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Signé par <span className="font-medium">{offer.signer_name}</span>
                  </p>
                  {offer.signed_at && (
                    <p className="text-xs text-gray-500">
                      le {new Date(offer.signed_at).toLocaleDateString()} à {new Date(offer.signed_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
            {!signed ? (
              <>
                <Button 
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
                
                <Button
                  onClick={handleSignature}
                  disabled={!signature || !signerName.trim() || isSigning}
                  className="w-full sm:w-auto gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSigning ? 'Signature en cours...' : 'Signer le document'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handlePrintPdf}
                disabled={isPrintingPdf}
                className="w-full sm:w-auto gap-2"
              >
                <Printer className="h-4 w-4" />
                {isPrintingPdf ? 'Génération en cours...' : 'Télécharger le document'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PublicSignOffer;
