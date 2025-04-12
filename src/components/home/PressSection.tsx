
import React from "react";
import Container from "@/components/layout/Container";
import { PlayCircle } from "lucide-react";

const PressSection = () => {
  // Logos des médias
  const mediaLogos = [
    { id: 1, src: "/lovable-uploads/73d518f9-158d-4e00-bf66-27a3b5132dd7.png", alt: "DH.be" },
    { id: 2, src: "/lovable-uploads/77cb8f7a-a865-497e-812d-e04c6d5c9160.png", alt: "LN24" },
    { id: 3, src: "/lovable-uploads/d4880ad6-24e3-41fc-a43a-5ed1b4e843f3.png", alt: "Tendances Trends" },
    { id: 4, src: "/lovable-uploads/7ef530c6-e5ce-4e0e-8ea4-d258a8603fd8.png", alt: "Y A PAS DE PLANETE B" },
    { id: 5, src: "/lovable-uploads/84d56be2-f9c6-47ac-b155-b269343646ce.png", alt: "Solutions Magazine" },
    { id: 6, src: "/lovable-uploads/ed501677-ceb6-452f-85a3-d92673365d14.png", alt: "GRENKE" },
    { id: 7, src: "/lovable-uploads/5677be0b-0218-4a20-be93-ce2a5303184c.png", alt: "RTBF" },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <Container maxWidth="custom">
        <div className="text-center mb-12">
          <h2 className="text-[46px] font-bold text-gray-900 mb-4">
            La presse <span className="bg-[#48B5C3]/20 text-[#48B5C3] px-4 py-1 rounded-full">parle de nous</span>
          </h2>
          
          {/* Vidéo YouTube miniature */}
          <div className="mt-10 mb-16 max-w-4xl mx-auto relative group">
            <img 
              src="/lovable-uploads/cb4a11cf-7f6c-43c4-9099-5817ef928f1a.png" 
              alt="Interview fondateur iTakecare" 
              className="w-full h-auto rounded-lg shadow-md"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <a 
                href="https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform group-hover:scale-110"
              >
                <PlayCircle className="w-12 h-12 text-[#48B5C3]" />
              </a>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded-md">
              <div className="text-white text-left">
                <p className="text-lg font-semibold">Gianni Sergi</p>
                <p className="text-sm">Fondateur de iTakecare</p>
              </div>
            </div>
          </div>
          
          {/* Logos des médias */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center">
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
      </Container>
    </section>
  );
};

export default PressSection;
