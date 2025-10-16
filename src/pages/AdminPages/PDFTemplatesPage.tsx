import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySlugAccess } from "@/hooks/useCompanySlugAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

const PDFTemplatesPage: React.FC = () => {
  const { companySlug } = useParams();
  const { company } = useCompanySlugAccess(companySlug);
  const [isSaving, setIsSaving] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["pdf-templates", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id
  });

  const defaultTemplate = templates?.find(t => t.is_default) || templates?.[0];

  const handleSetDefault = async (templateId: string) => {
    if (!company?.id) return;
    setIsSaving(true);
    try {
      // Désactiver tous les autres templates par défaut
      await supabase
        .from("pdf_templates")
        .update({ is_default: false })
        .eq("company_id", company.id);

      // Activer le template sélectionné
      const { error } = await supabase
        .from("pdf_templates")
        .update({ is_default: true })
        .eq("id", templateId)
        .eq("company_id", company.id);

      if (error) throw error;
      toast({ title: "Template défini", description: "Le modèle est maintenant le modèle par défaut." });
    } catch (err: any) {
      console.error("Failed to set default template", err);
      toast({ title: "Erreur", description: err?.message || "Impossible de mettre à jour le template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement des templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Templates PDF — Paramètres</title>
        <meta name="description" content="Gérez vos modèles PDF pour les offres commerciales." />
        <link rel="canonical" href={`/${companySlug}/admin/pdf-templates`} />
      </Helmet>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6">
          {templates.map((template) => (
            <Card key={template.id} className={template.is_default ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description || "Aucune description"}</CardDescription>
                  </div>
                  {template.is_default && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Par défaut</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  {template.preview_url && (
                    <img src={template.preview_url} alt={`Aperçu ${template.name}`} className="rounded-lg border" />
                  )}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Identifiant: <strong>{template.id}</strong></p>
                      <p className="text-sm text-muted-foreground">Version: <strong>{template.version || "1.0.0"}</strong></p>
                    </div>
                    <div className="flex gap-3">
                      {!template.is_default && (
                        <Button 
                          onClick={() => handleSetDefault(template.id)} 
                          disabled={isSaving}
                        >
                          {isSaving ? "Enregistrement..." : "Définir comme défaut"}
                        </Button>
                      )}
                    </div>
                    {template.manifest_data && (
                      <div>
                        <h4 className="font-semibold mb-2">Variables disponibles</h4>
                        <div className="text-sm space-y-1">
                          {template.manifest_data.variables?.client && (
                            <p>Client: {template.manifest_data.variables.client.map((v: string) => `{{client.${v}}}`).join(", ")}</p>
                          )}
                          {template.manifest_data.variables?.offer && (
                            <p>Offre: {template.manifest_data.variables.offer.map((v: string) => `{{offer.${v}}}`).join(", ")}</p>
                          )}
                          {template.manifest_data.variables?.company && (
                            <p>Entreprise: {template.manifest_data.variables.company.map((v: string) => `{{company.${v}}}`).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun template disponible.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PDFTemplatesPage;
