
import React from 'react';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calculator, FileText, Package, BarChart, Mail, ArrowRight, CheckCircle, Zap, Shield, Briefcase, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SolutionsPage = () => {
  const navigate = useNavigate();

  const crmFeatures = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "👥 Gestion Clients",
      description: "Base clients complète spécialisée leasing",
      benefits: ["Fiches clients détaillées", "Historique complet", "Segmentation avancée"]
    },
    {
      icon: <BarChart className="h-8 w-8 text-emerald-600" />,
      title: "📅 Suivi Commercial",
      description: "Pipeline et suivi des opportunités",
      benefits: ["Étapes personnalisables", "Rappels automatiques", "Prévisions de vente"]
    },
    {
      icon: <BarChart className="h-8 w-8 text-purple-600" />,
      title: "📊 Tableaux de Bord",
      description: "Analytics et reporting en temps réel",
      benefits: ["KPI personnalisés", "Rapports automatiques", "Alertes intelligentes"]
    },
    {
      icon: <Mail className="h-8 w-8 text-orange-600" />,
      title: "📧 Communication",
      description: "Outils de communication intégrés",
      benefits: ["Email marketing", "Templates personnalisés", "Suivi des interactions"]
    }
  ];

  const calculatorFeatures = [
    {
      icon: <Calculator className="h-8 w-8 text-blue-600" />,
      title: "🧮 Calculs Précis",
      description: "Moteur de calcul spécialisé pour le leasing",
      benefits: ["Taux personnalisables", "Mensualités précises", "Options de rachat"]
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-emerald-600" />,
      title: "📈 Simulations",
      description: "Comparaisons et scenarios multiples",
      benefits: ["Comparaison d'offres", "Analyse de rentabilité", "Graphiques interactifs"]
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "📄 Génération Auto",
      description: "Documents générés automatiquement",
      benefits: ["Devis instantanés", "Contrats préremplis", "Export PDF"]
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-orange-600" />,
      title: "✅ Validation",
      description: "Vérifications et conformité intégrées",
      benefits: ["Règles métier", "Validation automatique", "Alertes intelligentes"]
    }
  ];

  const professionalFeatures = [
    {
      icon: <Briefcase className="h-8 w-8 text-blue-600" />,
      title: "💼 Simplicité d'usage",
      description: "Interface intuitive conçue pour les professionnels",
      benefits: ["Prise en main rapide", "Processus simplifiés", "Support dédié"]
    },
    {
      icon: <Zap className="h-8 w-8 text-emerald-600" />,
      title: "⚡ Réactivité",
      description: "Réponses rapides et traitement accéléré",
      benefits: ["Validation 24h", "Support prioritaire", "Processus optimisés"]
    },
    {
      icon: <Calculator className="h-8 w-8 text-purple-600" />,
      title: "🧮 Tarification adaptée",
      description: "Prix ajustés aux volumes des professionnels",
      benefits: ["Tarifs préférentiels", "Pas de frais cachés", "Facturation flexible"]
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "🤝 Accompagnement",
      description: "Support personnalisé pour votre activité",
      benefits: ["Conseiller dédié", "Formation incluse", "Suivi personnalisé"]
    }
  ];

  const enterpriseFeatures = [
    {
      icon: <Package className="h-8 w-8 text-blue-600" />,
      title: "🏢 Multi-entités",
      description: "Gérez plusieurs filiales et départements depuis une seule plateforme",
      benefits: ["Consolidation automatique", "Reporting centralisé", "Gestion des droits"]
    },
    {
      icon: <Users className="h-8 w-8 text-emerald-600" />,
      title: "👥 Équipes étendues",
      description: "Collaborez efficacement avec des équipes de grande taille",
      benefits: ["Workflow avancés", "Validation multi-niveaux", "Délégations"]
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-purple-600" />,
      title: "📊 Analytics avancées",
      description: "Tableaux de bord personnalisés et KPI métier",
      benefits: ["Dashboards personnalisés", "Alertes intelligentes", "Prédictions"]
    },
    {
      icon: <Shield className="h-8 w-8 text-orange-600" />,
      title: "🔒 Sécurité renforcée",
      description: "Conformité et sécurité adaptées aux grandes entreprises",
      benefits: ["SSO/SAML", "Audit trails", "Conformité RGPD"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🚀 Nos solutions d'automatisation innovantes
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Des outils complets pour optimiser votre activité de leasing
            </p>
          </div>
        </div>
      </div>

      {/* CRM Leasing Section */}
      <section id="crm" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CRM Leasing
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              🤝 Un CRM spécialement conçu pour l'activité de leasing
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {crmFeatures.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              Découvrir le CRM
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Calculateur Section */}
      <section id="calculateur" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Calculateur Intelligent
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              🧮 Un moteur de calcul spécialisé pour tous vos besoins de leasing
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {calculatorFeatures.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              Tester le calculateur
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions Professionnels Section */}
      <section id="professionnels" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Solutions Professionnels
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              💼 Des solutions de leasing pensées pour les PME et indépendants
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {professionalFeatures.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              Commencer mon essai gratuit
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions Entreprises Section */}
      <section id="entreprises" className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Solutions Entreprises
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              🏢 Des solutions de leasing adaptées aux besoins des grandes entreprises
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {enterpriseFeatures.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-500 flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/contact')}
            >
              Demander une démo entreprise
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SolutionsPage;
