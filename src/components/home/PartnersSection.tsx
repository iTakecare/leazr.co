
import React from "react";
import Container from "@/components/layout/Container";

const PartnersSection = () => {
  const partners = [
    { id: 15, name: "WinFinance", logo: "/lovable-uploads/0ed0c11a-0792-402d-9649-288aa573fc4c.png" },
    { id: 1, name: "Le Chiffre", logo: "/lovable-uploads/273e8a35-7b57-42b0-b601-382d95b1baaa.png" },
    { id: 2, name: "Sublime Émoi", logo: "/lovable-uploads/c1480966-a304-4d92-9d91-c70cbefbf2a8.png" },
    { id: 3, name: "JNS Ascenseurs", logo: "/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png" },
    { id: 4, name: "Ardenne Belge", logo: "/lovable-uploads/b51ceda5-0d7f-4358-9ff7-5957c2849dc6.png" },
    { id: 5, name: "Alarme De Clerck", logo: "/lovable-uploads/2e1ccff5-5bca-4d24-a2ea-df65fdb5d9a3.png" },
    { id: 6, name: "APIK", logo: "/lovable-uploads/3dc2ebd7-79c6-4602-bb0e-8b98763f871a.png" },
    { id: 7, name: "Athénée Royal de Saint-Ghislain", logo: "/lovable-uploads/18dcbda7-c640-4eca-882b-bbb004430197.png" },
    { id: 8, name: "European Food Banks Federation", logo: "/lovable-uploads/3c11e566-72ff-4182-8628-3a147fc708ef.png" },
    { id: 9, name: "The Southern Experience", logo: "/lovable-uploads/e2b9737a-8d20-49e8-a5fb-08cd3868bfa6.png" },
    { id: 10, name: "Legal Avenue", logo: "/lovable-uploads/4d4aa02a-e93e-41fd-9884-61a4dc226da5.png" },
    { id: 11, name: "Finance Crédit & Placement", logo: "/lovable-uploads/bff07c1d-e89b-40bd-9f4b-f6a004580ae6.png" },
    { id: 12, name: "DEXI", logo: "/lovable-uploads/325be1db-cf46-4253-90e1-4c26f02b267b.png" },
    { id: 13, name: "Salesrise", logo: "/lovable-uploads/89e92f12-bc6a-4246-b072-56380afd4802.png" },
    { id: 14, name: "StartupVie", logo: "/lovable-uploads/1f643a3f-c6aa-432c-95a1-ed0cde4490a6.png" },
  ];

  // Duplicate the partners array to create a seamless loop effect
  const duplicatedPartners = [...partners, ...partners];

  return (
    <section className="py-10 mt-[-120px] sm:mt-[-180px] md:mt-[-350px] relative z-10 bg-transparent">
      <Container maxWidth="custom">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-[28px] md:text-[46px] font-bold text-gray-900">Ils nous font confiance</h2>
        </div>
        
        <div className="relative overflow-hidden w-full bg-white/80 py-6 rounded-xl">
          <div className="flex space-x-16 animate-marquee">
            {duplicatedPartners.map((partner, index) => (
              <div 
                key={`${partner.id}-${index}`} 
                className="flex items-center justify-center"
              >
                <img 
                  src={partner.logo} 
                  alt={partner.name} 
                  className="h-12 md:h-16 object-contain max-w-[120px] md:max-w-[160px] opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-110 rounded-lg"
                  title={partner.name}
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default PartnersSection;
