import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, Download, ArrowLeft } from "lucide-react";
import { getOfferForClient, saveOfferSignature, isOfferSigned } from "@/services/offers/offerSignature";
import SignaturePad from "@/components/signature/SignaturePad";
import PDFCanvas from "@/components/settings/pdf-preview/PDFCanvas";
import { formatCurrency } from "@/lib/utils";

const SignOffer = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0.8);
  const [signerName, setSignerName] = useState<string>("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const signaturePadRef = useRef<any>(null);

  const [localTemplate, setLocalTemplate] = useState({
    name: "Default Template",
    companyName: "iTakeCare",
    companyAddress: "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
    companyContact: "Tel: +32 471 511 121 - Email: hello@itakecare.be",
    companySiret: "TVA: BE 0795.642.894",
    logoURL: "",
    primaryColor: "#2C3E50",
    secondaryColor: "#3498DB",
    headerText: "OFFRE N° {offer_id}",
    footerText: "Cette offre est valable 30 jours à compter de sa date d'émission.",
    templateImages: [], 
    fields: [
      {
        id: "client_name",
        label: "Nom du client",
        value: "{client_name}",
        position: { x: 20, y: 40 },
        page: 0,
        isVisible: true
      },
      {
        id: "total_amount",
        label: "Montant total",
        value: "{amount}",
        position: { x: 150, y: 120 },
        page: 0,
        isVisible: true
      },
      {
        id: "monthly_payment",
        label: "Mensualité",
        value: "{monthly_payment}",
        position: { x: 150, y: 140 },
        page: 0,
        isVisible: true
      },
      {
        id: "equipment_table",
        label: "Tableau d'équipement",
        value: "equipment_table",
        position: { x: 20, y: 80 },
        page: 0,
        isVisible: true
      }
    ]
  });

  useEffect(() => {
    const fetchOffer = async () => {
      if (!offerId) {
        setError("Identifiant d'offre manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const alreadySigned = await isOfferSigned(offerId);
        setSigned(alreadySigned);
        
        const offerData = await getOfferForClient(offerId);
        
        if (!offerData) {
          setError("L'offre demandée n'existe pas ou n'est plus disponible");
          setLoading(false);
          return;
        }
        
        console.log("Offer data:", offerData);
        setOffer(offerData);
        
        if (offerData.client_name) {
          setSignerName(offerData.client_name);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching offer:", error);
        setError("Erreur lors du chargement de l'offre");
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  const handleSubmit = async () => {
    if (!offerId || !signaturePadRef.current) {
      toast.error("Impossible de soumettre la signature");
      return;
    }

    if (signaturePadRef.current.isEmpty()) {
      toast.error("Veuillez signer le document avant de continuer");
      return;
    }

    if (!signerName.trim()) {
      toast.error("Veuillez entrer votre nom avant de continuer");
      return;
    }

    try {
      setSubmitting(true);
      
      const signatureImage = signaturePadRef.current.toDataURL("image/png");
      setSignatureData(signatureImage);
      
      const success = await saveOfferSignature(offerId, signatureImage, signerName);
      
      if (success) {
        toast.success("Signature enregistrée avec succès");
        setSigned(true);
      } else {
        toast.error("Erreur lors de l'enregistrement de la signature");
      }
    } catch (error) {
      console.error("Error submitting signature:", error);
      toast.error("Une erreur est survenue lors de la soumission de la signature");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setSignatureData(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Chargement de l'offre...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center py-8 px-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold">Signature d'offre</h1>
        <p className="text-muted-foreground">
          Offre de {offer?.client_name || "Client"} - {formatCurrency(offer?.monthly_payment || 0)}/mois
        </p>
      </div>

      {signed ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 px-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Offre déjà signée</h2>
            <p className="text-muted-foreground mb-6">
              Cette offre a déjà été signée{offer?.signed_at ? ` le ${new Date(offer.signed_at).toLocaleDateString('fr-FR')}` : ''}.
            </p>
            <div className="flex gap-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger l'offre signée
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="preview">Aperçu du document</TabsTrigger>
            <TabsTrigger value="sign">Signer le document</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="mt-0">
            <Card>
              <CardContent className="p-1 sm:p-6">
                {offer && (
                  <PDFCanvas
                    localTemplate={localTemplate}
                    zoomLevel={zoomLevel}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageLoaded={pageLoaded}
                    setPageLoaded={setPageLoaded}
                    isDraggable={false}
                    sampleData={offer}
                    onStartDrag={() => {}}
                    onDrag={() => {}}
                    onEndDrag={() => {}}
                    useRealData={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sign" className="mt-0">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Signature électronique</h3>
                  <p className="text-sm text-muted-foreground">
                    En signant ce document, vous acceptez les termes et conditions de l'offre.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" htmlFor="signerName">
                        Votre nom complet
                      </label>
                      <input
                        id="signerName"
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Entrez votre nom complet"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Votre signature
                      </label>
                      <div className="border rounded-md p-1 bg-white">
                        <SignaturePad
                          ref={signaturePadRef}
                          width={550}
                          height={200}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between gap-4 pt-4">
                    <Button variant="outline" onClick={handleClear} disabled={submitting}>
                      Effacer la signature
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        "Signer et valider l'offre"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SignOffer;
