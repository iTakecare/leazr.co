import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
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
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import IBANInput from "@/components/contracts/IBANInput";
import { generateAndUploadSignedContractPDF } from "@/services/signedContractPdfService";

interface ContractData {
  id: string;
  offer_id: string;
  client_name: string;
  client: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    vat_number: string;
    billing_address?: string;
    billing_city?: string;
    billing_postal_code?: string;
  };
  leaser_name: string;
  monthly_payment: number;
  contract_duration: number;
  tracking_number: string;
  contract_number?: string;
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

// Manual build marker to quickly confirm which frontend bundle is running.
const BUILD_ID = "public-contract-signature-2025-12-27-01";

const PublicContractSignature: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const isDebug = new URLSearchParams(window.location.search).get("debug") === "1";
  const canonicalUrl = window.location.href.split("?")[0];

  const Seo = (
    <Helmet>
      <title>Signature contrat de location</title>
      <meta
        name="description"
        content="Signature électronique de votre contrat de location."
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );

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
    console.log("[PublicContractSignature] BUILD_ID:", BUILD_ID);
  }, []);

  useEffect(() => {
    if (token) {
      fetchContract();
    }
  }, [token]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase.rpc('get_contract_for_signature', {
        p_token: token
      });

      if (error) throw error;

      if (!data) {
        setError("Contrat non trouvé ou déjà signé");
        return;
      }

      // Normalize response - handle array or direct object
      let normalized: any = Array.isArray(data) ? data[0] : data;

      const parseJsonIfString = (value: any) => {
        if (typeof value !== 'string') return value;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      // Normalize nested objects (RPC responses sometimes return JSON as strings)
      normalized = parseJsonIfString(normalized);
      normalized.company = parseJsonIfString(normalized?.company ?? normalized?.companies);

      // Client can arrive under different keys depending on SQL/RPC implementation
      let client: any = normalized?.client ?? normalized?.clients;
      client = parseJsonIfString(client);

      // Fallback: rebuild client object from flat fields if needed
      if (!client) {
        const hasAnyFlatClientField = Boolean(
          normalized?.client_name ||
            normalized?.client_company ||
            normalized?.client_email ||
            normalized?.client_phone ||
            normalized?.client_address ||
            normalized?.client_city ||
            normalized?.client_postal_code ||
            normalized?.client_vat_number
        );

        if (hasAnyFlatClientField) {
          client = {
            id: normalized?.client_id,
            name: normalized?.client_name,
            company: normalized?.client_company,
            email: normalized?.client_email,
            phone: normalized?.client_phone,
            address: normalized?.client_address,
            city: normalized?.client_city,
            postal_code: normalized?.client_postal_code,
            vat_number: normalized?.client_vat_number,
            billing_address: normalized?.client_billing_address,
            billing_city: normalized?.client_billing_city,
            billing_postal_code: normalized?.client_billing_postal_code
          };
        }
      }

      normalized.client = client ?? null;

      // Debug log (minimal + useful)
      console.log('[PublicContractSignature] Normalized contract data:', {
        keys: normalized ? Object.keys(normalized) : [],
        hasClient: !!normalized?.client,
        clientType: typeof normalized?.client,
        clientCompany: normalized?.client?.company,
        clientName: normalized?.client?.name,
        clientAddress: normalized?.client?.address,
        hasFlatClientName: !!normalized?.client_name
      });

      setContract(normalized);
      setSignerName(normalized?.client?.name || normalized?.client_name || "");

      if (normalized?.signature_status === 'signed') {
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

  const client = contract?.client;
  const tenantCompany = client?.company ?? client?.name ?? contract?.client_name ?? "";
  const tenantContact = client?.name ?? contract?.client_name ?? "";
  const tenantAddressLine = client?.address ?? client?.billing_address ?? "";
  const tenantPostalCode = client?.postal_code ?? client?.billing_postal_code ?? "";
  const tenantCity = client?.city ?? client?.billing_city ?? "";
  const hasTenantAddress = Boolean(tenantAddressLine || tenantPostalCode || tenantCity);

  const debugData = isDebug
    ? {
        buildId: BUILD_ID,
        url: window.location.href,
        token,
        hasContract: !!contract,
        contractKeys: contract ? Object.keys(contract) : [],
        hasClient: !!client,
        clientType: typeof client,
        clientKeys: client ? Object.keys(client as any) : [],
        tenantCompany,
        tenantContact,
        tenantAddressLine,
        tenantPostalCode,
        tenantCity,
        vat: client?.vat_number ?? null,
      }
    : null;

  // Normaliser les espaces et caractères spéciaux pour une comparaison tolérante
  const normalizeText = (str: string) => {
    return str
      .replace(/[\s\u00A0\u202F\u2009]+/g, ' ') // Tous types d'espaces → espace normal
      .replace(/€/g, '€') // Normaliser le symbole euro
      .trim()
      .toLowerCase();
  };

  const normalizedConfirmation = normalizeText(confirmation);
  const normalizedExpected = normalizeText(expectedConfirmation);
  
  const isConfirmationValid = normalizedConfirmation === normalizedExpected;
  
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
        // Generate and upload the signed contract PDF
        try {
          console.log('Generating signed contract PDF for contract:', data.contract_id);
          const pdfUrl = await generateAndUploadSignedContractPDF(data.contract_id);
          console.log('Signed contract PDF generated and uploaded:', pdfUrl);
        } catch (pdfErr) {
          console.error('Failed to generate signed contract PDF:', pdfErr);
          // Continue - signing was successful even if PDF generation failed
        }

        // Send confirmation email with the PDF
        try {
          console.log('Sending signed contract email for contract:', data.contract_id);
          const emailResponse = await supabase.functions.invoke('send-signed-contract-email', {
            body: { contractId: data.contract_id }
          });
          
          if (emailResponse.error) {
            console.error('Email sending error:', emailResponse.error);
          } else {
            console.log('Signed contract email sent successfully');
          }
        } catch (emailErr) {
          console.error('Failed to send signed contract email:', emailErr);
        }

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
        {Seo}
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
        {Seo}
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
        {Seo}
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
              Référence : {contract?.contract_number || contract?.tracking_number}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {Seo}
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
            Référence : {contract?.contract_number || contract?.tracking_number}
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
              <p className="font-medium">{tenantCompany || "Non renseigné"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{tenantContact || "Non renseigné"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
              <p className="font-medium">
                {hasTenantAddress ? (
                  <>
                    {tenantAddressLine || ""}
                    {tenantAddressLine ? <br /> : null}
                    {[tenantPostalCode, tenantCity].filter(Boolean).join(" ")}
                  </>
                ) : (
                  "Non renseigné"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">N° TVA</p>
              <p className="font-medium">{client?.vat_number || "Non renseigné"}</p>
            </div>

            {isDebug && (
              <div className="md:col-span-2">
                <Separator className="my-2" />
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Debug (build {BUILD_ID})
                  </p>
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </div>
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

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Build: {BUILD_ID}
        </p>
      </div>
    </div>
  );
};

export default PublicContractSignature;
