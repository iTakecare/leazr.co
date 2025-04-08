
import React from "react";

interface SignatureSectionProps {
  pageHeight: number;
  scaleFactor?: number;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  pageHeight,
  scaleFactor = 1
}) => {
  // Calculer la position bottom en fonction de la hauteur de la page
  // Placé plus bas pour éviter de chevaucher d'autres éléments
  const bottomPosition = 20 * scaleFactor;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 p-4 border-t"
      style={{
        bottom: `${bottomPosition}px`,
        padding: `${10 * scaleFactor}px`,
        zIndex: 10, // Augmenter le z-index pour s'assurer qu'il est au premier plan
      }}
    >
      <h3 className="text-center font-bold mb-2" style={{ fontSize: `${14 * scaleFactor}px` }}>
        Signature client
      </h3>
      <div
        className="border border-dashed rounded-md mx-auto"
        style={{
          width: "300px",
          height: "100px",
          transform: `scale(${scaleFactor})`,
          transformOrigin: "center",
          backgroundColor: "rgba(255, 255, 255, 0.7)" // Ajouter un fond légèrement transparent
        }}
      />
    </div>
  );
};

export default SignatureSection;
