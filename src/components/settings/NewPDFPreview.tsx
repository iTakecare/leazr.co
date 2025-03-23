
import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, FileDown, Printer, Maximize2, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// Composant pour afficher un champ sur le PDF
const PDFField = ({ field, zoomLevel, resolveValue, onDragStart, onDragEnd, onDrag, isDraggable }) => {
  // Convertir les millimètres en pixels (standard: 1mm = 3.7795275591px à 96 DPI)
  const mmToPx = (mm) => mm * 3.7795275591 * zoomLevel;
  
  // Position en pixels
  const xPx = mmToPx(field.position?.x || 0);
  const yPx = mmToPx(field.position?.y || 0);
  
  // Taille de police avec zoom
  const fontSize = field.style?.fontSize 
    ? field.style.fontSize * zoomLevel
    : 9 * zoomLevel;
  
  // Style du champ
  const style = {
    position: "absolute" as const, // Using type assertion to fix the error
    left: `${xPx}px`,
    top: `${yPx}px`,
    zIndex: 5,
    fontSize: `${fontSize}px`,
    fontWeight: field.style?.fontWeight || 'normal',
    fontStyle: field.style?.fontStyle || 'normal',
    textDecoration: field.style?.textDecoration || 'none',
    color: field.style?.color || 'black',
    whiteSpace: "pre-wrap" as const,
    maxWidth: field.id === 'equipment_table' 
      ? `${mmToPx(150)}px` 
      : `${mmToPx(80)}px`,
    cursor: isDraggable ? 'move' : 'default'
  };
  
  // Handlers pour le drag and drop
  const handleDragStart = (e) => {
    if (!isDraggable) return;
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(field.id, offsetX, offsetY);
  };

  const handleDrag = (e) => {
    if (!isDraggable || !e.clientX) return; // Ignorer les événements sans coordonnées
    onDrag(e.clientX, e.clientY);
  };

  const handleDragEnd = () => {
    if (!isDraggable) return;
    onDragEnd();
  };
  
  // Si c'est un tableau d'équipement, afficher le tableau
  if (field.id === 'equipment_table') {
    return (
      <div 
        style={style} 
        className="pdf-field"
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {resolveValue(field.id, 'equipment_table')}
      </div>
    );
  }
  
  // Pour tous les autres champs
  return (
    <div 
      style={style} 
      className="pdf-field"
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <span>{resolveValue(field.value)}</span>
    </div>
  );
};

// Composant pour afficher une page du PDF
const PDFPage = ({ 
  currentPage, 
  template, 
  pageLoaded, 
  zoomLevel, 
  getCurrentPageBackground, 
  getCurrentPageFields,
  resolveFieldValue,
  renderEquipmentTable,
  handleImageError,
  handleImageLoad,
  onDragStart,
  onDragEnd,
  onDrag,
  isDraggable
}) => {
  // Si un arrière-plan est disponible
  if (getCurrentPageBackground()) {
    return (
      <div className="relative" style={{ height: "100%" }}>
        <img 
          src={getCurrentPageBackground()} 
          alt={`Template page ${currentPage + 1}`}
          className="w-full h-full object-contain"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ display: "block" }}
        />
        
        {/* Champs positionnés - n'apparaissent que lorsque l'image est chargée */}
        {pageLoaded && getCurrentPageFields().map((field) => (
          <PDFField 
            key={field.id} 
            field={field} 
            zoomLevel={zoomLevel} 
            resolveValue={(value, type) => 
              type === 'equipment_table' 
                ? renderEquipmentTable() 
                : resolveFieldValue(value)
            }
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrag={onDrag}
            isDraggable={isDraggable}
          />
        ))}
      </div>
    );
  }
  
  // Si aucun arrière-plan n'est disponible
  return (
    <div className="w-full h-full bg-white flex items-center justify-center border">
      <p className="text-gray-400">Pas d'image pour la page {currentPage + 1}</p>
    </div>
  );
};

