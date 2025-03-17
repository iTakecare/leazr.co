
import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/utils/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, MapPin, User, Building, BadgePercent } from "lucide-react";
import ClientsView from "./ClientsView";
import CommissionsView from "./CommissionsView";
import { CommissionLevel, getCommissionLevelWithRates } from "@/services/commissionService";

interface AmbassadorDetailProps {
  isOpen: boolean;
  onClose: () => void;
  ambassador: any;
  onEdit: () => void;
  onCreateOffer?: () => void;
}

const AmbassadorDetail = ({
  isOpen,
  onClose,
  ambassador,
  onEdit,
  onCreateOffer,
}: AmbassadorDetailProps) => {
  const [tab, setTab] = useState("overview");
  const [commissionLevel, setCommissionLevel] = useState<CommissionLevel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ambassador?.commission_level_id) {
      loadCommissionLevel(ambassador.commission_level_id);
    } else {
      setCommissionLevel(null);
    }
  }, [isOpen, ambassador]);

  const loadCommissionLevel = async (levelId: string) => {
    setLoading(true);
    try {
      const level = await getCommissionLevelWithRates(levelId);
      setCommissionLevel(level);
    } catch (error) {
      console.error("Error loading commission level:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!ambassador) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-white">
                {getInitials(ambassador.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl">{ambassador.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Badge
                  variant={ambassador.status === "active" ? "default" : "secondary"}
                >
                  {ambassador.status === "active" ? "Actif" : "Inactif"}
                </Badge>
                {ambassador.region && (
                  <span className="flex items-center text-xs gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {ambassador.region}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Informations de contact
                </h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{ambassador.email}</span>
                  </div>
                  {ambassador.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{ambassador.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {ambassador.company && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Informations entreprise
                  </h3>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{ambassador.company}</span>
                    </div>
                    {ambassador.vat_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>TVA: {ambassador.vat_number}</span>
                      </div>
                    )}
                    {ambassador.address && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {ambassador.address}
                        <br />
                        {ambassador.postal_code} {ambassador.city}
                        {ambassador.country && `, ${ambassador.country}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {commissionLevel && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Barème de commissionnement</h3>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgePercent className="h-4 w-4 text-primary" />
                      <div className="font-medium">{commissionLevel.name}</div>
                      {commissionLevel.is_default && (
                        <Badge variant="outline" className="text-xs">Par défaut</Badge>
                      )}
                    </div>
                    {commissionLevel.rates && commissionLevel.rates.length > 0 && (
                      <div className="mt-2 space-y-1 text-sm">
                        {commissionLevel.rates
                          .sort((a, b) => b.min_amount - a.min_amount) // Sort by min_amount descending
                          .map((rate, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2">
                              <div className="text-muted-foreground">
                                {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                              </div>
                              <div className="font-medium text-right">{rate.rate}%</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">Clients</div>
                  <div className="text-2xl font-bold mt-1">
                    {ambassador.clients_count || 0}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-lg border p-3">
                  <div className="text-sm text-muted-foreground">
                    Commissions totales
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatCurrency(ambassador.commissions_total || 0)}
                  </div>
                </div>
              </div>

              {ambassador.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                  <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {ambassador.notes}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <ClientsView ambassadorId={ambassador.id} isVisible={tab === "clients"} />
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionsView
              ambassadorId={ambassador.id}
              isVisible={tab === "commissions"}
            />
          </TabsContent>
        </Tabs>

        <SheetFooter className="flex-row justify-between gap-2 pt-6">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1"
          >
            Modifier
          </Button>
          {onCreateOffer && (
            <Button onClick={onCreateOffer} className="flex-1">
              Créer une offre
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AmbassadorDetail;
