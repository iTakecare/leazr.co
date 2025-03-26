
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="bg-primary/5">
        <CardTitle>Informations client</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="font-medium text-gray-500">Nom</Label>
            <p className="mt-1">{clientName}</p>
          </div>
          {clientEmail && (
            <div>
              <Label className="font-medium text-gray-500">Email</Label>
              <p className="mt-1">{clientEmail}</p>
            </div>
          )}
        </div>
        {clientCompany && (
          <div className="mt-4">
            <Label className="font-medium text-gray-500">Entreprise</Label>
            <p className="mt-1">{clientCompany}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientInformation;
