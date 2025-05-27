
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BookOpen, HelpCircle, Video, Download, ArrowRight } from 'lucide-react';

const ResourcesPage = () => {
  const resources = [
    {
      category: 'Documentation',
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      items: [
        { title: 'Guide de démarrage rapide', type: 'PDF', description: 'Commencez avec Leazr en 10 minutes' },
        { title: 'Manuel utilisateur complet', type: 'PDF', description: 'Documentation complète de la plateforme' },
        { title: 'API Documentation', type: 'Web', description: 'Intégrez Leazr avec vos systèmes' }
      ]
    },
    {
      category: 'Formations',
      icon: <Video className="h-8 w-8 text-green-600" />,
      items: [
        { title: 'Webinaire : CRM Leasing', type: 'Vidéo', description: 'Maîtrisez le CRM en 1 heure' },
        { title: 'Formation calculateur', type: 'Vidéo', description: 'Optimisez vos calculs de leasing' },
        { title: 'Gestion des contrats', type: 'Vidéo', description: 'De la création à la signature' }
      ]
    },
    {
      category: 'Support',
      icon: <HelpCircle className="h-8 w-8 text-purple-600" />,
      items: [
        { title: 'FAQ Complète', type: 'Web', description: 'Réponses aux questions fréquentes' },
        { title: 'Tickets de support', type: 'Web', description: 'Assistance technique personnalisée' },
        { title: 'Chat en direct', type: 'Web', description: 'Support immédiat pendant les heures ouvrables' }
      ]
    },
    {
      category: 'Guides Métier',
      icon: <BookOpen className="h-8 w-8 text-orange-600" />,
      items: [
        { title: 'Réglementation leasing 2024', type: 'PDF', description: 'Mise à jour des aspects légaux' },
        { title: 'Bonnes pratiques CRM', type: 'PDF', description: 'Optimisez votre relation client' },
        { title: 'Calculs de rentabilité', type: 'Excel', description: 'Templates de calculs avancés' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Ressources</h1>
            <p className="text-xl mb-8">
              Tout ce dont vous avez besoin pour maîtriser Leazr et optimiser votre activité
            </p>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {resources.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {category.icon}
                    <CardTitle className="text-2xl">{category.category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{item.title}</h3>
                            <p className="text-gray-600 text-sm">{item.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.type}</span>
                            <Button size="sm" variant="outline">
                              {item.type === 'PDF' || item.type === 'Excel' ? <Download className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Besoin d'aide personnalisée ?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Notre équipe d'experts est disponible pour vous accompagner dans votre utilisation de Leazr
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Contacter le support</Button>
            <Button size="lg" variant="outline">Planifier une démo</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResourcesPage;
