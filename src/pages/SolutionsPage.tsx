
import React from "react";
import { Monitor, Server, Globe, Recycle, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainNavigation from "@/components/layout/MainNavigation";
import Footer from "@/components/layout/Footer";

const SolutionsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-[#f8f8f6] to-[#edf7f9]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-[#33638E] mb-6">
              Solutions informatiques durables pour votre entreprise
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl">
              Découvrez nos solutions innovantes de location et gestion d'équipements informatiques, adaptées aux besoins des entreprises modernes et respectueuses de l'environnement.
            </p>
            <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-8 py-6 text-lg">
              Découvrir nos offres
            </Button>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-full h-20 bg-white" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
      </div>
      
      {/* Location d'équipement Section */}
      <section id="location" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Monitor className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Location d'équipement
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Notre service de location d'équipements informatiques vous permet d'accéder à du matériel performant sans investissement initial important. Flexible et adapté à vos besoins, notre offre inclut la maintenance et le support technique.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Matériel haut de gamme régulièrement mis à jour</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Contrats flexibles sans engagement de longue durée</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Service tout inclus : livraison, installation, support technique</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Découvrir nos offres de location <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png" 
                alt="Location d'équipement informatique" 
                className="rounded-xl shadow-lg w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Gestion de parc Section */}
      <section id="gestion-parc" className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Server className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Gestion de parc informatique
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Notre solution de gestion de parc informatique vous aide à optimiser l'utilisation et la maintenance de vos équipements. Nous prenons en charge l'inventaire, le suivi et la maintenance préventive pour une infrastructure toujours opérationnelle.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Inventaire complet et mise à jour en temps réel</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Surveillance proactive et maintenance préventive</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Tableaux de bord détaillés et rapports personnalisés</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                En savoir plus <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/bff07c1d-e89b-40bd-9f4b-f6a004580ae6.png" 
                alt="Gestion de parc informatique" 
                className="rounded-xl shadow-lg w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Services cloud Section */}
      <section id="cloud" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Globe className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Services cloud
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Nos solutions cloud offrent flexibilité, sécurité et performance pour vos applications et données. Que vous recherchiez une infrastructure cloud complète ou des services spécifiques, nous vous accompagnons dans votre transformation numérique.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Infrastructure sécurisée et évolutive</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Sauvegarde et récupération de données</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Solutions de collaboration et productivité</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Explorer nos services cloud <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/9a1919eb-054c-4be8-acb5-0a02b18696da.png" 
                alt="Services cloud" 
                className="rounded-xl shadow-lg w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Reconditionnement Section */}
      <section id="reconditionnement" className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Recycle className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Reconditionnement d'équipements
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Notre service de reconditionnement donne une seconde vie à vos équipements informatiques tout en réduisant l'impact environnemental. Nous récupérons, réparons et certifions vos appareils pour une utilisation prolongée ou une revente.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Reconditionnement professionnel et certifié</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Effacement sécurisé des données</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Réduction de l'empreinte carbone de votre entreprise</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Découvrir notre service <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/8d038f0d-17e4-4f5f-8ead-f7719343506f.png" 
                alt="Reconditionnement d'équipements" 
                className="rounded-xl shadow-lg w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Prêt à transformer votre infrastructure informatique ?
          </h2>
          <p className="text-lg mb-8 max-w-3xl mx-auto">
            Contactez nos experts pour discuter de vos besoins et découvrir comment nos solutions peuvent répondre à vos enjeux spécifiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="rounded-full bg-white text-[#33638E] hover:bg-gray-100 px-8 py-6 text-lg">
              Demander un devis
            </Button>
            <Button variant="outline" className="rounded-full border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
              Contacter un conseiller
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default SolutionsPage;
