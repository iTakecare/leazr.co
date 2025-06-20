import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Share2, HelpCircle, Monitor, ArrowRight, Download, Clock, Eye, Calendar, Star, Play, FileText, Video, Users, Award, Target, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import Logo from '@/components/layout/Logo';

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('ResourcesPage rendering successfully');

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

      {/* Confirmation que la page fonctionne */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            ✅ Page Ressources chargée avec succès !
          </h2>
          <p className="text-xl text-slate-600">
            Cette page fonctionne maintenant correctement. Vous pouvez naviguer vers les autres sections.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button onClick={() => navigate('/solutions')}>Voir Solutions</Button>
            <Button onClick={() => navigate('/services')} variant="outline">Voir Services</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ResourcesPage;
