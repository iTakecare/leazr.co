
import React from "react";
import { Link } from "react-router-dom";

const Index = () => {
  // Simple direct console log for debugging
  console.log("Index component rendering");
  
  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      {/* Basic Header */}
      <header className="w-full py-4 px-6 flex items-center justify-between bg-white shadow-sm">
        <div>
          <img
            src="/lovable-uploads/f7574869-dbb7-4c4e-a51e-a5e14608acb2.png"
            alt="iTakecare Logo"
            className="w-24 h-auto"
          />
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li><Link to="/" className="text-gray-800 hover:text-[#42B6C5]">Accueil</Link></li>
            <li><Link to="/catalogue" className="text-gray-800 hover:text-[#42B6C5]">Catalogue</Link></li>
            <li><Link to="/contact" className="text-gray-800 hover:text-[#42B6C5]">Contact</Link></li>
          </ul>
        </nav>
      </header>
      
      {/* Simplified Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 mb-10 lg:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Leasing de matériel informatique{" "}
              <span className="text-[#42B6C5]">Reconditionné</span>
            </h1>
            
            <p className="text-lg mb-8">
              Optez pour un parc informatique performant et écoresponsable
            </p>
            
            <Link 
              to="/catalogue" 
              className="bg-[#42B6C5] hover:bg-[#389aa7] text-white rounded-full px-6 py-3 inline-block"
            >
              Découvrir le catalogue
            </Link>
          </div>
          
          <div className="lg:w-1/2 flex justify-center">
            <img 
              src="/lovable-uploads/10277032-6bec-4f1c-a1b5-884fb4f2a2ce.png" 
              alt="MacBook" 
              className="w-full max-w-md"
            />
          </div>
        </div>
      </div>
      
      {/* Simple features section */}
      <div className="w-full bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Nos Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Qualité certifiée</h3>
              <p>Matériel reconditionné de qualité avec garantie complète.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Formules adaptées</h3>
              <p>Solutions de leasing sur-mesure avec services inclus.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Empreinte réduite</h3>
              <p>Réduction de votre empreinte carbone grâce à l'économie circulaire.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
