
import React from "react";
import { Link } from "react-router-dom";

const Register = () => {
  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Créer un compte</h1>
        <form className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border rounded px-3 py-2" 
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block mb-1">Mot de passe</label>
            <input 
              type="password" 
              className="w-full border rounded px-3 py-2"
              placeholder="********" 
            />
          </div>
          <div>
            <label className="block mb-1">Confirmer le mot de passe</label>
            <input 
              type="password" 
              className="w-full border rounded px-3 py-2"
              placeholder="********" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            S'inscrire
          </button>
        </form>
        <p className="mt-4 text-center">
          Déjà inscrit? <Link to="/login" className="text-blue-600">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
