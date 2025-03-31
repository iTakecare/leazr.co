
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
  Loader2,
  Building
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

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
  const [clientData, setClientData] = useState<Client | null>(null);

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
        // Fetch user profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        if (profileData) {
          setFirstName(profileData.first_name || "");
          setLastName(profileData.last_name || "");
          setPhone(profileData.phone || "");
          setAvatarUrl(profileData.avatar_url);
          setEmailNotifications(profileData.email_notifications !== false);
          setSecurityAlerts(profileData.security_alerts !== false);
          setTwoFactorAuth(!!profileData.two_factor_auth);
        }

        // Fetch client data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (clientError) {
          console.error("Erreur lors de la récupération des données client:", clientError);
        } else if (clientData) {
          setClientData(clientData);
          
          // If user profile doesn't have these fields filled, use client data
          if (!profileData?.phone && clientData.phone) {
            setPhone(clientData.phone);
          }
          
          // If first name or last name aren't set, try to extract from client name
          if ((!profileData?.first_name || !profileData?.last_name) && clientData.name && clientData.name.includes(' ')) {
            const nameParts = clientData.name.split(' ');
            if (!profileData?.first_name) setFirstName(nameParts[0] || "");
            if (!profileData?.last_name) setLastName(nameParts.slice(1).join(' ') || "");
          }
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
                  {clientData?.company && (
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <Building className="h-3 w-3 mr-1" />
                      <span>{clientData.company}</span>
                    </div>
                  )}
                </div>

                <nav className="space-y-1">
                  <a href="#profile" className="flex items-center p-2 rounded-md hover:bg-muted">
                    <User className="mr-2 h-4 w-4 text-primary" />
                    <span>Profil</span>
                  </a>
                  {clientData && (
                    <a href="#company" className="flex items-center p-2 rounded-md hover:bg-muted">
                      <Building className="mr-2 h-4 w-4 text-primary" />
                      <span>Entreprise</span>
                    </a>
                  )}
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

          {clientData && (
            <motion.div variants={itemVariants}>
              <Card id="company">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-5 w-5 text-primary" />
                    Informations de l'entreprise
                  </CardTitle>
                  <CardDescription>
                    Données de votre entreprise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Société</Label>
                      <div className="p-2 bg-muted/30 rounded-md">
                        {clientData.company || "Non renseigné"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro de TVA</Label>
                      <div className="p-2 bg-muted/30 rounded-md">
                        {clientData.vat_number || "Non renseigné"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <div className="p-2 bg-muted/30 rounded-md">
                      {clientData.address ? (
                        <div>
                          <p>{clientData.address}</p>
                          <p>{clientData.postal_code} {clientData.city}</p>
                          <p>{clientData.country}</p>
                        </div>
                      ) : (
                        "Non renseignée"
                      )}
                    </div>
                  </div>
                  
                  {clientData.has_different_shipping_address && clientData.shipping_address && (
                    <div className="space-y-2">
                      <Label>Adresse de livraison</Label>
                      <div className="p-2 bg-muted/30 rounded-md">
                        <p>{clientData.shipping_address}</p>
                        <p>{clientData.shipping_postal_code} {clientData.shipping_city}</p>
                        <p>{clientData.shipping_country}</p>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Pour modifier les informations de votre entreprise, veuillez contacter notre équipe support.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

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
