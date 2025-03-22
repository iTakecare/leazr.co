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
  const [currentLevelId, setCurrentLevelId] = useState<string>("");
  const [pdfTemplates, setPdfTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCommissionLevels();
      loadPdfTemplates();
      if (ambassador?.commission_level_id) {
        setCurrentLevelId(ambassador.commission_level_id);
        loadCommissionLevel(ambassador.commission_level_id);
      } else {
        setCommissionLevel(null);
        setCurrentLevelId("");
      }

      if (ambassador?.pdf_template_id) {
        setSelectedTemplateId(ambassador.pdf_template_id);
      } else {
        setSelectedTemplateId("");
      }
    } else {
      setCommissionLevel(null);
      setCurrentLevelId("");
      setSelectedTemplateId("");
    }
  }, [isOpen, ambassador]);

  const loadPdfTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const supabase = getSupabaseClient();
      
      // Vérifier si la table existe
      const { data: tableExists } = await supabase.rpc(
        'check_table_exists', 
        { table_name: 'pdf_templates' }
      );
      
      if (!tableExists) {
        setLoadingTemplates(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('id, name')
        .order('name');
        
      if (error) {
        console.error("Error loading PDF templates:", error);
      } else {
        setPdfTemplates(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleUpdatePdfTemplate = async (templateId: string) => {
    try {
      if (!ambassador?.id) return;
      
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('ambassadors')
        .update({ pdf_template_id: templateId })
        .eq('id', ambassador.id);
        
      if (error) {
        console.error("Error updating PDF template:", error);
        toast.error("Erreur lors de la mise à jour du modèle PDF");
        return;
      }
      
      setSelectedTemplateId(templateId);
      
      // Mettre à jour l'ambassadeur dans le composant parent
      if (ambassador && typeof ambassador === 'object') {
        ambassador.pdf_template_id = templateId;
      }
      
      toast.success("Modèle PDF mis à jour");
    } catch (error) {
      console.error("Error updating PDF template:", error);
      toast.error("Erreur lors de la mise à jour du modèle PDF");
    }
  };

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
      if (!ambassador?.id) return;
      
      console.log("Updating commission level to:", levelId);
      await updateAmbassadorCommissionLevel(ambassador.id, levelId);
      setCurrentLevelId(levelId);
      loadCommissionLevel(levelId);
      
      // Mettre à jour l'ambassadeur dans le composant parent
      if (ambassador && typeof ambassador === 'object') {
        ambassador.commission_level_id = levelId;
      }
      
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
                currentLevelId={currentLevelId}
                commissionLevel={commissionLevel}
                commissionLevels={commissionLevels}
                loading={loading}
                onUpdateCommissionLevel={handleUpdateCommissionLevel}
              />

              <div className="space-y-2 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Modèle PDF</h3>
                <div className="grid gap-2">
                  {loadingTemplates ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Chargement des modèles...</span>
                    </div>
                  ) : pdfTemplates.length > 0 ? (
                    <div className="space-y-2">
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={selectedTemplateId}
                        onChange={(e) => handleUpdatePdfTemplate(e.target.value)}
                      >
                        <option value="">Modèle par défaut</option>
                        {pdfTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Sélectionnez un modèle PDF pour cet ambassadeur. Si aucun n'est sélectionné, le modèle par défaut sera utilisé.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun modèle PDF disponible. Créez-en un dans les paramètres.
                    </p>
                  )}
                </div>
              </div>

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
