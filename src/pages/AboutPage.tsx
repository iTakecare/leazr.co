import React from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import HomeFooter from '@/components/home/HomeFooter';
import { Check, PlayCircle } from 'lucide-react';
import Container from '@/components/layout/Container';
import CtaSection from '@/components/home/CtaSection';

const AboutPage = () => {
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
    <div className="flex flex-col min-h-screen bg-white">
      <UnifiedNavigation />
      
      <div className="flex flex-col min-h-[60vh] items-center gap-6 md:gap-10 py-4 md:py-10 relative pt-16 md:pt-24">
        <div className="flex flex-col w-full h-[60vh] items-start gap-2.5 absolute top-0 left-0">
          <img
            className="relative w-full h-[60vh] object-cover"
            alt="Background"
            src="/clip-path-group.png"
            width="1920" 
            height="1080"
          />
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="relative w-full max-w-[1320px] mx-auto px-4 py-20 text-center z-10 mt-12">
          <div className="text-center">
            <h1 className="font-black text-[#222222] text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
              iTakecare - L'IT réinventé
            </h1>
            <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
              backgroundColor: 'rgba(29, 174, 219, 0.35)', 
              color: '#48b5c3',
              fontWeight: 900
            }}>
              pour les entreprises
            </div>
            <p className="text-[#222222] text-xl md:text-xl max-w-3xl mx-auto">
              Trop d'entreprises immobilisent leur trésorerie dans du matériel qui devient vite obsolète. 
              Chez iTakecare, nous avons voulu changer cela. Notre solution ? Un modèle de leasing intelligent qui vous 
              permet d'avoir un équipement toujours à jour, sans surprise et sans surcoût.
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 bg-white relative">
        <div className="absolute top-0 right-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/93b1f0bc-f724-452e-9187-7fbf56303736.png" 
                alt="Personne travaillant sur un ordinateur portable avec un carnet de notes" 
                className="w-3/4 h-auto rounded-lg shadow-lg mx-auto"
              />
            </div>
            <div className="md:w-1/2">
              <div className="relative">
                <h2 className="relative font-extrabold text-[#222222] text-4xl sm:text-5xl mb-6 z-10">
                  Notre mission : simplifier l'IT, optimiser vos coûts.
                </h2>
              </div>
              <p className="text-[#222222] text-xl mb-8">
                Nous croyons que chaque entreprise mérite une informatique performante et flexible. En
                proposant du matériel reconditionné de qualité et une gestion optimisée, nous vous
                aidons à évoluer sans contrainte.
              </p>
              <div className="h-0.5 w-full bg-gray-200 mb-8"></div>
              
              <div className="space-y-6">
                {[
                  { title: "Fiabilité", description: "Du matériel testé et garanti, prêt à l'emploi." },
                  { title: "Simplicité", description: "Un service clé en main pour un IT sans prise de tête." },
                  { title: "Écoresponsabilité", description: "Une solution durable qui limite le gaspillage électronique." }
                ].map((value, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      <Check className="h-6 w-6 text-[#48b5c3]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{value.title}</h3>
                      <p className="text-lg text-gray-700">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 mt-32 relative">
        <div className="absolute top-0 left-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-6">
            La personne derrière iTakecare ?
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-2/3">
              <p className="text-[#222222] text-lg mb-6">
                À l'origine de l'entreprise, nous retrouvons Gianni, son fondateur. Actif dans le monde de 
                l'informatique depuis plus de 15 ans, il a toujours voulu souhaiter trouver des solutions 
                faciles, concrètes et abordables aux problèmes informatiques que rencontrent les 
                indépendants et les petites entreprises.
              </p>
              <p className="text-[#222222] text-lg mb-6">
                Il fondé iTakecare, car il s'est rendu compte, avec le temps, que même avec des besoins professionnels, 
                les petites entreprises n'ont pas toujours les moyens de payer les (grosses) factures liées soit à l'acquisition ou parfois 
                au dépannage de leur matériel.
              </p>
              <p className="text-[#222222] text-lg mb-6">
                La solution s'est donc présentée à lui tout naturellement : proposer du matériel de 
                qualité, intégrer la maintenance et la garantie, dans un système de « pack » avec une seule mensualité, tout inclus et surtout sans surprise. Pour lui, cela permet à ses clients 
                d'avoir l'esprit tranquille, dès qu'il s'agit de penser à leur informatique... Fini tout cela, ils 
                gèrent leur entreprise, iTakecare met ses compétences à leur service.
              </p>
            </div>
            <div className="md:w-1/3">
              <img 
                src="/lovable-uploads/cdbb563f-cccb-4d4a-b040-245c565379e1.png" 
                alt="Gianni, fondateur d'iTakecare" 
                className="rounded-full shadow-xl w-80 h-80 object-cover mx-auto"
              />
              <div className="text-center mt-4">
                <h3 className="font-bold text-[#222222] text-xl">Gianni Sergi</h3>
                <p className="text-[#48b5c3]">Fondateur d'iTakecare</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <h2 className="font-bold text-[#222222] text-3xl mb-12 text-center">Nos valeurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Entraide", description: "Nous accordons une importance primordiale à se rendre disponibles pour nous entraider. En partageant nos connaissances et nos expériences, nous contribuons au développement des uns des autres. C'est un plaisir de se sentir utile et de semer des sourires sur notre chemin." },
              { title: "Confiance", description: "Nous valorisons les relations humaines authentiques et favorisons des liens durables avec nos clients, nos partenaires et nos collaborateurs. Accessibles et disponibles, nous sommes généreux dans nos interactions. Nous sommes convaincus que se soutenir les uns les autres nous donnent des ailes." },
              { title: "Écoresponsabilité", description: "Une solution durable qui limite le gaspillage électronique. Nous contribuons activement à réduire l'impact environnemental du numérique." },
              { title: "Fiabilité", description: "Du matériel testé et garanti, prêt à l'emploi. Nous nous engageons à fournir des équipements de qualité et un service irréprochable." },
              { title: "Simplicité", description: "Un service clé en main pour un IT sans prise de tête. Nous simplifions la gestion informatique pour que vous puissiez vous concentrer sur votre cœur de métier." },
              { title: "Évolution", description: "Tournés vers l'avenir, nous travaillons à devancer les besoins des professionnels. Attachés au concret, nous adaptons nos idées créatives à la réalité du terrain. Selon nous, la proximité est au service d'une haute exigence de qualité. Persuadés que la flexibilité est un gage de compétitivité, nous cultivons un environnement qui favorise l'inventivité et l'agilité." }
            ].map((value, index) => (
              <div key={index} className="p-8 rounded-lg shadow-lg">
                <h3 className="font-bold text-[#48b5c3] text-xl mb-4">{value.title}</h3>
                <p className="text-[#222222]">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="absolute top-0 left-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <Container maxWidth="custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="flex flex-col relative z-10">
              <h2 className="text-3xl sm:text-[46px] font-bold text-gray-900 mb-8 mr-2">
                La presse <span className="whitespace-nowrap bg-[#48b5c34f] text-[#48b5c3] px-4 sm:px-6 py-1 rounded-lg group-hover:bg-[#33638E] group-hover:text-white relative top-[-2px] ml-1 text-2xl sm:text-4xl">parle de nous</span>
              </h2>
              
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
            
            <div className="flex items-center justify-center h-full mt-8 md:mt-16 relative z-10">
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

      <CtaSection />

      <HomeFooter />
    </div>
  );
};

export default AboutPage;
