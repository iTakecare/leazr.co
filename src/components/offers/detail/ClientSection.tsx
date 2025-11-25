
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Building, ExternalLink } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

interface ClientSectionProps {
  offer: any;
}

const ClientSection: React.FC<ClientSectionProps> = ({ offer }) => {
  const { companySlug } = useRoleNavigation();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Informations client
        </CardTitle>
        {offer.client_id && companySlug && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/${companySlug}/admin/clients/${offer.client_id}`}>
              <ExternalLink className="w-4 h-4" />
              Voir fiche client
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Nom</p>
              <p className="font-medium">{offer.client_name}</p>
            </div>
          </div>
          
          {offer.client_email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{offer.client_email}</p>
              </div>
            </div>
          )}
          
          {offer.client_phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium">{offer.client_phone}</p>
              </div>
            </div>
          )}
          
          {offer.client_company && (
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Entreprise</p>
                <p className="font-medium">{offer.client_company}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientSection;
