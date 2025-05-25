
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Users, BarChart, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-6 w-6 text-blue-600" />,
      title: "🤝 CRM Intégré",
      description: "Gérez vos clients et prospects efficacement avec notre système intelligent",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: <BarChart className="h-6 w-6 text-emerald-600" />,
      title: "🧮 Calculateur Intelligent",
      description: "Automatisez vos calculs de leasing avec précision et rapidité",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-600" />,
      title: "📝 Contrats Digitaux",
      description: "Signature électronique sécurisée et gestion complète des contrats",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: <Zap className="h-6 w-6 text-orange-600" />,
      title: "📦 Catalogue Produits",
      description: "Gestion centralisée et optimisée de tous vos équipements",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    }
  ];

  const stats = [
    { value: "⚡ 60%", label: "Temps économisé", color: "text-blue-600" },
    { value: "🏢 500+", label: "Entreprises clientes", color: "text-emerald-600" },
    { value: "🔒 99.9%", label: "Disponibilité", color: "text-purple-600" },
    { value: "🎯 24/7", label: "Support client", color: "text-orange-600" }
  ];

  const benefits = [
    "✨ Interface moderne et intuitive",
    "🤖 Automatisation complète des processus",
    "🔐 Sécurité bancaire et données chiffrées",
    "🚀 Support client réactif et formation incluse",
    "🔗 Intégrations avec vos outils existants",
    "🔄 Mises à jour continues et innovations"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                L
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Leazr
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors" 
                onClick={() => navigate('/login')}
              >
                Connexion
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all" 
                onClick={() => navigate('/signup')}
              >
                🚀 Commencer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 hover:from-blue-200 hover:to-purple-200 border-blue-200 shadow-sm">
            ✨ Nouvelle génération de logiciel de leasing
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Simplifiez votre
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              💻 leasing informatique
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            🎯 Leazr est la plateforme tout-en-un qui modernise la gestion de votre activité de leasing. 
            Du prospect au contrat, automatisez vos processus avec élégance et efficacité.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate('/signup')}
            >
              🎉 Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-8 py-3 text-lg transition-all"
            >
              👀 Voir la démo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-md transition-shadow">
                <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              🎨 Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Une suite complète d'outils pensés pour les professionnels du leasing informatique
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`${feature.borderColor} ${feature.bgColor} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              >
                <CardContent className="p-6 text-center">
                  <div className={`mx-auto mb-4 p-3 bg-white rounded-lg w-fit shadow-sm`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-8">
                🌟 Pourquoi choisir Leazr ?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl border border-blue-200 shadow-lg">
              <div className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  ⚡ 60%
                </div>
                <div className="text-lg text-slate-600 mb-6">
                  de temps économisé sur le traitement des offres
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                  <p className="text-slate-700 italic mb-4">
                    💬 "Leazr a transformé notre façon de travailler. Interface épurée, 
                    processus fluides, résultats remarquables."
                  </p>
                  <div className="text-sm text-slate-600">
                    — Marie Dubois, CEO chez TechLease 🏆
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            🎯 Prêt à moderniser votre activité ?
          </h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto text-slate-300">
            🤝 Rejoignez les entreprises qui font déjà confiance à Leazr 
            pour gérer leur activité de leasing informatique avec succès.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 text-lg shadow-xl hover:shadow-2xl transition-all"
            onClick={() => navigate('/signup')}
          >
            🚀 Commencer maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  L
                </div>
                <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Leazr
                </span>
              </div>
              <p className="text-slate-600 text-sm">
                💼 La plateforme de référence pour le leasing informatique.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">📦 Produit</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">⚡ Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">💰 Tarifs</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">🔒 Sécurité</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🆘 Support</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">📚 Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">📞 Contact</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">🎓 Formation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🏢 Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">ℹ️ À propos</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">📝 Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">💼 Carrières</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-center text-sm text-slate-600">
            <p>© 2024 Leazr. Tous droits réservés. 💙</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
