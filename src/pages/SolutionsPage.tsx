
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Star, Zap, Shield, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const SolutionsPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('SolutionsPage rendering successfully');

  const solutions = [
    {
      icon: <Cpu className="h-12 w-12 text-blue-600" />,
      title: "🏢 Solutions Entreprises",
      description: "Plateforme complète pour grandes entreprises avec besoins avancés",
      features: [
        "CRM multi-utilisateurs avancé",
        "Gestion de portefeuille complexe", 
        "Intégrations ERP/CRM existants",
        "Reporting financier approfondi",
        "Support dédié 24/7"
      ],
      price: "Sur mesure",
      popular: false
    },
    {
      icon: <Zap className="h-12 w-12 text-emerald-600" />,
      title: "💼 Solutions Professionnels",
      description: "Parfait pour PME et indépendants du secteur leasing",
      features: [
        "Interface intuitive et rapide",
        "Calculateur leasing intelligent",
        "Génération automatique de contrats",
        "Suivi clients simplifié",
        "Formation incluse"
      ],
      price: "À partir de 49€/mois",
      popular: true
    },
    {
      icon: <Shield className="h-12 w-12 text-purple-600" />,
      title: "🤝 CRM Leasing Spécialisé",
      description: "Solution CRM pensée spécifiquement pour le secteur du leasing",
      features: [
        "Pipeline de vente optimisé leasing",
        "Gestion des commissions automatisée",
        "Tableaux de bord sectoriels",
        "Workflows métier pré-configurés",
        "API ouverte"
      ],
      price: "À partir de 79€/mois",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            💼 Solutions métier leasing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Solutions Leazr
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pour Tous Profils
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Que vous soyez une grande entreprise, un professionnel indépendant ou une PME, 
            découvrez la solution Leazr adaptée à vos besoins spécifiques.
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className={`relative hover:shadow-lg transition-shadow ${solution.popular ? 'ring-2 ring-blue-500' : ''}`}>
                {solution.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                      ⭐ Plus populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="mb-4 flex justify-center">
                    {solution.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{solution.title}</CardTitle>
                  <CardDescription>{solution.description}</CardDescription>
                  <div className="text-2xl font-bold text-blue-600 mt-4">
                    {solution.price}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {solution.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={solution.popular ? "default" : "outline"}
                    onClick={() => navigate('/contact')}
                  >
                    Découvrir cette solution
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Confirmation */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            ✅ Page Solutions créée avec succès !
          </h2>
          <p className="text-xl text-slate-600">
            Cette page présente nos différentes solutions métier.
          </p>
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
