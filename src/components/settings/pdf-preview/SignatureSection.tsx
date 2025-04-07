
import React from "react";

interface SignatureSectionProps {
  scaleFactor: number;
  pageHeight: number;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({ 
  scaleFactor,
  pageHeight
}) => {
  // Position the signature section near the bottom of the page
  const sectionStyle: React.CSSProperties = {
    position: "absolute",
    bottom: `${40 * scaleFactor}px`,
    right: `${20 * scaleFactor}px`,
    width: `${80 * scaleFactor}px`,
    border: "1px solid #ced4da",
    borderRadius: `${3 * scaleFactor}px`,
    padding: `${5 * scaleFactor}px`,
    backgroundColor: "#f8f9fa"
  };

  const titleStyle: React.CSSProperties = {
    fontSize: `${10 * scaleFactor}px`, 
    marginBottom: `${5 * scaleFactor}px`, 
    fontWeight: "bold",
    textAlign: "center"
  };

  const fieldContainerStyle: React.CSSProperties = {
    display: "flex", 
    flexDirection: "column", 
    gap: `${10 * scaleFactor}px`
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex", 
    flexDirection: "column", 
    gap: `${2 * scaleFactor}px`
  };

  const labelStyle: React.CSSProperties = {
    fontSize: `${8 * scaleFactor}px`
  };

  const dateInputStyle: React.CSSProperties = {
    border: "1px solid #dee2e6",
    borderRadius: `${2 * scaleFactor}px`,
    height: `${15 * scaleFactor}px`,
    backgroundColor: "white"
  };

  const signatureInputStyle: React.CSSProperties = {
    border: "1px solid #dee2e6",
    borderRadius: `${2 * scaleFactor}px`,
    height: `${40 * scaleFactor}px`,
    backgroundColor: "white"
  };

  const disclaimerStyle: React.CSSProperties = {
    fontSize: `${6 * scaleFactor}px`, 
    marginTop: `${2 * scaleFactor}px`,
    fontStyle: "italic",
    textAlign: "center"
  };

  return (
    <div style={sectionStyle}>
      <div style={titleStyle}>
        Bon pour accord
      </div>
      
      <div style={fieldContainerStyle}>
        <div style={fieldStyle}>
          <span style={labelStyle}>Date:</span>
          <div style={dateInputStyle}></div>
        </div>
        
        <div style={fieldStyle}>
          <span style={labelStyle}>Signature:</span>
          <div style={signatureInputStyle}></div>
        </div>
        
        <div style={disclaimerStyle}>
          La signature de ce document vaut acceptation des conditions générales
        </div>
      </div>
    </div>
  );
};

export default SignatureSection;
