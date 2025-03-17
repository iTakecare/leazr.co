
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Loader2 } from "lucide-react";
import ClientsView from "./ClientsView";
import CommissionsView from "./CommissionsView";
import { 
  CommissionLevel, 
  getCommissionLevelWithRates, 
  getCommissionLevels,
  updateAmbassadorCommissionLevel 
} from "@/services/commissionService";
import { toast } from "sonner";
import ContactInfoSection from "./sections/ContactInfoSection";
import CompanyInfoSection from "./sections/CompanyInfoSection";
import CommissionLevelSelector from "./sections/CommissionLevelSelector";
import StatsSummary from "./sections/StatsSummary";
import NotesSection from "./sections/NotesSection";

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
  const [commissionLevels, setCommissionLevels] = useState<CommissionLevel[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCommissionLevels();
      if (ambassador?.commission_level_id) {
        loadCommissionLevel(ambassador.commission_level_id);
      } else {
        setCommissionLevel(null);
      }
    } else {
      setCommissionLevel(null);
    }
  }, [isOpen, ambassador]);

  const loadCommissionLevels = async () => {
    try {
      const levels = await getCommissionLevels("ambassador");
      setCommissionLevels(levels);
    } catch (error) {
      console.error("Error loading commission levels:", error);
    }
  };

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

  const handleUpdateCommissionLevel = async (levelId: string) => {
    try {
      await updateAmbassadorCommissionLevel(ambassador.id, levelId);
      loadCommissionLevel(levelId);
      toast.success("Barème de commissionnement mis à jour");
    } catch (error) {
      console.error("Error updating commission level:", error);
      toast.error("Erreur lors de la mise à jour du barème");
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
              <ContactInfoSection 
                email={ambassador.email} 
                phone={ambassador.phone} 
              />

              <CompanyInfoSection 
                company={ambassador.company}
                vat_number={ambassador.vat_number}
                address={ambassador.address}
                postal_code={ambassador.postal_code}
                city={ambassador.city}
                country={ambassador.country}
              />

              <CommissionLevelSelector 
                ambassadorId={ambassador.id}
                currentLevelId={ambassador.commission_level_id}
                commissionLevel={commissionLevel}
                commissionLevels={commissionLevels}
                loading={loading}
                onUpdateCommissionLevel={handleUpdateCommissionLevel}
              />

              <StatsSummary 
                clientsCount={ambassador.clients_count || 0}
                commissionsTotal={ambassador.commissions_total || 0}
              />

              <NotesSection notes={ambassador.notes} />
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <ClientsView 
              owner={{ id: ambassador.id, name: ambassador.name, type: 'ambassador' }}
              clients={clients}
              isOpen={tab === "clients"}
              onClose={() => setTab("overview")}
            />
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionsView
              owner={{ id: ambassador.id, name: ambassador.name, type: 'ambassador' }}
              isOpen={tab === "commissions"}
              onClose={() => setTab("overview")}
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
