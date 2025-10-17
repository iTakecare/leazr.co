import React from 'react';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Zap, Calculator, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfessionalsSolutionsPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Briefcase className="h-8 w-8 text-blue-600" />,
      title: "Simplicité d'usage",
      description: "Interface intuitive conçue pour les professionnels",
      benefits: ["Prise en main rapide", "Processus simplifiés", "Support dédié"]
    },
    {
      icon: <Zap className="h-8 w-8 text-emerald-600" />,
      title: "Réactivité",
      description: "Réponses rapides et traitement accéléré",
      benefits: ["Validation rapide", "Support prioritaire", "Processus optimisés"]
    },
    {
      icon: <Calculator className="h-8 w-8 text-purple-600" />,
      title: "Tarification adaptée",
      description: "Prix ajustés aux volumes des professionnels",
      benefits: ["Tarifs préférentiels", "Transparence", "Facturation flexible"]
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "Accompagnement",
      description: "Support personnalisé pour votre activité",
      benefits: ["Conseiller dédié", "Formation incluse", "Suivi personnalisé"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">
              Solutions <span className="text-primary">Professionnels</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Des solutions de leasing pensées pour les PME et indépendants
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-muted rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
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
              onClick={() => navigate('/signup')}
            >
              Commencer l'essai gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProfessionalsSolutionsPage;
