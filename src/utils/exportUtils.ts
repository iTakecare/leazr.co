
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

export const generatePDF = (
  title: string, 
  headers: string[], 
  data: (string | number)[][]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      
      // Ajouter le titre
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Ajouter la date
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Généré le ${new Date().toLocaleDateString()}`,
        14,
        30
      );
      
      // Générer le tableau
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
      });
      
      // Sauvegarder le PDF
      doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      
      resolve();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      reject(error);
    }
  });
};

export const generateExcel = (
  sheetName: string, 
  headers: string[], 
  data: (string | number)[][], 
  fileName: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Créer un nouveau classeur
      const wb = XLSX.utils.book_new();
      
      // Créer une feuille avec les données
      const fullData = [headers, ...data];
      const ws = XLSX.utils.aoa_to_sheet(fullData);
      
      // Ajouter la feuille au classeur
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Générer le fichier Excel en binaire
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      
      // Créer un Blob à partir des données
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Sauvegarder le fichier
      saveAs(blob, fileName);
      
      resolve();
    } catch (error) {
      console.error("Erreur lors de la génération du fichier Excel:", error);
      reject(error);
    }
  });
};
