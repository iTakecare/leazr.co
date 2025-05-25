
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Zap, Shield, Users, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "CRM Intégré",
      description: "Gérez vos clients et prospects avec un CRM pensé pour le leasing informatique"
    },
    {
      icon: <BarChart className="h-8 w-8 text-green-600" />,
      title: "Calculateur Intelligent",
      description: "Calculez automatiquement vos offres de leasing avec nos algorithmes optimisés"
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      title: "Contrats Digitaux",
      description: "Générez et gérez vos contrats de leasing avec signature électronique"
    },
    {
      icon: <Zap className="h-8 w-8 text-orange-600" />,
      title: "Catalogue Produits",
      description: "Catalogue centralisé de vos équipements informatiques avec gestion des variantes"
    }
  ];

  const benefits = [
    "Réduction de 60% du temps de traitement des offres",
    "Automatisation complète du processus de leasing",
    "Interface intuitive et moderne",
    "Support client réactif et formation incluse",
    "Sécurité bancaire et données chiffrées",
    "Intégrations avec vos outils existants"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                L
              </div>
              <span className="text-2xl font-bold text-gray-900">Leazr</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Connexion
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Essai gratuit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-100">
            🚀 Nouvelle génération de logiciel de leasing
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
            Révolutionnez votre 
            <span className="text-blue-600"> leasing informatique</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Leazr est la plateforme tout-en-un qui simplifie la gestion de votre activité de leasing. 
            Du prospect au contrat, automatisez vos processus et boostez votre productivité.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
              onClick={() => navigate('/signup')}
            >
              Commencer l'essai gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3"
              onClick={() => navigate('/demo')}
            >
              Voir la démo
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            ✨ 14 jours d'essai gratuit • Aucune carte bancaire requise
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une suite complète d'outils conçus spécifiquement pour les professionnels du leasing informatique
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                Pourquoi choisir Leazr ?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">60%</div>
                <div className="text-xl text-gray-600 mb-6">
                  de temps économisé sur le traitement des offres
                </div>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-gray-700 italic">
                    "Leazr a transformé notre façon de travailler. Nous traitons maintenant 
                    3 fois plus d'offres avec la même équipe."
                  </p>
                  <div className="mt-4 text-sm text-gray-600">
                    — Marie Dubois, CEO chez TechLease
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Prêt à transformer votre activité ?
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">
            Rejoignez les centaines d'entreprises qui font déjà confiance à Leazr 
            pour gérer leur activité de leasing informatique.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            onClick={() => navigate('/signup')}
          >
            Commencer maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  L
                </div>
                <span className="text-xl font-bold">Leazr</span>
              </div>
              <p className="text-gray-400">
                La plateforme de référence pour le leasing informatique.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white">Tarifs</a></li>
                <li><a href="#" className="hover:text-white">Sécurité</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Formation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">À propos</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carrières</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Leazr. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
