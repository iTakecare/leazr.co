import React, { useEffect } from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building, Briefcase, FileText, HelpCircle } from 'lucide-react';
import HomeFooter from '@/components/home/HomeFooter';
import Container from '@/components/layout/Container';

const ServicesPage = () => {
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
              Nos <span className="text-[#48b5c3]">services</span> informatiques
            </h1>
            <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
              backgroundColor: 'rgba(29, 174, 219, 0.35)', 
              color: '#48b5c3',
              fontWeight: 900
            }}>
              pour votre entreprise
            </div>
            <p className="text-[#222222] text-xl md:text-xl max-w-3xl mx-auto">
              Des services personnalisés pour accompagner votre entreprise dans sa transformation numérique 
              et optimiser votre productivité.
            </p>
          </div>
        </div>
      </div>

      {/* Pour entreprises Section - with blur effect */}
      <section id="entreprises" className="py-16 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Building className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl sm:text-4xl mb-4">Services pour entreprises</h2>
              <p className="text-[#222222] text-lg mb-6">
                Solutions adaptées aux besoins des entreprises de toutes tailles.
                Nous vous accompagnons dans la mise en place et la gestion de votre infrastructure informatique.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Audit de votre infrastructure existante</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Conseil et accompagnement stratégique</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Mise en place de solutions sur mesure</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Demander un audit gratuit
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692" 
                alt="Services pour entreprises" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pour professionnels Section */}
      <section id="professionnels" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <Briefcase className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Services pour professionnels</h2>
              <p className="text-[#222222] text-lg mb-6">
                Offres spéciales pour indépendants et professionnels.
                Des solutions adaptées à vos besoins spécifiques et à votre budget.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Équipement informatique professionnel à tarif préférentiel</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Support technique dédié et réactif</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Solutions flexibles qui évoluent avec votre activité</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir nos offres pour professionnels
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40" 
                alt="Services pour professionnels" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Formations Section - with blur effect */}
      <section id="formations" className="py-16 relative">
        <div className="absolute top-0 left-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <FileText className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Formations</h2>
              <p className="text-[#222222] text-lg mb-6">
                Programmes de formation pour vos équipes.
                Nous proposons des formations adaptées à tous les niveaux pour permettre à vos collaborateurs de maîtriser les outils numériques.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Formations sur mesure selon vos besoins</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Formations en présentiel ou à distance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Support pédagogique complet</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir notre catalogue de formations
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1594608661623-aa0bd3a69799" 
                alt="Formations informatiques" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Support technique Section */}
      <section id="support" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <HelpCircle className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Support technique</h2>
              <p className="text-[#222222] text-lg mb-6">
                Assistance technique dédiée et réactive.
                Notre équipe de techniciens expérimentés est à votre disposition pour résoudre rapidement tous vos problèmes informatiques.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Support téléphonique et par email</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Intervention à distance ou sur site</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Temps de réponse garanti</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Contacter notre support technique
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf" 
                alt="Support technique" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - using the same style as HomePage CtaSection */}
      <section className="py-16 bg-transparent text-white">
        <Container maxWidth="custom">
          <div className="text-center relative">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded-xl overflow-hidden z-0">
              <img src="/lovable-uploads/f3127226-39ba-4431-a251-f9b5cf02613d.png" alt="Fond turquoise" className="w-full h-full object-cover" />
            </div>
            
            <div className="relative z-10 py-16">
              <h2 className="text-[32px] md:text-[46px] font-bold mb-4">
                Des services informatiques
                <br />
                <span className="bg-[#33949F]/40 px-4 py-1 rounded-lg text-white">adaptés</span> à tous vos besoins
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
                Découvrez comment notre expertise peut transformer votre environnement de travail et booster votre productivité.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Button className="bg-[#33949F] hover:bg-[#2C8089] text-white font-bold rounded-full px-8 py-3 h-auto">
                  Demander un devis
                </Button>
                <Button variant="outline" className="bg-white hover:bg-gray-100 text-gray-800 font-bold border-none rounded-full px-8 py-3 h-auto">
                  Parler à un conseiller
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

export default ServicesPage;
