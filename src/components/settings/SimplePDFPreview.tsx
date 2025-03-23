
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PDFTemplate } from "@/utils/templateManager";
import PDFCanvas from "./pdf-preview/PDFCanvas";
import PreviewControls from "./pdf-preview/PreviewControls";
import { Loader2, Save } from "lucide-react";

interface SimplePDFPreviewProps {
  template: PDFTemplate;
  onSave: (template: PDFTemplate) => Promise<void>;
}

const SimplePDFPreview: React.FC<SimplePDFPreviewProps> = ({ template, onSave }) => {
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
    fields: Array.isArray(template.fields) ? [...template.fields] : []
  });
  
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isFieldDragging, setIsFieldDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleData, setSampleData] = useState({});
  const [useRealData, setUseRealData] = useState(false);
  const [realData, setRealData] = useState(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Charger des données d'exemple pour l'aperçu
    setSampleData({
      client_name: "Dupont",
      client_first_name: "Jean",
      client_email: "jean.dupont@exemple.fr",
      client_phone: "+33 6 12 34 56 78",
      client_company: "Entreprise Exemple",
      client_vat_number: "FR12345678901",
      client_address: "15 Rue de l'Exemple",
      client_postal_code: "75000",
      client_city: "Paris",
      client_country: "France",
      offer_id: "OFR-2023-001",
      offer_created_at: "2023-04-15",
      offer_total_price_excl: "1200.00€",
      offer_total_price_incl: "1440.00€",
      offer_monthly_payment: "40.00€",
      equipment_title: "Ordinateur portable Dell XPS 13",
      equipment_description: "Processeur i7, 16 Go RAM, 512 Go SSD",
      equipment_price: "1200.00€",
      equipment_quantity: "1",
      leaser_name: "FinanceIT",
      lease_duration: "36 mois",
      lease_interest_rate: "3.5%"
    });
    
    // Charger une offre réelle pour les tests avec données réelles
    fetchRealData();
  }, []);
  
  // Charger une offre réelle depuis la base de données
  const fetchRealData = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Récupérer l'offre la plus récente
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        console.log("Données réelles chargées:", data);
        setRealData(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données réelles:", error);
    }
  };
  
  // Mise à jour du template local quand le template parent change
  useEffect(() => {
    console.log("Mise à jour du template local depuis le template parent");
    console.log("Fields:", template?.fields?.length || 0);
    console.log("Images:", template?.templateImages?.length || 0);
    
    setLocalTemplate({
      ...template,
      templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
      fields: Array.isArray(template.fields) ? [...template.fields] : []
    });
    
    // Réinitialiser les états
    setHasUnsavedChanges(false);
  }, [template]);
  
  // Fonction utilisée pour démarrer le drag & drop d'un champ
  const handleStartDrag = (fieldId: string, offsetX: number, offsetY: number) => {
    if (!isDraggable) return;
    
    setDraggedFieldId(fieldId);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsFieldDragging(true);
  };
  
  // Fonction appelée lors du déplacement d'un champ
  const handleDrag = (clientX: number, clientY: number) => {
    if (!isFieldDragging || !draggedFieldId) return;
    
    // Trouver le champ en cours de déplacement
    const fields = [...localTemplate.fields];
    const fieldIndex = fields.findIndex(f => f.id === draggedFieldId);
    
    if (fieldIndex === -1) return;
    
    // Calculer les coordonnées mm à partir des coordonnées de l'écran
    // La conversion tient compte du zoom et du fait que l'unité est en mm
    const containerRect = document.querySelector(".bg-white.shadow-lg")?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Coordonnées du pointeur par rapport au conteneur
    const relativeX = clientX - containerRect.left - dragOffset.x;
    const relativeY = clientY - containerRect.top - dragOffset.y;
    
    // Conversion en mm (210mm = largeur A4, 297mm = hauteur A4)
    const widthInMm = 210;
    const heightInMm = 297;
    
    // Calcul des coordonnées en mm en tenant compte du zoom
    const xInMm = (relativeX / (containerRect.width / widthInMm)) / zoomLevel;
    const yInMm = (relativeY / (containerRect.height / heightInMm)) / zoomLevel;
    
    // Limiter les coordonnées à l'intérieur de la page
    const newX = Math.max(0, Math.min(xInMm, widthInMm));
    const newY = Math.max(0, Math.min(yInMm, heightInMm));
    
    // Mise à jour de la position du champ
    fields[fieldIndex] = {
      ...fields[fieldIndex],
      position: {
        x: Math.round(newX * 10) / 10, // Arrondir à 1 décimale
        y: Math.round(newY * 10) / 10  // Arrondir à 1 décimale
      }
    };
    
    // Mettre à jour le template local et marquer comme ayant des changements non sauvegardés
    setLocalTemplate({
      ...localTemplate,
      fields
    });
    
    setHasUnsavedChanges(true);
  };
  
  // Fonction appelée à la fin du déplacement d'un champ
  const handleEndDrag = () => {
    if (!isFieldDragging) return;
    
    setIsFieldDragging(false);
    setDraggedFieldId(null);
  };
  
  // Fonction pour sauvegarder les changements
  const handleSave = async () => {
    // Annuler tout timeout de sauvegarde en cours
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    try {
      setIsSaving(true);
      
      // Valider les données avant sauvegarde
      const fieldsToSave = localTemplate.fields.map(field => {
        // S'assurer que tous les champs ont des positions valides
        if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
          return {
            ...field,
            position: { x: 10, y: 10 } // Valeurs par défaut
          };
        }
        
        // Arrondir les coordonnées à 1 décimale
        return {
          ...field,
          position: {
            x: Math.round(field.position.x * 10) / 10,
            y: Math.round(field.position.y * 10) / 10
          }
        };
      });
      
      // Créer une copie profonde du template avec les champs mis à jour
      const templateToSave = {
        ...localTemplate,
        fields: fieldsToSave
      };
      
      // Sauvegarder via la fonction fournie par le parent
      await onSave(templateToSave);
      
      // Mettre à jour l'état local
      setHasUnsavedChanges(false);
      toast.success("Modifications sauvegardées avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Détermine quelles données utiliser en fonction du paramètre useRealData
  const getCurrentData = () => {
    if (useRealData && realData) {
      return realData;
    }
    return sampleData;
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Aperçu du modèle</CardTitle>
        {hasUnsavedChanges && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <PreviewControls 
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isDraggable={isDraggable}
          setIsDraggable={setIsDraggable}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          sampleData={getCurrentData()}
          localTemplate={localTemplate}
          setLoading={setLoading}
          isSaving={isSaving}
          useRealData={useRealData}
          setUseRealData={setUseRealData}
        />
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement...</span>
          </div>
        ) : (
          <PDFCanvas 
            localTemplate={localTemplate}
            zoomLevel={zoomLevel}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageLoaded={pageLoaded}
            setPageLoaded={setPageLoaded}
            isDraggable={isDraggable}
            sampleData={getCurrentData()}
            onStartDrag={handleStartDrag}
            onDrag={handleDrag}
            onEndDrag={handleEndDrag}
            useRealData={useRealData}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SimplePDFPreview;
