import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Briefcase, Headphones, Book, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: <Building className="h-12 w-12 text-blue-600" />,
      title: "Solutions Entreprises",
      description: "Accompagnement sur mesure pour les organisations",
      features: [
        "Configuration personnalisée",
        "Formation de vos équipes",
        "Support prioritaire",
        "Intégrations sur mesure"
      ]
    },
    {
      icon: <Briefcase className="h-12 w-12 text-emerald-600" />,
      title: "Solutions PME",
      description: "Offres adaptées aux PME et indépendants",
      features: [
        "Mise en place rapide",
        "Tarifs adaptés",
        "Support réactif",
        "Formation incluse"
      ]
    },
    {
      icon: <Headphones className="h-12 w-12 text-purple-600" />,
      title: "Support Technique",
      description: "Assistance pour tous vos besoins",
      features: [
        "Support email",
        "Base de connaissances",
        "Tutoriels vidéo",
        "FAQ complète"
      ]
    },
    {
      icon: <Book className="h-12 w-12 text-orange-600" />,
      title: "Formation",
      description: "Apprenez à utiliser Leazr efficacement",
      features: [
        "Formation initiale",
        "Webinaires réguliers",
        "Documentation complète",
        "Support pédagogique"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-primary">Services</span> et accompagnement
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Un accompagnement personnalisé pour optimiser votre utilisation de Leazr.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/contact')}>
              Parler à un expert
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
              Voir les tarifs
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                      <CardDescription className="text-base">{service.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
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
            Besoin d'aide ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Notre équipe est là pour vous accompagner dans votre projet.
          </p>
          <Button size="lg" onClick={() => navigate('/contact')}>
            Contactez-nous
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicesPage;
