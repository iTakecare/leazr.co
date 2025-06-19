
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Briefcase, HelpCircle, Share2, Clock, Users, Headphones, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('ServicesPage rendering successfully');

  const services = [
    {
      icon: <Building className="h-12 w-12 text-blue-600" />,
      title: "🏢 Pour Entreprises",
      description: "Services dédiés aux grandes entreprises et groupes",
      features: [
        "Déploiement sur mesure",
        "Formation équipes complètes", 
        "Intégration systèmes existants",
        "Support prioritaire dédié",
        "Accompagnement change management"
      ],
      availability: "Sur rendez-vous"
    },
    {
      icon: <Briefcase className="h-12 w-12 text-emerald-600" />,
      title: "💼 Pour Professionnels",
      description: "Accompagnement personnalisé pour PME et indépendants",
      features: [
        "Onboarding personnalisé",
        "Formation individuelle",
        "Configuration métier",
        "Support réactif",
        "Conseils d'optimisation"
      ],
      availability: "Sous 48h"
    },
    {
      icon: <HelpCircle className="h-12 w-12 text-purple-600" />,
      title: "🆘 Support Technique",
      description: "Assistance technique complète et réactive",
      features: [
        "Support multicanal (chat, email, téléphone)",
        "Résolution rapide des incidents",
        "Maintenance préventive",
        "Mises à jour automatiques",
        "Documentation technique"
      ],
      availability: "7j/7, 9h-19h"
    },
    {
      icon: <Share2 className="h-12 w-12 text-orange-600" />,
      title: "🎓 Formation & Accompagnement",
      description: "Formation complète à toutes nos solutions",
      features: [
        "Sessions de formation en ligne",
        "Webinaires sectoriels",
        "Documentation interactive",
        "Certification utilisateur",
        "Communauté d'entraide"
      ],
      availability: "Planning flexible"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🤝 Services d'accompagnement expert
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Nos Services
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              D'Accompagnement
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Un accompagnement sur mesure pour garantir votre succès avec Leazr. 
            De l'onboarding au support quotidien, nous sommes là pour vous.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-4">
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                  <div className="flex items-center mt-4">
                    <Clock className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-600 font-medium">
                      {service.availability}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Confirmation */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            ✅ Page Services créée avec succès !
          </h2>
          <p className="text-xl text-slate-600">
            Cette page détaille nos services d'accompagnement.
          </p>
          <div className="mt-8">
            <Button onClick={() => navigate('/contact')} size="lg">
              Contactez-nous pour plus d'infos
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
