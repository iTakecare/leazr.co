import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Briefcase, Headphones, Book, ArrowRight, Users, Star, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: <Building className="h-12 w-12 text-blue-600" />,
      title: "🏢 Solutions Entreprises",
      description: "Accompagnement sur mesure pour les grandes organisations",
      features: [
        "🎯 Audit personnalisé de vos besoins",
        "🔧 Personnalisation avancée",
        "👥 Formation équipe dédiée",
        "🔗 Intégrations sur mesure",
        "📊 Reporting personnalisé",
        "🆘 Support prioritaire"
      ],
      price: "Sur devis",
      cta: "Demander un audit"
    },
    {
      icon: <Briefcase className="h-12 w-12 text-emerald-600" />,
      title: "💼 Solutions Professionnels",
      description: "Offres adaptées aux indépendants et PME",
      features: [
        "⚡ Mise en place rapide",
        "💰 Tarifs préférentiels",
        "📱 Outils mobiles optimisés",
        "🎓 Webinaires gratuits",
        "💬 Communauté d'entraide",
        "📧 Support email réactif"
      ],
      price: "À partir de 49€/mois",
      cta: "Découvrir nos plans"
    },
    {
      icon: <Headphones className="h-12 w-12 text-purple-600" />,
      title: "🆘 Support Technique",
      description: "Assistance dédiée pour tous vos besoins",
      features: [
        "🕐 Support 24h/24 (Business)",
        "📞 Hotline dédiée",
        "💻 Prise en main à distance",
        "📚 Base de connaissances",
        "🎥 Tutoriels vidéo",
        "🔧 Maintenance préventive"
      ],
      price: "Inclus",
      cta: "Contacter le support"
    },
    {
      icon: <Book className="h-12 w-12 text-orange-600" />,
      title: "🎓 Formation & Accompagnement",
      description: "Devenez expert de notre solution",
      features: [
        "📖 Formation initiale complète",
        "🎯 Sessions personnalisées",
        "🏆 Certification utilisateur",
        "📱 Formation mobile",
        "👥 Ateliers collectifs",
        "📋 Support pédagogique"
      ],
      price: "Inclus Pro/Business",
      cta: "Réserver une formation"
    }
  ];

  const testimonials = [
    {
      name: "Claire Moreau",
      company: "LeaseTech Solutions",
      role: "Directrice Générale",
      content: "Le service d'accompagnement Leazr a été exceptionnel. L'équipe nous a aidés à optimiser tous nos processus de leasing.",
      rating: 5
    },
    {
      name: "Philippe Durand",
      company: "Financement Pro",
      role: "Responsable Commercial",
      content: "Formation très complète et support réactif. Nous avons gagné 60% de temps sur nos calculs de leasing.",
      rating: 5
    },
    {
      name: "Sophie Laurent",
      company: "LeasePartners",
      role: "Chef de Projet",
      content: "L'intégration avec nos outils existants s'est faite sans accroc grâce à l'équipe technique Leazr.",
      rating: 5
    }
  ];

  const process = [
    {
      step: "1",
      title: "🔍 Analyse",
      description: "Audit de vos besoins et processus actuels"
    },
    {
      step: "2",
      title: "🎯 Personnalisation",
      description: "Configuration sur mesure de la solution"
    },
    {
      step: "3",
      title: "🚀 Déploiement",
      description: "Mise en production et formation équipes"
    },
    {
      step: "4",
      title: "📈 Optimisation",
      description: "Suivi et amélioration continue"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🛠️ Services sur mesure
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Nos Services
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Un accompagnement personnalisé pour optimiser votre activité de leasing
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {service.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-semibold text-blue-600">{service.price}</span>
                    </div>
                    <Button className="w-full" variant="outline">
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

      {/* Process Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              🔄 Notre processus d'accompagnement
            </h2>
            <p className="text-xl text-slate-600">
              Une méthode éprouvée pour assurer votre succès
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              💬 Ce que disent nos clients
            </h2>
            <p className="text-xl text-slate-600">
              Témoignages de professionnels qui nous font confiance
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                    <div className="text-sm text-blue-600">{testimonial.company}</div>
                  </div>
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
            🤝 Prêt à être accompagné ?
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Nos experts sont là pour vous aider à optimiser votre activité de leasing
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
              🚀 Essai gratuit
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
