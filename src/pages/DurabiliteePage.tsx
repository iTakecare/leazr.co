
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";
import HomeFooter from "@/components/home/HomeFooter";
import CtaSection from "@/components/home/CtaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Recycle, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const DurabiliteePage = () => {
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
              Durabilité
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-[#222222] mb-6">
              Notre engagement pour un numérique responsable
            </h1>
            <p className="text-lg text-[#555555] mb-8">
              Découvrez comment iTakecare intègre la durabilité au cœur de son modèle d'affaires, avec des solutions informatiques écoresponsables qui réduisent l'impact environnemental.
            </p>
            <Button 
              className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-8 py-3 text-base font-semibold"
            >
              Découvrir notre impact
            </Button>
          </div>
        </div>
      </div>
      
      {/* Section Notre engagement */}
      <section id="engagement" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Share2 className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Notre engagement
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Notre mission pour un numérique responsable
              </h2>
              <p className="text-[#555555] mb-8">
                Chez iTakecare, nous croyons qu'il est possible de concilier performance technologique et respect de l'environnement. Notre mission est de transformer le secteur informatique en proposant des solutions durables et accessibles.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Réduction de l'empreinte carbone des entreprises</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Prolongation de la durée de vie des équipements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Sensibilisation aux enjeux du numérique responsable</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                En savoir plus sur notre vision
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/9d44b5f8-4a64-40e3-a368-207f0f45a360.png" 
                alt="Notre engagement" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Économie circulaire */}
      <section id="economie-circulaire" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Recycle className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Économie circulaire
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Comment nous contribuons à l'économie circulaire
              </h2>
              <p className="text-[#555555] mb-8">
                Notre modèle d'affaires s'inscrit pleinement dans l'économie circulaire, en donnant une seconde vie aux équipements informatiques et en optimisant leur utilisation tout au long de leur cycle de vie.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Reconditionnement professionnel de matériel premium</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Réutilisation des composants et matériaux</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Gestion responsable de la fin de vie des produits</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Découvrir notre processus
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/7e711eae-90de-40ce-806c-21ffa5c9d7b6.png" 
                alt="Économie circulaire" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Impact environnemental */}
      <section id="impact" className="py-20 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/2">
              <div className="flex items-center mb-4">
                <Globe className="text-[#48b5c3] w-6 h-6 mr-3" />
                <Badge className="bg-[#48b5c34f] text-[#48b5c3] px-3 py-1 text-sm font-medium rounded-full">
                  Impact environnemental
                </Badge>
              </div>
              <h2 className="text-3xl font-bold text-[#222222] mb-6">
                Nos actions pour réduire l'empreinte environnementale
              </h2>
              <p className="text-[#555555] mb-8">
                Nous prenons des mesures concrètes pour minimiser notre impact environnemental, de la réduction des déchets électroniques à l'optimisation de notre chaîne logistique en passant par des partenariats responsables.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Diminution de 80% des déchets électroniques</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Réduction de 70% des émissions de CO2 par appareil</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#48b5c3] mr-3">✓</span>
                  <span>Emballages recyclés et recyclables à 100%</span>
                </li>
              </ul>
              <Button 
                className="bg-[#48b5c3] hover:bg-[#33638E] rounded-full text-white px-6 py-2"
              >
                Consulter notre rapport d'impact
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/lovable-uploads/aa41f092-7d73-4917-9bb9-78e029f4a786.png" 
                alt="Impact environnemental" 
                className="w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Section Chiffres clés */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#222222] mb-12">
            Notre impact en chiffres
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">12 500+</div>
              <h3 className="text-xl font-semibold text-[#222222] mb-3">Appareils reconditionnés</h3>
              <p className="text-[#555555]">Équipements remis en circulation chaque année</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">-70%</div>
              <h3 className="text-xl font-semibold text-[#222222] mb-3">Empreinte carbone</h3>
              <p className="text-[#555555]">Par rapport à l'achat de matériel neuf</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">98%</div>
              <h3 className="text-xl font-semibold text-[#222222] mb-3">Taux de recyclage</h3>
              <p className="text-[#555555]">Des composants en fin de vie</p>
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

export default DurabiliteePage;
