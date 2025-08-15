import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  AlertTriangle,
  Pause,
  Trash2,
  Play,
  Shield,
  Mail,
  Database,
  Clock,
  FileX,
  History,
  User
} from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { motion } from "framer-motion";

// Mock data
const mockCompanyData = {
  id: '1',
  name: 'TechCorp Solutions',
  account_status: 'active',
  created_at: '2024-01-15T10:00:00Z',
  last_login: '2024-02-20T14:30:00Z',
  user_count: 25,
  data_size: '2.5 GB'
};

const actionHistory = [
  {
    id: '1',
    date: '2024-02-15T10:00:00Z',
    action: 'Suspension temporaire',
    reason: 'Problème de paiement résolu',
    duration: '3 jours',
    admin: 'Admin SaaS'
  },
  {
    id: '2', 
    date: '2024-01-20T15:30:00Z',
    action: 'Prolongation période essai',
    reason: 'Demande client',
    duration: '7 jours',
    admin: 'Admin SaaS'
  }
];

const CompanyActionsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // States pour les actions
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [backupData, setBackupData] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const company = mockCompanyData;

  const handleBack = () => {
    navigate(`/admin/leazr-saas-users/company/${id}/details`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const suspendReasons = [
    'Problème de paiement',
    'Violation des conditions d\'utilisation',
    'Demande du client',
    'Maintenance technique',
    'Problème de sécurité',
    'Autre'
  ];

  const deleteReasons = [
    'Demande de suppression du client',
    'Violation grave des conditions',
    'Compte inactif depuis longtemps',
    'Problème de conformité RGPD',
    'Fusion avec un autre compte',
    'Autre'
  ];

  const handleSuspendAccount = async () => {
    if (!suspendReason || !suspendDuration) return;
    
    setIsLoading(true);
    console.log('Suspension du compte:', {
      companyId: id,
      reason: suspendReason,
      duration: suspendDuration,
      notifyClient,
      backupData
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    
    // Reset form
    setSuspendReason('');
    setSuspendDuration('');
    setNotifyClient(true);
  };

  const handleReactivateAccount = async () => {
    setIsLoading(true);
    console.log('Réactivation du compte:', id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason || confirmationText !== company.name) return;
    
    setIsLoading(true);
    console.log('Suppression du compte:', {
      companyId: id,
      reason: deleteReason,
      backupData
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsLoading(false);
    
    // Redirect after deletion
    navigate('/admin/leazr-saas-users');
  };

  const isDeleteFormValid = deleteReason && confirmationText === company.name;

  return (
    <PageTransition>
      <Container>
        <motion.div
          className="py-6 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux détails
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-bold">Actions sur le Compte</h1>
              <p className="text-muted-foreground">{company.name}</p>
            </div>
            <div className="ml-auto">
              <Badge variant={company.account_status === 'active' ? 'default' : 'destructive'}>
                {company.account_status === 'active' ? 'Actif' : 'Suspendu'}
              </Badge>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Attention</p>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Les actions sur cette page peuvent affecter l'accès et les données de l'entreprise. 
              Assurez-vous de comprendre les conséquences avant de procéder.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions de suspension */}
            <div className="space-y-6">
              {company.account_status === 'active' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Pause className="h-5 w-5" />
                      Suspendre le Compte
                    </CardTitle>
                    <CardDescription>
                      Suspendre temporairement l'accès de l'entreprise à la plateforme
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Raison de la suspension *</Label>
                      <Select value={suspendReason} onValueChange={setSuspendReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une raison" />
                        </SelectTrigger>
                        <SelectContent>
                          {suspendReasons.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Durée de suspension *</Label>
                      <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez la durée" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 jour</SelectItem>
                          <SelectItem value="3">3 jours</SelectItem>
                          <SelectItem value="7">7 jours</SelectItem>
                          <SelectItem value="30">30 jours</SelectItem>
                          <SelectItem value="indefini">Indéfini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="notify-suspend" 
                          checked={notifyClient}
                          onCheckedChange={(checked) => setNotifyClient(checked === true)}
                        />
                        <Label htmlFor="notify-suspend" className="text-sm">
                          Notifier le client par email
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="backup-suspend" 
                          checked={backupData}
                          onCheckedChange={(checked) => setBackupData(checked === true)}
                        />
                        <Label htmlFor="backup-suspend" className="text-sm">
                          Créer une sauvegarde avant suspension
                        </Label>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSuspendAccount}
                      disabled={!suspendReason || !suspendDuration || isLoading}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {isLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Suspension en cours...
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Suspendre le compte
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <Play className="h-5 w-5" />
                      Réactiver le Compte
                    </CardTitle>
                    <CardDescription>
                      Rétablir l'accès de l'entreprise à la plateforme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleReactivateAccount}
                      disabled={isLoading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Réactivation en cours...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Réactiver le compte
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Actions de communication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un email personnalisé
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Notifier un problème de sécurité
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Actions de suppression et informations */}
            <div className="space-y-6">
              {/* Zone de danger */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    Zone de Danger
                  </CardTitle>
                  <CardDescription>
                    Actions irréversibles qui supprimeront définitivement le compte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Raison de la suppression *</Label>
                    <Select value={deleteReason} onValueChange={setDeleteReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une raison" />
                      </SelectTrigger>
                      <SelectContent>
                        {deleteReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Confirmation *</Label>
                    <Input
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder={`Tapez "${company.name}" pour confirmer`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tapez exactement le nom de l'entreprise pour confirmer la suppression
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="backup-delete" 
                      checked={backupData}
                      onCheckedChange={(checked) => setBackupData(checked === true)}
                    />
                    <Label htmlFor="backup-delete" className="text-sm">
                      Créer une sauvegarde complète avant suppression
                    </Label>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ Cette action est irréversible. Toutes les données de l'entreprise seront supprimées définitivement.
                    </p>
                  </div>

                  <Button 
                    onClick={handleDeleteAccount}
                    disabled={!isDeleteFormValid || isLoading}
                    variant="destructive"
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Suppression en cours...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer définitivement
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Informations du compte */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Informations du Compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Créé le:</span>
                    <span>{formatDate(company.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dernière connexion:</span>
                    <span>{formatDate(company.last_login)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilisateurs:</span>
                    <span>{company.user_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taille des données:</span>
                    <span>{company.data_size}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Historique des actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des Actions
              </CardTitle>
              <CardDescription>
                Dernières actions administratives effectuées sur ce compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {actionHistory.map((action) => (
                  <div key={action.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium">{action.action}</p>
                      <p className="text-sm text-muted-foreground">
                        Raison: {action.reason} • Durée: {action.duration}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{action.admin}</span>
                        <span>•</span>
                        <span>{formatDate(action.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {actionHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune action administrative enregistrée
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default CompanyActionsPage;