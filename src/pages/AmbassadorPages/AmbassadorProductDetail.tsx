import React from 'react';
import { useParams } from 'react-router-dom';

const AmbassadorProductDetail = () => {
  const { productId } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Détail du produit</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          Détails du produit avec l'ID: {productId}
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Informations</h2>
            <p className="text-gray-600 mb-2">Nom: Produit exemple</p>
            <p className="text-gray-600 mb-2">Catégorie: Catégorie exemple</p>
            <p className="text-gray-600 mb-2">Prix: 100€</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-600">
              Description du produit...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorProductDetail;
