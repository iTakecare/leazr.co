
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, BoxSelect, TicketCheck, BarChart3, Shield, Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/layout/MainNavigation";
import HomeFooter from "@/components/home/HomeFooter";

const HubPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <MainNavigation />
      
      {/* Hero Section avec le même style que AboutPage */}
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
              Hub iTakecare
            </h1>
            <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
              backgroundColor: 'rgba(72, 181, 195, 0.2)', 
              color: '#48b5c3',
              fontWeight: 900
            }}>
              pour les entreprises
            </div>
            <p className="text-[#222222] text-xl md:text-xl max-w-3xl mx-auto">
              Votre espace centralisé pour une gestion informatique simplifiée. Gérez vos équipements, vos contrats et vos tickets en toute simplicité.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/signup">
                <Button className="bg-[#48b5c3] hover:bg-[#3da6b4] text-lg px-8 py-6 rounded-full">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#33638E] sm:text-4xl">
              Tout ce dont vous avez besoin, au même endroit
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Une plateforme unique pour gérer l'ensemble de votre infrastructure informatique, de la commande à la maintenance.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <BoxSelect className="h-6 w-6 text-white" />
                  </div>
                  Gestion des commandes
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Suivez vos commandes en temps réel et gérez vos équipements informatiques depuis une interface intuitive.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Attribution des équipements
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Assignez facilement les équipements à vos collaborateurs et gardez une trace de chaque attribution.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <TicketCheck className="h-6 w-6 text-white" />
                  </div>
                  Support technique
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Créez et suivez vos tickets de support directement depuis la plateforme pour une résolution rapide.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  Reporting et analytics
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Accédez à des tableaux de bord détaillés pour analyser l'utilisation et les coûts de votre parc informatique.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Sécurité et conformité
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Assurez la conformité de votre parc informatique et protégez vos données sensibles.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-[#48b5c3]">
                    <Boxes className="h-6 w-6 text-white" />
                  </div>
                  Gestion des stocks
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Optimisez votre inventaire et anticipez vos besoins en équipements informatiques.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#33638E]">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Prêt à simplifier votre gestion IT ?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Commencez dès aujourd'hui à utiliser Hub iTakecare gratuitement et découvrez comment simplifier la gestion de votre infrastructure informatique.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/signup">
                <Button className="bg-white text-[#33638E] hover:bg-gray-100 text-lg px-8 py-6 rounded-full">
                  Créer un compte gratuit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <HomeFooter />
    </div>
  );
};

export default HubPage;
