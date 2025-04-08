
import React from "react";

interface PDFFooterProps {
  pageNumber: number;
  totalPages: number;
  companyName?: string;
  companyAddress?: string;
  companySiret?: string;
  companyContact?: string;
  footerText?: string;
  zoomLevel?: number;
}

const PDFFooter: React.FC<PDFFooterProps> = ({
  pageNumber,
  totalPages,
  companyName = "iTakecare",
  companyAddress = "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
  companySiret = "TVA: BE 0795.642.894",
  companyContact = "Tel: +32 471 511 121 - Email: hello@itakecare.be",
  footerText = "Cette offre est valable 30 jours à compter de sa date d'émission.",
  zoomLevel = 1
}) => {
  return (
    <div className="w-full" style={{ 
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to right, #1A2C3A, #2C4356)',
      borderTop: '3px solid #FFB74D',
      color: 'white',
      padding: `${12 * zoomLevel}px ${15 * zoomLevel}px`
    }}>
      <div className="text-center">
        <p className="text-xs text-center font-bold text-white mb-2" style={{ fontSize: `${11 * zoomLevel}px` }}>
          {footerText}
        </p>
        <div className="flex justify-center items-center">
          <p className="text-center text-white opacity-80" style={{ fontSize: `${9 * zoomLevel}px` }}>
            {companyName} - {companyAddress}<br />
            {companySiret} - {companyContact}
          </p>
        </div>
        <p className="text-xs font-medium text-white opacity-80 mt-2" style={{ fontSize: `${9 * zoomLevel}px` }}>
          {pageNumber} / {totalPages}
        </p>
      </div>
    </div>
  );
};

export default PDFFooter;
