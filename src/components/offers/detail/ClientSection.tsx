import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, ExternalLink, Building2, Hash } from "lucide-react";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import ClientOtherDeals from "@/components/shared/ClientOtherDeals";
import { supabase } from "@/integrations/supabase/client";

interface ClientSectionProps {
  offer: any;
}

const ClientSection: React.FC<ClientSectionProps> = ({ offer }) => {
  const { companySlug } = useRoleNavigation();
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    if (!offer.client_id) return;
    supabase
      .from('clients')
      .select('first_name, last_name, name, email, company, vat_number, phone')
      .eq('id', offer.client_id)
      .single()
      .then(({ data }) => {
        if (data) setClientData(data);
      });
  }, [offer.client_id]);

  const displayName = clientData
    ? [clientData.first_name, clientData.last_name].filter(Boolean).join(' ') || clientData.name || offer.client_name
    : offer.client_name;

  const email = clientData?.email || offer.client_email;
  const company = clientData?.company || offer.client_company;
  const vatNumber = clientData?.vat_number;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Client
          </span>
          {offer.client_id && companySlug && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
              <Link to={`/${companySlug}/admin/clients/${offer.client_id}?from=offer&offerId=${offer.id}`}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Fiche
              </Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {/* Name & Company */}
        <div>
          <p className="font-medium text-sm">{displayName}</p>
          {company && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {company}
            </p>
          )}
        </div>

        {/* Details grid */}
        <div className="space-y-1 text-xs">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1.5 text-primary hover:underline truncate"
            >
              <Mail className="w-3 h-3 shrink-0" />
              {email}
            </a>
          )}
          {vatNumber && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="w-3 h-3 shrink-0" />
              TVA: {vatNumber}
            </p>
          )}
        </div>

        {/* Other deals */}
        {(offer.client_id || offer.client_email) && (
          <div className="border-t border-border pt-2 mt-2">
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
