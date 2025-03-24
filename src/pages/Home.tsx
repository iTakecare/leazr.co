
import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Bienvenue sur iTakecare</h1>
      <p className="mb-6">Plateforme de gestion d'offres et de contrats</p>
      <div className="flex gap-4">
        <Link to="/login">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Se connecter
          </button>
        </Link>
        <Link to="/register">
          <button className="bg-gray-200 px-4 py-2 rounded">
            S'inscrire
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
