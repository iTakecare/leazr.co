import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, Package } from "lucide-react";

interface ExternalService {
  id: string;
  provider_name: string;
  product_name: string;
  description: string | null;
  price_htva: number;
  billing_period: string;
  quantity: number;
}

const billingLabels: Record<string, string> = {
  monthly: "/mois",
  yearly: "/an",
  one_time: "unique",
};

interface ExternalServicesSectionProps {
  offerId: string;
}

const ExternalServicesSection = ({ offerId }: ExternalServicesSectionProps) => {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["offer-external-services", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_external_services" as any)
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ExternalService[];
    },
  });

  if (isLoading || services.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Headphones className="h-4 w-4 text-indigo-600" />
          Services externes
          <Badge variant="secondary" className="ml-auto text-xs">
            {services.length} service{services.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {services.map((service) => (
            <div key={service.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 rounded-md bg-indigo-50 p-1.5">
                  <Package className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{service.product_name}</p>
                  <p className="text-xs text-muted-foreground">{service.provider_name}</p>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">
                  {service.price_htva.toFixed(2)} € <span className="text-xs font-normal text-muted-foreground">{billingLabels[service.billing_period] || service.billing_period}</span>
                </p>
                {service.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">x{service.quantity}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExternalServicesSection;
