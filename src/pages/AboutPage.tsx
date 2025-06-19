
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Award, TrendingUp, Heart, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Logo from '@/components/layout/Logo';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  console.log('AboutPage rendering successfully');

  const values = [
    {
      icon: <Target className="h-8 w-8 text-blue-600" />,
      title: "🎯 Innovation",
      description: "Nous repoussons constamment les limites pour offrir les meilleures solutions leasing du marché"
    },
    {
      icon: <Users className="h-8 w-8 text-emerald-600" />,
      title: "🤝 Proximité Client",
      description: "Notre succès se mesure à celui de nos clients. Nous construisons des partenariats durables"
    },
    {
      icon: <Award className="h-8 w-8 text-purple-600" />,
      title: "🏆 Excellence",
      description: "Qualité et fiabilité sont au cœur de tout ce que nous développons et livrons"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
      title: "📈 Performance",
      description: "Nous aidons nos clients à optimiser leur rentabilité et croissance"
    }
  ];

  const team = [
    {
      name: "Marie Dubois",
      role: "CEO & Fondatrice",
      experience: "15 ans dans le leasing",
      description: "Experte du secteur, Marie a créé Leazr pour révolutionner l'industrie du leasing"
    },
    {
      name: "Pierre Martin", 
      role: "CTO",
      experience: "12 ans en fintech",
      description: "Architecte de notre plateforme, Pierre pilote l'innovation technique"
    },
    {
      name: "Sophie Laurent",
      role: "Head of Product", 
      experience: "10 ans en product management",
      description: "Sophie orchestre le développement produit en lien avec les besoins métier"
    },
    {
      name: "Antoine Rousseau",
      role: "Head of Sales",
      experience: "8 ans en solution B2B",
      description: "Antoine accompagne nos clients dans leur transformation digitale"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
            🚀 Notre histoire et mission
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              À Propos de
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Leazr
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            🎯 Fondée en 2019, Leazr révolutionne le secteur du leasing avec des solutions 
            technologiques innovantes pensées par et pour les professionnels du secteur.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-8">
              <div className="text-center">
                <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-4">💙 Notre Mission</h2>
                <p className="text-lg text-slate-700 max-w-3xl mx-auto">
                  Démocratiser l'accès aux outils de gestion leasing les plus performants, 
                  en simplifiant les processus complexes et en offrant une expérience utilisateur 
                  exceptionnelle à tous les acteurs du secteur.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">🌟 Nos Valeurs</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4">
                    {value.icon}
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">👥 Notre Équipe</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{member.name}</CardTitle>
                  <CardDescription className="text-blue-600 font-medium">
                    {member.role} • {member.experience}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{member.description}</p>
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
            ✅ Page À Propos créée avec succès !
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Cette page présente notre histoire, mission et équipe.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/contact')} size="lg">
              Nous contacter
            </Button>
            <Button onClick={() => navigate('/solutions')} variant="outline" size="lg">
              Voir nos solutions
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