// Composant principal d'aperçu PDF
const NewPDFPreview = ({ template, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const previewRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  const [modifiedTemplate, setModifiedTemplate] = useState(template);

  // Mettre à jour le template local quand le template parent change
  useEffect(() => {
    setModifiedTemplate(template);
  }, [template]);

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
      email: "jean.dupont@exemple.fr",
      address: "123 Rue de l'Exemple, 75000 Paris",
      phone: "+33 1 23 45 67 89"
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
    workflow_status: "draft",
    commission: 250,
    equipment_total: 3350,
    type: "Leasing Matériel IT",
    remarks: "Offre spéciale pour renouvellement parc informatique",
    user: {
      name: "Gianni Sergi",
      email: "gianni@itakecare.be",
      phone: "+32 471 511 121"
    }
  };
  
  // Générer un PDF
  const handleGeneratePreview = async () => {
    try {
      setLoading(true);
      
      // Générer le PDF en utilisant le template et l'offre d'exemple
      const offerWithTemplate = {
        ...SAMPLE_OFFER,
        __template: modifiedTemplate
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
  const totalPages = modifiedTemplate?.templateImages?.length || 1;
  
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
    if (modifiedTemplate?.templateImages && modifiedTemplate.templateImages.length > 0) {
      // Recherche de l'image correspondant à la page actuelle
      const pageImage = modifiedTemplate.templateImages.find(img => img.page === currentPage);
      
      if (pageImage) {
        // Si l'image a une URL, l'utiliser
        if (pageImage.url) {
          // Ajouter un timestamp pour éviter les problèmes de cache
          return `${pageImage.url}?t=${new Date().getTime()}`;
        }
        // Sinon, utiliser les données base64 si disponibles
        else if (pageImage.data) {
          return pageImage.data;
        }
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
      if ((key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) && typeof value === 'number') {
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
  const renderEquipmentTable = () => {
    const equipment = parseEquipmentData(SAMPLE_OFFER.equipment_description);
    
    if (!equipment || equipment.length === 0) {
      return <p className="text-sm italic">Aucun équipement disponible</p>;
    }
    
    return (
      <table className="w-full border-collapse" style={{ fontSize: `${9 * zoomLevel}px` }}>
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
    return modifiedTemplate?.fields?.filter(f => 
      f.isVisible && (f.page === currentPage || (currentPage === 0 && f.page === undefined))
    ) || [];
  };

  // Vérifier si des images de template sont disponibles
  const hasTemplateImages = modifiedTemplate?.templateImages && 
                           Array.isArray(modifiedTemplate.templateImages) && 
                           modifiedTemplate.templateImages.length > 0;
  
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
  
  // Zoom in
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  // Zoom out
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  // Gestion du début de drag d'un champ
  const handleDragStart = (fieldId, offsetX, offsetY) => {
    setIsDragging(true);
    setDraggedFieldId(fieldId);
    setDragOffsetX(offsetX);
    setDragOffsetY(offsetY);
  };

  // Gestion du drag d'un champ
  const handleDrag = (clientX, clientY) => {
    if (!isDragging || !draggedFieldId) return;

    const container = previewRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left - dragOffsetX) / (3.7795275591 * zoomLevel);
    const y = (clientY - rect.top - dragOffsetY) / (3.7795275591 * zoomLevel);

    // Mise à jour du champ dans un nouveau template
    const updatedFields = modifiedTemplate.fields.map(field => {
      if (field.id === draggedFieldId && field.page === currentPage) {
        return {
          ...field,
          position: {
            x: Math.max(0, x),
            y: Math.max(0, y)
          }
        };
      }
      return field;
    });

    setModifiedTemplate({
      ...modifiedTemplate,
      fields: updatedFields
    });
    
    setHasUnsavedChanges(true);
  };

  // Gestion de la fin de drag d'un champ
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedFieldId(null);
  };

  // Sauvegarder les modifications
  const handleSaveChanges = () => {
    if (onSave && hasUnsavedChanges) {
      onSave(modifiedTemplate);
      setHasUnsavedChanges(false);
      toast.success("Modifications sauvegardées");
    }
  };

  // Toggle le mode de positionnement des champs
  const toggleDragMode = () => {
    setIsDraggable(!isDraggable);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Aperçu du modèle de PDF</h3>
        <div className="flex gap-2">
          <div className="flex items-center border rounded-md mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomLevel <= 0.5}
              className="h-8 px-2"
            >
              -
            </Button>
            <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={zoomLevel >= 2}
              className="h-8 px-2"
            >
              +
            </Button>
          </div>
          <Button
            variant={isDraggable ? "default" : "outline"}
            size="sm"
            onClick={toggleDragMode}
            className="h-8"
          >
            {isDraggable ? "Terminer le positionnement" : "Positionner les champs"}
          </Button>
          {hasUnsavedChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveChanges}
              className="h-8"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          )}
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
            <div className="bg-white shadow-lg relative" style={{ 
              width: `${210 * zoomLevel}mm`, 
              height: `${297 * zoomLevel}mm`,
              maxWidth: "100%"
            }}>
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
              
              {/* Contenu du PDF */}
              {hasTemplateImages ? (
                <PDFPage 
                  currentPage={currentPage}
                  template={modifiedTemplate}
                  pageLoaded={pageLoaded}
                  zoomLevel={zoomLevel}
                  getCurrentPageBackground={getCurrentPageBackground}
                  getCurrentPageFields={getCurrentPageFields}
                  resolveFieldValue={resolveFieldValue}
                  renderEquipmentTable={renderEquipmentTable}
                  handleImageError={handleImageError}
                  handleImageLoad={handleImageLoad}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDrag={handleDrag}
                  isDraggable={isDraggable}
                />
              ) : (
                /* Aperçu générique si pas de template uploadé */
                <div className="min-h-[842px]">
                  {/* En-tête */}
                  <div className="border-b p-6" style={{ backgroundColor: modifiedTemplate?.primaryColor || '#2C3E50', color: "white" }}>
                    <div className="flex justify-between items-center">
                      {modifiedTemplate?.logoURL && (
                        <img 
                          src={modifiedTemplate.logoURL} 
                          alt="Logo" 
                          className="h-10 object-contain"
                        />
                      )}
                      <h1 className="text-xl font-bold">{modifiedTemplate?.headerText?.replace('{offer_id}', 'EXEMPLE') || 'EXEMPLE'}</h1>
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
                      {renderEquipmentTable()}
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
                    <p>{modifiedTemplate?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}</p>
                    <hr className="my-2 border-gray-300" />
                    <div className="flex justify-center items-center">
                      <p className="text-center">
                        {modifiedTemplate?.companyName || 'Entreprise'} - {modifiedTemplate?.companyAddress || 'Adresse'}<br />
                        {modifiedTemplate?.companySiret || 'SIRET'} - {modifiedTemplate?.companyContact || 'Contact'}
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
          <li>Cliquez sur "Positionner les champs" pour activer le mode de positionnement</li>
          <li>Déplacez les champs en les faisant glisser à l'emplacement souhaité</li>
          <li>Cliquez sur "Sauvegarder" pour enregistrer les positions</li>
          <li>Cliquez sur "Terminer le positionnement" pour désactiver le mode d'édition</li>
        </ol>
        <p className="mt-2 font-medium text-blue-600">Note: Les coordonnées X/Y représentent la position en millimètres depuis le coin supérieur gauche de la page.</p>
        {totalPages > 1 && <p className="mt-2">Utilisez les boutons de navigation pour parcourir les différentes pages du document.</p>}
      </div>
    </div>
  );
};

export default NewPDFPreview;
