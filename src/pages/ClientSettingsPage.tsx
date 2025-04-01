
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  User, 
  Bell, 
  Shield,
  Save,
  Loader2 
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ClientSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

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

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setPhone(data.phone || "");
          setAvatarUrl(data.avatar_url);
          setEmailNotifications(data.email_notifications !== false);
          setSecurityAlerts(data.security_alerts !== false);
          setTwoFactorAuth(!!data.two_factor_auth);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        toast.error("Impossible de charger votre profil");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          email_notifications: emailNotifications,
          security_alerts: securityAlerts,
          two_factor_auth: twoFactorAuth,
          updated_at: new Date()
        })
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      toast.success("Paramètres mis à jour avec succès");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour de votre profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full p-4 md:p-6"
    >
      <div className="mb-6 bg-muted/30 p-4 rounded-lg">
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre compte et vos préférences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <motion.div variants={itemVariants}>
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={avatarUrl || ''} alt="Avatar utilisateur" />
                    <AvatarFallback className="text-xl bg-primary/20 text-primary">
                      {firstName && lastName 
                        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                        : user?.email?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-medium">{firstName} {lastName}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <nav className="space-y-1">
                  <a href="#profile" className="flex items-center p-2 rounded-md hover:bg-muted">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <span>Profil</span>
                  </a>
                  <a href="#notifications" className="flex items-center p-2 rounded-md hover:bg-muted">
                    <Bell className="mr-2 h-4 w-4 text-primary" />
                    <span>Notifications</span>
                  </a>
                  <a href="#security" className="flex items-center p-2 rounded-md hover:bg-muted">
                    <Shield className="mr-2 h-4 w-4 text-primary" />
                    <span>Sécurité</span>
                  </a>
                </nav>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <Card id="profile">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>
                  Mettez à jour vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nom"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ""} 
                    disabled
                    placeholder="Email"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Téléphone"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card id="notifications">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configurez vos préférences de notification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications par email</h4>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des emails pour les mises à jour importantes
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Alertes de sécurité</h4>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications pour les activités suspectes
                    </p>
                  </div>
                  <Switch
                    checked={securityAlerts}
                    onCheckedChange={setSecurityAlerts}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card id="security">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-primary" />
                  Sécurité
                </CardTitle>
                <CardDescription>
                  Gérez vos paramètres de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Authentification à deux facteurs</h4>
                    <p className="text-sm text-muted-foreground">
                      Ajouter une couche de sécurité supplémentaire à votre compte
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorAuth}
                    onCheckedChange={setTwoFactorAuth}
                    disabled={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  L'authentification à deux facteurs sera bientôt disponible
                </p>
                <Separator className="my-2" />
                <div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => toast.info("Cette fonction sera bientôt disponible")}
                  >
                    Changer le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="flex justify-end mt-6">
              <Button 
                className="flex items-center gap-2 px-8 py-6"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer les modifications
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClientSettingsPage;
