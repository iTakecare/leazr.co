import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySlugAccess } from "@/hooks/useCompanySlugAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

const TEMPLATE_ID = "itakecare-v1";

const PDFTemplatesPage: React.FC = () => {
  const { companySlug } = useParams();
  const { company } = useCompanySlugAccess(companySlug);
  const [isSaving, setIsSaving] = useState(false);

  const previewUrl = useMemo(() => "/pdf-templates/itakecare-v1/preview.png", []);
  const templateUrl = useMemo(() => "/pdf-templates/itakecare-v1/template.html", []);

  const handleSetDefault = async () => {
    if (!company?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ default_html_template_slug: TEMPLATE_ID })
        .eq("id", company.id);

      if (error) throw error;
      toast({ title: "Template défini", description: "Le modèle iTakecare est maintenant le modèle par défaut." });
    } catch (err: any) {
      console.error("Failed to set default template", err);
      toast({ title: "Erreur", description: err?.message || "Impossible de mettre à jour le template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Templates PDF iTakecare — Paramètres</title>
        <meta name="description" content="Gérez le modèle PDF iTakecare pour vos offres commerciales." />
        <link rel="canonical" href={`/${companySlug}/admin/pdf-templates`} />
      </Helmet>

      <Card>
        <CardHeader>
          <CardTitle>Template iTakecare</CardTitle>
          <CardDescription>Modèle officiel en 7 pages conforme au design Canva</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <img src={previewUrl} alt="Aperçu template iTakecare" className="rounded-lg border" />
            <div className="space-y-4">
              <p>Identifiant: <strong>{TEMPLATE_ID}</strong></p>
              <div className="flex gap-3">
                <a href={templateUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Voir le HTML</Button>
                </a>
                <Button onClick={handleSetDefault} disabled={isSaving}>{isSaving ? "Enregistrement..." : "Définir comme défaut"}</Button>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Variables disponibles</h4>
                <ul className="list-disc ml-5 text-sm">
                  <li>Client: {"{{client.name}}"}, {"{{client.vat}}"}, {"{{client.address}}"}, {"{{client.contactName}}"}, {"{{client.email}}"}, {"{{client.phone}}"}</li>
                  <li>Offre: {"{{offer.id}}"}, {"{{offer.date}}"}, {"{{offer.termMonths}}"}, {"{{offer.totalMonthly}}"}, {"{{offer.fees}}"}, {"{{offer.insurance.annualEstimated}}"}, {"{{offer.insurance.minAnnual}}"}</li>
                  <li>Items: {"{{#each items}}"} ... {"{{/each}}"}</li>
                  <li>Entreprise: {"{{company.name}}"}, {"{{company.address}}"}, {"{{company.email}}"}, {"{{company.phone}}"}, {"{{company.vat}}"}</li>
                  <li>Métriques: {"{{metrics.clientsCount}}"}, {"{{metrics.devicesCount}}"}, {"{{metrics.co2SavedTons}}"}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFTemplatesPage;
