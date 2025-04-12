
import React from "react";
import Container from "@/components/layout/Container";
import { PlayCircle } from "lucide-react";

const PressSection = () => {
  // Nouveaux logos des médias
  const mediaLogos = [
    { id: 1, src: "/lovable-uploads/4a365700-1047-4e60-b8a1-6242c4204f13.png", alt: "Y a pas de planète B" },
    { id: 2, src: "/lovable-uploads/f24c13be-8cad-499a-8480-d95b5edcedd9.png", alt: "Digital Economy Solutions Magazine" },
    { id: 3, src: "/lovable-uploads/9b65200f-0001-4ca6-85a3-5661a1b02319.png", alt: "Grenke" },
    { id: 4, src: "/lovable-uploads/144ade64-e2af-4bc1-8661-0a4e4147c025.png", alt: "RTBF" },
    { id: 5, src: "/lovable-uploads/2572a791-d55e-4ad4-913a-da0aafb8a184.png", alt: "DH.be" },
    { id: 6, src: "/lovable-uploads/16ce88fd-9ad2-4c22-b444-2ce082646093.png", alt: "LN24" },
  ];

  return (
    <section className="py-16 bg-white">
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
                src="/lovable-uploads/2f73aee8-84dc-490a-8169-325e65ab91bd.png" 
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
