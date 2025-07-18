
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import SimplifiedCloudflareManager from "@/components/admin/SimplifiedCloudflareManager";

const LeazrSaasDomains = () => {
  const { user } = useAuth();

  // Vérifier que seul l'admin SaaS peut accéder à cette page
  if (!user || !user.email?.endsWith('@itakecare.be')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestion des Domaines SaaS</h1>
          <p className="text-muted-foreground mt-2">
            Interface simplifiée pour la gestion automatisée des sous-domaines Cloudflare
          </p>
        </div>
        
        <SimplifiedCloudflareManager />
      </div>
    </div>
  );
};

export default LeazrSaasDomains;
