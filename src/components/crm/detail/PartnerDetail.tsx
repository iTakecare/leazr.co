
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
import { Mail, Phone, Building2, User, BadgePercent, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CommissionLevel, getCommissionLevelWithRates } from "@/services/commissionService";
import { getSupabaseClient } from "@/integrations/supabase/client";

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
  const [pdfTemplates, setPdfTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (partner?.commission_level_id) {
        loadCommissionLevel(partner.commission_level_id);
      } else {
        setCommissionLevel(null);
      }
      
      loadPdfTemplates();
      
      if (partner?.pdf_template_id) {
        setSelectedTemplateId(partner.pdf_template_id);
      } else {
        setSelectedTemplateId("");
      }
    } else {
      setCommissionLevel(null);
      setSelectedTemplateId("");
    }
  }, [isOpen, partner]);
  
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
  
  const handleUpdatePdfTemplate = async (templateId: string) => {
    try {
      if (!partner?.id) return;
      
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('partners')
        .update({ pdf_template_id: templateId })
        .eq('id', partner.id);
        
      if (error) {
        console.error("Error updating PDF template:", error);
        toast.error("Erreur lors de la mise à jour du modèle PDF");
        return;
      }
      
      setSelectedTemplateId(templateId);
      
      // Mettre à jour le partenaire dans le composant parent
      if (partner && typeof partner === 'object') {
        partner.pdf_template_id = templateId;
      }
      
      toast.success("Modèle PDF mis à jour");
    } catch (error) {
      console.error("Error updating PDF template:", error);
      toast.error("Erreur lors de la mise à jour du modèle PDF");
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

          {/* Sélecteur de modèle PDF */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Modèle PDF</h3>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <div className="font-medium">Modèle pour les offres</div>
              </div>
              {loadingTemplates ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Chargement des modèles...</span>
                </div>
              ) : pdfTemplates.length > 0 ? (
                <div className="mt-2">
                  <select 
                    className="w-full p-2 border rounded-md text-sm"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Sélectionnez un modèle PDF personnalisé pour ce partenaire.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun modèle PDF disponible. Créez-en un dans les paramètres.
                </p>
              )}
            </div>
          </div>

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
