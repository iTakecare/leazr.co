
import React from "react";

interface SignatureSectionProps {
  zoomLevel: number;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({ zoomLevel }) => {
  return (
    <div style={{
      position: "absolute",
      bottom: `${40 * zoomLevel}mm`,
      right: `${20 * zoomLevel}mm`,
      width: `${80 * zoomLevel}mm`,
      border: "1px solid #ced4da",
      borderRadius: `${3 * zoomLevel}px`,
      padding: `${5 * zoomLevel}px`,
      backgroundColor: "#f8f9fa"
    }}>
      <div style={{ 
        fontSize: `${10 * zoomLevel}px`, 
        marginBottom: `${5 * zoomLevel}px`, 
        fontWeight: "bold",
        textAlign: "center" 
      }}>
        Bon pour accord
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: `${10 * zoomLevel}px` }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: `${2 * zoomLevel}px`
        }}>
          <span style={{ fontSize: `${8 * zoomLevel}px` }}>Date:</span>
          <div style={{
            border: "1px solid #dee2e6",
            borderRadius: `${2 * zoomLevel}px`,
            height: `${15 * zoomLevel}px`,
            backgroundColor: "white",
          }}></div>
        </div>
        
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: `${2 * zoomLevel}px`
        }}>
          <span style={{ fontSize: `${8 * zoomLevel}px` }}>Signature:</span>
          <div style={{
            border: "1px solid #dee2e6",
            borderRadius: `${2 * zoomLevel}px`,
            height: `${40 * zoomLevel}px`,
            backgroundColor: "white",
          }}></div>
        </div>
        
        <div style={{ 
          fontSize: `${6 * zoomLevel}px`, 
          marginTop: `${2 * zoomLevel}px`,
          fontStyle: "italic",
          textAlign: "center" 
        }}>
          La signature de ce document vaut acceptation des conditions générales
        </div>
      </div>
    </div>
  );
};

export default SignatureSection;
