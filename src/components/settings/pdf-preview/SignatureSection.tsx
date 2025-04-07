
import React from "react";

interface SignatureSectionProps {
  pageHeight: number;
  scaleFactor?: number;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  pageHeight,
  scaleFactor = 1
}) => {
  // Calculer la position bottom pour l'espace de signature
  const bottomPosition = 40 * scaleFactor;
  
  return (
    <div
      className="absolute left-0 right-0 p-4 border-t"
      style={{
        bottom: `${bottomPosition}px`,
        padding: `${12 * scaleFactor}px`,
        borderTop: `2px solid #E5E7EB`,
        borderColor: "#E5E7EB",
        zIndex: 10,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
      }}
    >
      <h3 
        className="text-center font-bold mb-2" 
        style={{ 
          fontSize: `${16 * scaleFactor}px`,
          color: "#1A2C3A",
        }}
      >
        Signature client
      </h3>
      <div
        className="border border-dashed rounded-md mx-auto flex items-center justify-center"
        style={{
          width: `${300 * scaleFactor}px`,
          height: `${100 * scaleFactor}px`,
          transform: `scale(${scaleFactor})`,
          transformOrigin: "center",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderColor: "#94a3b8",
          borderRadius: "8px",
        }}
      >
        <p style={{ 
          color: "#9CA3AF", 
          fontSize: `${10 * scaleFactor}px`, 
          fontStyle: "italic" 
        }}>
          Signature précédée de "Bon pour accord"
        </p>
      </div>
    </div>
  );
};

export default SignatureSection;
