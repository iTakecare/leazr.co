
import React from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import HomeFooter from '@/components/home/HomeFooter';

const AboutPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <UnifiedNavigation />
      
      {/* Hero Section with same background as homepage */}
      <div className="flex flex-col min-h-[60vh] items-center gap-6 md:gap-10 py-4 md:py-10 relative">
        {/* Background image - same as homepage */}
        <div className="flex flex-col w-full h-[60vh] items-start gap-2.5 absolute top-0 left-0">
          <img
            className="relative w-full h-[60vh] object-cover"
            alt="Background"
            src="/clip-path-group.png"
            width="1920" 
            height="1080"
          />
          {/* Gradient fade to white overlay */}
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative w-full max-w-[1320px] mx-auto px-4 py-20 text-center z-10 mt-12">
          <div className="text-center">
            <h1 className="font-black text-[#222222] text-3xl sm:text-4xl md:text-5xl leading-tight mb-6">
              <span className="text-[#33638E]">iTakecare</span> - L'IT réinventé
            </h1>
            <div className="inline-block text-[#48b5c3] text-3xl sm:text-4xl md:text-5xl font-bold mb-8 rounded-full py-2 px-8" style={{ 
              backgroundColor: 'rgba(135, 206, 235, 0.2)',
              color: '#48b5c3'
            }}>
              pour les entreprises
            </div>
            <p className="text-[#222222] text-lg max-w-3xl mx-auto">
              Trop d'entreprises immobilisent leur trésorerie dans du matériel qui devient vite obsolète. Chez 
              iTakecare, nous avons voulu changer cela. Notre solution ? Un modèle de leasing intelligent qui vous 
              permet d'avoir un équipement toujours à jour, sans surprise et sans surcoût.
            </p>
          </div>
        </div>
      </div>

      {/* Notre histoire Section */}
      <section className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Notre histoire</h2>
              <p className="text-[#222222] text-lg mb-6">
                iTakecare est né de la conviction que l'informatique peut être à la fois performante, accessible et écologique. 
                Fondée en 2018, notre entreprise s'est donnée pour mission de réinventer la façon dont les organisations 
                acquièrent et gèrent leur équipement informatique.
              </p>
              <p className="text-[#222222] text-lg mb-6">
                Face au gaspillage électronique croissant et aux défis environnementaux, nous avons développé un modèle 
                innovant basé sur le reconditionnement professionnel et la location d'équipements de qualité.
              </p>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir notre parcours
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
                alt="Notre histoire" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Notre fondateur Section - Reprenant la section "La personne derrière iTakecare" de l'image */}
      <section className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <h2 className="font-bold text-[#222222] text-3xl mb-8">La personne derrière iTakecare ?</h2>
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
                qualité, intégrer la maintenance et la garantie, dans un système de « pack » avec une 
                seule mensualité, tout inclus et surtout sans surprise. Pour lui, cela permet à ses clients 
                d'avoir l'esprit tranquille, dès qu'il s'agit de penser à leur informatique... Fini tout cela, ils 
                gèrent leur entreprise, iTakecare met ses compétences à leur service.
              </p>
            </div>
            <div className="md:w-1/3">
              <img 
                src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
                alt="Gianni, fondateur d'iTakecare" 
                className="rounded-full shadow-xl w-64 h-64 object-cover mx-auto"
              />
              <div className="text-center mt-4">
                <h3 className="font-bold text-[#222222] text-xl">Gianni Sergi</h3>
                <p className="text-[#48b5c3]">Fondateur d'iTakecare</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos valeurs Section */}
      <section className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <h2 className="font-bold text-[#222222] text-3xl mb-12 text-center">Nos valeurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="font-bold text-[#48b5c3] text-xl mb-4">Fiabilité</h3>
              <p className="text-[#222222]">
                Du matériel testé et garanti, prêt à l'emploi. 
                Nous nous engageons à fournir des équipements de qualité et un service irréprochable.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="font-bold text-[#48b5c3] text-xl mb-4">Simplicité</h3>
              <p className="text-[#222222]">
                Un service clé en main pour un IT sans prise de tête.
                Nous simplifions la gestion informatique pour que vous puissiez vous concentrer sur votre cœur de métier.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="font-bold text-[#48b5c3] text-xl mb-4">Écoresponsabilité</h3>
              <p className="text-[#222222]">
                Une solution durable qui limite le gaspillage électronique.
                Nous contribuons activement à réduire l'impact environnemental du numérique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La presse Section */}
      <section className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex items-baseline mb-12">
            <h2 className="font-bold text-[#222222] text-3xl">La presse</h2>
            <span className="ml-4 text-[#48b5c3] text-2xl font-medium">parlent de nous</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <img 
              src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
              alt="Logo presse 1" 
              className="h-16 object-contain grayscale hover:grayscale-0 transition-all"
            />
            <img 
              src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
              alt="Logo presse 2" 
              className="h-16 object-contain grayscale hover:grayscale-0 transition-all"
            />
            <img 
              src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
              alt="Logo presse 3" 
              className="h-16 object-contain grayscale hover:grayscale-0 transition-all"
            />
            <img 
              src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
              alt="Logo presse 4" 
              className="h-16 object-contain grayscale hover:grayscale-0 transition-all"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="w-full max-w-[1320px] mx-auto px-4 text-center">
          <h2 className="font-bold text-3xl mb-6">Rejoignez la révolution IT</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Découvrez comment iTakecare peut transformer votre approche de l'équipement informatique.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-[#33638E] hover:bg-gray-100 rounded-[50px] font-bold">
              Découvrir nos offres
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

export default AboutPage;
