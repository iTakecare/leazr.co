
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Mail, Building } from "lucide-react";

interface ClientInformationProps {
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
}

const ClientInformation: React.FC<ClientInformationProps> = ({
  clientName,
  clientEmail,
  clientCompany
}) => {
  return (
    <Card className="mb-6 overflow-hidden border-blue-100 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
        <CardTitle className="text-base flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Informations client
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-medium text-gray-500 flex items-center">
              <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              Nom
            </Label>
            <p className="mt-1 font-medium">{clientName}</p>
          </div>
          {clientEmail && (
            <div>
              <Label className="text-sm font-medium text-gray-500 flex items-center">
                <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                Email
              </Label>
              <p className="mt-1">{clientEmail}</p>
            </div>
          )}
        </div>
        {clientCompany && (
          <div className="mt-4">
            <Label className="text-sm font-medium text-gray-500 flex items-center">
              <Building className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              Entreprise
            </Label>
            <p className="mt-1">{clientCompany}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientInformation;
