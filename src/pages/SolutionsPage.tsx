import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';

const SolutionsPage: React.FC = () => {
  const navigate = useNavigate();

  const solutions = [
    {
      icon: <Users className="h-12 w-12 text-blue-600" />,
      title: "CRM Leasing",
      description: "Gérez vos clients et prospects avec un CRM adapté au leasing",
      features: [
        "Gestion complète des contacts",
        "Suivi des opportunités",
        "Historique des interactions",
        "Tableaux de bord personnalisables"
      ]
    },
    {
      icon: <BarChart className="h-12 w-12 text-emerald-600" />,
      title: "Calculateur",
      description: "Créez des simulations de leasing précises et rapides",
      features: [
        "Calculs automatisés",
        "Simulations multi-scénarios",
        "Génération de propositions",
        "Paramétrage flexible"
      ]
    },
    {
      icon: <Shield className="h-12 w-12 text-purple-600" />,
      title: "Contrats",
      description: "Générez et signez vos contrats en ligne",
      features: [
        "Templates personnalisables",
        "Signature électronique",
        "Archivage sécurisé",
        "Suivi des échéances"
      ]
    },
    {
      icon: <Zap className="h-12 w-12 text-orange-600" />,
      title: "Catalogue",
      description: "Gérez votre catalogue d'équipements",
      features: [
        "Base de données centralisée",
        "Gestion des prix",
        "Catégorisation flexible",
        "Recherche avancée"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-primary">Solutions complètes</span>
            <br />
            pour le leasing
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Des modules conçus pour optimiser chaque aspect de votre activité de leasing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Essayer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')}>
              Demander une démo
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-4 bg-muted rounded-xl">
                      {solution.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{solution.title}</CardTitle>
                      <CardDescription className="text-base">{solution.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {solution.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à optimiser votre activité ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Découvrez comment Leazr peut transformer votre façon de gérer le leasing.
          </p>
          <Button size="lg" onClick={() => navigate('/signup')}>
            Commencer gratuitement
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SolutionsPage;
