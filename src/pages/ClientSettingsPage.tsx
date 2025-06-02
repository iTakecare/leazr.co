
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Settings, User, Shield, Bell, CreditCard } from "lucide-react";

const ClientSettingsPage = () => {
  const { user } = useAuth();

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
              <Input id="firstName" defaultValue={user?.first_name || ""} />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" defaultValue={user?.last_name || ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user?.email || ""} type="email" />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" placeholder="+33 1 23 45 67 89" />
          </div>
          <Button>Enregistrer les modifications</Button>
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
            <Input id="currentPassword" type="password" />
          </div>
          <div>
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
            <Input id="confirmPassword" type="password" />
          </div>
          <Button>Changer le mot de passe</Button>
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
    },
    {
      title: "Facturation",
      description: "Gérez vos informations de facturation",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="company">Société</Label>
            <Input id="company" placeholder="Nom de votre société" />
          </div>
          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" placeholder="Adresse de facturation" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input id="city" placeholder="Ville" />
            </div>
            <div>
              <Label htmlFor="postalCode">Code postal</Label>
              <Input id="postalCode" placeholder="Code postal" />
            </div>
          </div>
          <div>
            <Label htmlFor="vatNumber">Numéro TVA</Label>
            <Input id="vatNumber" placeholder="BE0123456789" />
          </div>
          <Button>Mettre à jour</Button>
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

      <div className="space-y-6">
        {settingSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {section.content}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClientSettingsPage;
