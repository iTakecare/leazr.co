
import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Mail, Phone, Building2, User, BadgePercent } from "lucide-react";
import { CommissionLevel, getCommissionLevelWithRates } from "@/services/commissionService";

interface PartnerDetailProps {
  isOpen: boolean;
  onClose: () => void;
  partner: any;
  onEdit: () => void;
}

const PartnerDetail = ({
  isOpen,
  onClose,
  partner,
  onEdit,
}: PartnerDetailProps) => {
  const [commissionLevel, setCommissionLevel] = useState<CommissionLevel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && partner?.commission_level_id) {
      loadCommissionLevel(partner.commission_level_id);
    } else {
      setCommissionLevel(null);
    }
  }, [isOpen, partner]);

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

  if (!partner) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl">{partner.name}</SheetTitle>
          <SheetDescription>
            Détails du partenaire
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations générales</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{partner.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{partner.contactName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{partner.type}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Informations de contact</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{partner.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{partner.phone}</span>
              </div>
            </div>
          </div>

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

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-primary" />
                <div className="font-medium">Commissions totales</div>
              </div>
              <div className="text-xl font-bold">{formatCurrency(partner.commissionsTotal)}</div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={onEdit}>
              Modifier le partenaire
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PartnerDetail;
