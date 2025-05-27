
import React from 'react';
import MainNavigation from '@/components/layout/MainNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calculator, Shield, Database, ArrowRight, CheckCircle } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: 'CRM Leasing Intégré',
      description: 'Gérez vos prospects, clients et partenaires depuis une interface unifiée.'
    },
    {
      icon: <Calculator className="h-8 w-8 text-green-600" />,
      title: 'Calculateur Intelligent',
      description: 'Calculez instantanément les mensualités et conditions de leasing.'
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      title: 'Contrats Digitaux',
      description: 'Génération et signature électronique de contrats sécurisés.'
    },
    {
      icon: <Database className="h-8 w-8 text-orange-600" />,
      title: 'Catalogue Équipements',
      description: 'Base de données complète avec gestion des tarifs et variantes.'
    }
  ];

  const benefits = [
    'Interface intuitive et moderne',
    'Calculs automatisés précis',
    'Signature électronique intégrée',
    'Support client dédié',
    'Mises à jour régulières',
    'Sécurité renforcée'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              La plateforme de leasing nouvelle génération
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Simplifiez et professionnalisez votre activité de leasing avec nos outils métier innovants
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Essai gratuit 30 jours
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                Voir la démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-gray-600">Des outils conçus spécialement pour l'activité de leasing</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Pourquoi choisir Leazr ?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Une solution complète qui s'adapte parfaitement aux besoins spécifiques du secteur du leasing.
              </p>
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6">Commencez dès aujourd'hui</h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-green-600">✓ Installation rapide</h4>
                  <p className="text-sm text-gray-600">Configuration en moins de 10 minutes</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-green-600">✓ Formation incluse</h4>
                  <p className="text-sm text-gray-600">Support et formation de votre équipe</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-green-600">✓ Garantie satisfait</h4>
                  <p className="text-sm text-gray-600">30 jours d'essai sans engagement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Prêt à transformer votre activité ?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Rejoignez les centaines d'entreprises qui font confiance à Leazr pour leur activité de leasing
          </p>
          <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
            Commencer l'essai gratuit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img src="/lovable-uploads/3a4ae1ec-2b87-4a07-a178-b3bc5d86594b.png" alt="Leazr" className="h-8 mb-4" />
              <p className="text-gray-400">La solution de référence pour professionnaliser votre activité de leasing.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Fonctionnalités</li>
                <li>Tarifs</li>
                <li>Sécurité</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Contact</li>
                <li>Formation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-gray-400">
                <li>À propos</li>
                <li>Blog</li>
                <li>Carrières</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Leazr. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
