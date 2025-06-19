
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, Zap, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  console.log('PricingPage rendering successfully');

  const plans = [
    {
      name: "Starter",
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      description: "Parfait pour débuter avec le leasing",
      monthlyPrice: 49,
      annualPrice: 490,
      features: [
        "Jusqu'à 50 contrats/mois",
        "Calculateur leasing de base",
        "2 utilisateurs inclus",
        "Support email",
        "Templates de contrats standards",
        "Tableau de bord simple"
      ],
      limitations: [
        "Pas d'intégrations externes",
        "Reporting limité"
      ],
      popular: false,
      cta: "Commencer gratuitement"
    },
    {
      name: "Professional",
      icon: <Star className="h-8 w-8 text-emerald-600" />,
      description: "La solution complète Leazr pour professionnels",
      monthlyPrice: 100,
      annualPrice: 1000,
      features: [
        "Contrats illimités",
        "Calculateur leasing avancé + simulateurs",
        "Utilisateurs illimités",
        "CRM intégré complet",
        "Gestion multi-clients",
        "Catalogue produits personnalisable",
        "Génération automatique de devis",
        "Signatures électroniques",
        "Workflow de validation",
        "Reporting avancé et analytics",
        "Intégrations bancaires",
        "Support prioritaire (chat + téléphone)",
        "Formation incluse",
        "API complète"
      ],
      limitations: [],
      popular: true,
      cta: "Essai gratuit 14 jours"
    },
    {
      name: "Enterprise",
      icon: <Crown className="h-8 w-8 text-purple-600" />,
      description: "Solution sur mesure pour grandes entreprises",
      monthlyPrice: 250,
      annualPrice: 2500,
      features: [
        "Tout du plan Professional",
        "Multi-tenant / Marque blanche",
        "Déploiement sur mesure",
        "Intégrations ERP/CRM existants",
        "API dédiée et webhooks",
        "Formation équipe complète",
        "Support dédié 24/7",
        "SLA garantis",
        "Hébergement privé disponible",
        "Conformité RGPD avancée",
        "Audit de sécurité",
        "Développements spécifiques"
      ],
      limitations: [],
      popular: false,
      cta: "Contacter l'équipe"
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (!plan.monthlyPrice) return "Sur devis";
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
    const period = isAnnual ? "/an" : "/mois";
    return `${price}€${period}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (!plan.monthlyPrice || !plan.annualPrice) return null;
    const monthlyCost = plan.monthlyPrice * 12;
    const savings = monthlyCost - plan.annualPrice;
    return savings;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            💰 Tarifs transparents et compétitifs
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Tarifs Leazr
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple & Transparent
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Choisissez le plan qui correspond à vos besoins. 
            Tous nos plans incluent les mises à jour et le support.
          </p>
          
          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`font-medium ${!isAnnual ? 'text-blue-600' : 'text-slate-600'}`}>
              Mensuel
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-blue-600"
            />
            <span className={`font-medium ${isAnnual ? 'text-blue-600' : 'text-slate-600'}`}>
              Annuel
            </span>
            {isAnnual && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                💰 Jusqu'à 2 mois offerts
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative hover:shadow-lg transition-all duration-300 ${
                  plan.popular 
                    ? 'ring-2 ring-blue-500 scale-105 shadow-xl' 
                    : 'hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                      ⭐ Plus populaire
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="mb-4 flex justify-center">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  
                  <div className="py-4">
                    <div className="text-4xl font-bold text-blue-600">
                      {getPrice(plan)}
                    </div>
                    {isAnnual && getSavings(plan) && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        💰 Économisez {getSavings(plan)}€/an
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li key={limitIndex} className="flex items-start opacity-60">
                        <div className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-slate-400"></div>
                        </div>
                        <span className="text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                        : ''
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    onClick={() => navigate('/signup')}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">❓ Questions Fréquentes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔄 Puis-je changer de plan ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Oui, vous pouvez passer à un plan supérieur à tout moment. 
                  La différence sera calculée au prorata.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💳 Quels moyens de paiement ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Nous acceptons les cartes bancaires, virements et prélèvements SEPA. 
                  Paiement sécurisé garanti.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🛡️ Vos données sont-elles sécurisées ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Absolument. Hébergement sécurisé en Europe, chiffrement bout en bout, 
                  conformité RGPD complète.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📞 Quel support inclus ?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Support email pour Starter, chat et téléphone pour Professional, 
                  support dédié 24/7 pour Enterprise.
                </p>
              </CardContent>
            </Card>
          </div>
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
            <p>© 2025 Leazr.co est une marque développée par iTakecare SRL. Tous droits réservés. 💙</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
