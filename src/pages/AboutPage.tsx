
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Award, ArrowRight, Heart, Lightbulb, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: <Lightbulb className="h-8 w-8 text-orange-600" />,
      title: "💡 Innovation",
      description: "Nous développons des solutions innovantes spécifiquement adaptées aux défis du leasing"
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: "🤝 Proximité",
      description: "Nous accompagnons nos clients avec une approche personnalisée et un support dédié"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-600" />,
      title: "🔒 Fiabilité",
      description: "Nos solutions sont robustes, sécurisées et conformes aux exigences du secteur financier"
    },
    {
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      title: "⚡ Performance",
      description: "Nous optimisons vos processus pour gagner en efficacité et en rentabilité"
    }
  ];

  const team = [
    {
      name: "Marie Dubois",
      role: "CEO & Fondatrice",
      description: "15 ans d'expérience dans le leasing",
      avatar: "MD"
    },
    {
      name: "Pierre Martin",
      role: "CTO",
      description: "Expert en solutions financières digitales",
      avatar: "PM"
    },
    {
      name: "Sophie Lefebvre",
      role: "Head of Product",
      description: "Spécialiste UX/UI pour le secteur financier",
      avatar: "SL"
    },
    {
      name: "Antoine Rousseau",
      role: "Head of Sales",
      description: "Expert commercial en solutions B2B",
      avatar: "AR"
    }
  ];

  const milestones = [
    {
      year: "2020",
      title: "🚀 Création de Leazr",
      description: "Lancement de la première version dédiée au leasing"
    },
    {
      year: "2021",
      title: "📈 Croissance",
      description: "50+ entreprises de leasing nous font confiance"
    },
    {
      year: "2022",
      title: "🔗 Intégrations",
      description: "Partenariats avec les principales banques et éditeurs comptables"
    },
    {
      year: "2023",
      title: "🏆 Reconnaissance",
      description: "Prix de l'innovation FinTech pour notre solution"
    },
    {
      year: "2024",
      title: "🌍 Expansion",
      description: "200+ clients actifs et expansion européenne"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            ℹ️ Découvrez notre histoire
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              À propos de Leazr
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Nous révolutionnons l'industrie du leasing grâce à des solutions digitales sur mesure
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                🎯 Notre mission
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Simplifier et optimiser l'activité de leasing grâce à des outils digitaux innovants, 
                conçus spécifiquement pour répondre aux défis uniques de ce secteur.
              </p>
              <p className="text-lg text-slate-600 mb-8">
                Nous croyons que la technologie doit servir l'humain et faciliter le travail quotidien des 
                professionnels du leasing, leur permettant de se concentrer sur la valeur ajoutée.
              </p>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">200+</div>
                  <div className="text-sm text-slate-600">Clients actifs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">70%</div>
                  <div className="text-sm text-slate-600">Gain de temps</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">50M€</div>
                  <div className="text-sm text-slate-600">Financements traités</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl font-semibold mb-4">🌟 Notre vision</h3>
              <p className="text-slate-700 mb-4">
                Devenir la référence européenne des solutions digitales pour le leasing, 
                en accompagnant la transformation numérique de tout l'écosystème.
              </p>
              <p className="text-slate-700">
                Nous voulons permettre à chaque acteur du leasing d'être plus efficace, plus rentable 
                et de mieux servir ses clients finaux.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              💎 Nos valeurs
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Les principes qui guident notre développement et nos relations avec nos clients
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 p-3 bg-slate-50 rounded-lg w-fit">
                    {value.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-slate-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              📅 Notre parcours
            </h2>
            <p className="text-xl text-slate-600">
              Les étapes clés de notre développement
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-20 text-right">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {milestone.year}
                    </Badge>
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-2">{milestone.title}</h3>
                    <p className="text-slate-600 text-sm">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              👥 Notre équipe
            </h2>
            <p className="text-xl text-slate-600">
              Des experts passionnés au service de votre réussite
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-600 font-semibold">{member.avatar}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{member.name}</h3>
                  <p className="text-blue-600 text-sm mb-2">{member.role}</p>
                  <p className="text-slate-600 text-xs">{member.description}</p>
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
            🤝 Rejoignez l'aventure Leazr
          </h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto text-slate-300">
            💼 Faites partie des entreprises qui transforment leur activité de leasing avec nos solutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-10 py-4 text-xl"
              onClick={() => navigate('/signup')}
            >
              🚀 Démarrer gratuitement
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 px-10 py-4 text-xl"
              onClick={() => navigate('/contact')}
            >
              📞 Nous contacter
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

export default AboutPage;
