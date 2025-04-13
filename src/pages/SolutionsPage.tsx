
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Server, Globe, Recycle } from "lucide-react";
import { Link } from "react-router-dom";

const SolutionsPage = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden font-['Inter']">
      <UnifiedNavigation />
      
      {/* Hero Section avec fond similaire à la page d'accueil */}
      <div className="pt-[100px] relative min-h-[500px] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover"
            alt="Background"
            src="/clip-path-group.png"
          />
          {/* Gradient fade to white overlay */}
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 z-10">
          <div className="max-w-3xl">
            <Badge className="bg-[#48b5c34f] text-[#48b5c3] mb-4 px-3 py-1 text-sm font-medium rounded-full">
              Solutions iTakecare
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-[#222222] mb-6">
              Des solutions informatiques innovantes pour votre entreprise
            </h1>
            <p className="text-lg text-[#555555] mb-8">
              Découvrez nos solutions conçues pour optimiser votre parc informatique, réduire vos coûts et contribuer à un numérique plus responsable.
            </p>
            <Button 
              className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-8 py-3 text-base font-semibold"
            >
              Demander un devis
            </Button>
          </div>
        </div>
      </div>
      
      {/* Section Location d'équipement */}
      <section id="location" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Monitor className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Location d'équipement
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Matériel informatique haute performance en location flexible
              </h2>
              <p className="text-[#555555] mb-8">
                Accédez à des équipements informatiques de qualité sans investissement initial. Notre solution de leasing vous permet de disposer de matériel reconditionné haut de gamme avec un contrat tout inclus : maintenance, assistance et garantie.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Flexibilité des contrats de 12 à 48 mois</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Remplacement sous 24h en cas de panne</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Support technique dédié et réactif</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Découvrir notre catalogue
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png" 
                alt="Location d'équipement" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Gestion de parc */}
      <section id="gestion-parc" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Server className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Gestion de parc
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Solutions complètes pour gérer votre infrastructure informatique
              </h2>
              <p className="text-[#555555] mb-8">
                Simplifiez la gestion de votre parc informatique avec notre solution intégrée. Suivez votre inventaire, planifiez les mises à jour et optimisez les performances de vos équipements, le tout depuis une interface unique.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Inventaire en temps réel de vos équipements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Automatisation des tâches de maintenance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Analyse des performances et recommandations</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Demander une démonstration
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/dd01c4d2-2532-40c5-b511-60b4cf1d88f6.png" 
                alt="Gestion de parc informatique" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Services cloud */}
      <section id="cloud" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Globe className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Services cloud
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Infrastructure cloud sécurisée et évolutive
              </h2>
              <p className="text-[#555555] mb-8">
                Migrez vos applications et données vers notre infrastructure cloud sécurisée et bénéficiez d'une flexibilité maximale. Nos solutions s'adaptent à vos besoins et évoluent avec votre entreprise.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Sauvegarde automatique et redondante</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Sécurité renforcée et conformité RGPD</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Évolutivité à la demande selon vos besoins</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Explorer nos services cloud
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/5677be0b-0218-4a20-be93-ce2a5303184c.png" 
                alt="Services cloud" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Reconditionnement */}
      <section id="reconditionnement" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Recycle className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Reconditionnement
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Équipements reconditionnés et certifiés écologiques
              </h2>
              <p className="text-[#555555] mb-8">
                Optez pour des équipements reconditionnés de haute qualité, testés et certifiés. Une solution économique et écologique qui prolonge la durée de vie des appareils et réduit l'empreinte carbone.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Économie jusqu'à 40% par rapport au neuf</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Tests rigoureux et garantie complète</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Impact environnemental réduit de 70%</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Voir les équipements disponibles
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/1d3ac6e1-5c24-4197-af4f-5aa8f2dd014b.png" 
                alt="Reconditionnement informatique" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <CtaSection />
      
      {/* Footer */}
      <HomeFooter />
    </div>
  );
};

export default SolutionsPage;
