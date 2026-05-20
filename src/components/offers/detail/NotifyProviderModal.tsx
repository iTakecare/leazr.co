import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ServiceLine {
  id: string;
  product_name: string;
  description: string | null;
  price_htva: number;
  billing_period: string;
  quantity: number;
}

interface NotifyProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  providerName: string;
  services: ServiceLine[];
}

const billingLabels: Record<string, string> = {
  monthly: "/mois",
  yearly: "/an",
  one_time: "unique",
};

const NotifyProviderModal: React.FC<NotifyProviderModalProps> = ({
  open,
  onOpenChange,
  offerId,
  providerName,
  services,
}) => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  // Look up the provider record (need its id + contact_email) for THIS offer's company
  const { data: provider, isLoading: providerLoading } = useQuery({
    queryKey: ["external-provider-by-name", offerId, providerName],
    queryFn: async () => {
      // Resolve the offer's company first so we don't pick a provider from another tenant
      const { data: offer } = await supabase
        .from("offers")
        .select("company_id, client_name, client_email, clients(name,email,phone,company)")
        .eq("id", offerId)
        .single();
      if (!offer) return null;
      const { data, error } = await supabase
        .from("external_providers")
        .select("id, name, contact_email, contact_phone, website_url")
        .eq("company_id", offer.company_id)
        .eq("name", providerName)
        .maybeSingle();
      if (error) throw error;
      return { provider: data, offer };
    },
    enabled: open,
  });

  // Already-sent notifications for this provider on this offer
  const { data: previousNotifs } = useQuery({
    queryKey: ["offer-provider-notifs", offerId, provider?.provider?.id],
    queryFn: async () => {
      if (!provider?.provider?.id) return [];
      const { data, error } = await supabase
        .from("offer_external_provider_notifications" as any)
        .select("id, created_at, provider_email")
        .eq("offer_id", offerId)
        .eq("provider_id", provider.provider.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open && !!provider?.provider?.id,
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "send-external-provider-notification",
        {
          body: {
            offerId,
            providerId: provider?.provider?.id,
            serviceIds: services.map((s) => s.id),
            note: note.trim() || undefined,
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Email envoyé à ${data.sent_to}`);
      queryClient.invalidateQueries({ queryKey: ["offer-provider-notifs", offerId] });
      setNote("");
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Échec de l'envoi");
    },
  });

  const providerRow = provider?.provider;
  const offerRow = provider?.offer;
  const canSend = !!providerRow?.contact_email && !sendMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            Notifier {providerName}
          </DialogTitle>
        </DialogHeader>

        {providerLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Chargement...
          </div>
        ) : !providerRow ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun prestataire <strong>{providerName}</strong> trouvé dans le catalogue de cette entreprise.
            </AlertDescription>
          </Alert>
        ) : !providerRow.contact_email ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ce prestataire n'a pas d'email de contact configuré. Renseignez-le dans{" "}
              <strong>Gestion du catalogue → Prestataires externes</strong>.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {previousNotifs && previousNotifs.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Déjà notifié {previousNotifs.length} fois — dernière fois le{" "}
                  {new Date(previousNotifs[0].created_at).toLocaleString("fr-FR")}.
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/40 rounded-md p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground">Email sera envoyé à :</p>
              <p className="font-medium">{providerRow.contact_email}</p>
              {providerRow.contact_phone && (
                <p className="text-xs text-muted-foreground">Téléphone configuré : {providerRow.contact_phone}</p>
              )}
              {providerRow.website_url && (
                <a
                  href={providerRow.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {providerRow.website_url} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div>
              <Label className="text-xs">Coordonnées du client transmises</Label>
              <div className="text-sm bg-background border rounded-md p-3 mt-1 space-y-0.5">
                <p>
                  <span className="text-muted-foreground">Nom :</span>{" "}
                  <strong>{offerRow?.clients?.name || offerRow?.client_name || "—"}</strong>
                </p>
                {offerRow?.clients?.company && (
                  <p>
                    <span className="text-muted-foreground">Société :</span> {offerRow.clients.company}
                  </p>
                )}
                {(offerRow?.clients?.email || offerRow?.client_email) && (
                  <p>
                    <span className="text-muted-foreground">Email :</span>{" "}
                    {offerRow?.clients?.email || offerRow?.client_email}
                  </p>
                )}
                {offerRow?.clients?.phone && (
                  <p>
                    <span className="text-muted-foreground">Téléphone :</span> {offerRow.clients.phone}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">
                Services concernés <Badge variant="outline" className="ml-1">{services.length}</Badge>
              </Label>
              <div className="text-sm bg-background border rounded-md p-3 mt-1 divide-y">
                {services.map((s) => (
                  <div key={s.id} className="py-1.5 first:pt-0 last:pb-0 flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.product_name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs">
                      <p>x{s.quantity}</p>
                      <p>
                        {s.price_htva.toFixed(2)} € HTVA{" "}
                        <span className="text-muted-foreground">
                          {billingLabels[s.billing_period] || s.billing_period}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="provider-note">Note pour le prestataire (optionnel)</Label>
              <Textarea
                id="provider-note"
                placeholder="Ex: Merci de recontacter le client dans les meilleurs délais..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-xs text-blue-800">
                Le prestataire reçoit les coordonnées du client pour le recontacter directement et finaliser
                la transaction. Cet email n'engage en rien iTakecare sur la facturation du service.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendMut.isPending}>
            Annuler
          </Button>
          <Button onClick={() => sendMut.mutate()} disabled={!canSend}>
            {sendMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" /> Envoyer la notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotifyProviderModal;
