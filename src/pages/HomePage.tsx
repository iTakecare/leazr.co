import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Calculator, FileText, Package, ArrowRight } from 'lucide-react';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import Logo from '@/components/layout/Logo';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "CRM Leasing",
      description: "Gérez vos clients et prospects efficacement"
    },
    {
      icon: <Calculator className="h-8 w-8" />,
      title: "Calculateur",
      description: "Créez des simulations de leasing précises"
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Contrats",
      description: "Générez et signez vos contrats en ligne"
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: "Catalogue",
      description: "Gérez votre catalogue d'équipements"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-8">
            <Logo className="h-20" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Votre solution de
            <br />
            <span className="text-primary">gestion de contrats de leasing</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Simplifiez la gestion de votre activité de leasing avec une plateforme complète
            et intuitive.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Essayer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Modules principaux
            </h2>
            <p className="text-lg text-muted-foreground">
              Tout ce dont vous avez besoin pour gérer votre activité
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="mb-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Essayez Leazr gratuitement et découvrez comment optimiser votre activité de leasing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Essai gratuit
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')}>
              Nous contacter
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
