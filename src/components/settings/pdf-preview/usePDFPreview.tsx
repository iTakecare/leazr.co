
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PDFTemplate } from "@/types/pdfTemplate";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { generateOfferPdf } from "@/utils/pdfGenerator";

export const usePDFPreview = (template: PDFTemplate, onSave: (template: PDFTemplate) => Promise<void>) => {
  const [localTemplate, setLocalTemplate] = useState<PDFTemplate>({
    ...template,
    templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
    fields: Array.isArray(template.fields) ? [...template.fields] : []
  });
  
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleData, setSampleData] = useState({});
  const [useRealData, setUseRealData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  
  // Reset page loaded state when changing pages
  useEffect(() => {
    setPageLoaded(false);
  }, [currentPage]);
  
  // Update local template when parent template changes
  useEffect(() => {
    console.log("Mise à jour du template local depuis le template parent");
    console.log("Fields:", template?.fields?.length || 0);
    console.log("Images:", template?.templateImages?.length || 0);
    
    if (template?.fields) {
      console.log("Champs pour la page 1:", template.fields.filter(f => f.page === 0 || !f.page).length);
      
      const fieldsPage1 = template.fields.filter(f => f.page === 0 || !f.page);
      fieldsPage1.forEach((f, i) => {
        console.log(` - ${f.id}: "${f.label}" à (${f.position?.x || '?'}, ${f.position?.y || '?'})`);
      });
    }
    
    if (template?.templateImages) {
      console.log("Image trouvée pour la page 1:", template.templateImages.some(img => img.page === 0 || !img.page));
    }
    
    setLocalTemplate({
      ...template,
      templateImages: Array.isArray(template.templateImages) ? [...template.templateImages] : [],
      fields: Array.isArray(template.fields) ? [...template.fields] : []
    });
  }, [template]);
  
  // Load sample data for the preview
  useEffect(() => {
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
      created_at: new Date().toISOString(),
      amount: 15000,
      monthly_payment: 450.50,
      equipment_description: JSON.stringify([
        {
          title: "Ordinateur portable Dell XPS 13",
          purchasePrice: 1500,
          quantity: 2,
          margin: 15,
          monthlyPayment: 50
        },
        {
          title: "Écran Dell 27 pouces",
          purchasePrice: 350,
          quantity: 2,
          margin: 20,
          monthlyPayment: 25
        },
        {
          title: "Docking Station USB-C",
          purchasePrice: 180,
          quantity: 2,
          margin: 25,
          monthlyPayment: 10
        }
      ])
    });
    
    // Fetch real data for testing with real data
    fetchRealData();
  }, []);
  
  // Fetch a real offer from the database
  const fetchRealData = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Get the most recent offer
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
  
  // Function to generate a PDF preview
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      
      const offerWithTemplate = {
        ...getCurrentData(),
        __template: localTemplate
      };
      
      const pdfFilename = await generateOfferPdf(offerWithTemplate);
      
      toast.success(`PDF généré avec succès : ${pdfFilename}`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };
  
  // Save changes to the template
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate data before saving
      const fieldsToSave = localTemplate.fields.map(field => {
        // Ensure all fields have valid positions
        if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
          return {
            ...field,
            position: { x: 10, y: 10 } // Default values
          };
        }
        
        // Round coordinates to 1 decimal place
        return {
          ...field,
          position: {
            x: Math.round(field.position.x * 10) / 10,
            y: Math.round(field.position.y * 10) / 10
          }
        };
      });
      
      // Create a deep copy of the template with updated fields
      const templateToSave = {
        ...localTemplate,
        fields: fieldsToSave
      };
      
      // Save via the function provided by the parent
      await onSave(templateToSave);
      
      toast.success("Modifications sauvegardées avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Get current page background image
  const getCurrentPageBackground = () => {
    if (localTemplate?.templateImages && localTemplate.templateImages.length > 0) {
      const pageImage = localTemplate.templateImages.find(img => img.page === currentPage);
      
      if (pageImage) {
        if (pageImage.url) {
          return `${pageImage.url}?t=${new Date().getTime()}`;
        }
        else if (pageImage.data) {
          return pageImage.data;
        }
      }
    }
    return null;
  };
  
  // Get fields for the current page
  const getCurrentPageFields = () => {
    return localTemplate?.fields?.filter(f => 
      f.isVisible && (f.page === currentPage || (currentPage === 0 && f.page === undefined))
    ) || [];
  };
  
  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Erreur de chargement de l'image:", e.currentTarget.src);
    e.currentTarget.src = "/placeholder.svg";
    
    setTimeout(() => {
      if (e.currentTarget.src === "/placeholder.svg") {
        const currentSrc = e.currentTarget.src;
        const timestamp = new Date().getTime();
        const newSrc = currentSrc.includes('?') 
          ? currentSrc.split('?')[0] + `?t=${timestamp}`
          : `${currentSrc}?t=${timestamp}`;
        
        console.log("Tentative de rechargement de l'image avec cache-busting:", newSrc);
        e.currentTarget.src = newSrc;
      }
    }, 2000);
  };
  
  // Handle image load success
  const handleImageLoad = () => {
    console.log("Image chargée avec succès");
    setPageLoaded(true);
  };
  
  // Determine which data to use based on useRealData parameter
  const getCurrentData = () => {
    if (useRealData && realData) {
      return realData;
    }
    return sampleData;
  };
  
  return {
    localTemplate,
    setLocalTemplate,
    zoomLevel,
    setZoomLevel,
    currentPage,
    setCurrentPage,
    pageLoaded,
    setPageLoaded,
    loading,
    isSaving,
    sampleData,
    useRealData,
    setUseRealData,
    realData,
    handleGeneratePreview,
    handleSave,
    getCurrentPageBackground,
    getCurrentPageFields,
    handleImageError,
    handleImageLoad,
    getCurrentData
  };
};
