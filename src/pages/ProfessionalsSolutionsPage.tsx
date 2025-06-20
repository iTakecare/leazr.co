
import React from 'react';
import MainNavigation from '@/components/layout/MainNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Zap, Calculator, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfessionalsSolutionsPage = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <MainNavigation />
      
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Solutions Professionnels
              </span>
            </h1>
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
      </div>
    </div>
  );
};

export default ProfessionalsSolutionsPage;
