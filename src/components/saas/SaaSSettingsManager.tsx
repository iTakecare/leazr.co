
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Globe, 
  Mail, 
  Shield, 
  CreditCard,
  Database,
  Palette,
  Bell,
  Key,
  Save
} from "lucide-react";

const SaaSSettingsManager = () => {
  const [settings, setSettings] = useState({
    // Paramètres généraux
    platformName: 'Leazr SaaS',
    platformDescription: 'Plateforme de gestion de leasing tout-en-un',
    supportEmail: 'support@leazr.com',
    maintenanceMode: false,
    newRegistrations: true,
    
    // Paramètres email
    smtpHost: 'smtp.resend.com',
    smtpPort: '587',
    smtpUser: 'resend',
    smtpPassword: '••••••••',
    emailSignature: 'L\'équipe Leazr SaaS',
    
    // Paramètres de sécurité
    passwordMinLength: 8,
    requireTwoFactor: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    
    // Paramètres de facturation
    currency: 'EUR',
    taxRate: 20,
    trialDuration: 14,
    gracePeriod: 3,
    
    // Paramètres d'apparence
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    logoUrl: '',
    favicon: '',
    
    // Notifications
    emailNotifications: true,
    slackWebhook: '',
    discordWebhook: '',
    
    // API et intégrations
    apiRateLimit: 1000,
    webhookSecret: '••••••••••••••••',
    stripePublicKey: 'pk_test_••••••••',
    stripeSecretKey: 'sk_test_••••••••'
  });

  const handleSave = (section: string) => {
    console.log(`Sauvegarde des paramètres ${section}:`, settings);
    // Ici, vous ajouteriez la logique de sauvegarde
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuration SaaS</h2>
        <p className="text-muted-foreground">Paramètres et configuration de la plateforme Leazr</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Facturation</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Base</span>
          </TabsTrigger>
        </TabsList>

        {/* Paramètres généraux */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>Configuration de base de la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Nom de la plateforme</Label>
                  <Input 
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Email de support</Label>
                  <Input 
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="platformDescription">Description</Label>
                <Textarea 
                  id="platformDescription"
                  value={settings.platformDescription}
                  onChange={(e) => setSettings({...settings, platformDescription: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Mode maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Mettre la plateforme en maintenance
                  </p>
                </div>
                <Switch 
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Nouvelles inscriptions</Label>
                  <p className="text-sm text-muted-foreground">
                    Autoriser les nouvelles inscriptions
                  </p>
                </div>
                <Switch 
                  checked={settings.newRegistrations}
                  onCheckedChange={(checked) => setSettings({...settings, newRegistrations: checked})}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('general')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres email */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration email</CardTitle>
              <CardDescription>Paramètres SMTP et modèles d'email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input 
                    id="smtpHost"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input 
                    id="smtpPort"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({...settings, smtpPort: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">Utilisateur SMTP</Label>
                  <Input 
                    id="smtpUser"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">Mot de passe SMTP</Label>
                  <Input 
                    id="smtpPassword"
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => setSettings({...settings, smtpPassword: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailSignature">Signature email</Label>
                <Textarea 
                  id="emailSignature"
                  value={settings.emailSignature}
                  onChange={(e) => setSettings({...settings, emailSignature: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('email')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres de sécurité */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité et authentification</CardTitle>
              <CardDescription>Paramètres de sécurité de la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Longueur minimale du mot de passe</Label>
                  <Input 
                    id="passwordMinLength"
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Expiration de session (heures)</Label>
                  <Input 
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Tentatives de connexion max</Label>
                <Input 
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="max-w-32"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Exiger 2FA pour tous les utilisateurs
                  </p>
                </div>
                <Switch 
                  checked={settings.requireTwoFactor}
                  onCheckedChange={(checked) => setSettings({...settings, requireTwoFactor: checked})}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('security')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres de facturation */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facturation et paiements</CardTitle>
              <CardDescription>Configuration des paramètres de facturation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select value={settings.currency} onValueChange={(value) => setSettings({...settings, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">Dollar US (USD)</SelectItem>
                      <SelectItem value="GBP">Livre Sterling (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                  <Input 
                    id="taxRate"
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({...settings, taxRate: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="trialDuration">Durée d'essai (jours)</Label>
                  <Input 
                    id="trialDuration"
                    type="number"
                    value={settings.trialDuration}
                    onChange={(e) => setSettings({...settings, trialDuration: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gracePeriod">Période de grâce (jours)</Label>
                  <Input 
                    id="gracePeriod"
                    type="number"
                    value={settings.gracePeriod}
                    onChange={(e) => setSettings({...settings, gracePeriod: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('billing')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apparence */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apparence et branding</CardTitle>
              <CardDescription>Personnalisation de l'interface utilisateur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Couleur primaire</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                      className="w-16"
                    />
                    <Input 
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                      className="w-16"
                    />
                    <Input 
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({...settings, secondaryColor: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL du logo</Label>
                  <Input 
                    id="logoUrl"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon">URL du favicon</Label>
                  <Input 
                    id="favicon"
                    value={settings.favicon}
                    onChange={(e) => setSettings({...settings, favicon: e.target.value})}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('appearance')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configuration des notifications et intégrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Notifications email</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des notifications par email
                  </p>
                </div>
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slackWebhook">Webhook Slack</Label>
                <Input 
                  id="slackWebhook"
                  value={settings.slackWebhook}
                  onChange={(e) => setSettings({...settings, slackWebhook: e.target.value})}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordWebhook">Webhook Discord</Label>
                <Input 
                  id="discordWebhook"
                  value={settings.discordWebhook}
                  onChange={(e) => setSettings({...settings, discordWebhook: e.target.value})}
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('notifications')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API et intégrations</CardTitle>
              <CardDescription>Configuration des API et services externes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">Limite de taux API (requêtes/heure)</Label>
                <Input 
                  id="apiRateLimit"
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => setSettings({...settings, apiRateLimit: parseInt(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Secret webhook</Label>
                <Input 
                  id="webhookSecret"
                  type="password"
                  value={settings.webhookSecret}
                  onChange={(e) => setSettings({...settings, webhookSecret: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stripePublicKey">Clé publique Stripe</Label>
                  <Input 
                    id="stripePublicKey"
                    value={settings.stripePublicKey}
                    onChange={(e) => setSettings({...settings, stripePublicKey: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Clé secrète Stripe</Label>
                  <Input 
                    id="stripeSecretKey"
                    type="password"
                    value={settings.stripeSecretKey}
                    onChange={(e) => setSettings({...settings, stripeSecretKey: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('api')}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base de données */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base de données et maintenance</CardTitle>
              <CardDescription>Outils de maintenance et de monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">47</div>
                    <div className="text-sm text-muted-foreground">Clients SaaS</div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">2.3GB</div>
                    <div className="text-sm text-muted-foreground">Taille de la DB</div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Sauvegarde automatique</h4>
                    <p className="text-sm text-muted-foreground">Dernière sauvegarde: il y a 2 heures</p>
                  </div>
                  <Button variant="outline">Forcer une sauvegarde</Button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Optimisation de la base</h4>
                    <p className="text-sm text-muted-foreground">Optimiser les performances</p>
                  </div>
                  <Button variant="outline">Optimiser maintenant</Button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Nettoyage des logs</h4>
                    <p className="text-sm text-muted-foreground">Supprimer les anciens logs</p>
                  </div>
                  <Button variant="outline">Nettoyer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SaaSSettingsManager;
