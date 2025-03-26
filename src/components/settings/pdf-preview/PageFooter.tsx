
import React from "react";

interface PageFooterProps {
  zoomLevel: number;
  template: any;
}

const PageFooter: React.FC<PageFooterProps> = ({ zoomLevel, template }) => {
  return (
    <div className="w-full" style={{ 
      position: "absolute", 
      bottom: 0, 
      left: 0, 
      right: 0,
      padding: `${10 * zoomLevel}px`
    }}>
      <div className="text-center" style={{ 
        borderTop: "1px solid #e5e7eb", 
        paddingTop: `${10 * zoomLevel}px`
      }}>
        <p className="text-center font-bold" style={{ fontSize: `${10 * zoomLevel}px` }}>
          {template?.footerText || "Cette offre est valable 30 jours à compter de sa date d'émission."}
        </p>
        <div className="flex justify-center items-center mt-2">
          <p className="text-center" style={{ fontSize: `${8 * zoomLevel}px` }}>
            {template?.companyName || 'iTakeCare'} - {template?.companyAddress || 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique'}<br />
            {template?.companySiret || 'TVA: BE 0795.642.894'} - {template?.companyContact || 'Tel: +32 471 511 121 - Email: hello@itakecare.be'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageFooter;
