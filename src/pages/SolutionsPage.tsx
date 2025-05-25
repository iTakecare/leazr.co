
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart, Shield, Zap, ArrowRight, CheckCircle, TrendingUp, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const SolutionsPage: React.FC = () => {
  const navigate = useNavigate();

  const solutions = [
    {
      icon: <Users className="h-12 w-12 text-blue-600" />,
      title: "🤝 CRM Leasing Intégré",
      description: "Gestion complète de votre relation client spécialisée leasing",
      features: [
        "📊 Segmentation clients avancée",
        "🎯 Pipeline de ventes optimisé",
        "📈 Suivi performance commerciale",
        "🔄 Workflows automatisés",
        "📱 Application mobile dédiée",
        "🔗 Synchronisation temps réel"
      ],
      benefits: [
        "+40% de conversion prospects",
        "-60% temps administratif",
        "360° vision client"
      ],
      color: "blue"
    },
    {
      icon: <BarChart className="h-12 w-12 text-emerald-600" />,
      title: "🧮 Calculateur Intelligent",
      description: "Moteur de calcul spécialisé pour tous vos besoins de leasing",
      features: [
        "💰 Calculs automatisés complexes",
        "📊 Simulations multi-scénarios",
        "🎯 Optimisation rentabilité",
        "📋 Grilles tarifaires flexibles",
        "⚡ Résultats instantanés",
        "📈 Analyse de rentabilité"
      ],
      benefits: [
        "99% précision calculs",
        "-80% temps de traitement",
        "Conformité réglementaire"
      ],
      color: "emerald"
    },
    {
      icon: <Shield className="h-12 w-12 text-purple-600" />,
      title: "📝 Contrats Digitaux",
      description: "Génération et signature électronique des contrats de leasing",
      features: [
        "📄 Templates personnalisables",
        "✍️ Signature électronique",
        "🔒 Validation juridique",
        "📚 Bibliothèque de clauses",
        "🔄 Workflows d'approbation",
        "📊 Suivi états contractuels"
      ],
      benefits: [
        "-75% délai signature",
        "100% conformité légale",
        "Archivage sécurisé"
      ],
      color: "purple"
    },
    {
      icon: <Zap className="h-12 w-12 text-orange-600" />,
      title: "💻 Catalogue Équipements IT",
      description: "Base de données complète d'équipements informatiques",
      features: [
        "🗂️ Catalogue complet matériel",
        "💰 Gestion prix et remises",
        "🔄 Mises à jour automatiques",
        "🏷️ Système de variantes",
        "📊 Analytics utilisation",
        "🔗 Intégration fournisseurs"
      ],
      benefits: [
        "10 000+ références",
        "Tarifs temps réel",
        "Gestion obsolescence"
      ],
      color: "orange"
    }
  ];

  const integrations = [
    { name: "Sage", logo: "💼", description: "Synchronisation comptable automatique" },
    { name: "Cegid", logo: "📊", description: "Intégration ERP complète" },
    { name: "Banques", logo: "🏦", description: "Connexions API bancaires" },
    { name: "Stripe", logo: "💳", description: "Paiements sécurisés" },
    { name: "DocuSign", logo: "✍️", description: "Signature électronique" },
    { name: "Mailchimp", logo: "📧", description: "Marketing automation" }
  ];

  const useCases = [
    {
      title: "🏢 Société de Leasing Traditionnelle",
      challenge: "Processus manuels chronophages et erreurs de calcul",
      solution: "Automatisation complète avec CRM + Calculateur + Contrats",
      result: "70% de gain de productivité et 0% d'erreurs"
    },
    {
      title: "🏪 Revendeur IT avec financement",
      challenge: "Difficultés à proposer des solutions de financement",
      solution: "Intégration catalogue + calculateur en marque blanche",
      result: "+50% de ventes avec financement intégré"
    },
    {
      title: "🏭 Groupe industriel",
      challenge: "Gestion multi-entités et reporting consolidé",
      solution: "Déploiement multi-sites avec reporting centralisé",
      result: "Vision globale et pilotage optimisé"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            💡 Solutions innovantes
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Nos Solutions
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Des outils conçus spécifiquement pour optimiser chaque aspect de votre activité de leasing informatique
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {solution.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{solution.title}</CardTitle>
                      <CardDescription className="text-base">{solution.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">🔧 Fonctionnalités clés :</h4>
                    <ul className="grid grid-cols-2 gap-2">
                      {solution.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">📈 Bénéfices mesurés :</h4>
                    <div className="flex flex-wrap gap-2">
                      {solution.benefits.map((benefit, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline">
                    Découvrir cette solution
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎯 Cas d'usage concrets
            </h2>
            <p className="text-xl text-slate-600">
              Comment nos clients transforment leur activité avec nos solutions
            </p>
          </div>
          
          <div className="space-y-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-3 gap-6 items-center">
                    <div>
                      <h3 className="font-semibold mb-2">{useCase.title}</h3>
                      <div className="text-sm text-red-600 mb-2">❌ Problématique :</div>
                      <p className="text-sm text-slate-600">{useCase.challenge}</p>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600 mb-2">🔧 Solution :</div>
                      <p className="text-sm text-slate-600">{useCase.solution}</p>
                    </div>
                    <div>
                      <div className="text-sm text-green-600 mb-2">✅ Résultat :</div>
                      <p className="text-sm font-semibold text-green-700">{useCase.result}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🔗 Intégrations disponibles
            </h2>
            <p className="text-xl text-slate-600">
              Connectez Leazr à votre écosystème existant
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {integrations.map((integration, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-3xl mb-3">{integration.logo}</div>
                  <h3 className="font-semibold mb-2">{integration.name}</h3>
                  <p className="text-xs text-slate-600">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📊 ROI mesurable
            </h2>
            <p className="text-xl text-slate-600">
              Impact concret sur votre activité
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">70%</div>
              <div className="text-sm text-slate-600">Réduction temps de traitement</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">40%</div>
              <div className="text-sm text-slate-600">Augmentation conversion</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">99%</div>
              <div className="text-sm text-slate-600">Précision des calculs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">24h</div>
              <div className="text-sm text-slate-600">Délai moyen signature</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🚀 Transformez votre activité de leasing
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Découvrez comment nos solutions peuvent optimiser votre activité dès aujourd'hui
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🎉 Essai gratuit 14 jours
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 text-xl"
            >
              👀 Voir la démo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Logo variant="full" logoSize="lg" showText={false} className="mb-4 mx-auto" />
            <p className="text-slate-600">
              💼 La solution métier de référence pour le leasing informatique.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SolutionsPage;
