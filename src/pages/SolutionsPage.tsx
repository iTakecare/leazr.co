
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calculator, Shield, Database, ArrowRight } from 'lucide-react';

const SolutionsPage = () => {
  const solutions = [
    {
      id: 'crm',
      title: 'CRM Leasing Intégré',
      icon: <Users className="h-8 w-8 text-blue-600" />,
      description: 'Solution CRM complète spécialement conçue pour l\'activité de leasing avec gestion des prospects, clients et partenaires.',
      features: ['Gestion des prospects', 'Suivi client complet', 'Intégration partenaires', 'Tableau de bord temps réel']
    },
    {
      id: 'calculateur',
      title: 'Calculateur Intelligent',
      icon: <Calculator className="h-8 w-8 text-green-600" />,
      description: 'Moteur de calcul avancé pour tous vos besoins de leasing : mensualités, taux, rachats et simulations.',
      features: ['Calculs de mensualités', 'Gestion des taux', 'Options de rachat', 'Simulations avancées']
    },
    {
      id: 'contrats',
      title: 'Contrats Digitaux',
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      description: 'Génération automatique et signature électronique des contrats de location financière.',
      features: ['Génération automatique', 'Signature électronique', 'Templates personnalisés', 'Archivage sécurisé']
    },
    {
      id: 'catalogue',
      title: 'Catalogue Équipements',
      icon: <Database className="h-8 w-8 text-orange-600" />,
      description: 'Base de données complète d\'équipements avec gestion des variantes, tarifs et disponibilités.',
      features: ['Catalogue complet', 'Gestion des variantes', 'Tarification flexible', 'Mise à jour temps réel']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Nos Solutions Leasing</h1>
            <p className="text-xl mb-8">
              Des outils métier conçus spécialement pour optimiser votre activité de leasing
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Découvrir nos solutions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {solutions.map((solution) => (
              <Card key={solution.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {solution.icon}
                    <CardTitle className="text-2xl">{solution.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">{solution.description}</p>
                  <ul className="space-y-2">
                    {solution.features.map((feature, index) => (
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

export default SolutionsPage;
