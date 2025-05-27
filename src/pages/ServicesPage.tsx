
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Briefcase, HelpCircle, GraduationCap, ArrowRight } from 'lucide-react';

const ServicesPage = () => {
  const services = [
    {
      id: 'entreprises',
      title: 'Solutions Entreprises',
      icon: <Building className="h-8 w-8 text-blue-600" />,
      description: 'Services complets adaptés aux besoins des grandes entreprises et groupes.',
      features: ['Support dédié', 'Formation équipes', 'Intégration SI', 'SLA garantis']
    },
    {
      id: 'professionnels',
      title: 'Solutions Professionnels',
      icon: <Briefcase className="h-8 w-8 text-green-600" />,
      description: 'Offres spécialement conçues pour les PME et professionnels indépendants.',
      features: ['Tarifs préférentiels', 'Setup rapide', 'Support prioritaire', 'Formation incluse']
    },
    {
      id: 'support',
      title: 'Support Technique',
      icon: <HelpCircle className="h-8 w-8 text-purple-600" />,
      description: 'Assistance technique complète pour vous accompagner au quotidien.',
      features: ['Support 24/7', 'Chat en direct', 'Base de connaissances', 'Tickets prioritaires']
    },
    {
      id: 'formation',
      title: 'Formation & Accompagnement',
      icon: <GraduationCap className="h-8 w-8 text-orange-600" />,
      description: 'Programmes de formation pour maîtriser tous les aspects de la plateforme.',
      features: ['Webinaires réguliers', 'Formation sur site', 'Certification', 'Ressources exclusives']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Nos Services</h1>
            <p className="text-xl mb-8">
              Un accompagnement complet pour réussir votre activité de leasing
            </p>
            <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
              Contactez-nous
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {service.icon}
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <ArrowRight className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
