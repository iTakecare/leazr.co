import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Lightbulb, Shield, Users, Zap, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from '@/components/layout/LandingHeader';
import Footer from '@/components/layout/Footer';
import Logo from '@/components/layout/Logo';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-8">
            <Logo className="h-20" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            À propos de <span className="text-primary">Leazr</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Notre mission est de simplifier la gestion du leasing pour tous les professionnels.
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12">
            <Card>
              <CardHeader>
                <Target className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-2xl">Notre mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Simplifier et moderniser la gestion du leasing en proposant des outils
                  intuitifs et performants adaptés aux besoins des professionnels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lightbulb className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-2xl">Notre vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Devenir la référence des solutions de gestion de leasing en Europe
                  en plaçant l'expérience utilisateur au cœur de notre développement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos valeurs</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: <Sparkles className="h-8 w-8" />, title: "Innovation", description: "Amélioration continue de nos solutions" },
              { icon: <Users className="h-8 w-8" />, title: "Proximité", description: "Accompagnement personnalisé" },
              { icon: <Shield className="h-8 w-8" />, title: "Fiabilité", description: "Solutions robustes et sécurisées" },
              { icon: <TrendingUp className="h-8 w-8" />, title: "Performance", description: "Optimisation de vos processus" }
            ].map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                    {value.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoignez les professionnels qui font confiance à Leazr.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Essai gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')}>
              Nous contacter
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
