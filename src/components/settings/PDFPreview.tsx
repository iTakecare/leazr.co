import React, { useRef, useState, useEffect, CSSProperties } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileDown, Printer, Maximize2, ArrowLeft, ArrowRight } from "lucide-react";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const PDFPreview = ({ template }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const previewRef = useRef(null);

  // Reset pageLoaded when currentPage changes
  useEffect(() => {
    setPageLoaded(false);
  }, [currentPage]);
  
  // Exemple d'offre pour l'aperçu
  const SAMPLE_OFFER = {
    id: "abcdef1234567890",
    client_name: "Entreprise Exemple",
    client_email: "contact@exemple.fr",
    clients: {
      company: "Entreprise Exemple SA",
      name: "Jean Dupont",
      email: "jean.dupont@exemple.fr"
    },
    equipment_description: JSON.stringify([
      {
        title: "MacBook Pro 16\" M2 Pro",
        purchasePrice: 2399,
        quantity: 1,
        margin: 15
      },
      {
        title: "Écran Dell 27\" UltraSharp",
        purchasePrice: 399,
        quantity: 2,
        margin: 20
      },
      {
        title: "Dock USB-C Thunderbolt",
        purchasePrice: 199,
        quantity: 1,
        margin: 25
      }
    ]),
    amount: 3596,
    monthly_payment: 99.89,
    coefficient: 1.08,
    created_at: new Date().toISOString(),
    workflow_status: "draft"
  };
  
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      
      // Générer le PDF en utilisant le template et l'offre d'exemple
      const offerWithTemplate = {
        ...SAMPLE_OFFER,
        __template: template
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

  // Détermine le nombre total de pages
  const totalPages = template?.templateImages?.length || 1;
  
  // Aller à la page suivante
  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Aller à la page précédente
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Obtenir l'image de fond de la page actuelle
  const getCurrentPageBackground = () => {
    if (template?.templateImages && template.templateImages.length > 0) {
      // Recherche de l'image correspondant à la page actuelle
      const pageImage = template.templateImages.find(img => img.page === currentPage);
      
      if (pageImage && pageImage.url) {
        // Ajouter un timestamp pour éviter les problèmes de cache
        return `${pageImage.url}?t=${new Date().getTime()}`;
      } else {
        return null;
      }
    }
    return null;
  };

  // Fonction pour résoudre les valeurs des champs
  const resolveFieldValue = (pattern) => {
    if (!pattern || typeof pattern !== 'string') return '';
    
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      const keyParts = key.split('.');
      let value = SAMPLE_OFFER;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[part];
      }
      
      // Format appropriately
      if (key === 'page_number') {
        return String(currentPage + 1);
      }
      
      // For date fields
      if (key === 'created_at' && typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString();
        } catch (e) {
          console.error("Error formatting date:", e);
          return value ? String(value) : '';
        }
      }
      
      // For currency fields
      if ((key.includes('amount') || key.includes('payment') || key.includes('price')) && typeof value === 'number') {
        try {
          return formatCurrency(value);
        } catch (e) {
          console.error("Error formatting currency:", e);
          return typeof value === 'number' ? String(value) : '';
        }
      }
      
      // Make sure we always return a string
      if (value === undefined || value === null) return '';
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  };
  
  // Parse equipment data from JSON string to array of objects
  const parseEquipmentData = (jsonString) => {
    try {
      if (!jsonString) return [];
      
      // If it's already an array, return it
      if (Array.isArray(jsonString)) return jsonString;
      
      // Try to parse the JSON string
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing equipment data:", error);
      return [];
    }
  };
  
  // Calculate the total price for an equipment item
  const calculateItemTotal = (item) => {
    const price = parseFloat(item.purchasePrice || 0);
    const quantity = parseInt(item.quantity || 1);
    const margin = parseFloat(item.margin || 0) / 100;
    
    return price * quantity * (1 + margin);
  };
  
  // Render the equipment table
  const renderEquipmentTable = (jsonData) => {
    const equipment = parseEquipmentData(jsonData);
    
    if (!equipment || equipment.length === 0) {
      return <p className="text-sm italic">Aucun équipement disponible</p>;
    }
    
    return (
      <table className="w-full border-collapse" style={{ fontSize: "9px" }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-1 py-0.5 text-left">Désignation</th>
            <th className="border px-1 py-0.5 text-right">Prix</th>
            <th className="border px-1 py-0.5 text-center">Qté</th>
            <th className="border px-1 py-0.5 text-center">Marge</th>
            <th className="border px-1 py-0.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item, index) => {
            const totalPrice = calculateItemTotal(item);
            return (
              <tr key={index}>
                <td className="border px-1 py-0.5 text-left">{item.title}</td>
                <td className="border px-1 py-0.5 text-right">{formatCurrency(item.purchasePrice)}</td>
                <td className="border px-1 py-0.5 text-center">{item.quantity}</td>
                <td className="border px-1 py-0.5 text-center">{item.margin}%</td>
                <td className="border px-1 py-0.5 text-right">{formatCurrency(totalPrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };
  
  // Obtenir les champs pour la page actuelle
  const getCurrentPageFields = () => {
    return template?.fields?.filter(f => 
      f.isVisible && (f.page === currentPage || (currentPage === 0 && f.page === undefined))
    ) || [];
  };

  // Vérifier si des images de template sont disponibles
  const hasTemplateImages = template?.templateImages && 
                           Array.isArray(template.templateImages) && 
                           template.templateImages.length > 0;
  
  // Gérer les erreurs de chargement d'image
  const handleImageError = (e) => {
    console.error("Erreur de chargement de l'image:", e.target.src);
    e.target.src = "/placeholder.svg"; // Image de fallback
    
    // Tenter de recharger l'image après un délai
    setTimeout(() => {
      if (e.target.src === "/placeholder.svg") {
        const currentSrc = e.target.src;
        const timestamp = new Date().getTime();
        const newSrc = currentSrc.includes('?') 
          ? currentSrc.split('?')[0] + `?t=${timestamp}`
          : `${currentSrc}?t=${timestamp}`;
        
        console.log("Tentative de rechargement de l'image avec cache-busting:", newSrc);
        e.target.src = newSrc;
      }
    }, 2000);
  };
  
  // Marquer l'image comme chargée
  const handleImageLoad = () => {
    console.log("Image chargée avec succès");
    setPageLoaded(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Aperçu du modèle de PDF</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePreview}
            disabled={loading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Générer un PDF d'exemple
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div 
            ref={previewRef}
            className="bg-gray-100 p-4 flex justify-center min-h-[800px] overflow-auto"
          >
            <div className="bg-white shadow-lg w-full max-w-[595px] relative">
              {/* Navigation des pages */}
              {totalPages > 1 && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="h-8 w-8 bg-white bg-opacity-75"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center justify-center text-sm px-2 bg-white bg-opacity-75 rounded">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 w-8 bg-white bg-opacity-75"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Fond de page si un template a été uploadé */}
              {hasTemplateImages ? (
                <div className="relative">
                  {getCurrentPageBackground() ? (
                    <div className="relative" style={{ minHeight: "842px" }}>
                      <img 
                        src={getCurrentPageBackground()} 
                        alt={`Template page ${currentPage + 1}`}
                        className="w-full h-auto"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        style={{ 
                          display: "block",
                          width: "100%"
                        }}
                      />
                      
                      {/* Champs positionnés - n'apparaissent que lorsque l'image est chargée */}
                      {pageLoaded && getCurrentPageFields().map((field) => {
                        // Définir le style de base pour tous les champs
                        const baseStyle: CSSProperties = {
                          position: "absolute",
                          left: `${field.position?.x || 0}mm`,
                          top: `${field.position?.y || 0}mm`,
                          zIndex: 5,
                        };
                        
                        // Style spécifique pour le tableau d'équipements
                        let fieldStyle: CSSProperties = { ...baseStyle };
                        
                        // Ajouter des styles spécifiques selon le type de champ
                        if (field.id === 'equipment_table') {
                          fieldStyle.fontSize = "9px";
                        }
                        
                        return (
                          <div 
                            key={field.id}
                            className="absolute"
                            style={fieldStyle}
                          >
                            {field.id === 'equipment_table' ? (
                              renderEquipmentTable(SAMPLE_OFFER.equipment_description)
                            ) : (
                              <span>{resolveFieldValue(field.value)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-[842px] bg-white flex items-center justify-center border">
                      <p className="text-gray-400">Pas d'image pour la page {currentPage + 1}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Aperçu générique si pas de template uploadé */
                <div className="min-h-[842px]">
                  {/* En-tête */}
                  <div className="border-b p-6" style={{ backgroundColor: template?.primaryColor || '#2C3E50', color: "white" }}>
                    <div className="flex justify-between items-center">
                      {template?.logoURL && (
                        <img 
                          src={template.logoURL} 
                          alt="Logo" 
                          className="h-10 object-contain"
                        />
                      )}
                      <h1 className="text-xl font-bold">{template?.headerText?.replace('{offer_id}', 'EXEMPLE') || 'EXEMPLE'}</h1>
                    </div>
                  </div>
                  
                  {/* Corps du document */}
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between">
                      <div>
                        <h2 className="text-lg font-semibold mb-2">CLIENT</h2>
                        <p>Entreprise Exemple SA</p>
                        <p>Jean Dupont</p>
                        <p>contact@exemple.fr</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">Référence: OFF-EXEMPLE</p>
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-semibold mb-2">DÉTAILS DE L'OFFRE</h2>
                      <div className="space-y-1">
                        <p>Montant total: 3 596,00 €</p>
                        <p>Paiement mensuel: 99,89 €</p>
                        <p>Coefficient: 1.08</p>
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-semibold mb-2">ÉQUIPEMENTS</h2>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Désignation</th>
                            <th className="border p-2 text-right">Prix unitaire</th>
                            <th className="border p-2 text-center">Qté</th>
                            <th className="border p-2 text-center">Marge</th>
                            <th className="border p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border p-2">MacBook Pro 16" M2 Pro</td>
                            <td className="border p-2 text-right">2 399,00 €</td>
                            <td className="border p-2 text-center">1</td>
                            <td className="border p-2 text-center">15%</td>
                            <td className="border p-2 text-right">2 758,85 €</td>
                          </tr>
                          <tr>
                            <td className="border p-2">Écran Dell 27" UltraSharp</td>
                            <td className="border p-2 text-right">399,00 €</td>
                            <td className="border p-2 text-center">2</td>
                            <td className="border p-2 text-center">20%</td>
                            <td className="border p-2 text-right">957,60 €</td>
                          </tr>
                          <tr>
                            <td className="border p-2">Dock USB-C Thunderbolt</td>
                            <td className="border p-2 text-right">199,00 €</td>
                            <td className="border p-2 text-center">1</td>
                            <td className="border p-2 text-center">25%</td>
                            <td className="border p-2 text-right">248,75 €</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <div className="w-1/3 space-y-2">
                        <div className="flex justify-between border-b pb-1">
                          <span className="font-medium">Total HT:</span>
                          <span>3 596,00 €</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="font-medium">TVA (20%):</span>
                          <span>719,20 €</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1">
                          <span>Total TTC:</span>
                          <span>4 315,20 €</span>
                        </div>
                        <div className="flex justify-between text-blue-600 font-semibold pt-2 border-t">
                          <span>Mensualité:</span>
                          <span>99,89 € / mois</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pied de page */}
                  <div className="p-6 text-xs text-gray-600 bg-gray-50 border-t">
                    <p>{template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}</p>
                    <hr className="my-2 border-gray-300" />
                    <div className="flex justify-center items-center">
                      <p className="text-center">
                        {template?.companyName || 'Entreprise'} - {template?.companyAddress || 'Adresse'}<br />
                        {template?.companySiret || 'SIRET'} - {template?.companyContact || 'Contact'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>Pour positionner les champs sur vos pages:</p>
        <ol className="list-decimal list-inside ml-4 space-y-1 mt-2">
          <li>Ajoutez des pages en uploadant des images dans l'onglet "Pages du modèle"</li>
          <li>Allez dans l'onglet "Champs et positionnement" pour définir les champs</li>
          <li>Pour chaque champ, sélectionnez la page sur laquelle il doit apparaître</li>
          <li>Ajustez les coordonnées X et Y pour positionner précisément le champ</li>
          <li>Utilisez cet aperçu pour vérifier le positionnement de vos champs</li>
        </ol>
        {totalPages > 1 && <p className="mt-2">Utilisez les boutons de navigation pour parcourir les différentes pages du document.</p>}
      </div>
    </div>
  );
};

export default PDFPreview;

