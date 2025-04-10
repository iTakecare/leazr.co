
import React from "react";
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatLegalTimestamp } from "@/utils/formatters";

interface SignedAlertProps {
  signerName?: string;
  signedAt?: string;
  signerIp?: string;
}

const SignedAlert: React.FC<SignedAlertProps> = ({ signerName, signedAt, signerIp }) => {
  return (
    <Alert className="mb-6 bg-green-50 border-green-200">
      <CheckCircle className="h-5 w-5 text-green-600" />
      <AlertTitle>Offre signée</AlertTitle>
      <AlertDescription>
        {signerName ? `Cette offre a été signée par ${signerName}` : "Cette offre a été signée"} 
        {signedAt ? ` le ${formatLegalTimestamp(signedAt)}` : "."}
        {signerIp && <div className="text-xs mt-1 text-gray-500">Adresse IP du signataire: {signerIp}</div>}
      </AlertDescription>
    </Alert>
  );
};

export default SignedAlert;
