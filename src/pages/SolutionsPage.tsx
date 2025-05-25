
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart, Shield, Zap, ArrowRight, CheckCircle, TrendingUp, Database, Clock, Award, Star, Target } from 'lucide-react';
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
      industries: ["Equipements industriels", "Véhicules", "Informatique", "Mobilier"],
      color: "blue"
    },
    {
      icon: <BarChart className="h-12 w-12 text-emerald-600" />,
      title: "🧮 Calculateur Intelligent",
      description: "Moteur de calcul spécialisé pour tous vos besoins de leasing",
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
      industries: ["Tous secteurs", "Multi-équipements", "International", "PME/ETI"],
      color: "emerald"
    },
    {
      icon: <Shield className="h-12 w-12 text-purple-600" />,
      title: "📝 Contrats Digitaux",
      description: "Génération et signature électronique des contrats de leasing",
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
      industries: ["Tous équipements", "B2B", "Particuliers", "Professionnels"],
      color: "purple"
    },
    {
      icon: <Zap className="h-12 w-12 text-orange-600" />,
      title: "💼 Catalogue Équipements",
      description: "Base de données complète d'équipements avec IA",
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
      industries: ["Industrie", "BTP", "Transport", "Santé"],
      color: "orange"
    }
  ];

  const integrations = [
    { name: "Sage", logo: "💼", description: "Synchronisation comptable bidirectionnelle", certified: true },
    { name: "Cegid", logo: "📊", description: "Intégration ERP complète temps réel", certified: true },
    { name: "SAP", logo: "🔷", description: "Module leasing SAP natif", certified: false },
    { name: "Banques", logo: "🏦", description: "Connexions API 50+ banques partenaires", certified: true },
    { name: "Stripe", logo: "💳", description: "Paiements sécurisés multi-devises", certified: true },
    { name: "DocuSign", logo: "✍️", description: "Signature électronique certifiée", certified: true },
    { name: "Mailchimp", logo: "📧", description: "Marketing automation spécialisé", certified: false },
    { name: "Salesforce", logo: "☁️", description: "CRM synchronisation avancée", certified: false }
  ];

  const useCases = [
    {
      title: "🏢 Société de Leasing Traditionnelle",
      company: "LeasePro France",
      challenge: "Processus manuels chronophages, erreurs de calcul récurrentes, perte de prospects",
      solution: "Déploiement complet : CRM + Calculateur + Contrats + Formation équipe",
      result: "70% de gain de productivité, 0% d'erreurs, +45% CA en 12 mois",
      metrics: { time: "70%", errors: "0%", revenue: "+45%" },
      testimonial: "Leazr a révolutionné notre façon de travailler. ROI atteint en 4 mois."
    },
    {
      title: "🏪 Revendeur avec Financement",
      company: "AutoMax Solutions",
      challenge: "Difficultés à proposer financement, concurrence déloyale, marge réduite",
      solution: "Intégration catalogue + calculateur en marque blanche + formation commerciale",
      result: "+50% ventes avec financement, +25% marge moyenne, satisfaction client 95%",
      metrics: { sales: "+50%", margin: "+25%", satisfaction: "95%" },
      testimonial: "Le financement est devenu notre avantage concurrentiel principal."
    },
    {
      title: "🏭 Groupe Multi-entités",
      company: "IndustriaLease Group",
      challenge: "Gestion disparate, reporting complexe, pas de vision consolidée",
      solution: "Déploiement multi-sites + reporting centralisé + dashboards executives",
      result: "Vision globale temps réel, pilotage optimisé, décisions rapides",
      metrics: { visibility: "100%", decisions: "3x plus rapides", control: "Centralisé" },
      testimonial: "Enfin une vision claire de notre activité sur tous nos sites."
    },
    {
      title: "🚗 Concessionaires Auto",
      company: "AutoPlus Network",
      challenge: "Processus financement longs, taux de refus élevé, expérience client dégradée",
      solution: "Module scoring + pré-qualification + signature digitale + suivi temps réel",
      result: "-60% délai financement, -30% taux refus, satisfaction client +40%",
      metrics: { delay: "-60%", rejection: "-30%", satisfaction: "+40%" },
      testimonial: "Nos clients signent leur financement en 15 minutes maintenant."
    }
  ];

  const technologies = [
    {
      name: "Intelligence Artificielle",
      icon: "🤖",
      description: "IA pour l'analyse des risques et optimisation des taux",
      features: ["Scoring automatique", "Détection fraude", "Prédiction VR"]
    },
    {
      name: "Blockchain",
      icon: "⛓️",
      description: "Traçabilité et sécurisation des contrats",
      features: ["Contrats intelligents", "Audit trail", "Certification"]
    },
    {
      name: "API First",
      icon: "🔗",
      description: "Architecture ouverte pour intégrations",
      features: ["REST API", "Webhooks", "SDK disponibles"]
    },
    {
      name: "Cloud Sécurisé",
      icon: "☁️",
      description: "Infrastructure haute disponibilité",
      features: ["99.9% uptime", "Backup auto", "RGPD compliant"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            💡 Solutions innovantes pour le leasing
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
            🎯 Des outils conçus spécifiquement pour optimiser chaque aspect de votre activité de leasing, 
            de la prospection au suivi des contrats, avec des technologies de pointe.
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

      {/* Solutions Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎛️ Notre Suite Complète
            </h2>
            <p className="text-xl text-slate-600">
              Quatre modules intégrés pour une gestion optimale de votre activité
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-blue-200">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border">
                      {solution.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{solution.title}</CardTitle>
                      <CardDescription className="text-base">{solution.description}</CardDescription>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {solution.industries.map((industry, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      Fonctionnalités clés :
                    </h4>
                    <ul className="grid grid-cols-1 gap-2">
                      {solution.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Bénéfices mesurés :
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {solution.benefits.map((benefit, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 justify-center">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline" size="lg">
                    Découvrir {solution.title.split(' ')[1]}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section with detailed metrics */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎯 Success Stories Détaillées
            </h2>
            <p className="text-xl text-slate-600">
              Comment nos clients transforment concrètement leur activité avec nos solutions
            </p>
          </div>
          
          <div className="space-y-12">
            {useCases.map((useCase, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{useCase.title}</h3>
                        <Badge variant="outline" className="mb-4">{useCase.company}</Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Problématique :
                          </div>
                          <p className="text-sm text-slate-600 bg-red-50 p-3 rounded-lg border border-red-200">{useCase.challenge}</p>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            Solution déployée :
                          </div>
                          <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">{useCase.solution}</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          Résultats obtenus :
                        </div>
                        <p className="text-sm font-semibold text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">{useCase.result}</p>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-lg border">
                        <p className="text-sm italic text-slate-700 mb-2">"{useCase.testimonial}"</p>
                        <div className="text-xs text-slate-500">— Direction Générale, {useCase.company}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border">
                      <h4 className="font-semibold mb-4 text-center">📊 Métriques Clés</h4>
                      <div className="space-y-4">
                        {Object.entries(useCase.metrics).map(([key, value], idx) => (
                          <div key={idx} className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{value}</div>
                            <div className="text-xs text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🚀 Technologies de Pointe
            </h2>
            <p className="text-xl text-slate-600">
              Innovation et sécurité au service de votre activité
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {technologies.map((tech, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow bg-white">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{tech.icon}</div>
                  <h3 className="font-semibold mb-3">{tech.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{tech.description}</p>
                  <div className="space-y-1">
                    {tech.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs block">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Integrations Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🔗 Écosystème d'Intégrations
            </h2>
            <p className="text-xl text-slate-600">
              Connectez Leazr à votre environnement existant en quelques clics
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 lg:grid-cols-4 gap-6 mb-12">
            {integrations.map((integration, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow relative">
                <CardContent className="p-6">
                  {integration.certified && (
                    <Badge className="absolute -top-2 -right-2 bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Certifié
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

      {/* Enhanced ROI Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              📊 ROI Garanti et Mesurable
            </h2>
            <p className="text-xl text-blue-100">
              Impact concret sur votre activité dès les premiers mois
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
            <Badge className="bg-yellow-500 text-yellow-900 mb-4">
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
            🚀 Transformez votre activité de leasing dès aujourd'hui
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Rejoignez les 200+ entreprises qui ont choisi Leazr pour optimiser leur activité 
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Logo variant="full" logoSize="lg" showText={false} className="mb-4 mx-auto" />
            <p className="text-slate-600">
              💼 La solution métier de référence pour le leasing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SolutionsPage;
