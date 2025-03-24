
import React from "react";

const CRM = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Gestion des Relations Clients</h1>
      <p className="mb-6">
        Interface de gestion des relations clients et partenaires.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Ambassadeurs</h2>
          <p className="text-gray-600 mb-4">Gérez votre réseau d'ambassadeurs et consultez leurs performances.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Voir les ambassadeurs
          </button>
        </div>

        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Partenaires</h2>
          <p className="text-gray-600 mb-4">Suivez vos partenaires commerciaux et leurs activités.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Voir les partenaires
          </button>
        </div>

        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Clients</h2>
          <p className="text-gray-600 mb-4">Accédez à la base de données clients et gérez les informations.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Voir les clients
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRM;
