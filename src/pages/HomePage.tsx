
import React from 'react';
import { Layout } from '@/components/layout/Layout';

const HomePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bienvenue sur iTakecare</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Catalogue de produits</h2>
          <p className="text-gray-600 mb-4">
            Découvrez notre sélection de produits informatiques et de solutions écologiques.
          </p>
          <a href="/produits" className="text-primary hover:underline">
            Voir le catalogue →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Offres personnalisées</h2>
          <p className="text-gray-600 mb-4">
            Des solutions sur mesure pour les besoins spécifiques de votre entreprise.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Accéder au tableau de bord →
          </a>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Services et support</h2>
          <p className="text-gray-600 mb-4">
            Un accompagnement complet pour tous vos besoins informatiques.
          </p>
          <a href="/contact" className="text-primary hover:underline">
            Nous contacter →
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
