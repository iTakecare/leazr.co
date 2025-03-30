
import React from "react";
import { Link } from "react-router-dom";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import Container from "@/components/layout/Container";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <Container className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Solutions professionnelles pour votre entreprise
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Découvrez notre catalogue complet d'équipements et de services pour optimiser votre environnement de travail.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/catalogue" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Explorer le catalogue
            </Link>
            <Link 
              to="/signup-business" 
              className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Créer un compte entreprise
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-3">Location d'équipement</h3>
              <p className="text-gray-600">Solutions flexibles pour équiper vos équipes avec du matériel performant.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-3">Services cloud</h3>
              <p className="text-gray-600">Infrastructure et solutions cloud sécurisées pour votre entreprise.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-3">Support et maintenance</h3>
              <p className="text-gray-600">Assistance technique et SAV pour assurer la continuité de votre activité.</p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Home;
