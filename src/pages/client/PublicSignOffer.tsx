
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOfferById } from "@/services/offerService";
import SignatureSection from "@/components/offers/SignatureSection";
import { signOffer, generateOfferPdf } from "@/services/offerSignature";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Loader2, Users, Calendar, Printer, CheckCircle2 } from "lucide-react";

const PublicSignOffer = () => {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const offerData = await getOfferById(id);
        
        if (!offerData) {
          setError("L'offre demandée n'existe pas ou a été supprimée.");
          return;
        }
        
        setOffer(offerData);
        
        // Préremplir le nom du signataire avec le nom du client
        if (offerData.client_name) {
          setSignerName(offerData.client_name);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'offre:", error);
        setError("Impossible de charger les détails de l'offre.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffer();
  }, [id]);

  const handleSign = async (signatureData: string) => {
    if (!id || !signerName) {
      toast.error("Veuillez renseigner votre nom avant de signer.");
      return;
    }
    
    try {
      setIsSigning(true);
      
      await signOffer(id, {
        signature: signatureData,
        name: signerName
      });
      
      // Mise à jour locale de l'offre pour afficher la signature
      setOffer(prev => ({
        ...prev,
        signature: signatureData,
        signature_name: signerName,
        signed_at: new Date().toISOString(),
        status: "signed"
      }));
      
      toast.success("L'offre a été signée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la signature:", error);
      toast.error("Une erreur est survenue lors de la signature.");
    } finally {
      setIsSigning(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!id) return;
    
    try {
      setIsPrintingPdf(true);
      const pdfUrl = await generateOfferPdf(id);
      
      // Ouvrir le PDF dans un nouvel onglet
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Impossible de générer le PDF de l'offre.");
    } finally {
      setIsPrintingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-4">Erreur</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-6" onClick={() => window.location.href = "/"}>
            Retourner à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (!offer) {
    return null;
  }

  const equipmentList = typeof offer.equipment_description === 'string'
    ? JSON.parse(offer.equipment_description)
    : offer.equipment_description || [];

  const isSigned = !!offer.signature;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Offre de leasing iTakecare</CardTitle>
            </div>
            <div className="h-10">
              <img src="/logo.svg" alt="iTakecare Logo" className="h-full" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Client</h3>
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{offer.client_name}</p>
                    <p className="text-sm text-gray-600">{offer.client_email}</p>
                    {offer.client_company && (
                      <p className="text-sm text-gray-600">{offer.client_company}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Détails de l'offre</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <p className="text-sm">
                      Créée le {formatDate(offer.created_at)}
                    </p>
                  </div>
                  {offer.status && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-400" />
                      <p className="text-sm">
                        Statut: <span className="font-medium">{offer.status === 'signed' ? 'Signée' : 'En attente de signature'}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-bold mb-4">Équipements inclus</h2>
              <div className="overflow-hidden border rounded-lg">
                <table className="min-w-full divide-y">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qté</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y">
                    {equipmentList.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.quantity || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-4 flex flex-col md:flex-row justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mensualité totale</p>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(offer.monthly_payment)} /mois</p>
                <p className="text-xs text-gray-500 mt-1">Durée de {offer.duration || 36} mois</p>
              </div>
              {isSigned && (
                <Button
                  variant="outline"
                  onClick={handlePrintPdf}
                  disabled={isPrintingPdf}
                  className="mt-3 md:mt-0 self-start"
                >
                  {isPrintingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  Imprimer l'offre
                </Button>
              )}
            </div>

            {offer.remarks && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2">Remarques:</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line">{offer.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <SignatureSection
          signed={isSigned}
          signature={offer.signature}
          signerName={signerName}
          setSignerName={setSignerName}
          isSigning={isSigning}
          signedAt={offer.signed_at}
          onSign={handleSign}
          isPrintingPdf={isPrintingPdf}
          onPrintPdf={handlePrintPdf}
        />
      </div>
    </div>
  );
};

export default PublicSignOffer;
