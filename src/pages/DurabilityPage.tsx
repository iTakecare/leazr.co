
import React, { useEffect } from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Share2, Recycle, Globe } from 'lucide-react';
import HomeFooter from '@/components/home/HomeFooter';

const DurabilityPage = () => {
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
            Notre engagement pour une <span className="text-[#48b5c3]">IT durable</span>
          </h1>
          <p className="text-[#222222] text-lg max-w-3xl mx-auto mb-8">
            Découvrez comment iTakecare contribue à réduire l'impact environnemental du numérique grâce au reconditionnement et à l'économie circulaire.
          </p>
          <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold text-lg px-8 py-6">
            Découvrir notre approche
          </Button>
        </div>
      </div>

      {/* Notre engagement Section */}
      <section id="engagement" className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Share2 className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Notre engagement</h2>
              <p className="text-[#222222] text-lg mb-6">
                Notre mission pour un numérique responsable.
                Nous nous engageons à réduire l'impact environnemental du numérique en proposant des solutions durables et responsables.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Prolonger la durée de vie des équipements informatiques</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Réduire les déchets électroniques</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Promouvoir une consommation responsable</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                En savoir plus sur notre mission
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/lovable-uploads/e054083d-ed0f-49f5-ba69-fb357e8af592.png" 
                alt="Notre engagement" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Économie circulaire Section */}
      <section id="economie-circulaire" className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <Recycle className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Économie circulaire</h2>
              <p className="text-[#222222] text-lg mb-6">
                Comment nous contribuons à l'économie circulaire.
                Notre approche s'inscrit dans une démarche d'économie circulaire pour réduire l'utilisation de ressources naturelles.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Reconditionnement professionnel des équipements</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Recyclage responsable en fin de vie</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Réutilisation des composants encore fonctionnels</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Découvrir notre processus de reconditionnement
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/computer.png" 
                alt="Économie circulaire" 
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Impact environnemental Section */}
      <section id="impact" className="py-16 bg-gray-50">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Globe className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-bold text-[#222222] text-3xl mb-4">Impact environnemental</h2>
              <p className="text-[#222222] text-lg mb-6">
                Nos actions pour réduire l'empreinte environnementale.
                Nous mesurons et réduisons continuellement l'impact environnemental de nos activités.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Réduction des émissions de CO2</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Économie de ressources naturelles</span>
                </li>
                <li className="flex items-start">
                  <span className="text-lg mr-2 mt-0.5">✅</span>
                  <span className="text-[#222222]">Diminution des déchets électroniques</span>
                </li>
              </ul>
              <Button className="bg-[#48b5c3] hover:bg-[#33638E] rounded-[50px] font-bold">
                Consulter notre rapport d'impact
              </Button>
            </div>
            <div className="md:w-1/2">
              <img 
                src="/clip-path-group.png" 
                alt="Impact environnemental" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Statistiques Section */}
      <section className="py-16">
        <div className="w-full max-w-[1320px] mx-auto px-4">
          <h2 className="font-bold text-[#222222] text-3xl mb-12 text-center">Notre impact en chiffres</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">+5000</div>
              <p className="text-[#222222] text-lg">Équipements reconditionnés par an</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">-70%</div>
              <p className="text-[#222222] text-lg">De réduction d'émissions de CO2 par rapport au neuf</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">99%</div>
              <p className="text-[#222222] text-lg">Des composants recyclés en fin de vie</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#33638E] text-white">
        <div className="w-full max-w-[1320px] mx-auto px-4 text-center">
          <h2 className="font-bold text-3xl mb-6">Rejoignez notre démarche écologique</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            En choisissant iTakecare, vous participez activement à la réduction de l'impact environnemental du numérique.
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

export default DurabilityPage;
