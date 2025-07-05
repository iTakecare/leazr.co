
import React from "react";
import UnifiedNavigation from "@/components/layout/UnifiedNavigation";

const HubPage = () => {
  return (
    <div className="bg-white min-h-screen flex flex-col overflow-x-hidden">
      <UnifiedNavigation />
      
      <div className="pt-[100px]">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8 text-center">Hub Central</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Plateforme Client</h3>
                <p className="text-gray-600 mb-4">Accédez à votre espace client pour gérer vos contrats et services.</p>
                <a 
                  href="/client/dashboard" 
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Accéder
                </a>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Plateforme Partenaire</h3>
                <p className="text-gray-600 mb-4">Espace dédié à nos partenaires pour collaborer sur des projets communs.</p>
                <a 
                  href="/partner/dashboard" 
                  className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  Accéder
                </a>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Espace Ambassadeur</h3>
                <p className="text-gray-600 mb-4">Portail pour nos ambassadeurs pour promouvoir nos solutions et services.</p>
                <a 
                  href="/ambassador/dashboard" 
                  className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                >
                  Accéder
                </a>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Catalogue de Produits</h3>
                <p className="text-gray-600 mb-4">Découvrez notre gamme complète de produits et solutions informatiques.</p>
                <a 
                  href="/catalog/anonymous" 
                  className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
                >
                  Parcourir
                </a>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Support Technique</h3>
                <p className="text-gray-600 mb-4">Besoin d'aide ? Notre équipe de support est là pour vous aider.</p>
                <a 
                  href="/contact" 
                  className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  Contacter
                </a>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">Administration</h3>
                <p className="text-gray-600 mb-4">Accès réservé aux administrateurs pour la gestion de la plateforme.</p>
                <a 
                  href="/dashboard" 
                  className="inline-block bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <footer className="bg-gray-800 text-white py-12 mt-20">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p>© {new Date().getFullYear()} Tous droits réservés</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HubPage;
