
import React from "react";
import Container from "@/components/layout/Container";
import { PlayCircle } from "lucide-react";

const PressSection = () => {
  // Logos des médias
  const mediaLogos = [
    { id: 1, src: "/lovable-uploads/73d518f9-158d-4e00-bf66-27a3b5132dd7.png", alt: "DH.be" },
    { id: 2, src: "/lovable-uploads/77cb8f7a-a865-497e-812d-e04c6d5c9160.png", alt: "LN24" },
    { id: 3, src: "/lovable-uploads/d4880ad6-24e3-41fc-a43a-5ed1b4e843f3.png", alt: "Tendances Trends" },
    { id: 4, src: "/lovable-uploads/5677be0b-0218-4a20-be93-ce2a5303184c.png", alt: "RTBF" },
    { id: 5, src: "/lovable-uploads/9d44b5f8-4a64-40e3-a368-207f0f45a360.png", alt: "DIGITAL ENERGY SOLUTIONS" },
    { id: 6, src: "/lovable-uploads/ed501677-ceb6-452f-85a3-d92673365d14.png", alt: "GRENKE" },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <Container maxWidth="custom">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Colonne de gauche: Titre et YouTube thumbnail */}
          <div className="flex flex-col">
            <h2 className="text-[46px] font-bold text-gray-900 mb-8">
              La presse <span className="bg-[#48B5C3]/20 text-[#48B5C3] px-6 py-2 rounded-full">parle de nous</span>
            </h2>
            
            {/* Vidéo YouTube miniature */}
            <div className="relative group mt-4">
              <img 
                src="/lovable-uploads/88f6cdf6-516c-4d4f-8a9f-d74894212c9b.png" 
                alt="Gianni Sergi - Fondateur de iTakecare - Interview" 
                className="w-full h-auto rounded-lg shadow-md"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <a 
                  href="https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform group-hover:scale-110"
                >
                  <PlayCircle className="w-12 h-12 text-red-600" />
                </a>
              </div>
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-md">
                <div className="text-white text-left">
                  <p className="text-sm font-medium">Leasing informatique reconditionné iTakecare - JT RTBF 03/04/2024</p>
                  <p className="text-xs">Gianni Sergi, Fondateur de iTakecare</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Colonne de droite: Logos en 2 rangées */}
          <div className="flex items-center">
            <div className="grid grid-cols-3 grid-rows-2 gap-8 w-full">
              {mediaLogos.map((logo) => (
                <div key={logo.id} className="flex items-center justify-center h-16 sm:h-20">
                  <img 
                    src={logo.src} 
                    alt={logo.alt} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default PressSection;
