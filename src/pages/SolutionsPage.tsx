
import React, { useEffect } from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Monitor, Server, Globe, Recycle } from 'lucide-react';
import HomeFooter from '@/components/home/HomeFooter';
import Container from '@/components/layout/Container';

const SolutionsPage = () => {
  useEffect(() => {
    // Scroll to the section if hash is present in URL
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <UnifiedNavigation />
      
      {/* Hero Section - Styled like the About page */}
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
              Nos solutions <span className="text-[#48b5c3]">informatiques</span>
            </h1>
            <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
              backgroundColor: 'rgba(29, 174, 219, 0.35)', 
              color: '#48b5c3',
              fontWeight: 900
            }}>
              pour votre entreprise
            </div>
            <p className="text-[#222222] text-xl md:text-xl max-w-3xl mx-auto">
              Des solutions adaptées à vos besoins pour optimiser votre infrastructure informatique et réduire votre impact environnemental.
            </p>
            <div className="mt-8">
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold text-lg px-8 py-6">
                Découvrir notre catalogue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Location d'équipement Section - with blur effect like About page */}
      <section id="location" className="py-16 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Monitor className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Location d'équipement</h2>
              <p className="text-[#222222] text-lg mb-6">
                Matériel informatique haute performance en location flexible. 
                Nous proposons une large gamme d'équipements reconditionnés et testés pour répondre à tous vos besoins.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Ordinateurs portables, PC fixes, écrans et accessoires</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Matériel testé, garanti et prêt à l'emploi</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Contrats flexibles adaptés à vos besoins</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir nos offres de location
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
                alt="Matériel informatique" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gestion de parc Section */}
      <section id="gestion-parc" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <Server className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Gestion de parc informatique</h2>
              <p className="text-[#222222] text-lg mb-6">
                Solutions complètes pour gérer votre infrastructure informatique.
                Nous prenons en charge l'ensemble de votre parc pour vous permettre de vous concentrer sur votre cœur de métier.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Inventaire et suivi de votre parc informatique</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Maintenance préventive et corrective</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Remplacement sous 24h en cas de panne</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                En savoir plus sur la gestion de parc
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6"
                alt="Gestion de parc informatique" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services cloud Section */}
      <section id="cloud" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Globe className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Services cloud</h2>
              <p className="text-[#222222] text-lg mb-6">
                Infrastructure cloud sécurisée et évolutive pour votre entreprise.
                Nous vous proposons des solutions adaptées à vos besoins pour stocker, partager et sécuriser vos données.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Stockage sécurisé et sauvegarde automatique</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Collaboration et partage de documents</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Solutions évolutives selon vos besoins</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir nos services cloud
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81"
                alt="Services cloud" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Reconditionnement Section */}
      <section id="reconditionnement" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <Recycle className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Reconditionnement</h2>
              <p className="text-[#222222] text-lg mb-6">
                Équipements reconditionnés et certifiés écologiques.
                Nous donnons une seconde vie à du matériel informatique de qualité pour réduire l'impact environnemental.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Matériel haut de gamme reconditionné</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Réduction de l'empreinte carbone</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Économies substantielles sur le coût du matériel</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                En savoir plus sur notre processus
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7"
                alt="Reconditionnement d'équipements" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-transparent text-white">
        <Container maxWidth="custom">
          <div className="text-center relative">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded-xl overflow-hidden z-0">
              <img src="/lovable-uploads/f3127226-39ba-4431-a251-f9b5cf02613d.png" alt="Fond turquoise" className="w-full h-full object-cover" />
            </div>
            
            <div className="relative z-10 py-16">
              <h2 className="text-[32px] md:text-[46px] font-bold mb-4">
                Prêt à optimiser votre infrastructure IT ?
                <br />
                n'a plus de <span className="bg-[#33949F]/40 px-4 py-1 rounded-lg text-slate-950">secrets</span> pour vous
              </h2>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Button className="bg-[#33949F] hover:bg-[#2C8089] text-white font-bold rounded-full px-8 py-3 h-auto">
                  Demander un devis
                </Button>
                <Button variant="outline" className="bg-white hover:bg-gray-100 text-gray-800 font-bold border-none rounded-full px-8 py-3 h-auto">
                  Nous contacter
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <HomeFooter />
    </div>
  );
};

export default SolutionsPage;
