
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
import { MapPin, Loader2, FileText } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import ClientsView from "./ClientsView";
import CommissionsView from "./CommissionsView";
import { 
  CommissionLevel, 
  getCommissionLevelWithRates, 
  getCommissionLevels,
  updateAmbassadorCommissionLevel 
} from "@/services/commissionService";
import { getPDFTemplates, assignTemplateToAmbassador } from "@/services/pdfTemplateService";
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [currentLevelId, setCurrentLevelId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCommissionLevels();
      loadPDFTemplates();
      
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
  
  const loadPDFTemplates = async () => {
    try {
      const templatesData = await getPDFTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading PDF templates:", error);
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
  
  const handleTemplateChange = async (templateId: string) => {
    if (!ambassador?.id) return;
    
    setIsUpdatingTemplate(true);
    try {
      const success = await assignTemplateToAmbassador(ambassador.id, templateId);
      
      if (success) {
        setSelectedTemplateId(templateId);
        ambassador.pdf_template_id = templateId;
        toast.success("Modèle PDF assigné avec succès");
      } else {
        toast.error("Erreur lors de l'assignation du modèle PDF");
      }
    } catch (error) {
      console.error("Error assigning template:", error);
      toast.error("Erreur lors de l'assignation du modèle PDF");
    } finally {
      setIsUpdatingTemplate(false);
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
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Modèle PDF</h3>
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="font-medium">Modèle pour les offres</div>
                  </div>
                  <div className="mt-2">
                    <Select
                      value={selectedTemplateId}
                      onValueChange={handleTemplateChange}
                      disabled={isUpdatingTemplate}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Modèle par défaut</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
