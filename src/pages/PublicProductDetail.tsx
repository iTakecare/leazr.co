
import React from 'react';
import { useParams } from 'react-router-dom';

const PublicProductDetail = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Détail du produit</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="h-80 bg-gray-200 rounded-md mb-4"></div>
            <div className="grid grid-cols-4 gap-2">
              <div className="h-20 bg-gray-300 rounded-md"></div>
              <div className="h-20 bg-gray-300 rounded-md"></div>
              <div className="h-20 bg-gray-300 rounded-md"></div>
              <div className="h-20 bg-gray-300 rounded-md"></div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Produit exemple</h2>
            <p className="text-gray-600 mb-4">
              ID du produit: {id}
            </p>
            <p className="font-bold text-2xl text-primary mb-4">100€</p>
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600">
                Description détaillée du produit...
              </p>
            </div>
            <button className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary/90">
              Ajouter au panier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProductDetail;
