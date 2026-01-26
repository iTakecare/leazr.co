import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, ExternalLink } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import ClientOtherDeals from "@/components/shared/ClientOtherDeals";

interface ClientSectionProps {
  offer: any;
}

const ClientSection: React.FC<ClientSectionProps> = ({ offer }) => {
  const { companySlug } = useRoleNavigation();
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="w-4 h-4" />
          Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client name with avatar */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(offer.client_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{offer.client_name}</span>
            {offer.client_company && (
              <p className="text-sm text-muted-foreground">{offer.client_company}</p>
            )}
          </div>
        </div>

        {/* Email */}
        {offer.client_email && (
          <a 
            href={`mailto:${offer.client_email}`} 
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            {offer.client_email}
          </a>
        )}

        {/* Phone */}
        {offer.client_phone && (
          <a 
            href={`tel:${offer.client_phone}`}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Phone className="w-4 h-4" />
            {offer.client_phone}
          </a>
        )}

        {/* View client button */}
        {offer.client_id && companySlug && (
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/${companySlug}/admin/clients/${offer.client_id}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir la fiche client
            </Link>
          </Button>
        )}

        {/* Other deals from this client */}
        {(offer.client_id || offer.client_email) && (
          <div className="border-t border-border pt-4 mt-4">
            <ClientOtherDeals
              clientId={offer.client_id}
              clientEmail={offer.client_email}
              currentOfferId={offer.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientSection;
