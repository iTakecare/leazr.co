
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Users, BarChart, Shield, Zap, ShoppingCart } from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-6 w-6 text-blue-600" />,
      title: "🤝 Gestion Clientèle Leasing",
      description: "CRM spécialisé pour gérer vos clients, prospects et partenaires dans l'activité de leasing",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: <BarChart className="h-6 w-6 text-emerald-600" />,
      title: "🧮 Calculs de Leasing Avancés",
      description: "Moteur de calcul intelligent adapté aux spécificités du leasing : mensualités, taux, rachats",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-600" />,
      title: "📝 Contrats de Leasing Digitaux",
      description: "Génération automatique et signature électronique des contrats de location financière",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: <Zap className="h-6 w-6 text-orange-600" />,
      title: "💼 Catalogue Équipements",
      description: "Base de données complète d'équipements avec gestion des variantes et tarifs",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      icon: <ShoppingCart className="h-6 w-6 text-indigo-600" />,
      title: "🛒 E-commerce",
      description: "Plateforme de vente en ligne dédiée aux équipements de leasing avec paiement sécurisé",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    }
  ];

  const stats = [
    { value: "⚡ 70%", label: "Réduction temps de traitement", color: "text-blue-600" },
    { value: "🏢 200+", label: "Sociétés de leasing", color: "text-emerald-600" },
    { value: "📋 50%", label: "Moins d'erreurs de calcul", color: "text-purple-600" },
    { value: "🚀 24h", label: "De la demande au contrat", color: "text-orange-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header avec navigation */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-5xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 hover:from-blue-200 hover:to-purple-200 border-blue-200 shadow-sm">
            ✨ Solution métier dédiée au leasing
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Maîtrisez votre
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              activité de leasing
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed max-w-4xl mx-auto">
            🎯 Leazr est la plateforme métier conçue spécialement pour les entreprises qui proposent du leasing. 
            De la prospection au suivi des contrats, optimisez chaque étape de votre activité avec des outils dédiés.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl shadow-lg hover:shadow-xl transition-all" 
              onClick={() => navigate('/signup')}
            >
              🎉 Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 px-10 py-4 text-xl transition-all"
              onClick={() => navigate('/login')}
            >
              👀 Se connecter
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-md transition-shadow">
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${stat.color}`}>{stat.value}</div>
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎨 Votre suite complète pour le leasing
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Des fonctionnalités métier pensées pour répondre aux défis spécifiques de l'activité de leasing
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-8">
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🎯 Prêt à optimiser votre activité de leasing ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            🤝 Rejoignez les entreprises de leasing qui font déjà confiance à Leazr 
            pour développer et gérer leur activité avec efficacité et professionnalisme.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl shadow-xl hover:shadow-2xl transition-all"
            onClick={() => navigate('/signup')}
          >
            🚀 Démarrer mon activité leasing
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold text-blue-600 mb-4">Leazr</div>
              <p className="text-slate-600 text-sm">
                💼 La solution métier de référence pour le leasing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">📦 Solution</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">⚡ Fonctionnalités</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💰 Tarifs</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🔒 Sécurité</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🆘 Support</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">📚 Documentation</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📞 Contact</button></li>
                <li><button className="hover:text-blue-600 transition-colors">🎓 Formation</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">🏢 Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><button className="hover:text-blue-600 transition-colors">ℹ️ À propos</button></li>
                <li><button className="hover:text-blue-600 transition-colors">📝 Blog</button></li>
                <li><button className="hover:text-blue-600 transition-colors">💼 Carrières</button></li>
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

export default HomePage;
