import LandingHeader from "@/components/layout/LandingHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, HelpCircle, Video } from "lucide-react";

const ResourcesPage = () => {
  const resourceCategories = [
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Guides d'utilisation et documentation technique pour utiliser efficacement la plateforme Leazr.",
    },
    {
      icon: FileText,
      title: "Blog & Actualités",
      description: "Suivez les dernières actualités, mises à jour et bonnes pratiques du secteur du leasing.",
    },
    {
      icon: HelpCircle,
      title: "FAQ & Support",
      description: "Trouvez rapidement des réponses aux questions fréquentes et contactez notre équipe support.",
    },
    {
      icon: Video,
      title: "Formations",
      description: "Accédez à des sessions de formation pour développer vos compétences sur la plateforme.",
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Ressources & Support
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Accédez à la documentation, aux guides et au support pour utiliser efficacement Leazr.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg">
                <BookOpen className="h-5 w-5 mr-2" />
                Documentation
              </Button>
              <Button size="lg" variant="outline">
                <HelpCircle className="h-5 w-5 mr-2" />
                Support
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {resourceCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Accéder
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Besoin d'aide ?
            </h2>
            <p className="text-muted-foreground mb-6">
              Notre équipe support est disponible pour répondre à vos questions.
            </p>
            <Button size="lg">
              Contacter le Support
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ResourcesPage;
