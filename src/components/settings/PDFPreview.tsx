
import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { generateOfferPdf } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

// Données factices pour la prévisualisation
const SAMPLE_OFFER = {
  id: '12345678-1234-1234-1234-123456789012',
  created_at: '2023-05-15T14:30:00Z',
  amount: 10000,
  monthly_payment: 280,
  coefficient: 1.5,
  type: 'Leasing',
  workflow_status: 'En attente',
  commission: 500,
  remarks: 'Livraison à prévoir en 3 semaines',
  client_name: 'Entreprise Example',
  clients: {
    name: 'Entreprise Example',
    company: 'Entreprise Example SARL',
    email: 'contact@example.com',
    address: '123 Rue de l\'Exemple, 75000 Paris, France',
    phone: '+33 1 23 45 67 89'
  },
  user: {
    name: 'Jean Dupont',
    email: 'jean.dupont@itakecare.com',
    phone: '+33 6 12 34 56 78'
  },
  equipment_description: '[{"title":"MacBook Pro 16 pouces","purchasePrice":2000,"quantity":2,"margin":10},{"title":"Écran 27 pouces 4K","purchasePrice":500,"quantity":3,"margin":15},{"title":"Dock USB-C","purchasePrice":150,"quantity":5,"margin":20}]',
  equipment_total: 6500
};

// Fonction pour parser les données d'équipement
const parseEquipmentData = (jsonString) => {
  if (!jsonString) return [];
  
  try {
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    } else if (Array.isArray(jsonString)) {
      return jsonString;
    }
  } catch (error) {
    console.error("Erreur de parsing JSON:", error);
    return [];
  }
  
  return [];
};

