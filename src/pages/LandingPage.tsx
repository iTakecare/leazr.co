import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Users, BarChart, Shield, Zap } from 'lucide-react';
import { useNavigate } from "react-router";
import Logo from '@/components/layout/Logo';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const features = [{
    icon: <Users className="h-6 w-6 text-blue-600" />,
    title: "🤝 Gestion Clientèle Leasing",
    description: "CRM spécialisé pour gérer vos clients, prospects et partenaires dans l'activité de leasing",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  }, {
    icon: <BarChart className="h-6 w-6 text-emerald-600" />,
    title: "🧮 Calculs de Leasing Avancés",
    description: "Moteur de calcul intelligent adapté aux spécificités du leasing : mensualités, taux, rachats",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }, {
    icon: <Shield className="h-6 w-6 text-purple-600" />,
    title: "📝 Contrats de Leasing Digitaux",
    description: "Génération automatique et signature électronique des contrats de location financière",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  }, {
    icon: <Zap className="h-6 w-6 text-orange-600" />,
    title: "💼 Catalogue Équipements",
    description: "Base de données complète d'équipements avec gestion des variantes et tarifs",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  }];
  const stats = [{
    value: "⚡ 70%",
    label: "Réduction temps de traitement",
    color: "text-blue-600"
  }, {
    value: "🏢 200+",
    label: "Sociétés de leasing",
    color: "text-emerald-600"
  }, {
    value: "📋 50%",
    label: "Moins d'erreurs de calcul",
    color: "text-purple-600"
  }, {
    value: "🚀 24h",
    label: "De la demande au contrat",
    color: "text-orange-600"
  }];
  const benefits = ["📊 Tableaux de bord spécialisés pour l'activité de leasing", "⚙️ Automatisation des processus métier du leasing", "🔢 Calculs financiers conformes aux normes du leasing", "📈 Suivi de la performance commerciale et financière", "🔗 Intégrations avec les systèmes bancaires et comptables", "📋 Conformité réglementaire et reporting automatisé"];
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header avec menu complet */}
      <LandingHeader />

      {/* Hero Section avec logo agrandi */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container mx-auto text-center max-w-5xl">
          {/* Logo central agrandi */}
          <div className="mb-8 flex justify-center">
            <Logo variant="full" logoSize="2xl" showText={false} className="transform hover:scale-105 transition-transform duration-300" />
          </div>
          
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
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/signup')}>
              🎉 Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => <div key={index} className="text-center p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-md transition-shadow">
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>)}
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => <Card key={index} className={`${feature.borderColor} ${feature.bgColor} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
                <CardContent className="p-6 text-center">
                  <div className={`mx-auto mb-4 p-3 bg-white rounded-lg w-fit shadow-sm`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-8">
                🌟 Pourquoi Leazr pour votre activité de leasing ?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{benefit}</span>
                  </div>)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl border border-blue-200 shadow-lg">
              <div className="text-center">
                <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">⚡ 60%</div>
                <div className="text-lg text-slate-600 mb-6">
                  de temps économisé sur le traitement des dossiers de leasing
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                  <p className="text-slate-700 italic mb-4">
                    💬 "Leazr a révolutionné notre gestion du leasing. 
                    Calculs automatisés, suivi client simplifié, performances en hausse."
                  </p>
                  <div className="text-sm text-slate-600">
                    — Pierre Martin, Directeur Commercial chez LeaseTech Pro 🏆
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
          <h2 className="text-4xl font-bold mb-6">
            🎯 Prêt à optimiser votre activité de leasing ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            🤝 Rejoignez les entreprises de leasing qui font déjà confiance à Leazr 
            pour développer et gérer leur activité avec efficacité et professionnalisme.
          </p>
          <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl shadow-xl hover:shadow-2xl transition-all" onClick={() => navigate('/signup')}>
            🚀 Démarrer mon activité leasing
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* Footer avec le nouveau composant */}
      <Footer />
    </div>;
};
export default LandingPage;