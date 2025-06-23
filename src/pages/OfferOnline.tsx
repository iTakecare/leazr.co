
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getOfferById } from "@/services/offers/getOffers";
import { saveOfferSignature } from "@/services/offers/offerSignature";
import { Loader2, FileText, CheckCircle, User, Building2, Calendar, Euro } from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

const OfferOnline = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureRef, setSignatureRef] = useState<SignatureCanvas | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id) {
        setError("ID de l'offre manquant");
        setLoading(false);
        return;
      }

      try {
        console.log("📋 Loading offer for ID:", id);
        const offerData = await getOfferById(id);
        
        if (!offerData) {
          setError("Offre non trouvée");
          setLoading(false);
          return;
        }

        console.log("✅ Offer loaded:", offerData);
        setOffer(offerData);
        setSignerName(offerData.client_name || "");
      } catch (err) {
        console.error("❌ Error loading offer:", err);
        setError("Erreur lors du chargement de l'offre");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id]);

  const handleSign = async () => {
    if (!offer || !signatureRef || !signerName.trim()) {
      toast.error("Veuillez saisir votre nom et signer");
      return;
    }

    if (signatureRef.isEmpty()) {
      toast.error("Veuillez signer dans la zone prévue");
      return;
    }

    setSigning(true);
    try {
      const signatureData = signatureRef.toDataURL();
      const userIp = await fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => data.ip)
        .catch(() => 'Unknown');

      const result = await saveOfferSignature(offer.id, signatureData, signerName, userIp);
      
      if (result.data) {
        toast.success("Offre signée avec succès !");
        setOffer({ ...offer, signature_data: signatureData, signer_name: signerName, signed_at: new Date().toISOString() });
      } else {
        throw new Error("Erreur lors de la signature");
      }
    } catch (err) {
      console.error("❌ Error signing offer:", err);
      toast.error("Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef) {
      signatureRef.clear();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
    } catch {
      return "Date invalide";
    }
  };

  const parseEquipment = (equipmentDescription: string) => {
    try {
      return JSON.parse(equipmentDescription);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'offre...</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Offre non trouvée</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const equipment = parseEquipment(offer.equipment_description || '[]');
  const isAlreadySigned = !!(offer.signature_data && offer.signed_at);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Offre de Leasing</h1>
                <p className="text-blue-100">Référence: {offer.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100">Date de création</p>
                <p className="font-semibold">{formatDate(offer.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-4">
              {isAlreadySigned ? (
                <Badge className="bg-green-100 text-green-800 px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Signée
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
                  En attente de signature
                </Badge>
              )}
              {isAlreadySigned && (
                <div className="text-sm text-gray-600">
                  Signée par {offer.signer_name} le {formatDate(offer.signed_at)}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations Client
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom</label>
                  <p className="text-lg font-semibold">{offer.client_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{offer.client_email || 'Non spécifié'}</p>
                </div>
                {offer.clients?.company && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Entreprise</label>
                    <p className="text-lg">{offer.clients.company}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Equipment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Détails de l'Équipement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {equipment.length > 0 ? (
                  <div className="space-y-4">
                    {equipment.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">{item.title}</h4>
                          <Badge variant="outline">Quantité: {item.quantity || 1}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Prix d'achat:</span>
                            <span className="ml-2 font-medium">{formatCurrency(item.purchasePrice || 0)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Marge:</span>
                            <span className="ml-2 font-medium">{item.margin || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucun équipement spécifié</p>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Résumé Financier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Montant Total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(offer.amount || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Montant Financé</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(offer.financed_amount || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Mensualité</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(offer.monthly_payment || 0)}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="text-center">
                  <p className="text-sm text-gray-500">Coefficient appliqué</p>
                  <p className="text-lg font-semibold">{offer.coefficient || 0}%</p>
                </div>
              </CardContent>
            </Card>

            {/* Signature Section */}
            {!isAlreadySigned && (
              <Card>
                <CardHeader>
                  <CardTitle>Signature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du signataire
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Saisissez votre nom"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signature
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg">
                      <SignatureCanvas
                        ref={(ref) => setSignatureRef(ref)}
                        canvasProps={{
                          width: 500,
                          height: 200,
                          className: 'signature-canvas w-full'
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={clearSignature}>
                        Effacer
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleSign}
                      disabled={signing || !signerName.trim()}
                      className="flex-1"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Signature en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Signer l'offre
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Already Signed */}
            {isAlreadySigned && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Offre Signée</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold">Cette offre a été signée avec succès</p>
                      <p className="text-sm text-gray-600">
                        Signée par {offer.signer_name} le {formatDate(offer.signed_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferOnline;
