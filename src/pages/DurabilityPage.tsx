import React, { useEffect } from 'react';
import UnifiedNavigation from '@/components/layout/UnifiedNavigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Share2, Recycle, Globe } from 'lucide-react';
import HomeFooter from '@/components/home/HomeFooter';
import Container from '@/components/layout/Container';

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
      
      {/* Hero Section - Styled like the About page */}
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
              Notre engagement pour une <span className="text-[#48b5c3]">IT durable</span>
            </h1>
            <div className="inline-block text-[#48b5c3] text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 rounded-lg py-2 px-8" style={{ 
              backgroundColor: 'rgba(29, 174, 219, 0.35)', 
              color: '#48b5c3',
              fontWeight: 900
            }}>
              pour notre planète
            </div>
            <p className="text-[#222222] text-xl md:text-xl max-w-3xl mx-auto">
              Découvrez comment iTakecare contribue à réduire l'impact environnemental du numérique 
              grâce au reconditionnement et à l'économie circulaire.
            </p>
          </div>
        </div>
      </div>

      {/* Notre engagement Section - with blur effect */}
      <section id="engagement" className="py-16 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Share2 className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Notre engagement</h2>
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
                src="https://images.unsplash.com/photo-1501854140801-50d01698950b" 
                alt="Notre engagement écologique" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
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
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Économie circulaire</h2>
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
                src="https://images.unsplash.com/photo-1581093588401-fbb62a02f120" 
                alt="Économie circulaire" 
                className="rounded-lg shadow-xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Impact environnemental Section - with blur effect */}
      <section id="impact" className="py-16 relative">
        <div className="absolute top-0 left-0 w-1/2 h-full z-0">
          <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] bg-[#48b5c3]/15 blur-[60px] rounded-full"></div>
        </div>
        
        <div className="w-full max-w-[1320px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <Globe className="w-16 h-16 text-[#48b5c3] mb-6" />
              <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-4">Impact environnemental</h2>
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
                src="https://images.unsplash.com/photo-1615729947596-a598e5de0ab3" 
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
          <h2 className="font-extrabold text-[#222222] text-4xl sm:text-5xl mb-12 text-center">Notre impact en chiffres</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">+5000</div>
              <p className="text-[#222222] text-lg">Équipements reconditionnés par an</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">-70%</div>
              <p className="text-[#222222] text-lg">De réduction d'émissions de CO2 par rapport au neuf</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
              <div className="text-[#48b5c3] text-5xl font-bold mb-4">99%</div>
              <p className="text-[#222222] text-lg">Des composants recyclés en fin de vie</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-transparent text-white">
        <Container maxWidth="custom">
          <div className="text-center relative">
            <div className="absolute inset-x-0 top-0 bottom-0 rounded-xl overflow-hidden z-0">
              <img src="/lovable-uploads/f3127226-39ba-4431-a251-f9b5cf02613d.png" alt="Fond turquoise" className="w-full h-full object-cover" />
            </div>
            
            <div className="relative z-10 py-16">
              <h2 className="text-[32px] md:text-[46px] font-bold mb-4">
                Prêt à rejoindre notre démarche 
                <br />
                <span className="bg-[#33949F]/40 px-4 py-1 rounded-lg text-slate-950">durable</span> ?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
                Ensemble, réduisons notre impact environnemental tout en optimisant votre infrastructure informatique.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Button className="bg-[#33949F] hover:bg-[#2C8089] text-white font-bold rounded-full px-8 py-3 h-auto">
                  Découvrir nos offres
                </Button>
                <Button variant="outline" className="bg-white hover:bg-gray-100 text-gray-800 font-bold border-none rounded-full px-8 py-3 h-auto">
                  Nous contacter
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <HomeFooter />
    </div>
  );
};

export default DurabilityPage;
