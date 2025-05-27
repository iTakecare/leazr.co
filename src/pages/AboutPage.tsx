
import React from 'react';
import MainNavigation from '@/components/layout/MainNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, Award, ArrowRight } from 'lucide-react';

const AboutPage = () => {
  const values = [
    {
      icon: <Target className="h-8 w-8 text-blue-600" />,
      title: 'Notre Mission',
      description: 'Simplifier et optimiser l\'activité de leasing grâce à des outils métier innovants.'
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: 'Notre Équipe',
      description: 'Des experts du leasing et de la technologie unis pour créer les meilleures solutions.'
    },
    {
      icon: <Award className="h-8 w-8 text-purple-600" />,
      title: 'Notre Engagement',
      description: 'Accompagner nos clients vers le succès avec des solutions performantes et un support de qualité.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">À Propos de Leazr</h1>
            <p className="text-xl mb-8">
              La solution métier de référence pour professionnaliser et développer votre activité de leasing
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Notre Histoire</h2>
            <div className="prose prose-lg mx-auto">
              <p className="text-gray-600 mb-6">
                Leazr est né de la volonté de transformer l'activité de leasing en proposant des outils métier 
                spécialement conçus pour répondre aux défis de ce secteur en pleine évolution.
              </p>
              <p className="text-gray-600 mb-6">
                Forte de notre expérience dans le domaine financier et technologique, notre équipe a développé 
                une plateforme complète qui accompagne les entreprises de leasing dans leur croissance et leur 
                professionnalisation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Nos Valeurs</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Rejoignez-nous</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Découvrez comment Leazr peut transformer votre activité de leasing
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            Essai gratuit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
