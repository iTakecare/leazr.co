import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { downloadOfferPdf, previewOfferPdf } from "@/services/pdfService";
import { FileDown, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PdfTemplateTest = () => {
  const [selectedOffer, setSelectedOffer] = useState<string>("");
  const [offers, setOffers] = useState<Array<{ id: string; client_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchOffers = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('offers')
        .select('id, client_name')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setOffers(data || []);
      if (data && data.length > 0) {
        setSelectedOffer(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedOffer) {
      toast.error('Veuillez sélectionner une offre');
      return;
    }

    try {
      setIsLoading(true);
      const offer = offers.find(o => o.id === selectedOffer);
      const success = await downloadOfferPdf(
        selectedOffer,
        `Test-Offre-${offer?.client_name || 'PDF'}.pdf`,
        'itakecare-v1'
      );

      if (success) {
        toast.success('PDF téléchargé avec succès');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedOffer) {
      toast.error('Veuillez sélectionner une offre');
      return;
    }

    try {
      setIsLoading(true);
      const success = await previewOfferPdf(selectedOffer, 'itakecare-v1');

      if (success) {
        toast.success('Prévisualisation ouverte');
      }
    } catch (error) {
      console.error('Error previewing PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Test de génération PDF</h3>
        <p className="text-sm text-muted-foreground">
          Testez la génération de PDF avec le template iTakecare v1
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Sélectionner une offre</Label>
          <div className="flex gap-2">
            <Select
              value={selectedOffer}
              onValueChange={setSelectedOffer}
              disabled={isFetching || offers.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner une offre..." />
              </SelectTrigger>
              <SelectContent>
                {offers.map((offer) => (
                  <SelectItem key={offer.id} value={offer.id}>
                    {offer.client_name || offer.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={fetchOffers}
              disabled={isFetching}
              variant="outline"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Charger'
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            disabled={!selectedOffer || isLoading}
            className="flex-1"
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Prévisualiser
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!selectedOffer || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Télécharger
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <h4 className="text-sm font-semibold">Informations</h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Template utilisé : iTakecare v1</p>
          <p>• Format : A4</p>
          <p>• Pages : 7</p>
          <p>• Moteur : Puppeteer (Chromium)</p>
        </div>
      </div>
    </Card>
  );
};
