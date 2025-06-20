
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Star, Zap, Shield, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import Logo from '@/components/layout/Logo';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      price: 49,
      description: 'Parfait pour débuter dans le leasing',
      popular: false,
      features: [
        '✅ 1 module inclus (CRM ou Calculateur)',
        '👤 1 utilisateur',
        '📊 Jusqu\'à 50 dossiers/mois',
        '📧 Support email',
        '🔄 Mises à jour automatiques',
        '📱 Application mobile'
      ],
      limitations: [
        'Fonctionnalités limitées',
        'Support standard uniquement'
      ]
    },
    {
      name: 'Pro',
      price: 149,
      description: 'Idéal pour les équipes qui se développent',
      popular: true,
      features: [
        '🎯 Jusqu\'à 3 modules au choix',
        '👥 5 utilisateurs inclus',
        '📊 Dossiers illimités',
        '⚡ Support prioritaire',
        '🔗 Intégrations avancées',
        '📈 Tableaux de bord personnalisés',
        '🔒 Sauvegarde automatique',
        '📱 Applications mobiles complètes'
      ],
      limitations: []
    },
    {
      name: 'Business',
      price: 'sur demande',
      description: 'Pour les grandes organisations de leasing',
      popular: false,
      features: [
        '🎛️ Tous les modules inclus',
        '👥 10 utilisateurs inclus',
        '📊 Gestion multi-entités',
        '🎧 Support dédié 24/7',
        '🔧 Personnalisation avancée',
        '📋 API complète',
        '🏢 White-label disponible',
        '🎓 Formation personnalisée',
        '📊 Reporting avancé'
      ],
      limitations: []
    }
  ];

  const modules = [
    { name: '🤝 CRM Leasing', description: 'Gestion complète des clients et prospects' },
    { name: '🧮 Calculateur', description: 'Moteur de calcul spécialisé leasing' },
    { name: '📝 Contrats Digitaux', description: 'Génération et signature électronique' },
    { name: '📦 Catalogue Équipements', description: 'Base de données équipements' },
    { name: '📊 Analytics', description: 'Tableaux de bord et reporting' },
    { name: '🔗 Intégrations', description: 'Connexions bancaires et comptables' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            💰 Tarifs transparents et adaptés
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Choisissez votre plan
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Des formules pensées pour accompagner votre croissance dans l'activité de leasing
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative shadow-lg hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'border-2 border-blue-500 scale-105' : 'hover:-translate-y-1'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Plus populaire
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-600">{plan.description}</CardDescription>
                  <div className="mt-4">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-4xl font-bold text-blue-600">{plan.price}€</span>
                        <span className="text-slate-600">/mois</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-blue-600">{plan.price}</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-slate-600 hover:bg-slate-700'
                    }`}
                    size="lg"
                    onClick={() => navigate('/signup', { state: { selectedPlan: plan.name.toLowerCase() } })}
                  >
                    Choisir {plan.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎛️ Modules disponibles
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Découvrez tous les modules spécialisés pour optimiser votre activité de leasing
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{module.name}</h3>
                  <p className="text-sm text-slate-600">{module.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              ❓ Questions fréquentes
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">🔄 Puis-je changer de plan ?</h3>
                <p className="text-slate-600 text-sm">Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis votre espace client.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">💳 Quels modes de paiement acceptez-vous ?</h3>
                <p className="text-slate-600 text-sm">Nous acceptons toutes les cartes bancaires, virements SEPA et prélèvements automatiques.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🔒 Mes données sont-elles sécurisées ?</h3>
                <p className="text-slate-600 text-sm">Absolument, nous utilisons un chiffrement de niveau bancaire et respectons le RGPD.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">🎓 Proposez-vous de la formation ?</h3>
                <p className="text-slate-600 text-sm">Oui, formation incluse pour les plans Pro et Business, webinaires gratuits pour tous.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🆘 Comment fonctionne le support ?</h3>
                <p className="text-slate-600 text-sm">Support email pour Starter, prioritaire pour Pro, dédié 24/7 pour Business.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🔗 Intégrations disponibles ?</h3>
                <p className="text-slate-600 text-sm">Sage, Cegid, banques partenaires, outils comptables et bien d'autres.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🚀 Prêt à démarrer ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Rejoignez dès maintenant les professionnels qui optimisent leur activité de leasing avec Leazr
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
            onClick={() => navigate('/signup')}
          >
            🎉 Essai gratuit 14 jours
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* Footer avec le nouveau composant */}
      <Footer />
    </div>
  );
};

export default PricingPage;
