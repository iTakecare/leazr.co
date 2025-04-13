
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Briefcase, FileText, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ServicesPage = () => {
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
              Services iTakecare
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-[#222222] mb-6">
              Des services complets pour votre infrastructure informatique
            </h1>
            <p className="text-lg text-[#555555] mb-8">
              Nos services professionnels répondent aux besoins spécifiques de votre entreprise, quelle que soit sa taille, avec une approche personnalisée et un suivi de qualité.
            </p>
            <Button 
              className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-8 py-3 text-base font-semibold"
            >
              Contacter un conseiller
            </Button>
          </div>
        </div>
      </div>
      
      {/* Section Pour entreprises */}
      <section id="entreprises" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Building className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Pour entreprises
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Solutions adaptées aux besoins des entreprises
              </h2>
              <p className="text-[#555555] mb-8">
                Bénéficiez de solutions globales pour équiper vos collaborateurs avec du matériel performant et une infrastructure fiable. Nos offres s'adaptent à la taille et aux spécificités de votre entreprise.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Équipement complet de vos postes de travail</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Gestion centralisée de votre parc informatique</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Support dédié et intervention rapide</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Demander un devis personnalisé
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/7ef530c6-e5ce-4e0e-8ea4-d258a8603fd8.png" 
                alt="Services pour entreprises" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Pour professionnels */}
      <section id="professionnels" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Briefcase className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Pour professionnels
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Offres spéciales pour indépendants et professionnels
              </h2>
              <p className="text-[#555555] mb-8">
                Profitez de solutions flexibles et économiques spécialement conçues pour les indépendants, auto-entrepreneurs et petites structures. Un équipement professionnel sans investissement lourd.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Forfaits adaptés aux petites structures</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Équipement premium à coût maîtrisé</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Assistance personnalisée et réactive</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Découvrir nos offres
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/3c11e566-72ff-4182-8628-3a147fc708ef.png" 
                alt="Services pour professionnels" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Formations */}
      <section id="formations" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <FileText className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Formations
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Programmes de formation pour vos équipes
              </h2>
              <p className="text-[#555555] mb-8">
                Optimisez l'adoption et l'utilisation de vos outils informatiques grâce à nos programmes de formation sur mesure. Des sessions adaptées à tous les niveaux pour une montée en compétence efficace.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Formations adaptées à tous les niveaux</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Sessions en présentiel ou à distance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Contenus personnalisés selon vos besoins</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Voir notre catalogue de formations
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/9a1919eb-054c-4be8-acb5-0a02b18696da.png" 
                alt="Formations informatiques" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Support technique */}
      <section id="support" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <HelpCircle className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Support technique
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Assistance technique dédiée et réactive
              </h2>
              <p className="text-[#555555] mb-8">
                Bénéficiez d'un support technique réactif et professionnel pour résoudre rapidement vos problèmes informatiques. Nos experts sont disponibles pour vous accompagner à chaque étape.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Support téléphonique, email et chat</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Intervention à distance ou sur site</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Temps de réponse garanti par contrat</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Contacter le support
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/95b23886-6036-4673-a2d8-fcee08de89b1.png" 
                alt="Support technique" 
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

export default ServicesPage;
