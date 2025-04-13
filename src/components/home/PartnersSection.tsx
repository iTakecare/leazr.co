
import React from "react";
import Container from "@/components/layout/Container";

const PartnersSection = () => {
  const partners = [
    { id: 1, name: "Sitemark" },
    { id: 2, name: "Sitemark" },
    { id: 3, name: "Sitemark" },
    { id: 4, name: "Sitemark" },
    { id: 5, name: "Sitemark" },
    { id: 6, name: "Sitemark" },
  ];

  return (
    <section className="py-10 mt-[-20px] sm:mt-[-50px] md:mt-[-80px] relative z-10 bg-transparent">
      <Container maxWidth="custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-[28px] md:text-[46px] font-bold text-gray-900">Ils nous font confiance</h2>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-10 lg:gap-16">
          {partners.map((partner) => (
            <div key={partner.id} className="flex items-center">
              <span className="text-lg md:text-[30px] font-medium">✱ {partner.name}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default PartnersSection;
