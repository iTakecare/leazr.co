
import React from 'react';

const PublicCatalog = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Catalogue de produits</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p className="text-gray-600">
          Découvrez notre sélection de produits informatiques écologiques.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Produits exemple */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="h-40 bg-gray-200 rounded-md mb-3"></div>
          <h3 className="font-semibold mb-1">Produit 1</h3>
          <p className="text-gray-600 text-sm mb-2">Description courte du produit...</p>
          <p className="font-bold text-primary">100€</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="h-40 bg-gray-200 rounded-md mb-3"></div>
          <h3 className="font-semibold mb-1">Produit 2</h3>
          <p className="text-gray-600 text-sm mb-2">Description courte du produit...</p>
          <p className="font-bold text-primary">150€</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="h-40 bg-gray-200 rounded-md mb-3"></div>
          <h3 className="font-semibold mb-1">Produit 3</h3>
          <p className="text-gray-600 text-sm mb-2">Description courte du produit...</p>
          <p className="font-bold text-primary">200€</p>
        </div>
      </div>
    </div>
  );
};

export default PublicCatalog;
