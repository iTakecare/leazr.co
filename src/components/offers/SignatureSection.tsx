
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Check, 
  FileText, 
  Info, 
  Printer 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignatureCanvas from "@/components/signature/SignaturePad";
import { formatDate } from "@/utils/formatters";

interface SignatureSectionProps {
  signed: boolean;
  signature: string | null;
  signerName: string;
  setSignerName: (name: string) => void;
  isSigning: boolean;
  signedAt?: string;
  onSign: (signatureData: string) => void;
  isPrintingPdf: boolean;
  onPrintPdf: () => void;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  signed,
  signature,
  signerName,
  setSignerName,
  isSigning,
  signedAt,
  onSign,
  isPrintingPdf,
  onPrintPdf
}) => {
  return (
    <Card className="mb-6 w-full overflow-hidden">
      <CardHeader className="bg-primary/5 py-3 px-4 md:px-6">
        <CardTitle className="text-lg md:text-xl">
          {signed ? "Signature" : "Signer l'offre"}
        </CardTitle>
        <CardDescription>
          {signed 
            ? "Cette offre a déjà été signée électroniquement."
            : "Veuillez signer ci-dessous pour accepter l'offre."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
        {signed ? (
          <div className="space-y-4 w-full">
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
              <Check className="text-green-500 h-5 w-5 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Signé par {signerName || "le client"} 
                {signedAt ? ` le ${formatDate(signedAt)}` : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6 w-full">
            <div className="space-y-2">
              <Label htmlFor="signer-name">Votre nom complet</Label>
              <Input 
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Entrez votre nom complet"
                disabled={isSigning}
                required
                className="border border-gray-300 w-full"
              />
              <p className="text-xs text-gray-500">
                Votre nom sera utilisé comme identification légale pour cette signature électronique.
              </p>
            </div>
            
            <div className="w-full bg-white">
              <Label className="mb-2 block">Votre signature</Label>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <SignatureCanvas 
                  onSave={onSign}
                  disabled={isSigning}
                  height={180}
                  className="w-full signature-container touch-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Utilisez votre doigt ou la souris pour signer dans le cadre ci-dessus.
              </p>
            </div>
            
            <Alert className="text-xs md:text-sm">
              <Info className="h-4 w-4 flex-shrink-0" />
              <AlertDescription>
                En signant cette offre, vous acceptez les conditions générales de leasing et confirmez
                que les informations fournies sont exactes.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      
      {signed && (
        <CardFooter className="border-t bg-gray-50 flex flex-col sm:flex-row justify-between px-3 md:px-6 py-3 gap-2">
          <div className="text-xs sm:text-sm text-gray-500">
            <FileText className="inline h-4 w-4 mr-1" />
            Une confirmation a été envoyée par email
          </div>
          <Button 
            variant="outline" 
            onClick={onPrintPdf} 
            disabled={isPrintingPdf}
            className="w-full sm:w-auto"
          >
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
  );
};

export default SignatureSection;
