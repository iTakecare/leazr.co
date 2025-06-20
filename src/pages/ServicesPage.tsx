import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Briefcase, Headphones, Book, ArrowRight, Users, Star, Clock, Award, Target, Zap, CheckCircle, Phone, Mail, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('ServicesPage rendering successfully');

  const services = [
    {
      icon: <Building className="h-12 w-12 text-blue-600" />,
      title: "🏢 Solutions Entreprises",
      description: "Accompagnement sur mesure pour les grandes organisations",
      features: [
        "🎯 Audit personnalisé de vos besoins et processus",
        "🔧 Personnalisation avancée de l'interface et workflows",
        "👥 Formation équipe dédiée sur site ou à distance",
        "🔗 Intégrations sur mesure avec vos systèmes existants",
        "📊 Reporting personnalisé et tableaux de bord executives",
        "🆘 Support prioritaire avec interlocuteur dédié",
        "🔄 Migration de données depuis vos anciens outils",
        "📋 Documentation technique complète personnalisée"
      ],
      price: "Sur devis personnalisé",
      cta: "Demander un audit gratuit",
      popular: false,
      clients: "50+ grandes entreprises",
      sla: "99.9% disponibilité garantie"
    },
    {
      icon: <Briefcase className="h-12 w-12 text-emerald-600" />,
      title: "💼 Solutions Professionnels",
      description: "Offres adaptées aux indépendants et PME",
      features: [
        "⚡ Mise en place rapide en 48h",
        "💰 Tarifs préférentiels pour PME",
        "📱 Outils mobiles optimisés terrain",
        "🎓 Webinaires gratuits chaque semaine",
        "💬 Communauté d'entraide active",
        "📧 Support email réactif sous 4h",
        "📚 Bibliothèque de ressources complète",
        "🔄 Formation continue incluse"
      ],
      price: "À partir de 49€/mois",
      cta: "Découvrir nos plans",
      popular: true,
      clients: "150+ PME accompagnées",
      sla: "Support 9h-18h en semaine"
    },
    {
      icon: <Headphones className="h-12 w-12 text-purple-600" />,
      title: "🆘 Support Technique",
      description: "Assistance dédiée pour tous vos besoins",
      features: [
        "🕐 Support 24h/24 7j/7 (plans Business+)",
        "📞 Hotline dédiée avec priorité",
        "💻 Prise en main à distance immédiate",
        "📚 Base de connaissances complète et actualisée",
        "🎥 Tutoriels vidéo détaillés par fonctionnalité",
        "🔧 Maintenance préventive proactive",
        "📊 Monitoring proactif de vos performances",
        "🚨 Alertes temps réel et résolution rapide"
      ],
      price: "Inclus dans tous les plans",
      cta: "Contacter le support",
      popular: false,
      clients: "200+ clients satisfaits",
      sla: "Résolution < 24h garantie"
    },
    {
      icon: <Book className="h-12 w-12 text-orange-600" />,
      title: "🎓 Formation & Accompagnement",
      description: "Devenez expert de notre solution",
      features: [
        "📖 Formation initiale complète (8h)",
        "🎯 Sessions personnalisées par métier",
        "🏆 Certification utilisateur officielle",
        "📱 Formation mobile et terrain",
        "👥 Ateliers collectifs inter-entreprises",
        "📋 Support pédagogique et exercices pratiques",
        "🔄 Formation continue aux nouvelles fonctionnalités",
        "🎪 Événements utilisateurs annuels"
      ],
      price: "Inclus Pro/Business",
      cta: "Réserver une formation",
      popular: false,
      clients: "500+ utilisateurs formés",
      sla: "Satisfaction 98% garantie"
    }
  ];

  const testimonials = [
    {
      name: "Claire Moreau",
      company: "LeaseTech Solutions",
      role: "Directrice Générale",
      content: "Le service d'accompagnement Leazr a été exceptionnel. L'équipe nous a aidés à optimiser tous nos processus de leasing et nous avons gagné 3 mois sur notre déploiement initial.",
      rating: 5,
      sector: "Équipements industriels",
      size: "200+ collaborateurs"
    },
    {
      name: "Philippe Durand",
      company: "Financement Pro",
      role: "Responsable Commercial",
      content: "Formation très complète et support réactif. Nous avons gagné 60% de temps sur nos calculs de leasing et nos équipes sont autonomes en 2 semaines.",
      rating: 5,
      sector: "Multi-équipements",
      size: "50 collaborateurs"
    },
    {
      name: "Sophie Laurent",
      company: "LeasePartners",
      role: "Chef de Projet Digital",
      content: "L'intégration avec nos outils existants s'est faite sans accroc grâce à l'équipe technique Leazr. Support exemplaire et expertise reconnue.",
      rating: 5,
      sector: "Véhicules",
      size: "100+ collaborateurs"
    },
    {
      name: "Marc Dubois",
      company: "AutoLease France",
      role: "Directeur Opérations",
      content: "ROI atteint en 4 mois grâce à l'accompagnement personnalisé. L'équipe Leazr comprend vraiment les enjeux du leasing automobile.",
      rating: 5,
      sector: "Automobile",
      size: "300+ collaborateurs"
    }
  ];

  const process = [
    {
      step: "1",
      title: "🔍 Analyse & Audit",
      description: "Audit complet de vos besoins, processus actuels et objectifs business",
      duration: "1-2 semaines",
      delivrables: ["Rapport d'audit", "Recommandations", "Roadmap personnalisée"]
    },
    {
      step: "2",
      title: "🎯 Personnalisation",
      description: "Configuration sur mesure de la solution selon vos spécificités métier",
      duration: "2-4 semaines",
      delivrables: ["Paramétrage complet", "Intégrations", "Tests utilisateurs"]
    },
    {
      step: "3",
      title: "🚀 Déploiement",
      description: "Mise en production progressive et formation complète de vos équipes",
      duration: "2-3 semaines",
      delivrables: ["Go-live", "Formation", "Documentation"]
    },
    {
      step: "4",
      title: "📈 Optimisation",
      description: "Suivi performance, optimisations continues et support dédié",
      duration: "En continu",
      delivrables: ["Reporting", "Optimisations", "Support permanent"]
    }
  ];

  const supportLevels = [
    {
      level: "Standard",
      description: "Support email 9h-18h",
      responseTime: "< 4h",
      channels: ["Email", "Ticket"],
      price: "Inclus Starter",
      features: ["Base de connaissances", "Tutoriels vidéo", "FAQ complète"]
    },
    {
      level: "Prioritaire",
      description: "Support multi-canal étendu",
      responseTime: "< 2h",
      channels: ["Email", "Téléphone", "Chat"],
      price: "Inclus Pro",
      features: ["Toutes fonctionnalités Standard", "Support téléphonique", "Chat en direct"]
    },
    {
      level: "Premium",
      description: "Support dédié 24h/7j",
      responseTime: "< 1h",
      channels: ["Tous", "Manager dédié"],
      price: "Inclus Business",
      features: ["Toutes fonctionnalités", "Account Manager", "Support 24/7", "Maintenance proactive"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🛠️ Services professionnels sur mesure
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Services & Accompagnement
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Expert Leasing
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Un accompagnement personnalisé pour optimiser votre activité de leasing, 
            avec des experts dédiés qui comprennent vos enjeux métier.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/contact')}
            >
              📞 Parler à un expert
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-10 py-4 text-xl"
            >
              📋 Guide des services
            </Button>
          </div>
        </div>
      </section>

      {/* Confirmation que la page fonctionne */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            ✅ Page Services chargée avec succès !
          </h2>
          <p className="text-xl text-slate-600">
            Cette page fonctionne maintenant correctement. Vous pouvez naviguer vers les autres sections.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button onClick={() => navigate('/solutions')}>Voir Solutions</Button>
            <Button onClick={() => navigate('/ressources')} variant="outline">Voir Ressources</Button>
          </div>
        </div>
      </section>

      {/* Services Grid Enhanced */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎨 Nos Services Professionnels
            </h2>
            <p className="text-xl text-slate-600">
              De l'audit initial au support continu, nous vous accompagnons à chaque étape
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className={`hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${service.popular ? 'border-2 border-emerald-300 relative' : ''}`}>
                {service.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Le plus populaire
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border">
                      {service.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                      <CardDescription className="text-base">{service.description}</CardDescription>
                      <div className="flex gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {service.clients}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.sla}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="font-semibold text-blue-600 text-lg">{service.price}</span>
                        {service.popular && (
                          <Badge variant="outline" className="ml-2 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Recommandé
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button className="w-full" variant={service.popular ? "default" : "outline"} size="lg">
                      {service.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section Enhanced */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🔄 Notre Méthodologie Éprouvée
            </h2>
            <p className="text-xl text-slate-600">
              Une approche structurée pour garantir votre succès
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-200">
                    <span className="text-2xl font-bold text-blue-600">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm mb-3">{item.description}</p>
                  <Badge variant="outline" className="mb-3 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {item.duration}
                  </Badge>
                  <div className="space-y-1">
                    {item.delivrables.map((delivrable, idx) => (
                      <div key={idx} className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                        {delivrable}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Support Levels Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🎧 Niveaux de Support
            </h2>
            <p className="text-xl text-slate-600">
              Un support adapté à vos besoins et à votre plan
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {supportLevels.map((support, index) => (
              <Card key={index} className={`hover:shadow-lg transition-shadow ${index === 1 ? 'border-2 border-emerald-300' : ''}`}>
                <CardHeader className="text-center">
                  <Badge className={`mb-2 ${index === 2 ? 'bg-purple-600' : index === 1 ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                    {support.level}
                  </Badge>
                  <CardTitle className="text-lg">{support.description}</CardTitle>
                  <div className="text-2xl font-bold text-blue-600">{support.responseTime}</div>
                  <CardDescription>Temps de réponse garanti</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">📞 Canaux disponibles :</h4>
                    <div className="flex flex-wrap gap-1">
                      {support.channels.map((channel, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">✨ Fonctionnalités :</h4>
                    <ul className="space-y-1">
                      {support.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="font-semibold text-center text-blue-600">{support.price}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              💬 Témoignages Clients Détaillés
            </h2>
            <p className="text-xl text-slate-600">
              L'expérience de nos clients avec nos services
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4 italic">"{testimonial.content}"</p>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg">{testimonial.name}</div>
                        <div className="text-sm text-slate-500">{testimonial.role}</div>
                        <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs mb-1">
                          {testimonial.sector}
                        </Badge>
                        <div className="text-xs text-slate-500">{testimonial.size}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📞 Parlons de votre Projet
            </h2>
            <p className="text-xl text-slate-600">
              Nos experts sont à votre disposition pour vous conseiller
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Phone className="h-8 w-8 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Appel découverte</h3>
                <p className="text-sm text-slate-600 mb-4">30 min pour comprendre vos besoins</p>
                <Button size="sm" className="w-full">
                  Réserver un créneau
                </Button>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Mail className="h-8 w-8 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Audit écrit</h3>
                <p className="text-sm text-slate-600 mb-4">Analyse détaillée de vos processus</p>
                <Button size="sm" variant="outline" className="w-full">
                  Demander un audit
                </Button>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Démo personnalisée</h3>
                <p className="text-sm text-slate-600 mb-4">Présentation sur vos cas d'usage</p>
                <Button size="sm" variant="outline" className="w-full">
                  Planifier une démo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            🤝 Prêt à être accompagné par nos experts ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Rejoignez les entreprises qui ont choisi l'excellence avec nos services professionnels 
            et bénéficiez d'un accompagnement sur mesure pour optimiser votre activité de leasing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/contact')}
            >
              📞 Demander un audit gratuit
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🚀 Essai gratuit 14 jours
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
              💼 La solution métier de référence pour le leasing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ServicesPage;
