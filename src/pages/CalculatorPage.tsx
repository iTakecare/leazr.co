
import React from 'react';
import MainNavigation from '@/components/layout/MainNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, TrendingUp, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CalculatorPage = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <MainNavigation />
      
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Calculateur Intelligent
              </span>
            </h1>
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
      </div>
    </div>
  );
};

export default CalculatorPage;
