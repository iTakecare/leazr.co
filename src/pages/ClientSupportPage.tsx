import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, Phone, MessageSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientSupportPage = () => {
  const supportOptions = [
    {
      title: "Centre d'aide",
      description: "Consultez notre FAQ et nos guides d'utilisation",
      icon: HelpCircle,
      action: "Consulter",
      color: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Contacter par email",
      description: "Envoyez-nous un message, nous vous répondrons rapidement",
      icon: Mail,
      action: "Envoyer un email",
      color: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "Support téléphonique",
      description: "Appelez-nous du lundi au vendredi de 9h à 18h",
      icon: Phone,
      action: "01 23 45 67 89",
      color: "bg-orange-100 dark:bg-orange-900/40",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      title: "Chat en direct",
      description: "Discutez avec notre équipe en temps réel",
      icon: MessageSquare,
      action: "Démarrer le chat",
      color: "bg-violet-100 dark:bg-violet-900/40",
      iconColor: "text-violet-600 dark:text-violet-400"
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
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Support Client</h1>
        <p className="text-muted-foreground">
          Nous sommes là pour vous aider. Choisissez le canal de communication qui vous convient.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportOptions.map((option) => (
          <Card key={option.title} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${option.color}`}>
                  <option.icon className={`h-5 w-5 ${option.iconColor}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{option.title}</CardTitle>
                  <CardDescription className="text-xs">{option.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full rounded-xl">
                {option.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-blue-500" />
              Questions Fréquentes
            </CardTitle>
            <CardDescription className="text-xs">
              Trouvez rapidement des réponses aux questions les plus courantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonQuestions.map((faq, index) => (
                <div key={index} className="p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                  <h4 className="font-medium text-sm mb-1">{faq.question}</h4>
                  <p className="text-xs text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Informations de Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium text-sm mb-2">Support Technique</h4>
                <p className="text-xs text-muted-foreground mb-1">Email: support@itakecare.be</p>
                <p className="text-xs text-muted-foreground">Téléphone: 01 23 45 67 89</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="font-medium text-sm mb-2">Horaires d'ouverture</h4>
                <p className="text-xs text-muted-foreground mb-1">Lundi - Vendredi: 9h - 18h</p>
                <p className="text-xs text-muted-foreground">Weekend: Fermé</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientSupportPage;
