import React from "react";
import Container from "@/components/layout/Container";
import { PlayCircle } from "lucide-react";

const PressSection = () => {
  // Logos des médias
  const mediaLogos = [
    { id: 1, src: "/lovable-uploads/073e7dbf-ca5c-4daf-b802-7f6b7ac52c8d.png", alt: "Pas de Planète B" },
    { id: 2, src: "/lovable-uploads/c63a7506-0940-48dc-97a7-5f471d90c628.png", alt: "Solutions Digital Economy Magazine" },
    { id: 3, src: "/lovable-uploads/98b42b6b-cc49-4ced-8e29-02f6bfbca203.png", alt: "Grenke" },
    { id: 4, src: "/lovable-uploads/dd01c4d2-2532-40c5-b511-60b4cf1d88f6.png", alt: "RTBF" },
    { id: 5, src: "/lovable-uploads/c8fe2b25-222e-46ff-9a1f-e567d4e08db8.png", alt: "DH.be" },
    { id: 6, src: "/lovable-uploads/44ed9a0d-fc12-42a5-aef6-3613cc9322fc.png", alt: "Tendances Trends" },
    { id: 7, src: "/lovable-uploads/0a5c4464-b8ea-42d5-a130-4c365fcd00ae.png", alt: "RTBF" },
  ];

  return (
    <section className="py-16">
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
                alt="Vidéo iTakecare" 
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
            </div>
          </div>
          
          {/* Colonne de droite: Logos en 3 rangées */}
          <div className="flex items-center">
            <div className="grid grid-cols-3 grid-rows-3 gap-8 w-full">
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
