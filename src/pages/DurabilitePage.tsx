
import React from "react";
import { Share2, Recycle, Globe, Heart, Leaf, BarChart, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainNavigation from "@/components/layout/MainNavigation";
import Footer from "@/components/layout/Footer";

const DurabilitePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-[#f8f8f6] to-[#edf7f9]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold text-[#33638E] mb-6">
              Notre engagement pour un numérique responsable
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl">
              Découvrez comment iTakecare concilie performance technologique et respect de l'environnement à travers nos initiatives durables et nos engagements concrets.
            </p>
            <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-8 py-6 text-lg">
              Découvrir nos actions
            </Button>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-full h-20 bg-white" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
      </div>
      
      {/* Notre engagement Section */}
      <section id="engagement" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Share2 className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Notre engagement
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Chez iTakecare, nous sommes convaincus que le numérique peut et doit être plus responsable. Notre mission est de proposer des solutions technologiques innovantes tout en minimisant leur impact environnemental et en maximisant leur impact social positif.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Prolonger la durée de vie des équipements informatiques</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Promouvoir l'économie circulaire dans le secteur IT</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Réduire les émissions de carbone liées au numérique</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Notre charte éthique <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/5677be0b-0218-4a20-be93-ce2a5303184c.png" 
                alt="Engagement écologique" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Économie circulaire Section */}
      <section id="economie-circulaire" className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Recycle className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Économie circulaire
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Notre modèle d'économie circulaire vise à maximiser l'utilisation des ressources et à réduire les déchets électroniques. Grâce à nos services de location, de reconditionnement et de recyclage, nous contribuons à créer un cycle de vie plus durable pour les équipements informatiques.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Seconde vie pour les équipements via le reconditionnement</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Recyclage responsable des composants en fin de vie</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Réduction de l'extraction de nouvelles ressources</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Découvrir notre processus <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/77cb8f7a-a865-497e-812d-e04c6d5c9160.png" 
                alt="Économie circulaire" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Impact environnemental Section */}
      <section id="impact" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <Globe className="h-7 w-7 text-[#48b5c3] mr-3" />
                <h2 className="text-2xl md:text-3xl font-bold text-[#33638E]">
                  Impact environnemental
                </h2>
              </div>
              <p className="text-gray-700 mb-6">
                Nous mesurons et cherchons constamment à réduire l'empreinte environnementale de nos activités et de celles de nos clients. Notre approche holistique prend en compte l'ensemble du cycle de vie des produits, de leur conception à leur fin de vie.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Réduction des émissions de CO2 liées au numérique</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Optimisation de la consommation énergétique</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-[#48b5c3] mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">Diminution des déchets électroniques (e-waste)</p>
                </div>
              </div>
              <Button className="rounded-full bg-[#48b5c3] hover:bg-[#3da6b4] text-white px-6">
                Voir notre rapport d'impact <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/56939bad-b11e-421e-8dca-13f8a485973b.png" 
                alt="Impact environnemental" 
                className="rounded-xl shadow-lg w-full object-cover" 
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Nos chiffres */}
      <section className="py-16 md:py-24 bg-[#f8f8f6]">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#33638E] text-center mb-12">
            Notre impact en chiffres
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Recycle className="h-10 w-10 text-[#48b5c3]" />
              </div>
              <div className="text-4xl font-bold text-[#33638E] mb-2">15 000+</div>
              <p className="text-gray-700">Équipements reconditionnés chaque année</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Leaf className="h-10 w-10 text-[#48b5c3]" />
              </div>
              <div className="text-4xl font-bold text-[#33638E] mb-2">1 200 t</div>
              <p className="text-gray-700">Émissions de CO₂ évitées</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-10 w-10 text-[#48b5c3]" />
              </div>
              <div className="text-4xl font-bold text-[#33638E] mb-2">500+</div>
              <p className="text-gray-700">Entreprises accompagnées vers un IT plus durable</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-10 w-10 text-[#48b5c3]" />
              </div>
              <div className="text-4xl font-bold text-[#33638E] mb-2">-30%</div>
              <p className="text-gray-700">Réduction moyenne de l'empreinte carbone IT de nos clients</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Certifications */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#33638E] text-center mb-12">
            Nos certifications et partenariats
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            <img src="/lovable-uploads/481ee77e-2767-4044-b4dd-801e1b70036a.png" alt="Certification 1" className="mx-auto h-20 object-contain" />
            <img src="/lovable-uploads/160cd577-8857-4349-a871-cd898da7f954.png" alt="Certification 2" className="mx-auto h-20 object-contain" />
            <img src="/lovable-uploads/3dc2ebd7-79c6-4602-bb0e-8b98763f871a.png" alt="Certification 3" className="mx-auto h-20 object-contain" />
            <img src="/lovable-uploads/5c6e8763-e237-4646-96d9-c54a63bf6893.png" alt="Certification 4" className="mx-auto h-20 object-contain" />
            <img src="/lovable-uploads/84d56be2-f9c6-47ac-b155-b269343646ce.png" alt="Certification 5" className="mx-auto h-20 object-contain" />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Prêts à adopter des solutions IT plus durables ?
          </h2>
          <p className="text-lg mb-8 max-w-3xl mx-auto">
            Rejoignez les entreprises qui transforment leur impact environnemental grâce à nos solutions informatiques responsables.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="rounded-full bg-white text-[#33638E] hover:bg-gray-100 px-8 py-6 text-lg">
              Demander un audit
            </Button>
            <Button variant="outline" className="rounded-full border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
              Contacter un expert
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default DurabilitePage;
