
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer';
import { OfferData, EquipmentItem } from '@/services/offers/types';
import { AlertCircle, Download, FileText, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  viewer: {
    width: '100%',
    height: '500px',
  },
  text: {
    fontSize: 12,
    textAlign: 'justify',
    fontFamily: 'Helvetica'
  },
  image: {
    marginVertical: 15,
    marginHorizontal: 100,
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Helvetica',
    fontWeight: 'bold'
  },
  footer: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Helvetica',
    color: 'grey'
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row'
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0
  },
  tableCellHeader: {
    margin: 4,
    fontSize: 12,
    fontWeight: 'bold'
  },
  tableCell: {
    margin: 4,
    fontSize: 10
  }
});

// Fix the event type for image error handling
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
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

// Create a custom interface for extended OfferData that includes equipment
interface ExtendedOfferData extends OfferData {
  equipment?: EquipmentItem[];
}

const PDFPreview = ({ template, offer }: { template: any, offer?: ExtendedOfferData }) => {
  const [scale, setScale] = useState(1.0);
  const [pageOrientation, setPageOrientation] = useState('portrait');
  const [showToolbar, setShowToolbar] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  const [isLandscape, setIsLandscape] = useState(false);
  
  useEffect(() => {
    setIsLandscape(pageOrientation === 'landscape');
  }, [pageOrientation]);
  
  // Function to generate the PDF document
  const generatePdfDocument = async () => {
    if (!template) {
      setError("Le modèle est manquant. Veuillez configurer le modèle PDF.");
      return;
    }
    
    setError(null);
    
    try {
      const document = (
        <Document>
          {template.templateImages && template.templateImages.length > 0 ? (
            template.templateImages.map((image: any, index: number) => (
              <Page size="A4" style={styles.page} key={index}>
                {image.src && (
                  <Image
                    src={image.src}
                    style={styles.image}
                  />
                )}
                {template.fields && template.fields.length > 0 ? (
                  template.fields
                    .filter((field: any) => field.page === index)
                    .map((field: any) => (
                      <Text
                        key={field.id}
                        style={{
                          position: 'absolute',
                          top: field.position.y,
                          left: field.position.x,
                          fontSize: field.style.fontSize,
                          fontWeight: field.style.fontWeight,
                          fontStyle: field.style.fontStyle,
                          textDecoration: field.style.textDecoration,
                          fontFamily: 'Helvetica'
                        }}
                      >
                        {field.label}
                      </Text>
                    ))
                ) : null}
              </Page>
            ))
          ) : (
            <Page size="A4" style={styles.page}>
              <Text style={styles.text}>Aucune image de modèle définie.</Text>
            </Page>
          )}
        </Document>
      );
      
      const pdfBlob = await pdf(document).toBlob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setPdfBlob(pdfBlob);
      setPdfUrl(pdfUrl);
    } catch (pdfError) {
      console.error("Erreur lors de la génération du PDF:", pdfError);
      setError("Erreur lors de la génération du PDF. Veuillez vérifier la configuration du modèle.");
    }
  };
  
  useEffect(() => {
    generatePdfDocument();
  }, [template]);
  
  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      toast.error("Le PDF n'est pas encore prêt pour l'impression.");
    }
  };
  
  const handleExportToJpg = () => {
    if (!pdfBlob) {
      toast.error("Le PDF n'est pas encore prêt pour l'exportation.");
      return;
    }
    
    // Use a more direct approach with HTML Canvas
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 800;
    canvasEl.height = 1131; // A4 proportions
    const ctx = canvasEl.getContext('2d');
    
    if (!ctx) {
      toast.error("Impossible de créer le contexte de canvas");
      return;
    }
    
    // Draw a white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    
    // Draw error message if needed
    if (error) {
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText(error, 20, 50);
    }
    
    // Convert to image and download
    const imgData = canvasEl.toDataURL('image/jpeg', 0.8);
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'pdf-page.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportToPng = () => {
    if (!pdfBlob) {
      toast.error("Le PDF n'est pas encore prêt pour l'exportation.");
      return;
    }
    
    // Use a more direct approach with HTML Canvas
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 800;
    canvasEl.height = 1131; // A4 proportions
    const ctx = canvasEl.getContext('2d');
    
    if (!ctx) {
      toast.error("Impossible de créer le contexte de canvas");
      return;
    }
    
    // Draw a white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    
    // Draw error message if needed
    if (error) {
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText(error, 20, 50);
    }
    
    // Convert to image and download
    const imgData = canvasEl.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'pdf-page.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportToPdf = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("Le PDF n'est pas encore prêt pour le téléchargement.");
    }
  };
  
  const handleExportToCsv = () => {
    if (!offer || !offer.equipment) {
      toast.error("Aucune donnée d'équipement disponible pour l'exportation CSV.");
      return;
    }
    
    const csvRows = [];
    
    // Headers
    csvRows.push("Description,Quantity,Price");
    
    // Data rows
    offer.equipment.forEach(item => {
      const values = [
        item.description ? item.description.replace(/,/g, '') : item.title.replace(/,/g, ''), // Remove commas from description
        item.quantity,
        item.price || item.purchasePrice
      ];
      csvRows.push(values.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'equipment.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportToExcel = () => {
    if (!offer || !offer.equipment) {
      toast.error("Aucune donnée d'équipement disponible pour l'exportation Excel.");
      return;
    }
    
    // Create CSV data for Excel
    const csvContent = [
      ["Description", "Quantity", "Price"].join(','),
      ...offer.equipment.map(item => [
        item.description || item.title, 
        item.quantity.toString(), 
        (item.price || item.purchasePrice).toString()
      ].join(','))
    ].join('\n');
    
    // Create a CSV blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'equipment.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Card>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Imprimer</Button>
            
            <Select value={pageOrientation} onValueChange={setPageOrientation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Paysage</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => setScale(Math.max(0.5, scale - 0.1))}><ZoomOut className="h-4 w-4 mr-2" /> Réduire</Button>
            <Button onClick={() => setScale(Math.min(2, scale + 0.1))}><ZoomIn className="h-4 w-4 mr-2" /> Agrandir</Button>
            
            <Button onClick={handleExportToPdf}><FileText className="h-4 w-4 mr-2" /> PDF</Button>
            
            <Button onClick={handleExportToCsv}>CSV</Button>
            <Button onClick={handleExportToExcel}>Excel</Button>
            
            <Button onClick={handleExportToJpg}>JPG</Button>
            <Button onClick={handleExportToPng}>PNG</Button>
          </div>
        )}
        
        <div
          ref={pdfContainerRef}
          style={{
            width: '100%',
            height: '800px',
            overflow: 'auto',
            border: '1px solid #ccc',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            backgroundColor: '#f9f9f9',
            position: 'relative',
          }}
        >
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="text-center py-8">
              {error ? (
                <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50 max-w-md mx-auto">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <p className="font-medium text-red-700">{error}</p>
                </div>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Génération du PDF...</p>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFPreview;
