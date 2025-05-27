
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, ArrowRight } from 'lucide-react';

const BlogPage = () => {
  const articles = [
    {
      id: 1,
      title: 'Les tendances du leasing en 2024',
      excerpt: 'Découvrez les principales évolutions du marché du leasing et comment s\'y adapter.',
      author: 'Équipe Leazr',
      date: '15 Mars 2024',
      category: 'Tendances',
      readTime: '5 min'
    },
    {
      id: 2,
      title: 'Optimiser ses calculs de leasing',
      excerpt: 'Guide complet pour maîtriser les calculs de mensualités et optimiser vos offres.',
      author: 'Expert Leazr',
      date: '10 Mars 2024',
      category: 'Guide',
      readTime: '8 min'
    },
    {
      id: 3,
      title: 'CRM : gérer efficacement ses prospects',
      excerpt: 'Meilleures pratiques pour transformer vos prospects en clients fidèles.',
      author: 'Consultant Leazr',
      date: '5 Mars 2024',
      category: 'CRM',
      readTime: '6 min'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Blog Leazr</h1>
            <p className="text-xl mb-8">
              Conseils d'experts, actualités et guides pour optimiser votre activité de leasing
            </p>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    <span className="text-sm text-gray-500">{article.readTime}</span>
                  </div>
                  <CardTitle className="text-xl">{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{article.excerpt}</p>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <User className="h-4 w-4 mr-1" />
                    <span className="mr-4">{article.author}</span>
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{article.date}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    Lire l'article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Restez informé</h2>
            <p className="text-gray-600 mb-8">
              Recevez nos derniers articles et conseils directement dans votre boîte mail
            </p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Votre email" 
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button>S'abonner</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
