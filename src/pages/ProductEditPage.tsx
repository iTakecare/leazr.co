
import React from 'react';
import { useParams } from 'react-router-dom';

const ProductEditPage = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Édition du produit</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          Édition du produit avec l'ID: {id}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du produit
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nom du produit"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Description du produit"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2">
            <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
              Annuler
            </button>
            <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEditPage;
