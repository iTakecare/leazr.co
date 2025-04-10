
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import SignaturePad from '@/components/signature/SignaturePad';

export interface SignatureSectionProps {
  signed: boolean;
  signature: string | null;
  signerName: string;
  setSignerName: (name: string) => void;
  approvalText: string;
  setApprovalText: (text: string) => void;
  isSigning: boolean;
  signedAt?: string;
  onSign: (signature: string) => void;
  isPrintingPdf: boolean;
  onPrintPdf: () => void;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  signed,
  signature,
  signerName,
  setSignerName,
  approvalText,
  setApprovalText,
  isSigning,
  signedAt,
  onSign,
  isPrintingPdf,
  onPrintPdf
}) => {
  if (signed && signature) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Signature électronique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Signé par</p>
            <p className="font-semibold">{signerName}</p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Mention légale</p>
            <p className="font-semibold italic">{approvalText}</p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Date de signature</p>
            <p className="font-semibold">
              {signedAt ? new Date(signedAt).toLocaleString('fr-FR') : 'Non disponible'}
            </p>
          </div>
          
          <div className="border rounded-md overflow-hidden bg-white p-2">
            <img 
              src={signature} 
              alt="Signature électronique" 
              className="max-w-full h-auto max-h-24 mx-auto" 
            />
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              onClick={onPrintPdf}
              disabled={isPrintingPdf}
            >
              {isPrintingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération du PDF...
                </>
              ) : (
                "Télécharger le document signé"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Signature électronique</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-1">
              Votre nom complet <span className="text-red-500">*</span>
            </label>
            <Input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full"
              required
            />
          </div>
          
          <div>
            <label htmlFor="approvalText" className="block text-sm font-medium text-gray-700 mb-1">
              Mention "Bon pour accord" <span className="text-red-500">*</span>
            </label>
            <Input
              id="approvalText"
              type="text"
              value={approvalText}
              onChange={(e) => setApprovalText(e.target.value)}
              placeholder="Veuillez saisir 'Bon pour accord'"
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Veuillez saisir exactement la mention "Bon pour accord" pour valider la signature
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre signature <span className="text-red-500">*</span>
            </label>
            <SignaturePad
              onSave={onSign}
              disabled={isSigning || !signerName.trim() || approvalText.trim().toLowerCase() !== "bon pour accord"}
              height={150}
              className="mb-2"
            />
          </div>
          
          {isSigning && (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Traitement de la signature...</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default SignatureSection;
