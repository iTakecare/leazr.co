
import React from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  return (
    <div className="container mx-auto px-4 py-12 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Mot de passe oublié</h1>
        <p className="mb-4">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
        <form className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <input 
              type="email" 
              className="w-full border rounded px-3 py-2" 
              placeholder="votre@email.com"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Envoyer le lien
          </button>
        </form>
        <p className="mt-4 text-center">
          <Link to="/login" className="text-blue-600">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