const PDFPreview = ({ template }) => {
  const [activeTab, setActiveTab] = useState("page1");
  const [previewData, setPreviewData] = useState(SAMPLE_OFFER);
  const [pages, setPages] = useState([]);
  
  useEffect(() => {
    // Créer le nombre de pages basé sur les images du template
    if (template?.templateImages && template.templateImages.length > 0) {
      const pageCount = Math.max(...template.templateImages.map(img => img.page)) + 1;
      setPages(Array.from({ length: pageCount }, (_, i) => i));
    } else {
      setPages([0]); // Au moins une page par défaut
    }
  }, [template]);
  
  // Générer un PDF avec les données de prévisualisation
  const handleGeneratePDF = async () => {
    if (!template) {
      toast.error("Aucun modèle de PDF configuré");
      return;
    }
    
    try {
      // Ajouter le template aux données pour la prévisualisation
      const previewDataWithTemplate = {
        ...previewData,
        __template: template
      };
      
      await generateOfferPdf(previewDataWithTemplate);
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };
  
  // Si pas de template, afficher un message
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Aucun modèle de PDF configuré</h3>
        <p className="text-muted-foreground mb-4">
          Configurez d'abord les informations de votre entreprise et les champs du modèle.
        </p>
      </div>
    );
  }
  
  // Trouver les champs pour une page spécifique
  const getFieldsForPage = (pageIndex) => {
    if (!template.fields) return [];
    
    return template.fields.filter(field => 
      field.isVisible && (field.page === pageIndex || field.page === null)
    );
  };
  
  // Convertir les coordonnées mm en pixels pour l'aperçu
  const mmToPx = (mm) => {
    // 1 mm = environ 3.78 pixels à une résolution de 96 DPI
    return mm * 3.78;
  };
  
  // Résoudre la valeur d'un champ
  const resolveFieldValue = (pattern) => {
    if (!pattern) return '';
    
    return pattern.replace(/\{([^}]+)\}/g, (match, key) => {
      const keyParts = key.split('.');
      let value = previewData;
      
      for (const part of keyParts) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[part];
      }
      
      // Formater selon le type
      if (typeof value === 'number') {
        // Détecter si c'est une valeur monétaire
        if (key.includes('amount') || key.includes('payment') || key.includes('price') || key.includes('commission')) {
          return formatCurrency(value);
        }
        return value.toString();
      } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
        return formatDate(value);
      }
      
      return value || 'Non renseigné';
    });
  };
  
  // Obtenir le style pour un champ
  const getFieldStyle = (field) => {
    const style = {
      position: 'absolute',
      left: `${mmToPx(field.position.x)}px`,
      top: `${mmToPx(field.position.y)}px`,
      fontSize: `${field.style?.fontSize || 10}px`,
      fontWeight: field.style?.fontWeight || 'normal',
      fontStyle: field.style?.fontStyle || 'normal',
      textDecoration: field.style?.textDecoration || 'none',
    };
    
    if (field.id === 'equipment_table') {
      style.maxWidth = "150mm";
      style.width = "150mm";
    }
    
    return style;
  };
  
  const renderEquipmentTable = (jsonData) => {
    let equipment = [];
    
    try {
      if (typeof jsonData === 'string') {
        try {
          equipment = JSON.parse(jsonData);
        } catch (e) {
          console.error("Failed to parse JSON string:", e);
          
          if (jsonData.includes('[{') && jsonData.includes('}]')) {
            try {
              const cleanedString = jsonData
                .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
                .replace(/'/g, '"');
              
              equipment = JSON.parse(cleanedString);
            } catch (evalError) {
              console.error("Failed to evaluate equipment string:", evalError);
            }
          }
        }
      } else if (Array.isArray(jsonData)) {
        equipment = jsonData;
      }
    } catch (error) {
      console.error("Error processing equipment data:", error);
    }
    
    if (!equipment || equipment.length === 0) {
      return <p className="text-sm italic">Aucun équipement disponible</p>;
    }
    
    return (
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 text-left">Désignation</th>
            <th className="px-2 py-1 text-right">Prix unitaire</th>
            <th className="px-2 py-1 text-center">Quantité</th>
            <th className="px-2 py-1 text-center">Marge</th>
            <th className="px-2 py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {equipment.map((item, index) => {
            const unitPrice = item.purchasePrice || 0;
            const quantity = item.quantity || 1;
            const margin = item.margin || 0;
            const totalPrice = unitPrice * quantity * (1 + margin / 100);
            
            return (
              <tr key={index}>
                <td className="px-2 py-1">{item.title}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(unitPrice)}</td>
                <td className="px-2 py-1 text-center">{quantity}</td>
                <td className="px-2 py-1 text-center">{margin}%</td>
                <td className="px-2 py-1 text-right">{formatCurrency(totalPrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Fonction pour gérer les erreurs de chargement d'image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Error loading image: ${(e.target as HTMLImageElement).src}`);
    (e.target as HTMLImageElement).src = '/placeholder.svg';
  };
  
  // Rendu du modèle PDF avec ses pages
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Aperçu du modèle</h3>
        <Button onClick={handleGeneratePDF} className="gap-2">
          <Download className="h-4 w-4" />
          <span>Télécharger le PDF</span>
        </Button>
      </div>
      
      {pages.length > 1 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {pages.map((page) => (
              <TabsTrigger key={page} value={`page${page + 1}`}>
                Page {page + 1}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {pages.map((page) => (
            <TabsContent key={page} value={`page${page + 1}`}>
              <RenderPDFPage 
                template={template} 
                pageIndex={page} 
                getFieldsForPage={getFieldsForPage}
                resolveFieldValue={resolveFieldValue}
                getFieldStyle={getFieldStyle}
                renderEquipmentTable={renderEquipmentTable}
                handleImageError={handleImageError}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
      
      {pages.length === 1 && (
        <RenderPDFPage 
          template={template} 
          pageIndex={0} 
          getFieldsForPage={getFieldsForPage}
          resolveFieldValue={resolveFieldValue}
          getFieldStyle={getFieldStyle}
          renderEquipmentTable={renderEquipmentTable}
          handleImageError={handleImageError}
        />
      )}
    </div>
  );
};

// Sous-composant pour rendre une page du PDF
const RenderPDFPage = ({ 
  template, 
  pageIndex, 
  getFieldsForPage, 
  resolveFieldValue, 
  getFieldStyle, 
  renderEquipmentTable,
  handleImageError
}) => {
  // Trouver l'image de fond pour cette page
  const backgroundImage = template.templateImages?.find(img => img.page === pageIndex);
  
  // Obtenir les champs pour cette page
  const fieldsForPage = getFieldsForPage(pageIndex);
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative">
          {/* Fond de page A4 */}
          <div 
            className="relative bg-white shadow-md mx-auto"
            style={{
              width: '210mm',
              height: '297mm',
              maxWidth: '100%',
              maxHeight: '80vh',
              transform: 'scale(0.75)',
              transformOrigin: 'top center',
              margin: '0 auto',
              overflow: 'hidden'
            }}
          >
            {/* Image de fond si disponible */}
            {backgroundImage && (
              <img 
                src={backgroundImage.url} 
                alt={`Page ${pageIndex + 1}`}
                className="absolute top-0 left-0 w-full h-full object-contain"
                onError={handleImageError}
              />
            )}
            
            {/* Afficher les champs */}
            {fieldsForPage.map((field) => (
              <div 
                key={`${field.id}-page${pageIndex}`} 
                style={getFieldStyle(field)}
              >
                {field.id === 'equipment_table' ? (
                  renderEquipmentTable(field.value)
                ) : (
                  <span>{resolveFieldValue(field.value)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFPreview;
