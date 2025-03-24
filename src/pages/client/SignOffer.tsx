
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  getOfferForClient, 
  saveOfferSignature, 
  isOfferSigned 
} from "@/services/offers/offerSignature";
import { generateAndDownloadOfferPdf } from "@/services/offers/offerPdf";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import SignatureCanvas from "@/components/signature/SignaturePad";
import { AlertCircle, Check, CheckCircle, FileText, Info, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClientOffersSidebar from "@/components/offers/ClientOffersSidebar";

const SignOffer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) {
        setError("Identifiant d'offre manquant");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setDebugInfo(`Tentative de chargement de l'offre: ${id}`);
        
        let alreadySigned = false;
        try {
          alreadySigned = await isOfferSigned(id);
          if (alreadySigned) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre déjà signée`);
          }
        } catch (signedErr) {
          console.error("Erreur lors de la vérification de signature:", signedErr);
          setDebugInfo(prev => `${prev}\nErreur vérification signature: ${JSON.stringify(signedErr)}`);
        }
        
        try {
          setDebugInfo(prev => `${prev}\nRécupération des données d'offre...`);
          const offerData = await getOfferForClient(id);
          
          if (!offerData) {
            setError("Cette offre n'existe pas ou n'est plus disponible.");
            setDebugInfo(prev => `${prev}\nAucune donnée d'offre reçue`);
            setLoading(false);
            return;
          }
          
          setDebugInfo(prev => `${prev}\nDonnées d'offre reçues. ID: ${offerData.id}, Status: ${offerData.workflow_status}`);
          console.log("Données d'offre complètes:", offerData);
          
          setOffer(offerData);
          
          if (offerData.client_name) {
            setSignerName(offerData.client_name);
          }
          
          if (offerData.signature_data) {
            setSignature(offerData.signature_data);
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre contient déjà une signature`);
          }
          
          if (offerData.workflow_status === 'approved' && !offerData.signature_data) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre marquée comme approuvée sans signature`);
          }
        } catch (dataErr: any) {
          console.error("Erreur détaillée lors de la récupération des données:", dataErr);
          setError(dataErr?.message || "Impossible de récupérer les détails de cette offre.");
          setDebugInfo(prev => `${prev}\nErreur récupération données: ${JSON.stringify(dataErr)}`);
        }
      } catch (err: any) {
        console.error("Erreur générale lors du chargement de l'offre:", err);
        setError(err?.message || "Une erreur s'est produite lors du chargement de l'offre.");
        setDebugInfo(prev => `${prev}\nErreur générale: ${JSON.stringify(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffer();
  }, [id]);
  
  const handleSignature = async (signatureData: string) => {
    if (!id || !signerName.trim()) {
      toast.error("Veuillez indiquer votre nom complet avant de signer.");
      return;
    }
    
    try {
      setIsSigning(true);
      setSignature(signatureData);
      
      console.log("Tentative d'enregistrement de la signature pour l'offre:", id);
      const success = await saveOfferSignature(id, signatureData, signerName);
      
      if (success) {
        setSigned(true);
        toast.success("Offre signée avec succès !");
        
        setOffer({
          ...offer,
          signature_data: signatureData,
          signer_name: signerName,
          signed_at: new Date().toISOString(),
          workflow_status: 'approved'
        });
        
        setTimeout(() => {
          handlePrintPdf();
        }, 1500);
        
        console.log("Signature enregistrée avec succès");
      } else {
        console.error("Échec de l'enregistrement de la signature");
        toast.error("Erreur lors de l'enregistrement de la signature.");
      }
    } catch (err) {
      console.error("Erreur lors de la signature:", err);
      toast.error("Une erreur s'est produite lors de la signature.");
    } finally {
      setIsSigning(false);
    }
  };
  
  const handlePrintPdf = async () => {
    if (!id) return;
    
    try {
      setIsPrintingPdf(true);
      console.log("Génération du PDF pour l'offre:", id);
      await generateAndDownloadOfferPdf(id);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
      toast.error("Une erreur s'est produite lors de la génération du PDF.");
    } finally {
      setIsPrintingPdf(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "Date inconnue";
    try {
      return format(new Date(dateString), "dd MMMM yyyy à HH:mm", { locale: fr });
    } catch {
      return "Date incorrecte";
    }
  };
  
  let equipmentDisplay = "Équipement non détaillé";
  try {
    if (offer.equipment_description) {
      if (typeof offer.equipment_description === 'string') {
        if (offer.equipment_description.startsWith('[') || offer.equipment_description.startsWith('{')) {
          try {
            const parsed = JSON.parse(offer.equipment_description);
            if (Array.isArray(parsed)) {
              equipmentDisplay = parsed.map(item => 
                typeof item === 'object' 
                  ? (item.title || item.name || item.model || JSON.stringify(item)) 
                  : String(item)
              ).join(", ");
            } else if (parsed && typeof parsed === 'object') {
              equipmentDisplay = parsed.title || parsed.name || parsed.model || JSON.stringify(parsed);
            }
          } catch (e) {
            console.log("L'equipment_description n'est pas un JSON valide, utilisation en l'état");
            equipmentDisplay = offer.equipment_description;
          }
        } else {
          equipmentDisplay = offer.equipment_description;
        }
      } else if (Array.isArray(offer.equipment_description)) {
        equipmentDisplay = offer.equipment_description.map((item: any) => 
          typeof item === 'object' 
            ? (item.title || item.name || item.model || JSON.stringify(item)) 
            : String(item)
        ).join(", ");
      } else if (typeof offer.equipment_description === 'object' && offer.equipment_description !== null) {
        equipmentDisplay = JSON.stringify(offer.equipment_description);
      }
    }
  } catch (e) {
    console.error("Erreur lors du parsing de l'équipement:", e);
    equipmentDisplay = typeof offer.equipment_description === 'string' 
      ? offer.equipment_description 
      : "Équipement non détaillé (erreur de format)";
  }
  
  console.log("Rendu de l'offre:", offer?.id, "Statut:", offer?.workflow_status);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre offre...</p>
        </div>
      </div>
    );
  }
  
  if (error || !offer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-2" />
              <CardTitle>Offre non disponible</CardTitle>
              <CardDescription>
                {error || "Cette offre n'existe pas ou n'est plus disponible."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo && (
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap">
                  <p className="font-bold mb-1">Informations de débogage:</p>
                  {debugInfo}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => window.location.href = "/"}>
                Retour à l'accueil
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Client Offers Sidebar */}
      <ClientOffersSidebar currentOfferId={id || ''} clientEmail={offer.client_email} />
      
      {/* Main Content */}
      <div className="flex-1 py-8 px-4 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">Offre de leasing</h1>
              <p className="text-gray-500">Référence: {id?.substring(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge 
                variant={signed ? "secondary" : "outline"} 
                className={signed ? "bg-green-50 text-green-700 border-green-200" : ""}
              >
                {signed ? "Signée" : "En attente de signature"}
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrintPdf}
                disabled={isPrintingPdf}
              >
                {isPrintingPdf ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></span>
                    Génération...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimer PDF
                  </span>
                )}
              </Button>
            </div>
          </div>
          
          {signed && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle>Offre signée</AlertTitle>
              <AlertDescription>
                {offer.signer_name ? `Cette offre a été signée par ${offer.signer_name}` : "Cette offre a été signée"} 
                {offer.signed_at ? ` le ${formatDate(offer.signed_at)}` : "."}
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle>Informations client</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="font-medium text-gray-500">Nom</Label>
                  <p className="mt-1">{offer.client_name}</p>
                </div>
                {offer.client_email && (
                  <div>
                    <Label className="font-medium text-gray-500">Email</Label>
                    <p className="mt-1">{offer.client_email}</p>
                  </div>
                )}
              </div>
              {offer.clients?.company && (
                <div className="mt-4">
                  <Label className="font-medium text-gray-500">Entreprise</Label>
                  <p className="mt-1">{offer.clients.company}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle>Équipement et financement</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label className="font-medium text-gray-500">Équipement</Label>
                  <p className="mt-1 whitespace-pre-line">{equipmentDisplay}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-sm text-blue-700 mb-1">Mensualité</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatCurrency(offer.monthly_payment)}
                      <span className="text-sm font-normal text-blue-500">/mois</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {offer.remarks && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <Label className="font-medium text-gray-500">Remarques</Label>
                    <p className="mt-1 whitespace-pre-line">{offer.remarks}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle>{signed ? "Signature" : "Signer l'offre"}</CardTitle>
              <CardDescription>
                {signed 
                  ? "Cette offre a déjà été signée électroniquement."
                  : "Veuillez signer ci-dessous pour accepter l'offre."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {signed ? (
                <div className="space-y-4">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 p-2 border-b">
                      <p className="text-sm text-gray-500">Signature</p>
                    </div>
                    <div className="p-4 bg-white flex justify-center">
                      {signature ? (
                        <img 
                          src={signature} 
                          alt="Signature" 
                          className="max-h-40 object-contain border" 
                        />
                      ) : (
                        <div className="text-gray-400 italic">
                          Signature électronique vérifiée
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Check className="text-green-500 h-5 w-5" />
                    <span className="text-sm text-gray-600">
                      Signé par {offer.signer_name || "le client"} 
                      {offer.signed_at ? ` le ${formatDate(offer.signed_at)}` : ""}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signer-name">Votre nom complet</Label>
                    <Input 
                      id="signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Entrez votre nom complet"
                      disabled={isSigning}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Votre nom sera utilisé comme identification légale pour cette signature électronique.
                    </p>
                  </div>
                  
                  <SignatureCanvas 
                    onSave={handleSignature}
                    disabled={isSigning}
                    height={200}
                    className="mt-4"
                  />
                  
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      En signant cette offre, vous acceptez les conditions générales de leasing et confirmez
                      que les informations fournies sont exactes.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
            
            {signed && (
              <CardFooter className="border-t bg-gray-50 flex justify-between">
                <div className="text-sm text-gray-500">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Une confirmation a été envoyée par email
                </div>
                <Button variant="outline" onClick={handlePrintPdf} disabled={isPrintingPdf}>
                  {isPrintingPdf ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></span>
                      Génération...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimer
                    </span>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignOffer;
