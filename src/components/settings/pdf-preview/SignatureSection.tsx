
import React from "react";

interface SignatureSectionProps {
  pageHeight: number;
  scaleFactor?: number; // Made this optional
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  pageHeight,
  scaleFactor = 1
}) => {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 p-4 border-t"
      style={{
        bottom: `${40 * (scaleFactor || 1)}px`,
        padding: `${10 * (scaleFactor || 1)}px`,
      }}
    >
      <h3 className="text-center font-bold mb-2" style={{ fontSize: `${14 * (scaleFactor || 1)}px` }}>
        Signature client
      </h3>
      <div
        className="border border-dashed rounded-md mx-auto"
        style={{
          width: "300px",
          height: "100px",
          transform: `scale(${scaleFactor || 1})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
};

export default SignatureSection;
