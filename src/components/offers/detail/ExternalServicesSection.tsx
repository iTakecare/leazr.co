import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headphones, Package, Mail, CheckCircle2 } from "lucide-react";
import NotifyProviderModal from "./NotifyProviderModal";

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
  const [notifyProvider, setNotifyProvider] = useState<string | null>(null);

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

  // Notifications already sent per provider (to display "Notifié ✓")
  const { data: notifs = [] } = useQuery({
    queryKey: ["offer-external-services-notifs", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_external_provider_notifications" as any)
        .select("provider_name, created_at")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  if (isLoading || services.length === 0) return null;

  // Group services by provider
  const grouped = services.reduce<Record<string, ExternalService[]>>((acc, s) => {
    if (!acc[s.provider_name]) acc[s.provider_name] = [];
    acc[s.provider_name].push(s);
    return acc;
  }, {});

  const lastNotifByProvider = notifs.reduce<Record<string, string>>((acc, n) => {
    if (!acc[n.provider_name]) acc[n.provider_name] = n.created_at;
    return acc;
  }, {});

  const providersForModal = notifyProvider ? grouped[notifyProvider] || [] : [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Headphones className="h-4 w-4 text-indigo-600" />
            Services prestataires externes
            <Badge variant="secondary" className="ml-auto text-xs">
              {services.length} service{services.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Facturés directement par chaque prestataire — non inclus dans le total à financer.
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {Object.entries(grouped).map(([providerName, items]) => {
            const lastNotif = lastNotifByProvider[providerName];
            return (
              <div key={providerName} className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold">{providerName}</p>
                  <div className="flex items-center gap-2">
                    {lastNotif && (
                      <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Notifié le {new Date(lastNotif).toLocaleDateString("fr-FR")}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setNotifyProvider(providerName)}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      {lastNotif ? "Renotifier" : "Notifier le prestataire"}
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {items.map((service) => (
                    <div
                      key={service.id}
                      className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 rounded-md bg-indigo-50 p-1.5">
                          <Package className="h-3.5 w-3.5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{service.product_name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          {service.price_htva.toFixed(2)} €{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {billingLabels[service.billing_period] || service.billing_period}
                          </span>
                        </p>
                        {service.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">x{service.quantity}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <NotifyProviderModal
        open={!!notifyProvider}
        onOpenChange={(open) => !open && setNotifyProvider(null)}
        offerId={offerId}
        providerName={notifyProvider || ""}
        services={providersForModal}
      />
    </>
  );
};

export default ExternalServicesSection;
