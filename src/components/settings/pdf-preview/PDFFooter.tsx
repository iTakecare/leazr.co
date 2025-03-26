
import React from "react";

interface PDFFooterProps {
  zoomLevel: number;
  companyName?: string;
  companyAddress?: string;
  companySiret?: string;
  companyContact?: string;
  footerText?: string;
}

const PDFFooter: React.FC<PDFFooterProps> = ({
  zoomLevel,
  companyName,
  companyAddress,
  companySiret,
  companyContact,
  footerText
}) => {
  return (
    <div className="w-full" style={{ 
      position: "absolute", 
      bottom: 0, 
      left: 0, 
      right: 0,
      padding: `${5 * zoomLevel}px`,
      paddingBottom: `${25 * zoomLevel}px`
    }}>
      <div className="text-center" style={{ 
        borderTop: "1px solid #e5e7eb", 
        paddingTop: `${8 * zoomLevel}px`
      }}>
        <p className="text-center font-bold" style={{ fontSize: `${10 * zoomLevel}px` }}>
          {footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}
        </p>
        <div className="flex justify-center items-center mt-2">
          <p className="text-center" style={{ fontSize: `${8 * zoomLevel}px` }}>
            {companyName || 'iTakeCare'} - {companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}<br />
            {companySiret || 'TVA: BE 0795.642.894'} - {companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFFooter;
