
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useClientData } from "@/hooks/useClientData";
import { BarChart3, Package, FileText, Clock, Settings, Eye, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { clientData, recentActivity, loading, error } = useClientData();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Mon Équipement",
      description: "Consultez vos équipements en cours de financement",
      icon: Package,
      href: "/client/equipment",
      color: "bg-blue-500"
    },
    {
      title: "Mes Demandes",
      description: "Suivez l'état de vos demandes",
      icon: Clock,
      href: "/client/requests",
      color: "bg-orange-500",
      badge: "3"
    },
    {
      title: "Mes Contrats",
      description: "Accédez à vos contrats de financement",
      icon: FileText,
      href: "/client/contracts",
      color: "bg-green-500"
    },
    {
      title: "Catalogue",
      description: "Découvrez notre catalogue d'équipements",
      icon: Eye,
      href: "/client/catalog",
      color: "bg-purple-500"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return "Date inconnue";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'offer': return Clock;
      case 'contract': return FileText;
      default: return Package;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'active': return 'text-blue-600';
      case 'completed': return 'text-gray-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Client</h1>
            <p className="text-muted-foreground">
              Bonjour {clientData?.name || user?.first_name || user?.email?.split('@')[0]}, voici un aperçu de votre activité
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/client/settings')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <motion.div key={action.title} variants={itemVariants}>
            <Card 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(action.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-md ${action.color} text-white`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  {action.badge && (
                    <Badge variant="secondary">{action.badge}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                  {action.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                  <div 
                    key={activity.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => {
                      if (activity.type === 'offer') {
                        navigate('/client/requests');
                      } else if (activity.type === 'contract') {
                        navigate('/client/contracts');
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <IconComponent className={`h-5 w-5 ${getStatusColor(activity.status)}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                    {activity.status && (
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${getStatusColor(activity.status)} border-current`}
                      >
                        {activity.status === 'pending' && '⏳ En attente'}
                        {activity.status === 'approved' && '✅ Approuvée'}
                        {activity.status === 'rejected' && '❌ Refusée'}
                        {activity.status === 'active' && '🔥 Actif'}
                        {activity.status === 'completed' && '✔️ Terminé'}
                        {!['pending', 'approved', 'rejected', 'active', 'completed'].includes(activity.status) && activity.status}
                      </Badge>
                    )}
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune activité récente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations du Compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{clientData?.email || user?.email}</p>
              </div>
              {clientData?.name && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom</p>
                  <p>{clientData.name}</p>
                </div>
              )}
              {clientData?.company && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Société</p>
                  <p>{clientData.company}</p>
                </div>
              )}
              {clientData?.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                  <p>{clientData.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {clientData?.status === 'active' ? 'Client Actif' : 
                   clientData?.status === 'lead' ? 'Prospect' : 'Inactif'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ClientDashboard;
