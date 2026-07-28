
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calculator, Shield, Box, ArrowRight, CheckCircle, TrendingUp, Database, Clock, Award, Star, Target, Zap, Building, Headphones, Book, Briefcase, Monitor, Server, Recycle, Share2, HelpCircle } from 'lucide-react';
import { useNavigate } from "react-router";
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';

const UnifiedSolutionsPage: React.FC = () => {
  const navigate = useNavigate();

  const mainSolutions = [
    {
      id: 'crm',
      icon: <Users className="h-16 w-16 text-blue-600" />,
      title: "🤝 CRM Intégré",
      subtitle: "Gérez vos clients et prospects efficacement",
      description: "Un système de gestion de la relation client spécialement conçu pour les entreprises de leasing, avec des fonctionnalités avancées de suivi et d'automatisation.",
      features: [
        "📊 Segmentation clients avancée par secteur d'activité",
        "🎯 Pipeline de ventes optimisé pour le leasing",
        "📈 Suivi performance commerciale en temps réel",
        "🔄 Workflows automatisés de qualification prospects",
        "📱 Application mobile dédiée terrain",
        "🔗 Synchronisation temps réel multi-utilisateurs",
        "📋 Historique complet des interactions client",
        "🎨 Tableaux de bord personnalisables par utilisateur"
      ],
      benefits: [
        "+40% de conversion prospects",
        "-60% temps administratif",
        "360° vision client complète",
        "ROI mesurable en 3 mois"
      ],
      useCases: [
        "Suivi des prospects depuis la première prise de contact",
        "Gestion du pipeline commercial avec prévisions automatiques",
        "Automatisation des relances clients",
        "Analyse des performances par commercial"
      ],
      color: "blue",
      gradient: "from-blue-50 to-blue-100"
    },
    {
      id: 'calculateur',
      icon: <Calculator className="h-16 w-16 text-emerald-600" />,
      title: "🧮 Calculateur Intelligent",
      subtitle: "Automatisez vos calculs de leasing",
      description: "Moteur de calcul avancé qui automatise tous vos calculs financiers de leasing avec une précision parfaite et des fonctionnalités d'optimisation intégrées.",
      features: [
        "💰 Calculs automatisés multi-devises",
        "📊 Simulations comparatives multi-scénarios",
        "🎯 Optimisation automatique de la rentabilité",
        "📋 Grilles tarifaires flexibles par segment",
        "⚡ Résultats instantanés en temps réel",
        "📈 Analyse de sensibilité avancée",
        "🔧 Paramétrage personnalisé par utilisateur",
        "📄 Génération automatique de propositions"
      ],
      benefits: [
        "99.9% précision calculs",
        "-80% temps de traitement",
        "Conformité réglementaire garantie",
        "Intégration comptable native"
      ],
      useCases: [
        "Calcul automatique des mensualités selon différents taux",
        "Comparaison de scénarios financiers multiples",
        "Optimisation des marges par type d'équipement",
        "Génération de propositions commerciales personnalisées"
      ],
      color: "emerald",
      gradient: "from-emerald-50 to-emerald-100"
    },
    {
      id: 'contrats',
      icon: <Shield className="h-16 w-16 text-purple-600" />,
      title: "📝 Contrats Digitaux",
      subtitle: "Signature électronique sécurisée",
      description: "Plateforme complète de gestion des contrats avec signature électronique certifiée, templates personnalisables et archivage sécurisé conforme RGPD.",
      features: [
        "📄 Templates personnalisables par secteur",
        "✍️ Signature électronique certifiée eIDAS",
        "🔒 Validation juridique automatique",
        "📚 Bibliothèque de clauses spécialisées",
        "🔄 Workflows d'approbation multi-niveaux",
        "📊 Suivi états contractuels en temps réel",
        "🗄️ Archivage sécurisé conforme RGPD",
        "📧 Notifications automatiques d'échéances"
      ],
      benefits: [
        "-75% délai signature",
        "100% conformité légale",
        "Archivage sécurisé 30 ans",
        "Audit trail complet"
      ],
      useCases: [
        "Génération automatique de contrats personnalisés",
        "Signature à distance sécurisée avec certificats",
        "Suivi des échéances et renouvellements",
        "Archivage numérique avec recherche avancée"
      ],
      color: "purple",
      gradient: "from-purple-50 to-purple-100"
    },
    {
      id: 'catalogue',
      icon: <Box className="h-16 w-16 text-orange-600" />,
      title: "📦 Catalogue Produits",
      subtitle: "Gestion centralisée de vos équipements",
      description: "Base de données complète et intelligente de tous vos équipements avec gestion des variantes, tarifs dynamiques et intégrations fournisseurs.",
      features: [
        "🗂️ Catalogue multi-fournisseurs centralisé",
        "💰 Gestion prix et remises dynamiques",
        "🔄 Mises à jour automatiques constructeurs",
        "🏷️ Système de variantes et options",
        "📊 Analytics utilisation et performance",
        "🔗 Intégration API fournisseurs",
        "🤖 Suggestions IA d'équipements alternatifs",
        "📈 Prévisions de valeur résiduelle"
      ],
      benefits: [
        "Base 500k+ références",
        "Tarifs temps réel",
        "Gestion obsolescence IA",
        "ROI optimisé automatique"
      ],
      useCases: [
        "Catalogue unifié de tous les équipements disponibles",
        "Gestion automatique des prix et promotions",
        "Recommandations d'équipements basées sur l'IA",
        "Suivi des performances et de la demande"
      ],
      color: "orange",
      gradient: "from-orange-50 to-orange-100"
    }
  ];

  const integrations = [
    { name: "Sage", logo: "💼", description: "Synchronisation comptable bidirectionnelle", certified: true },
    { name: "Cegid", logo: "📊", description: "Intégration ERP complète temps réel", certified: true },
    { name: "SAP", logo: "🔷", description: "Module leasing SAP natif", certified: false },
    { name: "Banques", logo: "🏦", description: "Connexions API 50+ banques partenaires", certified: true },
    { name: "Stripe", logo: "💳", description: "Paiements sécurisés multi-devises", certified: true },
    { name: "DocuSign", logo: "✍️", description: "Signature électronique certifiée", certified: true }
  ];

  const testimonials = [
    {
      company: "LeasePro France",
      sector: "🏢 Société de Leasing",
      quote: "Leazr a révolutionné notre façon de travailler. ROI atteint en 4 mois.",
      result: "70% de gain de productivité, 0% d'erreurs, +45% CA en 12 mois",
      logo: "🏢"
    },
    {
      company: "AutoMax Solutions", 
      sector: "🏪 Revendeur avec Financement",
      quote: "Le financement est devenu notre avantage concurrentiel principal.",
      result: "+50% ventes avec financement, +25% marge moyenne",
      logo: "🚗"
    },
    {
      company: "IndustriaLease Group",
      sector: "🏭 Groupe Multi-entités", 
      quote: "Enfin une vision claire de notre activité sur tous nos sites.",
      result: "Vision globale temps réel, pilotage optimisé",
      logo: "🏭"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🚀 Nos solutions d'automatisation innovantes
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Solutions Complètes
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              pour le Leasing
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Une suite intégrée de 4 modules spécialisés pour optimiser chaque aspect de votre activité de leasing, 
            de la prospection client jusqu'au suivi des contrats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🚀 Découvrir nos solutions
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-10 py-4 text-xl"
            >
              📞 Demander une démo
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions détaillées */}
      {mainSolutions.map((solution, index) => (
        <section key={solution.id} className={`py-20 ${index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
          <div className="container mx-auto px-6">
            <div className={`grid lg:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <div className="flex items-center mb-6">
                  <div className={`p-4 bg-gradient-to-br ${solution.gradient} rounded-2xl border mr-6`}>
                    {solution.icon}
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-2">{solution.title}</h2>
                    <p className="text-xl text-slate-600">{solution.subtitle}</p>
                  </div>
                </div>
                
                <p className="text-lg text-slate-700 mb-8 leading-relaxed">
                  {solution.description}
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Fonctionnalités clés :
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {solution.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                          <span className="text-slate-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Cas d'usage principaux :
                    </h4>
                    <div className="space-y-2">
                      {solution.useCases.map((useCase, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Target className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                          <span className="text-slate-600">{useCase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <Card className="border-2 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      Bénéfices mesurés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {solution.benefits.map((benefit, idx) => (
                        <div key={idx} className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-700 mb-1">{benefit.split(' ')[0]}</div>
                          <div className="text-xs text-green-600">{benefit.split(' ').slice(1).join(' ')}</div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" size="lg">
                      Découvrir {solution.title.split(' ')[1]}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Témoignages clients */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🏆 Témoignages Clients
            </h2>
            <p className="text-xl text-slate-600">
              Comment nos solutions transforment concrètement les entreprises
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">{testimonial.logo}</div>
                    <div>
                      <CardTitle className="text-lg">{testimonial.company}</CardTitle>
                      <CardDescription>{testimonial.sector}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <blockquote className="text-slate-700 italic mb-4">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border">
                    <div className="text-sm font-semibold text-blue-700">Résultats :</div>
                    <div className="text-sm text-slate-600">{testimonial.result}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Intégrations */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🔗 Écosystème d'Intégrations
            </h2>
            <p className="text-xl text-slate-600">
              Connectez vos solutions existantes en quelques clics
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
            {integrations.map((integration, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow relative bg-white">
                <CardContent className="p-6">
                  {integration.certified && (
                    <Badge className="absolute -top-2 -right-2 bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      ✓
                    </Badge>
                  )}
                  <div className="text-3xl mb-3">{integration.logo}</div>
                  <h3 className="font-semibold mb-2">{integration.name}</h3>
                  <p className="text-xs text-slate-600">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-slate-600 mb-4">+ 50 autres intégrations disponibles</p>
            <Button variant="outline" size="lg">
              Voir toutes les intégrations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ROI et métriques */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              📊 Impact Mesurable et Immédiat
            </h2>
            <p className="text-xl text-blue-100">
              Des résultats concrets dès les premiers mois d'utilisation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {[
              { value: "70%", label: "Réduction temps de traitement", icon: <Clock className="h-8 w-8" /> },
              { value: "40%", label: "Augmentation conversion", icon: <TrendingUp className="h-8 w-8" /> },
              { value: "99.9%", label: "Précision des calculs", icon: <Target className="h-8 w-8" /> },
              { value: "24h", label: "Délai moyen signature", icon: <Zap className="h-8 w-8" /> }
            ].map((metric, index) => (
              <div key={index} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex justify-center mb-4 text-blue-200">
                  {metric.icon}
                </div>
                <div className="text-4xl font-bold mb-2">{metric.value}</div>
                <div className="text-sm text-blue-100">{metric.label}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Badge className="bg-yellow-500 text-yellow-900 mb-6">
              <Award className="h-4 w-4 mr-1" />
              Garantie ROI 6 mois ou remboursé
            </Badge>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🚀 Prêt à transformer votre activité de leasing ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Rejoignez les 200+ entreprises qui ont choisi nos solutions pour optimiser leur activité 
            et générer plus de revenus avec moins d'efforts.
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
              onClick={() => navigate('/contact')}
            >
              📞 Demander une démo personnalisée
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default UnifiedSolutionsPage;
