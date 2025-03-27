
import React from "react";
import { BriefcaseIcon, HeartIcon, DollarSignIcon, ClockIcon, ShieldCheckIcon } from "lucide-react";

const ProductBenefits = () => {
  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold mb-6">La location pour entreprises de Apple MacBook Air M4 15"</h2>
      
      <p className="text-gray-700 mb-4">
        En optant pour la location d'un Apple MacBook Air M4 15" avec une offre complète de services, vous faites le choix d'une solution 
        flexible et économique, pensée pour répondre aux besoins de votre entreprise. Contrairement à l'achat, cette formule vous permet 
        de maîtriser vos coûts et d'éviter les dépenses imprévues liées à l'utilisation et à l'entretien de vos appareils.
      </p>
      
      <p className="text-gray-700 mb-4">
        Grâce à Valaia, la location longue durée inclut bien plus que le simple accès à un appareil de dernière génération. Elle s'accompagne 
        de services premium : logiciel de gestion de flotte gratuit, assistance technique, remplacement rapide en cas de dommage, et une 
        couverture financière complète des éventuels incidents. Cette approche permet à votre entreprise de se concentrer sur l'essentiel, 
        tout en bénéficiant d'un équipement toujours opérationnel et à jour.
      </p>
      
      <p className="text-gray-700 mb-8">
        Équipez vos collaborateurs sans impacter lourdement votre trésorerie et profitez d'une solution conçue pour optimiser vos 
        ressources. Avec Valaia, vous investissez dans la tranquillité d'esprit et la performance.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="flex items-start">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <DollarSignIcon className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Adieu...</h3>
            <p className="text-gray-600">Les problèmes liés au financement de mon matériel informatique</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <BriefcaseIcon className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Ciao...</h3>
            <p className="text-gray-600">Les coûts cachés liés à l'acquisition de ma flotte d'entreprise</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <HeartIcon className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Adiós...</h3>
            <p className="text-gray-600">Le manque de flexibilité dans le choix de ce que je peux offrir à mon équipe</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <ClockIcon className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Tschüss...</h3>
            <p className="text-gray-600">Les pertes de temps liées aux appareils obsolètes</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <ShieldCheckIcon className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Goodbye...</h3>
            <p className="text-gray-600">Les appareils qui dorment dans mes placards</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductBenefits;
