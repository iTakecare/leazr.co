
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, Phone, MessageSquare, FileText } from "lucide-react";

const ClientSupportPage = () => {
  const supportOptions = [
    {
      title: "Centre d'aide",
      description: "Consultez notre FAQ et nos guides d'utilisation",
      icon: HelpCircle,
      action: "Consulter",
      color: "bg-blue-500"
    },
    {
      title: "Contacter par email",
      description: "Envoyez-nous un message, nous vous répondrons rapidement",
      icon: Mail,
      action: "Envoyer un email",
      color: "bg-green-500"
    },
    {
      title: "Support téléphonique",
      description: "Appelez-nous du lundi au vendredi de 9h à 18h",
      icon: Phone,
      action: "01 23 45 67 89",
      color: "bg-orange-500"
    },
    {
      title: "Chat en direct",
      description: "Discutez avec notre équipe en temps réel",
      icon: MessageSquare,
      action: "Démarrer le chat",
      color: "bg-purple-500"
    }
  ];

  const commonQuestions = [
    {
      question: "Comment puis-je suivre mes paiements ?",
      answer: "Rendez-vous dans la section 'Mes Contrats' pour voir l'historique de vos paiements."
    },
    {
      question: "Puis-je modifier mes informations de facturation ?",
      answer: "Oui, vous pouvez mettre à jour vos informations dans les paramètres de votre compte."
    },
    {
      question: "Comment demander un nouveau financement ?",
      answer: "Consultez notre catalogue et soumettez une nouvelle demande depuis votre dashboard."
    },
    {
      question: "Que faire en cas de problème technique ?",
      answer: "Contactez notre support technique par email ou téléphone, nous vous aiderons rapidement."
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Client</h1>
        <p className="text-muted-foreground">
          Nous sommes là pour vous aider. Choisissez le canal de communication qui vous convient.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportOptions.map((option) => (
          <Card key={option.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-md ${option.color} text-white`}>
                  <option.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                {option.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Questions Fréquentes
          </CardTitle>
          <CardDescription>
            Trouvez rapidement des réponses aux questions les plus courantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commonQuestions.map((faq, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-semibold mb-1">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations de Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Support Technique</h4>
              <p className="text-sm text-muted-foreground mb-1">Email: support@itakecare.be</p>
              <p className="text-sm text-muted-foreground">Téléphone: 01 23 45 67 89</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Horaires d'ouverture</h4>
              <p className="text-sm text-muted-foreground mb-1">Lundi - Vendredi: 9h - 18h</p>
              <p className="text-sm text-muted-foreground">Weekend: Fermé</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientSupportPage;
