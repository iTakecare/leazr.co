
import React from 'react';
import { Layout } from '@/components/layout/Layout';

const DashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tableau de bord</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Activités récentes</h2>
          <div className="text-gray-600">
            <p>Aucune activité récente à afficher.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Commandes en cours</h2>
          <div className="text-gray-600">
            <p>Aucune commande en cours.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
