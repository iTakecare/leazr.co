
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Users, Calculator, FileText, Package, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "🤝 Gestion Clientèle Leasing",
      description: "CRM spécialisé pour gérer vos clients, prospects et partenaires dans l'activité de leasing",
      color: "bg-blue-50 border-blue-200"
    },
    {
      icon: <Calculator className="h-8 w-8 text-emerald-600" />,
      title: "🧮 Calculs de Leasing Avancés",
      description: "Moteur de calcul intelligent adapté aux spécificités du leasing : mensualités, taux, rachats",
      color: "bg-emerald-50 border-emerald-200"
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "📝 Contrats de Leasing Digitaux",
      description: "Génération automatique et signature électronique des contrats de location financière",
      color: "bg-purple-50 border-purple-200"
    },
    {
      icon: <Package className="h-8 w-8 text-orange-600" />,
      title: "📦 Catalogue Équipements",
      description: "Base de données complète d'équipements avec gestion des variantes et tarifs",
      color: "bg-orange-50 border-orange-200"
    },
    {
      icon: <ShoppingCart className="h-8 w-8 text-pink-600" />,
      title: "🛒 E-commerce Intégré",
      description: "Plateforme de vente en ligne pour vos équipements avec gestion des commandes et paiements",
      color: "bg-pink-50 border-pink-200"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header avec fond dégradé */}
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <LandingHeader />
        
        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-32 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Révolutionnez votre{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                activité de leasing
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-700 mb-8 leading-relaxed">
              Une plateforme tout-en-un qui transforme la gestion complexe du leasing 
              en un processus fluide et automatisé
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all text-lg px-8 py-4"
                onClick={() => navigate('/signup')}
              >
                🚀 Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-lg px-8 py-4"
                onClick={() => navigate('/contact')}
              >
                📞 Demander une démo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎯 Votre suite complète pour le leasing
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Des fonctionnalités métier pensées pour répondre aux défis spécifiques de l'activité de leasing
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className={`${feature.color} border-2 hover:shadow-lg transition-all duration-300 hover:scale-105`}>
                <CardContent className="p-6">
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ⚡ Prêt à transformer votre activité de leasing ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez les professionnels qui font confiance à Leazr pour optimiser 
            leur gestion et développer leur activité.
          </p>
          <Button 
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all text-lg px-8 py-4"
            onClick={() => navigate('/signup')}
          >
            🎯 Démarrer maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-400">
            © 2024 Leazr.co - Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
