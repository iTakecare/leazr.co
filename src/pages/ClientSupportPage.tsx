import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LifeBuoy, 
  Plus, 
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Filter
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SupportTicket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed" | "in_progress";
  priority: "low" | "medium" | "high";
  category: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: string;
    content: string;
    sender: "client" | "support";
    created_at: string;
  }>;
};

const ClientSupportPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "TKT-001",
      title: "Problème de connexion avec mon MacBook",
      description: "Je n'arrive pas à me connecter au Wi-Fi de l'entreprise avec mon MacBook Pro",
      status: "in_progress",
      priority: "medium",
      category: "technical",
      created_at: "2023-08-15T10:30:00Z",
      updated_at: "2023-08-16T14:20:00Z",
      messages: [
        {
          id: "MSG-001",
          content: "Bonjour, je n'arrive pas à me connecter au Wi-Fi de l'entreprise avec mon MacBook Pro récemment fourni.",
          sender: "client",
          created_at: "2023-08-15T10:30:00Z"
        },
        {
          id: "MSG-002",
          content: "Bonjour, avez-vous bien entré les identifiants réseau fournis dans le document d'accueil ?",
          sender: "support",
          created_at: "2023-08-15T11:45:00Z"
        },
        {
          id: "MSG-003",
          content: "Oui, mais j'ai toujours une erreur d'authentification.",
          sender: "client",
          created_at: "2023-08-15T14:20:00Z"
        },
        {
          id: "MSG-004",
          content: "Nous allons regarder cela. Pouvez-vous me communiquer le nom du réseau auquel vous essayez de vous connecter ?",
          sender: "support",
          created_at: "2023-08-16T09:10:00Z"
        }
      ]
    },
    {
      id: "TKT-002",
      title: "Demande de renouvellement d'équipement",
      description: "Je souhaiterais remplacer mon équipement actuel qui commence à montrer des signes de faiblesse",
      status: "open",
      priority: "low",
      category: "request",
      created_at: "2023-09-02T08:45:00Z",
      updated_at: "2023-09-02T08:45:00Z",
      messages: [
        {
          id: "MSG-005",
          content: "Bonjour, mon ordinateur actuel commence à ralentir considérablement et j'aurais besoin d'un équipement plus performant pour mes tâches quotidiennes.",
          sender: "client",
          created_at: "2023-09-02T08:45:00Z"
        }
      ]
    },
    {
      id: "TKT-003",
      title: "Problème de batterie iPhone",
      description: "La batterie de mon iPhone se décharge très rapidement depuis quelques jours",
      status: "closed",
      priority: "high",
      category: "technical",
      created_at: "2023-07-10T15:20:00Z",
      updated_at: "2023-07-12T11:30:00Z",
      messages: [
        {
          id: "MSG-006",
          content: "Bonjour, la batterie de mon iPhone se vide en quelques heures même sans utilisation intensive.",
          sender: "client",
          created_at: "2023-07-10T15:20:00Z"
        },
        {
          id: "MSG-007",
          content: "Bonjour, avez-vous récemment installé de nouvelles applications ou fait une mise à jour du système ?",
          sender: "support",
          created_at: "2023-07-10T16:45:00Z"
        },
        {
          id: "MSG-008",
          content: "Oui, j'ai fait une mise à jour iOS hier.",
          sender: "client",
          created_at: "2023-07-11T09:20:00Z"
        },
        {
          id: "MSG-009",
          content: "C'est probablement lié. Je vous conseille de redémarrer votre téléphone et de désactiver les applications en arrière-plan. Si le problème persiste, nous pourrons organiser un remplacement de la batterie.",
          sender: "support",
          created_at: "2023-07-11T10:30:00Z"
        },
        {
          id: "MSG-010",
          content: "J'ai suivi vos conseils et tout est revenu à la normale. Merci beaucoup pour votre aide rapide !",
          sender: "client",
          created_at: "2023-07-12T11:30:00Z"
        }
      ]
    }
  ]);
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "technical",
    priority: "medium",
  });
  const [newMessage, setNewMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const handleCreateTicket = () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const ticket: SupportTicket = {
      id: `TKT-00${tickets.length + 1}`,
      title: newTicket.title,
      description: newTicket.description,
      status: "open",
      priority: newTicket.priority as "low" | "medium" | "high",
      category: newTicket.category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: `MSG-${Date.now()}`,
          content: newTicket.description,
          sender: "client",
          created_at: new Date().toISOString()
        }
      ]
    };

    setTickets([ticket, ...tickets]);
    setNewTicket({
      title: "",
      description: "",
      category: "technical",
      priority: "medium",
    });
    toast.success("Ticket créé avec succès");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    const updatedTicket = {
      ...selectedTicket,
      messages: [
        ...selectedTicket.messages,
        {
          id: `MSG-${Date.now()}`,
          content: newMessage,
          sender: "client" as const,
          created_at: new Date().toISOString()
        }
      ],
      updated_at: new Date().toISOString()
    };

    setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setNewMessage("");
    toast.success("Message envoyé");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Ouvert</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500">En cours</Badge>;
      case "closed":
        return <Badge className="bg-green-500">Résolu</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">Haute</Badge>;
      case "medium":
        return <Badge className="bg-orange-500">Moyenne</Badge>;
      case "low":
        return <Badge className="bg-green-500">Basse</Badge>;
      default:
        return <Badge className="bg-gray-500">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = filterStatus 
    ? tickets.filter(ticket => ticket.status === filterStatus)
    : tickets;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full p-4 md:p-6"
    >
      <div className="flex justify-between items-center mb-6 bg-muted/30 p-4 rounded-lg">
        <div>
          <h1 className="text-3xl font-bold">Support Technique</h1>
          <p className="text-muted-foreground">Gérez vos demandes de support et suivez leur avancement</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau ticket de support</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Titre
                </label>
                <Input
                  id="title"
                  placeholder="Résumé de votre problème"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Catégorie
                  </label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Problème technique</SelectItem>
                      <SelectItem value="request">Demande d'équipement</SelectItem>
                      <SelectItem value="billing">Facturation</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="priority" className="text-sm font-medium">
                    Priorité
                  </label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value) => setNewTicket({ ...newTicket, priority: value as "low" | "medium" | "high" })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre problème en détail"
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewTicket({ title: "", description: "", category: "technical", priority: "medium" })}>
                Annuler
              </Button>
              <Button onClick={handleCreateTicket}>
                Créer le ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-primary/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tickets
            </CardTitle>
            <LifeBuoy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total des tickets</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-yellow-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              En cours
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.filter(t => t.status === "open" || t.status === "in_progress").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tickets non résolus</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-all border-t-4 border-t-green-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Résolus
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.filter(t => t.status === "closed").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tickets résolus</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Mes tickets</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filterStatus || "all"}
            onValueChange={(value) => setFilterStatus(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="closed">Résolus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 mb-8">
        {filteredTickets.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <LifeBuoy className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Aucun ticket trouvé</h3>
              <p className="text-muted-foreground text-center mb-4">
                {filterStatus 
                  ? "Aucun ticket ne correspond à ce filtre. Essayez un autre filtre." 
                  : "Vous n'avez pas encore créé de ticket de support."}
              </p>
              {!filterStatus && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Créer un premier ticket</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau ticket de support</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label htmlFor="title" className="text-sm font-medium">
                          Titre
                        </label>
                        <Input
                          id="title"
                          placeholder="Résumé de votre problème"
                          value={newTicket.title}
                          onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label htmlFor="category" className="text-sm font-medium">
                            Catégorie
                          </label>
                          <Select 
                            value={newTicket.category} 
                            onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                          >
                            <SelectTrigger id="category">
                              <SelectValue placeholder="Catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technical">Problème technique</SelectItem>
                              <SelectItem value="request">Demande d'équipement</SelectItem>
                              <SelectItem value="billing">Facturation</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="priority" className="text-sm font-medium">
                            Priorité
                          </label>
                          <Select 
                            value={newTicket.priority} 
                            onValueChange={(value) => setNewTicket({ ...newTicket, priority: value as "low" | "medium" | "high" })}
                          >
                            <SelectTrigger id="priority">
                              <SelectValue placeholder="Priorité" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Basse</SelectItem>
                              <SelectItem value="medium">Moyenne</SelectItem>
                              <SelectItem value="high">Haute</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <label htmlFor="description" className="text-sm font-medium">
                          Description
                        </label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez votre problème en détail"
                          rows={5}
                          value={newTicket.description}
                          onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNewTicket({ title: "", description: "", category: "technical", priority: "medium" })}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateTicket}>
                        Créer le ticket
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className={`shadow-md hover:shadow-lg transition-duration-200 border-l-4 ${
              ticket.status === "open" ? "border-l-blue-500" :
              ticket.status === "in_progress" ? "border-l-yellow-500" :
              "border-l-green-500"
            }`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  <div className="flex gap-2">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <span>Créé le {formatDate(ticket.created_at)}</span>
                  <span className="mx-1">•</span>
                  <span>ID: {ticket.id}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-0">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ticket.description}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  <span>{ticket.messages.length} message{ticket.messages.length > 1 ? "s" : ""}</span>
                  <span className="mx-1">•</span>
                  <span>Mis à jour le {formatDate(ticket.updated_at)}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant={ticket.status === "closed" ? "outline" : "default"} 
                      className="w-full"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {ticket.status === "closed" ? "Voir les détails" : "Répondre"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex justify-between items-start">
                        <div>
                          <span>{selectedTicket?.title}</span>
                          <div className="flex gap-2 mt-2">
                            {selectedTicket && getStatusBadge(selectedTicket.status)}
                            {selectedTicket && getPriorityBadge(selectedTicket.priority)}
                          </div>
                        </div>
                        <span className="text-sm font-normal text-muted-foreground">ID: {selectedTicket?.id}</span>
                      </DialogTitle>
                    </DialogHeader>
                    
                    {selectedTicket && (
                      <>
                        <div className="space-y-4 py-4">
                          <div className="border-b pb-4">
                            <h3 className="text-sm font-medium mb-2">Description</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedTicket.description}
                            </p>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Créé le {formatDate(selectedTicket.created_at)}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium">Conversation</h3>
                            {selectedTicket.messages.map((message) => (
                              <div key={message.id} className={`flex ${message.sender === "client" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                  message.sender === "client" 
                                    ? "bg-primary/10 text-primary-foreground" 
                                    : "bg-muted"
                                }`}>
                                  <p className="text-sm">{message.content}</p>
                                  <div className="mt-1 text-xs text-muted-foreground flex justify-between items-center">
                                    <span>{message.sender === "client" ? "Vous" : "Support"}</span>
                                    <span>{formatDate(message.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {selectedTicket.status !== "closed" && (
                            <div className="pt-4">
                              <label htmlFor="response" className="text-sm font-medium block mb-2">
                                Votre réponse
                              </label>
                              <Textarea
                                id="response"
                                placeholder="Tapez votre message ici..."
                                rows={3}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="mb-4"
                              />
                              <Button 
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                              >
                                Envoyer
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClientSupportPage;
