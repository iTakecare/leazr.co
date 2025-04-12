
import React from "react";
import Container from "@/components/layout/Container";

const TestimonialSection = () => {
  return (
    <section className="py-16 bg-gray-50">
      <Container maxWidth="custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ce que disent nos clients
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez les retours d'expérience de nos clients satisfaits de notre solution de leasing informatique reconditionné.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-white p-6 rounded-xl shadow-soft">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <img 
                  src="https://randomuser.me/api/portraits/women/45.jpg" 
                  alt="Sophie Martin" 
                  className="w-12 h-12 rounded-full"
                />
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-gray-900">Sophie Martin</h4>
                <p className="text-sm text-gray-600">Directrice, Agence Numérique</p>
              </div>
            </div>
            <div className="flex text-yellow-400 mb-3">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <p className="text-gray-700">
              "Nous sommes très satisfaits de la qualité du matériel et du service. Les équipements sont comme neufs et le support technique est toujours réactif. Une démarche écologique qui correspond parfaitement à nos valeurs."
            </p>
          </div>
          
          {/* Testimonial 2 */}
          <div className="bg-white p-6 rounded-xl shadow-soft">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <img 
                  src="https://randomuser.me/api/portraits/men/32.jpg" 
                  alt="Thomas Durand" 
                  className="w-12 h-12 rounded-full"
                />
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-gray-900">Thomas Durand</h4>
                <p className="text-sm text-gray-600">CEO, Startup Tech</p>
              </div>
            </div>
            <div className="flex text-yellow-400 mb-3">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <p className="text-gray-700">
              "Le passage au leasing de matériel reconditionné a été une excellente décision pour notre startup. Nous avons réduit nos coûts de 40% tout en offrant à nos équipes du matériel performant. Le service client est impeccable."
            </p>
          </div>
          
          {/* Testimonial 3 */}
          <div className="bg-white p-6 rounded-xl shadow-soft">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <img 
                  src="https://randomuser.me/api/portraits/women/68.jpg" 
                  alt="Lucie Bernard" 
                  className="w-12 h-12 rounded-full"
                />
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-gray-900">Lucie Bernard</h4>
                <p className="text-sm text-gray-600">Responsable IT, Cabinet Conseil</p>
              </div>
            </div>
            <div className="flex text-yellow-400 mb-3">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <p className="text-gray-700">
              "La solution iTakecare nous a permis de moderniser notre parc informatique tout en maîtrisant notre budget. Le service de remplacement rapide en cas de panne nous garantit une continuité parfaite de nos activités."
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default TestimonialSection;
