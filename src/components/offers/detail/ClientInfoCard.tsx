
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Building, Phone } from "lucide-react";

interface ClientInfoCardProps {
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
}

const ClientInfoCard: React.FC<ClientInfoCardProps> = ({
  clientName,
  clientEmail,
  clientCompany,
  clientPhone
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Informations client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">{clientName}</div>
            <div className="text-sm text-muted-foreground">Nom du contact</div>
          </div>
        </div>
        
        {clientEmail && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">{clientEmail}</div>
              <div className="text-sm text-muted-foreground">Email</div>
            </div>
          </div>
        )}
        
        {clientCompany && (
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">{clientCompany}</div>
              <div className="text-sm text-muted-foreground">Société</div>
            </div>
          </div>
        )}
        
        {clientPhone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">{clientPhone}</div>
              <div className="text-sm text-muted-foreground">Téléphone</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientInfoCard;
