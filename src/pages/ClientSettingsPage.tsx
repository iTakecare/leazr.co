import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { User, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateClientFromProfile } from "@/services/clientService";
import { useClientData } from "@/hooks/useClientData";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const ClientSettingsPage = () => {
  const { user } = useAuth();
  const { clientData, loading: clientLoading, error: clientError } = useClientData();

  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || user?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [personalInfoLoading, setPersonalInfoLoading] = useState(false);

  const [company, setCompany] = useState(clientData?.company || "");
  const [address, setAddress] = useState(clientData?.address || "");
  const [city, setCity] = useState(clientData?.city || "");
  const [postalCode, setPostalCode] = useState(clientData?.postal_code || "");
  const [country, setCountry] = useState(clientData?.country || "");
  const [vatNumber, setVatNumber] = useState(clientData?.vat_number || "");

  useEffect(() => {
    if (clientData) {
      setCompany(clientData.company || "");
      setAddress(clientData.address || "");
      setCity(clientData.city || "");
      setPostalCode(clientData.postal_code || "");
      setCountry(clientData.country || "");
      setVatNumber(clientData.vat_number || "");
    }
  }, [clientData]);

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
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim()
        }
      });

      if (updateError) throw updateError;

      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim()
          })
          .eq('id', user.id);

        if (profileError) console.warn("Erreur profil:", profileError);

        if (clientData?.id) {
          const { error: clientErr } = await supabase
            .from('clients')
            .update({
              name: `${firstName.trim()} ${lastName.trim()}`,
              company: company.trim(),
              phone: phone.trim(),
              address: address.trim(),
              city: city.trim(),
              postal_code: postalCode.trim(),
              country: country.trim(),
              vat_number: vatNumber.trim()
            })
            .eq('id', clientData.id);

          if (clientErr) console.warn("Erreur client:", clientErr);
        } else {
          await updateClientFromProfile(user.id, firstName.trim(), lastName.trim(), phone.trim());
        }
      }

      toast.success("Informations personnelles mises à jour avec succès !");
    } catch (error: any) {
      console.error("Erreur:", error);
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe modifié avec succès !");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos préférences de compte et vos informations personnelles
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="profile" className="flex items-center gap-2 rounded-lg">
              <User className="h-4 w-4" />
              Mon Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 rounded-lg">
              <Shield className="h-4 w-4" />
              Sécurité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-blue-500" />
                  Informations personnelles
                </CardTitle>
                <CardDescription className="text-xs">Gérez vos informations de profil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user?.email || ""} type="email" disabled className="bg-muted rounded-xl" />
                    <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" placeholder="+33 1 23 45 67 89" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
                  </div>

                  <div className="pt-4 border-t border-border/40 space-y-4">
                    <div>
                      <Label htmlFor="company">Société</Label>
                      <Input id="company" placeholder="Nom de votre société" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="address">Adresse</Label>
                        <Input id="address" placeholder="123 rue de la Paix" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label htmlFor="city">Ville</Label>
                        <Input id="city" placeholder="Paris" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode">Code postal</Label>
                        <Input id="postalCode" placeholder="75001" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label htmlFor="country">Pays</Label>
                        <Input id="country" placeholder="France" value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="vatNumber">Numéro de TVA / SIRET</Label>
                      <Input id="vatNumber" placeholder="FR 12 345 678 901" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className="rounded-xl" />
                    </div>
                  </div>

                  <Button onClick={handleSavePersonalInfo} disabled={personalInfoLoading} className="mt-6 rounded-xl">
                    {personalInfoLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-orange-500" />
                  Sécurité
                </CardTitle>
                <CardDescription className="text-xs">Modifiez votre mot de passe et gérez la sécurité</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl" />
                  </div>
                  <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-xl">
                    {passwordLoading ? "Modification..." : "Changer le mot de passe"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default ClientSettingsPage;
