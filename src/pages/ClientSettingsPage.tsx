
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Settings, User, Shield, Bell, Users, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateClientFromProfile } from "@/services/clientService";
import { useClientData } from "@/hooks/useClientData";
import UnifiedClientView from "@/components/clients/UnifiedClientView";

const ClientSettingsPage = () => {
  const { user } = useAuth();
  const { clientData, loading: clientLoading, error: clientError } = useClientData();
  
  // États pour les informations personnelles
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || user?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [personalInfoLoading, setPersonalInfoLoading] = useState(false);
  
  // États pour le mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSavePersonalInfo = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Le prénom et le nom sont obligatoires");
      return;
    }

    setPersonalInfoLoading(true);
    try {
      // Mettre à jour les métadonnées utilisateur
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim()
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Mettre à jour également la table profiles si elle existe
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim()
          })
          .eq('id', user.id);

        if (profileError) {
          console.warn("Erreur lors de la mise à jour du profil:", profileError);
        }

        // Mettre à jour aussi la table clients si l'utilisateur a une fiche client
        const clientUpdateSuccess = await updateClientFromProfile(
          user.id,
          firstName.trim(),
          lastName.trim(),
          phone.trim()
        );

        if (clientUpdateSuccess) {
          console.log("Fiche client mise à jour avec succès");
        } else {
          console.log("Aucune fiche client à mettre à jour ou erreur lors de la mise à jour");
        }
      }

      toast.success("Informations personnelles mises à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour: " + error.message);
    } finally {
      setPersonalInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Tous les champs du mot de passe sont obligatoires");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      // Réinitialiser les champs
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast.success("Mot de passe modifié avec succès !");
    } catch (error: any) {
      console.error("Erreur lors du changement de mot de passe:", error);
      toast.error("Erreur lors du changement de mot de passe: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const settingSections = [
    {
      title: "Informations Personnelles",
      description: "Gérez vos informations de profil",
      icon: User,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input 
                id="firstName" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input 
                id="lastName" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user?.email || ""} type="email" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input 
              id="phone" 
              placeholder="+33 1 23 45 67 89"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSavePersonalInfo}
            disabled={personalInfoLoading}
          >
            {personalInfoLoading ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      )
    },
    {
      title: "Sécurité",
      description: "Modifiez votre mot de passe et gérez la sécurité",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input 
              id="currentPassword" 
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input 
              id="newPassword" 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
            <Input 
              id="confirmPassword" 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? "Modification..." : "Changer le mot de passe"}
          </Button>
        </div>
      )
    },
    {
      title: "Notifications",
      description: "Gérez vos préférences de notification",
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Notifications par email</h4>
              <p className="text-sm text-muted-foreground">Recevez des mises à jour importantes par email</p>
            </div>
            <Button variant="outline">Activé</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Rappels de paiement</h4>
              <p className="text-sm text-muted-foreground">Soyez averti avant l'échéance de vos paiements</p>
            </div>
            <Button variant="outline">Activé</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Nouvelles offres</h4>
              <p className="text-sm text-muted-foreground">Recevez des informations sur nos nouvelles offres</p>
            </div>
            <Button variant="outline">Désactivé</Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences de compte et vos informations personnelles
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mon Profil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>Gérez vos informations de profil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input 
                      id="firstName" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom</Label>
                    <Input 
                      id="lastName" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue={user?.email || ""} type="email" disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input 
                    id="phone" 
                    placeholder="+33 1 23 45 67 89"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSavePersonalInfo}
                  disabled={personalInfoLoading}
                >
                  {personalInfoLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>Modifiez votre mot de passe et gérez la sécurité</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input 
                    id="currentPassword" 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Modification..." : "Changer le mot de passe"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientSettingsPage;
