
import React from "react";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Réinitialiser le mot de passe</h1>
        <form className="space-y-4">
          <div>
            <label className="block mb-1">Nouveau mot de passe</label>
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
            Réinitialiser le mot de passe
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link to="/login" className="text-blue-600">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
