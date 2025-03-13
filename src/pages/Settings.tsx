
import React, { useState } from "react";
import { 
  Cog, 
  SunMoon, 
  User, 
  Globe, 
  Building2, 
  Code, 
  Key,
  ShoppingBag
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import WooCommerceImporter from "@/components/settings/WooCommerceImporter";
import LeaserManager from "@/components/settings/LeaserManager";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container py-10"
    >
      <div className="mb-8 flex items-center">
        <Cog className="h-6 w-6 mr-2 text-primary" />
        <h1 className="text-3xl font-bold">Paramètres</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="leasers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Leasers</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Avancé</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>Profil</span>
                </CardTitle>
                <CardDescription>
                  Gérez vos informations personnelles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" defaultValue={user?.first_name || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" defaultValue={user?.last_name || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {user?.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={`${user.first_name} ${user.last_name}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      Changer l'avatar
                    </Button>
                  </div>
                </div>
                <Button className="mt-4">Enregistrer les modifications</Button>
              </CardContent>
            </Card>
            
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SunMoon className="h-5 w-5 text-primary" />
                    <span>Apparence</span>
                  </CardTitle>
                  <CardDescription>
                    Personnalisez l'apparence de l'application.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="darkMode" className="cursor-pointer">
                      Mode sombre
                    </Label>
                    <Switch id="darkMode" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <span>Langue</span>
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez votre langue préférée.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="language">Langue</Label>
                      <select 
                        id="language" 
                        className="p-2 border rounded-md bg-background w-32"
                        defaultValue="fr"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="nl">Nederlands</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <span>Sécurité</span>
                  </CardTitle>
                  <CardDescription>
                    Gérez votre mot de passe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>Changer le mot de passe</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="leasers">
          <LeaserManager />
        </TabsContent>
        
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <span>Importation WooCommerce</span>
                </CardTitle>
                <CardDescription>
                  Importez des produits depuis votre boutique WooCommerce.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WooCommerceImporter />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Settings;
