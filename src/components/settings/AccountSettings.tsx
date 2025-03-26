
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const AccountSettings = () => {
  const { user, updateUserData } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    company: user?.company || ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSave = async () => {
    try {
      await updateUserData({
        first_name: formData.first_name,
        last_name: formData.last_name,
        company: formData.company
      });
      toast.success("Modifications enregistrées");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du profil:", error);
      toast.error("Erreur lors de l'enregistrement du profil");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres du compte</CardTitle>
        <CardDescription>
          Gérez les informations de votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input 
            id="first_name" 
            placeholder="Votre prénom" 
            value={formData.first_name}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input 
            id="last_name" 
            placeholder="Votre nom" 
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Entreprise</Label>
          <Input 
            id="company" 
            placeholder="Votre entreprise" 
            value={formData.company}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user?.email} disabled />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave}>
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AccountSettings;
