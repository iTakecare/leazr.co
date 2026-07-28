import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Star, Zap, Shield, Headphones } from 'lucide-react';
import { useNavigate } from "react-router";
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
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-primary">Tarifs</span> simples et transparents
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Choisissez la formule adaptée à vos besoins.
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

      <section className="py-16 px-6 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Modules disponibles
            </h2>
            <p className="text-lg text-muted-foreground">
              Découvrez les fonctionnalités incluses dans nos plans
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {modules.map((module, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{module.name}</h3>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Questions fréquentes
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Puis-je changer de plan ?</h3>
                <p className="text-muted-foreground text-sm">Oui, vous pouvez changer de plan à tout moment depuis votre espace client.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quels modes de paiement ?</h3>
                <p className="text-muted-foreground text-sm">Cartes bancaires, virements SEPA et prélèvements automatiques.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Sécurité des données ?</h3>
                <p className="text-muted-foreground text-sm">Chiffrement de niveau bancaire et conformité RGPD.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Formation incluse ?</h3>
                <p className="text-muted-foreground text-sm">Formation incluse pour les plans Pro et Business.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Support disponible ?</h3>
                <p className="text-muted-foreground text-sm">Support email pour tous, prioritaire pour Pro et dédié pour Business.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Intégrations ?</h3>
                <p className="text-muted-foreground text-sm">Intégrations avec les principaux outils comptables et bancaires.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Essayez Leazr gratuitement et découvrez la différence.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/signup')}
          >
            Essai gratuit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer avec le nouveau composant */}
      <Footer />
    </div>
  );
};

export default PricingPage;
