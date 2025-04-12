
import React from "react";
import { Check } from "lucide-react";
import Container from "@/components/layout/Container";

const FeatureSection = () => {
  return (
    <section className="py-16 bg-white">
      <Container maxWidth="custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            La solution complète pour votre parc informatique
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choisissez une approche écoresponsable sans compromis sur la qualité 
            et bénéficiez d'un service tout compris.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-xl shadow-soft hover:shadow-md transition-shadow duration-300">
            <div className="w-14 h-14 bg-[#48B5C3]/10 rounded-lg flex items-center justify-center mb-5">
              <img 
                src="/lovable-uploads/73661021-af85-4ce5-925d-701c27282221.png" 
                alt="Equipment" 
                className="w-8 h-8"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Matériel reconditionné haut de gamme
            </h3>
            <p className="text-gray-600 mb-4">
              Des équipements professionnels soigneusement sélectionnés et remis à neuf selon des normes rigoureuses.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Garantie complète pendant toute la durée du contrat</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Appareils testés et certifiés</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Économies significatives par rapport au neuf</span>
              </li>
            </ul>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-xl shadow-soft hover:shadow-md transition-shadow duration-300">
            <div className="w-14 h-14 bg-[#48B5C3]/10 rounded-lg flex items-center justify-center mb-5">
              <img 
                src="/lovable-uploads/1c9b904d-1c96-4dff-994c-4daaf6fd3ec1.png" 
                alt="Service" 
                className="w-8 h-8"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Service tout compris et sans souci
            </h3>
            <p className="text-gray-600 mb-4">
              Un accompagnement complet pour simplifier la gestion de votre parc informatique.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Support technique illimité</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Remplacement sous 24h en cas de panne</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Mise à jour et maintenance régulières</span>
              </li>
            </ul>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-xl shadow-soft hover:shadow-md transition-shadow duration-300">
            <div className="w-14 h-14 bg-[#48B5C3]/10 rounded-lg flex items-center justify-center mb-5">
              <img 
                src="/lovable-uploads/1d3ac6e1-5c24-4197-af4f-5aa8f2dd014b.png" 
                alt="Eco" 
                className="w-8 h-8"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Engagement environnemental concret
            </h3>
            <p className="text-gray-600 mb-4">
              Une démarche responsable qui réduit l'impact environnemental de votre entreprise.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Réduction significative de l'empreinte carbone</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Lutte contre l'obsolescence programmée</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 text-green-500 mr-2">
                  <Check size={18} />
                </span>
                <span className="text-gray-600 text-sm">Bilan carbone positif documenté</span>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FeatureSection;
