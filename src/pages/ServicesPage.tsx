
import React, { useEffect } from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building, Briefcase, FileText, HelpCircle } from 'lucide-react';
import HomeFooter from '@/components/home/HomeFooter';

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
      
      {/* Hero Section */}
      <div className="pt-[100px] flex flex-col items-center">
        <div className="w-full max-w-[1320px] px-4 py-20 text-center">
          <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">
            Nos <span className="text-[#48b5c3]">services</span> informatiques à votre service
          </h1>
          <p className="text-[#222222] text-lg max-w-3xl mx-auto mb-8">
            Des services personnalisés pour accompagner votre entreprise dans sa transformation numérique.
          </p>
          <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold text-lg px-8 py-6">
            Découvrir nos services
          </Button>
        </div>
      </div>

      {/* Pour entreprises Section */}
      <section id="entreprises" className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Building className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Services pour entreprises</h2>
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
                src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
                alt="Services pour entreprises" 
                className="rounded-lg shadow-xl w-full h-auto"
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
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Services pour professionnels</h2>
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
                src="/computer.png" 
                alt="Services pour professionnels" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Formations Section */}
      <section id="formations" className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <FileText className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Formations</h2>
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
                src="/clip-path-group.png" 
                alt="Formations" 
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
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Support technique</h2>
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
                src="/arrow.png" 
                alt="Support technique" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="w-full max-w-[1320px] mx-auto px-4 text-center">
          <h2 className="font-bold text-3xl mb-6">Besoin d'un service personnalisé ?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Contactez nos experts pour discuter de vos besoins spécifiques et obtenir une solution sur mesure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-[#33638E] hover:bg-gray-100 rounded-[50px] font-bold">
              Prendre rendez-vous
            </Button>
            <Button variant="outline" className="text-white border-white hover:bg-white/10 rounded-[50px] font-bold">
              Nous contacter
            </Button>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
};

export default ServicesPage;
