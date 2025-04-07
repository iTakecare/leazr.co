
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
  companyName = "iTakeCare",
  companyAddress = "Avenue du Général Michel 1E, 6000 Charleroi, Belgique",
  companySiret = "TVA: BE 0795.642.894",
  companyContact = "Tel: +32 471 511 121 - Email: hello@itakecare.be",
  footerText = "Cette offre est valable 30 jours à compter de sa date d'émission.",
  zoomLevel = 1
}) => {
  return (
    <div className="w-full bg-gray-50 border-t pt-2">
      <div className="text-center">
        <p className="text-xs font-bold">{pageNumber} / {totalPages}</p>
        <p className="text-xs text-center mt-1 font-bold">{footerText}</p>
        <div className="flex justify-center items-center mt-1">
          <p className="text-[8px] text-center text-gray-600">
            {companyName} - {companyAddress}<br />
            {companySiret} - {companyContact}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFFooter;
