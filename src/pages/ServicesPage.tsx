
import React from "react";
import { Building, Briefcase, FileText, HelpCircle, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainNavigation from "@/components/layout/MainNavigation";
import Footer from "@/components/layout/Footer";

const ServicesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-[#f8f8f6] to-[#edf7f9]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-[#33638E] mb-6">
              Des services adaptés à vos besoins professionnels
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl">
              Découvrez notre gamme complète de services informatiques conçus pour répondre aux défis spécifiques des entreprises et des professionnels d'aujourd'hui.
            </p>
            <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-8 py-6 text-lg">
              Découvrir nos services
            </Button>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-full h-20 bg-white" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
      </div>
      
      {/* Pour entreprises Section */}
      <section id="entreprises" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Building className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Pour entreprises
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Nos solutions d'entreprise offrent une approche intégrée pour la gestion de votre infrastructure informatique. De la planification stratégique à la mise en œuvre et au support continu, nous sommes votre partenaire technologique de confiance.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Solutions personnalisées pour entreprises de toutes tailles</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Gestion complète de l'infrastructure informatique</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Optimisation des coûts et de la performance</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Découvrir nos solutions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/073e7dbf-ca5c-4daf-b802-7f6b7ac52c8d.png" 
                alt="Services pour entreprises" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Pour professionnels Section */}
      <section id="professionnels" className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Briefcase className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Pour professionnels
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Nos offres pour professionnels indépendants et petites structures sont conçues pour vous offrir des solutions technologiques de qualité à des prix accessibles, vous permettant de vous concentrer sur votre cœur de métier.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Équipements et services adaptés aux besoins des indépendants</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Formules flexibles sans engagement de longue durée</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Support dédié et réactif</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Découvrir nos offres <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/11107b44-8240-43a0-8cf0-94d458195fa9.png" 
                alt="Services pour professionnels" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Formations Section */}
      <section id="formations" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <FileText className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Formations
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Nos programmes de formation sont conçus pour développer les compétences numériques de vos équipes. Personnalisables et pratiques, ils permettent une montée en compétence rapide sur les outils et technologies essentiels à votre activité.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Formations sur mesure adaptées à vos besoins spécifiques</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Formateurs experts dans leur domaine</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Sessions flexibles en présentiel ou à distance</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Voir notre catalogue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/1f643a3f-c6aa-432c-95a1-ed0cde4490a6.png" 
                alt="Formations informatiques" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Support technique Section */}
      <section id="support" className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <HelpCircle className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Support technique
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Notre équipe de support technique est disponible pour résoudre rapidement vos problèmes informatiques et minimiser les interruptions de votre activité. Un accompagnement proactif et réactif pour garantir la continuité de vos opérations.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Assistance rapide et professionnelle</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Maintenance préventive et résolution des incidents</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Support multicanal : téléphone, email, chat</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Contacter le support <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/95b23886-6036-4673-a2d8-fcee08de89b1.png" 
                alt="Support technique" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#33638E] text-center mb-12">
            Ce que nos clients disent de nos services
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#f8f8f6] p-6 rounded-xl">
              <p className="text-gray-700 mb-6 italic">
                "L'équipe d'iTakecare a complètement transformé notre infrastructure informatique. Leur service de location nous a permis d'accéder à des équipements de qualité sans impacter lourdement notre trésorerie."
              </p>
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/9d44b5f8-4a64-40e3-a368-207f0f45a360.png" 
                  alt="Portrait de client" 
                  className="w-12 h-12 rounded-full mr-4" 
                />
                <div>
                  <p className="font-medium">Sophie Martin</p>
                  <p className="text-sm text-gray-500">Directrice, PME Tech</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#f8f8f6] p-6 rounded-xl">
              <p className="text-gray-700 mb-6 italic">
                "Le support technique est incroyablement réactif. Chaque fois que nous avons eu un problème, l'équipe a répondu rapidement et efficacement, minimisant l'impact sur notre activité."
              </p>
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/1d3ac6e1-5c24-4197-af4f-5aa8f2dd014b.png" 
                  alt="Portrait de client" 
                  className="w-12 h-12 rounded-full mr-4" 
                />
                <div>
                  <p className="font-medium">Thomas Dubois</p>
                  <p className="text-sm text-gray-500">Responsable IT, Entreprise Média</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#f8f8f6] p-6 rounded-xl">
              <p className="text-gray-700 mb-6 italic">
                "En tant qu'indépendant, j'apprécie les solutions flexibles d'iTakecare. Leur offre pour professionnels correspond parfaitement à mes besoins, avec un excellent rapport qualité-prix."
              </p>
              <div className="flex items-center">
                <img 
                  src="/lovable-uploads/1de3ae2f-1f17-488b-94da-a18c63f4da87.png" 
                  alt="Portrait de client" 
                  className="w-12 h-12 rounded-full mr-4" 
                />
                <div>
                  <p className="font-medium">Julie Leroux</p>
                  <p className="text-sm text-gray-500">Consultante indépendante</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Besoin d'un service sur mesure pour votre activité ?
          </h2>
          <p className="text-lg mb-8 max-w-3xl mx-auto">
            Nos experts sont à votre disposition pour comprendre vos enjeux et vous proposer une solution adaptée à vos besoins spécifiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="rounded-full bg-white text-[#33638E] hover:bg-gray-100 px-8 py-6 text-lg">
              Demander un devis
            </Button>
            <Button variant="outline" className="rounded-full border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
              Prendre rendez-vous
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default ServicesPage;
