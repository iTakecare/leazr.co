
import React from "react";
import Container from "@/components/layout/Container";

const PartnersSection = () => {
  return (
    <section className="py-12 bg-white">
      <Container maxWidth="custom">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Ils nous font confiance</h2>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {/* Partner logos - using placeholder images for now */}
          <img 
            src="/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png" 
            alt="Company Logo" 
            className="h-12 w-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img 
            src="/lovable-uploads/160cd577-8857-4349-a871-cd898da7f954.png" 
            alt="Company Logo" 
            className="h-12 w-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img 
            src="/lovable-uploads/95b23886-6036-4673-a2d8-fcee08de89b1.png" 
            alt="Company Logo" 
            className="h-12 w-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
          <img 
            src="/lovable-uploads/053c0a35-e7c1-46d8-bd25-229c1a9dbabd.png" 
            alt="Company Logo" 
            className="h-12 w-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
        </div>
      </Container>
    </section>
  );
};

export default PartnersSection;
