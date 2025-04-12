
import React from "react";
import Container from "@/components/layout/Container";
import { PlayCircle } from "lucide-react";

const PressSection = () => {
  // Logos des médias avec leurs liens
  const mediaLogos = [
    { 
      id: 1, 
      src: "/lovable-uploads/073e7dbf-ca5c-4daf-b802-7f6b7ac52c8d.png", 
      alt: "Pas de Planète B",
      url: "https://auvio.rtbf.be/media/y-a-pas-de-planete-b-y-a-pas-de-planete-b-3247466"
    },
    { 
      id: 2, 
      src: "/lovable-uploads/c63a7506-0940-48dc-97a7-5f471d90c628.png", 
      alt: "Solutions Digital Economy Magazine",
      url: "https://www.solutions-magazine.com/travail-hybride-parc-it-reconditionne/"
    },
    { 
      id: 3, 
      src: "/lovable-uploads/98b42b6b-cc49-4ced-8e29-02f6bfbca203.png", 
      alt: "Grenke",
      url: "https://www.grenke.be/fr/grenke-insights/news/2023/le-leasing---une-solution-pour-sequiper-en-informatique/"
    },
    { 
      id: 4, 
      src: "/lovable-uploads/dd01c4d2-2532-40c5-b511-60b4cf1d88f6.png", 
      alt: "RTBF",
      url: "https://youtu.be/4-qbogY4b6g"
    },
    { 
      id: 5, 
      src: "/lovable-uploads/c8fe2b25-222e-46ff-9a1f-e567d4e08db8.png", 
      alt: "DH.be",
      url: "https://www.dhnet.be/regions/charleroi/2024/05/03/itakecare-la-start-up-carolo-qui-fait-parler-delle-son-fondateur-gianni-sergi-est-courtise-aux-quatre-coins-du-pays-4WQHC2XJINCTHO722MC7J464UE/"
    },
    { 
      id: 6, 
      src: "/lovable-uploads/44ed9a0d-fc12-42a5-aef6-3613cc9322fc.png", 
      alt: "Tendances Trends",
      url: "https://trends.levif.be/a-la-une/clever-together/itakecare-propose-des-solutions-durables-et-economiques/"
    },
    { 
      id: 7, 
      src: "/lovable-uploads/0a5c4464-b8ea-42d5-a130-4c365fcd00ae.png", 
      alt: "LN24",
      url: "https://www.ln24.be/videos/2025/01/07/success-stories-0701-xv8lumf/"
    },
    { 
      id: 8, 
      src: "/lovable-uploads/11107b44-8240-43a0-8cf0-94d458195fa9.png", 
      alt: "Telesambre",
      url: "https://www.telesambre.be/info/les-produits-reconditionnes-une-solution-eco-responsable-pour-les-pme/64820"
    },
  ];

  return (
    <section className="py-16">
      <Container maxWidth="custom">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Colonne de gauche: Titre et YouTube thumbnail */}
          <div className="flex flex-col">
            <h2 className="text-[46px] font-bold text-gray-900 mb-8">
              La presse <span className="bg-[#48b5c34f] text-[#48b5c3] px-6 py-1 rounded-lg group-hover:bg-[#33638E] group-hover:text-white relative top-[-2px] ml-2">parle de nous</span>
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
                  className="relative"
                >
                  <div className="absolute inset-0 rounded-full animate-[pulse_2s_infinite] bg-white/50 scale-150 blur-md"></div>
                  <div className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform group-hover:scale-110 relative z-10">
                    <PlayCircle className="w-12 h-12 text-red-600" />
                  </div>
                </a>
              </div>
            </div>
          </div>
          
          {/* Colonne de droite: Logos en 3 rangées - avec liens cliquables */}
          <div className="flex items-center justify-center h-full mt-8 md:mt-16">
            <div className="grid grid-cols-3 grid-rows-3 gap-6 w-full">
              {mediaLogos.map((logo) => (
                <div key={logo.id} className="flex items-center justify-center h-24 sm:h-28">
                  <a 
                    href={logo.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={logo.src} 
                      alt={logo.alt} 
                      className="max-h-full max-w-full object-contain w-auto h-16 sm:h-20"
                    />
                  </a>
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
