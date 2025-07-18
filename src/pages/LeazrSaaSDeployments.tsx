
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import SimplifiedNetlifyManager from "@/components/admin/SimplifiedNetlifyManager";

const LeazrSaaSDeployments = () => {
  const { user } = useAuth();

  // Vérifier que seul l'admin SaaS peut accéder à cette page
  if (!user || user.email !== "ecommerce@itakecare.be") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Déploiements SaaS</h1>
          <p className="text-muted-foreground mt-2">
            Interface simplifiée pour les déploiements automatisés sur Netlify
          </p>
        </div>
        
        <SimplifiedNetlifyManager />
      </div>
    </div>
  );
};

export default LeazrSaaSDeployments;
