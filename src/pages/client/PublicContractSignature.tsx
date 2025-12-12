import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Check, 
  Loader2, 
  AlertCircle,
  Building2,
  Euro,
  Calendar,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import IBANInput from "@/components/contracts/IBANInput";

interface ContractData {
  id: string;
  offer_id: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_address: string;
  client_city: string;
  client_postal_code: string;
  client_vat_number: string;
  leaser_name: string;
  monthly_payment: number;
  contract_duration: number;
  tracking_number: string;
  signature_status: string;
  is_self_leasing: boolean;
  company: {
    name: string;
    logo_url: string;
    primary_color: string;
  };
  equipment: Array<{
    id: string;
    title: string;
    quantity: number;
    purchase_price: number;
    monthly_payment: number;
  }>;
}

const PublicContractSignature: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  
  // Form state
  const [signerName, setSignerName] = useState("");
  const [clientIBAN, setClientIBAN] = useState("");
  const [clientBIC, setClientBIC] = useState("");
  const [isIBANValid, setIsIBANValid] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase.rpc('get_contract_for_signature', {
        p_signature_token: token
      });

      if (error) throw error;

      if (!data) {
        setError("Contrat non trouvé ou déjà signé");
        return;
      }

      setContract(data);
      setSignerName(data.client_name || "");

      if (data.signature_status === 'signed') {
        setIsSigned(true);
      }
    } catch (err: any) {
      console.error('Error fetching contract:', err);
      setError(err.message || "Erreur lors du chargement du contrat");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const expectedConfirmation = contract 
    ? `Bon pour accord pour ${formatCurrency(contract.monthly_payment)}/mois pendant ${contract.contract_duration} mois`
    : "";

  // Normaliser les espaces (normaux et insécables) pour une comparaison tolérante
  const normalizeSpaces = (str: string) => {
    return str.replace(/[\s\u00A0]+/g, ' ').trim().toLowerCase();
  };

  const isConfirmationValid = normalizeSpaces(confirmation) === normalizeSpaces(expectedConfirmation);
  
  const canSign = 
    signerName.trim() !== "" &&
    isIBANValid &&
    isConfirmationValid &&
    signatureRef.current &&
    !signatureRef.current.isEmpty();

  const handleClearSignature = () => {
    signatureRef.current?.clear();
  };

  const handleSign = async () => {
    if (!canSign || !token) return;

    setIsSigning(true);

    try {
      const signatureData = signatureRef.current?.toDataURL('image/png');
      
      // Get client IP (best effort)
      let signerIP = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        signerIP = ipData.ip;
      } catch {
        console.log('Could not fetch IP');
      }

      const { data, error } = await supabase.rpc('sign_contract_public', {
        p_signature_token: token,
        p_signature_data: signatureData,
        p_signer_name: signerName.trim(),
        p_signer_ip: signerIP,
        p_client_iban: clientIBAN,
        p_client_bic: clientBIC || null
      });

      if (error) throw error;

      if (data?.success) {
        setIsSigned(true);
        toast.success("Contrat signé avec succès !");
      } else {
        throw new Error(data?.error || "Erreur lors de la signature");
      }
    } catch (err: any) {
      console.error('Signing error:', err);
      toast.error(err.message || "Erreur lors de la signature du contrat");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Contrat non disponible</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Contrat signé !</h2>
            <p className="text-muted-foreground">
              Votre contrat a été signé avec succès. Vous recevrez une copie par email.
            </p>
            <p className="text-sm text-muted-foreground">
              Référence : {contract?.tracking_number}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with company branding */}
        <div className="text-center space-y-4">
          {contract?.company?.logo_url && (
            <img 
              src={contract.company.logo_url} 
              alt={contract.company.name}
              className="h-16 mx-auto object-contain"
            />
          )}
          <h1 className="text-2xl font-bold">Contrat de Location</h1>
          <p className="text-muted-foreground">
            Référence : {contract?.tracking_number}
          </p>
        </div>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informations du locataire
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Société</p>
              <p className="font-medium">{contract?.client_company || contract?.client_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{contract?.client_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
              <p className="font-medium">
                {contract?.client_address}<br />
                {contract?.client_postal_code} {contract?.client_city}
              </p>
            </div>
            {contract?.client_vat_number && (
              <div>
                <p className="text-sm text-muted-foreground">N° TVA</p>
                <p className="font-medium">{contract.client_vat_number}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Équipements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Équipement</th>
                    <th className="text-center p-3 text-sm font-medium">Qté</th>
                    <th className="text-right p-3 text-sm font-medium">Mensualité</th>
                  </tr>
                </thead>
                <tbody>
                  {contract?.equipment?.map((eq, idx) => (
                    <tr key={eq.id || idx} className="border-t">
                      <td className="p-3">{eq.title}</td>
                      <td className="p-3 text-center">{eq.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(eq.monthly_payment)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">Total mensuel HT</td>
                    <td className="p-3 text-right">{formatCurrency(contract?.monthly_payment || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Récapitulatif financier
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Mensualité HT</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(contract?.monthly_payment || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Durée</p>
              <p className="text-2xl font-bold">{contract?.contract_duration} mois</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Bailleur</p>
              <p className="text-lg font-semibold">{contract?.leaser_name}</p>
            </div>
          </CardContent>
        </Card>

        {/* SEPA / IBAN Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Mandat de domiciliation SEPA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le prélèvement mensuel sera effectué par domiciliation bancaire. 
                Veuillez renseigner vos coordonnées bancaires ci-dessous.
              </AlertDescription>
            </Alert>

            <IBANInput
              value={clientIBAN}
              onChange={(value, isValid) => {
                setClientIBAN(value);
                setIsIBANValid(isValid);
              }}
              required
              showBIC
              bicValue={clientBIC}
              onBICChange={setClientBIC}
            />
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Signature du contrat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="signerName">Nom du signataire</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Veuillez recopier exactement le texte suivant :
              </p>
              <Badge variant="outline" className="mb-2 font-normal text-sm py-1.5 px-3">
                {expectedConfirmation}
              </Badge>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Recopiez le texte ci-dessus"
                className={isConfirmationValid && confirmation ? 'border-green-500' : ''}
              />
              {confirmation && !isConfirmationValid && (
                <p className="text-xs text-destructive">
                  Le texte ne correspond pas exactement
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Votre signature</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSignature}
                >
                  Effacer
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-40',
                    style: { width: '100%', height: '160px' }
                  }}
                  backgroundColor="white"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Signez dans le cadre ci-dessus
              </p>
            </div>

            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                En signant ce contrat, vous vous engagez à payer les mensualités 
                indiquées pendant toute la durée du contrat. Votre signature 
                électronique a la même valeur juridique qu'une signature manuscrite.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSign}
              disabled={!canSign || isSigning}
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Signer le contrat
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicContractSignature;
