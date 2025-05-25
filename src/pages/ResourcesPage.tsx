
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Share2, HelpCircle, Monitor, ArrowRight, Download, Clock, Eye, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();

  const resourceCategories = [
    {
      icon: <Book className="h-12 w-12 text-blue-600" />,
      title: "📚 Documentation",
      description: "Guides complets pour maîtriser toutes les fonctionnalités",
      items: [
        { title: "Guide de démarrage rapide", type: "PDF", duration: "15 min", popular: true },
        { title: "Manuel utilisateur CRM", type: "Web", duration: "45 min", popular: false },
        { title: "API Documentation", type: "Web", duration: "30 min", popular: false },
        { title: "Guide d'intégration", type: "PDF", duration: "25 min", popular: true }
      ],
      cta: "Accéder à la documentation"
    },
    {
      icon: <Share2 className="h-12 w-12 text-emerald-600" />,
      title: "📝 Blog & Actualités",
      description: "Conseils d'experts et actualités du secteur leasing",
      items: [
        { title: "Les tendances du leasing IT 2024", type: "Article", duration: "8 min", popular: true },
        { title: "Optimiser sa rentabilité", type: "Article", duration: "12 min", popular: true },
        { title: "Réglementation IFRS 16", type: "Guide", duration: "20 min", popular: false },
        { title: "Success story client", type: "Étude de cas", duration: "6 min", popular: false }
      ],
      cta: "Lire le blog"
    },
    {
      icon: <HelpCircle className="h-12 w-12 text-purple-600" />,
      title: "❓ FAQ & Support",
      description: "Réponses aux questions les plus fréquentes",
      items: [
        { title: "Comment calculer un leasing ?", type: "FAQ", duration: "3 min", popular: true },
        { title: "Configurer les intégrations", type: "FAQ", duration: "5 min", popular: true },
        { title: "Gestion des utilisateurs", type: "FAQ", duration: "4 min", popular: false },
        { title: "Résolution des problèmes", type: "Support", duration: "Variable", popular: false }
      ],
      cta: "Consulter la FAQ"
    },
    {
      icon: <Monitor className="h-12 w-12 text-orange-600" />,
      title: "🎓 Webinaires & Formations",
      description: "Sessions de formation en ligne et replays disponibles",
      items: [
        { title: "Maîtriser le calculateur", type: "Webinaire", duration: "60 min", popular: true },
        { title: "CRM avancé pour le leasing", type: "Formation", duration: "90 min", popular: true },
        { title: "Générer des contrats", type: "Webinaire", duration: "45 min", popular: false },
        { title: "Reporting et analytics", type: "Formation", duration: "75 min", popular: false }
      ],
      cta: "S'inscrire aux webinaires"
    }
  ];

  const featuredArticles = [
    {
      title: "🚀 Le guide complet du leasing informatique",
      excerpt: "Tout ce que vous devez savoir sur le leasing IT : avantages, calculs, aspects juridiques...",
      readTime: "15 min",
      category: "Guide",
      date: "15 Mars 2024",
      featured: true
    },
    {
      title: "📊 ROI : Comment mesurer l'efficacité de votre solution",
      excerpt: "Méthodes et KPIs pour évaluer l'impact de vos outils de gestion de leasing",
      readTime: "8 min",
      category: "Analyse",
      date: "10 Mars 2024",
      featured: false
    },
    {
      title: "🔮 Tendances 2024 du leasing informatique",
      excerpt: "Les évolutions du marché et les opportunités à saisir cette année",
      readTime: "12 min",
      category: "Tendances",
      date: "5 Mars 2024",
      featured: false
    }
  ];

  const upcomingWebinars = [
    {
      title: "🎯 Optimiser sa conversion prospects",
      date: "25 Mars 2024",
      time: "14h00-15h00",
      speaker: "Marie Dubois, CEO Leazr",
      attendees: 127
    },
    {
      title: "🔧 Nouvelles fonctionnalités Q1 2024",
      date: "30 Mars 2024",
      time: "11h00-12h00",
      speaker: "Pierre Martin, CTO",
      attendees: 89
    },
    {
      title: "💼 Réussir sa transformation digitale",
      date: "5 Avril 2024",
      time: "15h00-16h30",
      speaker: "Sophie Lefebvre, Head of Product",
      attendees: 156
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            📚 Centre de ressources
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Ressources & Support
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎓 Tout ce dont vous avez besoin pour maîtriser Leazr et optimiser votre activité de leasing
          </p>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8">
            {resourceCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{category.title}</CardTitle>
                      <CardDescription className="text-base">{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{item.title}</span>
                            {item.popular && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                🔥 Populaire
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.duration}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full" variant="outline">
                    {category.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              ⭐ Articles à la une
            </h2>
            <p className="text-xl text-slate-600">
              Nos contenus les plus populaires pour vous accompagner
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {featuredArticles.map((article, index) => (
              <Card key={index} className={`hover:shadow-lg transition-shadow ${article.featured ? 'border-2 border-blue-200' : ''}`}>
                <CardContent className="p-6">
                  {article.featured && (
                    <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200">
                      ⭐ Article vedette
                    </Badge>
                  )}
                  <h3 className="font-semibold mb-3 text-lg">{article.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <Badge variant="outline" className="mb-4">
                    {article.category}
                  </Badge>
                  <Button className="w-full" size="sm" variant="outline">
                    Lire l'article
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Webinars */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎓 Webinaires à venir
            </h2>
            <p className="text-xl text-slate-600">
              Formations gratuites animées par nos experts
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {upcomingWebinars.map((webinar, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">{webinar.title}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      {webinar.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      {webinar.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Monitor className="h-4 w-4" />
                      {webinar.speaker}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500">{webinar.attendees} inscrits</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Gratuit
                    </Badge>
                  </div>
                  <Button className="w-full" size="sm">
                    S'inscrire
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📥 Téléchargements utiles
            </h2>
            <p className="text-xl text-slate-600">
              Ressources à emporter pour votre équipe
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Guide démarrage rapide", type: "PDF", size: "2.3 MB", downloads: "1.2k" },
              { title: "Checklist mise en route", type: "PDF", size: "890 KB", downloads: "890" },
              { title: "Templates contrats", type: "DOCX", size: "1.5 MB", downloads: "654" },
              { title: "Calculatrices Excel", type: "XLSX", size: "3.1 MB", downloads: "1.8k" }
            ].map((download, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{download.title}</h3>
                  <div className="text-xs text-slate-500 mb-4">
                    <div>{download.type} • {download.size}</div>
                    <div>{download.downloads} téléchargements</div>
                  </div>
                  <Button size="sm" className="w-full">
                    Télécharger
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🤝 Besoin d'aide personnalisée ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Notre équipe support est là pour vous accompagner dans votre réussite
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/contact')}
            >
              📞 Contacter le support
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🚀 Commencer maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Logo variant="full" logoSize="lg" showText={false} className="mb-4 mx-auto" />
            <p className="text-slate-600">
              💼 La solution métier de référence pour le leasing informatique.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResourcesPage;
