
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Share2, HelpCircle, Monitor, ArrowRight, Download, Clock, Eye, Calendar, Star, Play, FileText, Video, Users, Award, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();

  const resourceCategories = [
    {
      icon: <Book className="h-12 w-12 text-blue-600" />,
      title: "📚 Documentation Complète",
      description: "Guides détaillés pour maîtriser toutes les fonctionnalités",
      items: [
        { title: "Guide de démarrage rapide", type: "PDF", duration: "15 min", popular: true, downloads: "2.1k" },
        { title: "Manuel utilisateur CRM Leasing", type: "Web", duration: "45 min", popular: true, downloads: "1.8k" },
        { title: "API Documentation technique", type: "Web", duration: "30 min", popular: false, downloads: "650" },
        { title: "Guide d'intégration avancée", type: "PDF", duration: "25 min", popular: true, downloads: "1.2k" },
        { title: "Calculateur : mode d'emploi", type: "PDF", duration: "20 min", popular: true, downloads: "1.9k" },
        { title: "Contrats digitaux : guide complet", type: "Web", duration: "35 min", popular: false, downloads: "890" }
      ],
      cta: "Accéder à la documentation",
      totalResources: "50+ guides"
    },
    {
      icon: <Share2 className="h-12 w-12 text-emerald-600" />,
      title: "📝 Blog & Actualités Expert",
      description: "Conseils d'experts et actualités du secteur leasing",
      items: [
        { title: "Les tendances du leasing 2024", type: "Article", duration: "8 min", popular: true, downloads: "3.2k" },
        { title: "Optimiser sa rentabilité leasing", type: "Guide", duration: "12 min", popular: true, downloads: "2.8k" },
        { title: "Réglementation IFRS 16 expliquée", type: "Guide", duration: "20 min", popular: false, downloads: "1.1k" },
        { title: "Success story : AutoLease", type: "Étude de cas", duration: "6 min", popular: true, downloads: "1.6k" },
        { title: "Digitalisation du leasing", type: "Livre blanc", duration: "25 min", popular: false, downloads: "980" },
        { title: "ROI leasing : méthodes de calcul", type: "Article", duration: "10 min", popular: true, downloads: "2.1k" }
      ],
      cta: "Lire le blog",
      totalResources: "100+ articles"
    },
    {
      icon: <HelpCircle className="h-12 w-12 text-purple-600" />,
      title: "❓ FAQ & Support Détaillé",
      description: "Réponses complètes aux questions fréquentes",
      items: [
        { title: "Comment calculer un leasing ?", type: "FAQ", duration: "3 min", popular: true, downloads: "4.2k" },
        { title: "Configurer les intégrations", type: "FAQ", duration: "5 min", popular: true, downloads: "2.9k" },
        { title: "Gestion avancée des utilisateurs", type: "FAQ", duration: "4 min", popular: false, downloads: "1.4k" },
        { title: "Résolution problèmes courants", type: "Support", duration: "Variable", popular: true, downloads: "2.3k" },
        { title: "Sauvegardes et restauration", type: "FAQ", duration: "6 min", popular: false, downloads: "890" },
        { title: "Personnalisation interface", type: "FAQ", duration: "7 min", popular: false, downloads: "1.1k" }
      ],
      cta: "Consulter la FAQ",
      totalResources: "200+ réponses"
    },
    {
      icon: <Monitor className="h-12 w-12 text-orange-600" />,
      title: "🎓 Formations & Webinaires",
      description: "Sessions de formation en ligne et replays",
      items: [
        { title: "Maîtriser le calculateur leasing", type: "Webinaire", duration: "60 min", popular: true, downloads: "1.8k" },
        { title: "CRM avancé pour le leasing", type: "Formation", duration: "90 min", popular: true, downloads: "1.5k" },
        { title: "Générer des contrats efficacement", type: "Webinaire", duration: "45 min", popular: false, downloads: "1.2k" },
        { title: "Reporting et analytics", type: "Formation", duration: "75 min", popular: true, downloads: "1.4k" },
        { title: "Intégrations bancaires", type: "Webinaire", duration: "50 min", popular: false, downloads: "890" },
        { title: "Certification Leazr Expert", type: "Formation", duration: "4h", popular: false, downloads: "650" }
      ],
      cta: "S'inscrire aux formations",
      totalResources: "30+ sessions"
    }
  ];

  const featuredArticles = [
    {
      title: "🚀 Le guide complet du leasing moderne",
      excerpt: "Tout ce que vous devez savoir sur le leasing : avantages, calculs, aspects juridiques et tendances 2024",
      readTime: "15 min",
      category: "Guide Expert",
      date: "15 Mars 2024",
      author: "Marie Dubois, CEO Leazr",
      featured: true,
      downloads: "5.2k",
      rating: 4.9
    },
    {
      title: "📊 ROI : Mesurer l'efficacité de votre solution",
      excerpt: "Méthodes et KPIs pour évaluer précisément l'impact de vos outils de gestion de leasing sur votre rentabilité",
      readTime: "8 min",
      category: "Analyse Business",
      date: "10 Mars 2024",
      author: "Pierre Martin, CTO",
      featured: false,
      downloads: "3.1k",
      rating: 4.7
    },
    {
      title: "🔮 Tendances 2024 du secteur leasing",
      excerpt: "Les évolutions du marché, nouvelles réglementations et opportunités à saisir cette année",
      readTime: "12 min",
      category: "Tendances",
      date: "5 Mars 2024",
      author: "Sophie Laurent, Head of Product",
      featured: false,
      downloads: "2.8k",
      rating: 4.8
    },
    {
      title: "🏆 Success Story : Comment LeasePro a doublé son CA",
      excerpt: "Étude de cas détaillée : transformation digitale et résultats concrets d'un acteur majeur du leasing",
      readTime: "10 min",
      category: "Success Story",
      date: "1 Mars 2024",
      author: "Antoine Rousseau, Head of Sales",
      featured: false,
      downloads: "4.1k",
      rating: 4.9
    }
  ];

  const upcomingWebinars = [
    {
      title: "🎯 Optimiser sa conversion prospects en 2024",
      date: "25 Mars 2024",
      time: "14h00-15h30",
      speaker: "Marie Dubois, CEO Leazr",
      speakerTitle: "15 ans d'expérience leasing",
      attendees: 127,
      level: "Intermédiaire",
      description: "Techniques avancées pour améliorer votre taux de conversion et raccourcir votre cycle de vente"
    },
    {
      title: "🔧 Nouvelles fonctionnalités Q1 2024",
      date: "30 Mars 2024",
      time: "11h00-12h30",
      speaker: "Pierre Martin, CTO",
      speakerTitle: "Expert technique Leazr",
      attendees: 89,
      level: "Tous niveaux",
      description: "Découverte des dernières innovations et roadmap produit pour le reste de l'année"
    },
    {
      title: "💼 Réussir sa transformation digitale leasing",
      date: "5 Avril 2024",
      time: "15h00-16h30",
      speaker: "Sophie Laurent, Head of Product",
      speakerTitle: "Spécialiste transformation digitale",
      attendees: 156,
      level: "Avancé",
      description: "Méthodologie complète pour digitaliser efficacement vos processus de leasing"
    },
    {
      title: "📊 Analytics avancés : pilotez votre activité",
      date: "10 Avril 2024",
      time: "14h00-15h00",
      speaker: "Marc Durand, Data Analyst",
      speakerTitle: "Expert données secteur financier",
      attendees: 94,
      level: "Intermédiaire",
      description: "Tableaux de bord et KPIs essentiels pour optimiser votre performance leasing"
    }
  ];

  const downloadables = [
    {
      title: "Guide démarrage rapide",
      description: "Premiers pas avec Leazr",
      type: "PDF",
      size: "2.3 MB",
      downloads: "2.1k",
      category: "Getting Started",
      featured: true
    },
    {
      title: "Checklist mise en route complète",
      description: "90 points de contrôle pour un déploiement réussi",
      type: "PDF",
      size: "890 KB",
      downloads: "1.8k",
      category: "Implementation",
      featured: true
    },
    {
      title: "Templates contrats leasing",
      description: "20 modèles prêts à l'emploi",
      type: "DOCX",
      size: "1.5 MB",
      downloads: "3.2k",
      category: "Templates",
      featured: true
    },
    {
      title: "Calculatrices Excel avancées",
      description: "Formules de calcul leasing complètes",
      type: "XLSX",
      size: "3.1 MB",
      downloads: "2.8k",
      category: "Tools",
      featured: true
    },
    {
      title: "Livre blanc : Futur du leasing",
      description: "Tendances et évolutions à 5 ans",
      type: "PDF",
      size: "4.2 MB",
      downloads: "1.9k",
      category: "Research",
      featured: false
    },
    {
      title: "Guide intégrations API",
      description: "Documentation technique complète",
      type: "PDF",
      size: "2.8 MB",
      downloads: "1.1k",
      category: "Technical",
      featured: false
    }
  ];

  const communityStats = [
    { metric: "2,500+", label: "Membres actifs", icon: <Users className="h-6 w-6" /> },
    { metric: "150+", label: "Discussions par mois", icon: <Share2 className="h-6 w-6" /> },
    { metric: "95%", label: "Questions résolues", icon: <Target className="h-6 w-6" /> },
    { metric: "4.8/5", label: "Satisfaction communauté", icon: <Star className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            📚 Centre de ressources expert leasing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Ressources & Formation
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Leasing Expert
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎓 Plus de 400 ressources pour maîtriser Leazr et exceller dans votre activité de leasing : 
            guides, formations, webinaires et support communautaire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
            >
              🚀 Explorer les ressources
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-10 py-4 text-xl"
            >
              🎓 Rejoindre la communauté
            </Button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {communityStats.map((stat, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-100">
                <div className="flex justify-center mb-2 text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-blue-600">{stat.metric}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📋 Catégories de Ressources
            </h2>
            <p className="text-xl text-slate-600">
              Tout ce dont vous avez besoin pour réussir avec Leazr
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {resourceCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border">
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{category.title}</CardTitle>
                      <CardDescription className="text-base">{category.description}</CardDescription>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {category.totalResources}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {category.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            {item.popular && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                Populaire
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {item.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {item.downloads}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="ml-2">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button className="w-full" size="lg">
                      {category.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
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
              ⭐ Articles en Vedette
            </h2>
            <p className="text-xl text-slate-600">
              Les contenus les plus consultés par notre communauté
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {featuredArticles.map((article, index) => (
              <Card key={index} className={`hover:shadow-lg transition-shadow ${article.featured ? 'border-2 border-blue-200' : ''}`}>
                {article.featured && (
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-t-lg">
                    <Badge className="bg-white text-blue-600 mb-2">
                      <Award className="h-3 w-3 mr-1" />
                      Article vedette
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="text-xs">
                      {article.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3 w-3 text-yellow-400" />
                      {article.rating}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{article.excerpt}</p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>{article.author}</span>
                    <span>{article.date}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {article.downloads}
                      </span>
                    </div>
                    <Button size="sm" variant="outline">
                      Lire l'article
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Webinars */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎓 Webinaires à Venir
            </h2>
            <p className="text-xl text-slate-600">
              Participez à nos sessions de formation en direct
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {upcomingWebinars.map((webinar, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-blue-600 text-white">
                      <Calendar className="h-3 w-3 mr-1" />
                      {webinar.date}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {webinar.level}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{webinar.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{webinar.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{webinar.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span>{webinar.attendees} inscrits</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-sm">{webinar.speaker}</div>
                        <div className="text-xs text-slate-500">{webinar.speakerTitle}</div>
                      </div>
                    </div>
                    <Button className="w-full" size="lg">
                      <Video className="h-4 w-4 mr-2" />
                      S'inscrire gratuitement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📥 Téléchargements Populaires
            </h2>
            <p className="text-xl text-slate-600">
              Outils et guides prêts à utiliser
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloadables.map((download, index) => (
              <Card key={index} className={`hover:shadow-lg transition-shadow ${download.featured ? 'border-2 border-emerald-200' : ''}`}>
                <CardContent className="p-6">
                  {download.featured && (
                    <Badge className="bg-emerald-600 text-white mb-3">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Populaire
                    </Badge>
                  )}
                  
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{download.title}</h3>
                      <p className="text-sm text-slate-600">{download.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {download.type}
                      </Badge>
                      {download.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {download.downloads}
                    </span>
                  </div>
                  
                  <Button className="w-full" size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
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
            🚀 Prêt à développer votre expertise ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            📚 Accédez à toutes nos ressources premium et rejoignez une communauté 
            de 2500+ professionnels du leasing qui partagent leurs bonnes pratiques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🎓 Accéder aux ressources premium
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 text-xl"
            >
              💬 Rejoindre la communauté
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ResourcesPage;
