
import React, { useState } from 'react';
import { 
  User, Mail, Phone, Calendar, Tag, FileText, 
  UserPlus, KeyRound, Users, CreditCard, ChevronLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Card, CardContent, CardDescription, 
  CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Ambassador } from '@/services/ambassadorService';
import { createUserAccount, resetPassword } from '@/services/accountService';

interface AmbassadorDetailProps {
  ambassador: Ambassador;
  onReloadData: () => void;
}

const AmbassadorDetail = ({ ambassador, onReloadData }: AmbassadorDetailProps) => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const handleCreateAccount = async () => {
    if (!ambassador) return;
    
    if (!ambassador.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }
    
    setIsCreatingAccount(true);
    try {
      const success = await createUserAccount(ambassador, "ambassador");
      if (success) {
        onReloadData();
        toast.success("Compte utilisateur créé et emails de configuration envoyés");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Erreur lors de la création du compte");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleResetPassword = async () => {
    if (!ambassador?.email) {
      toast.error("Cet ambassadeur n'a pas d'adresse email");
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await resetPassword(ambassador.email);
      if (success) {
        toast.success("Email de réinitialisation envoyé avec succès");
      } else {
        toast.error("Échec de l'envoi de l'email de réinitialisation");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Détails de l'ambassadeur</h1>
        <div className="flex gap-2">
          <Link to="/ambassadors">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour à la liste
            </Button>
          </Link>
          <Link to={`/ambassadors/edit/${ambassador.id}`}>
            <Button size="sm">Modifier</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations principales
            </CardTitle>
            <CardDescription>Coordonnées et informations générales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{ambassador.email || 'Non spécifié'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Téléphone</p>
                  <p className="text-sm text-muted-foreground">{ambassador.phone || 'Non spécifié'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Statut</p>
                  <Badge variant={ambassador.status === 'active' ? 'secondary' : 'outline'}>
                    {ambassador.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date de création</p>
                  <p className="text-sm text-muted-foreground">{formatDate(ambassador.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dernière mise à jour</p>
                  <p className="text-sm text-muted-foreground">{formatDate(ambassador.updated_at)}</p>
                </div>
              </div>
            </div>
            
            {ambassador.notes && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{ambassador.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Account card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Compte utilisateur
            </CardTitle>
            <CardDescription>Accès à la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {ambassador.has_user_account ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800 font-medium">Compte actif</p>
                  {ambassador.user_account_created_at && (
                    <p className="text-xs text-green-700">
                      Créé le {formatDate(ambassador.user_account_created_at)}
                    </p>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {isResettingPassword ? 'Envoi en cours...' : 'Réinitialiser le mot de passe'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-800">
                    Cet ambassadeur n'a pas encore de compte utilisateur
                  </p>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleCreateAccount}
                  disabled={isCreatingAccount || !ambassador.email}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isCreatingAccount ? 'Création en cours...' : 'Créer un compte'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Stats card */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Performance
            </CardTitle>
            <CardDescription>Statistiques et commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-md p-4">
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{ambassador.clients_count || 0}</p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Nombre total de clients</span>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-md p-4">
                <p className="text-sm text-muted-foreground">Commissions totales</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(ambassador.commissions_total || 0)}</p>
                <div className="flex items-center mt-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Montant cumulé</span>
                </div>
              </div>
              
              <div className="bg-muted/30 rounded-md p-4">
                <p className="text-sm text-muted-foreground">Dernière commission</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(ambassador.last_commission || 0)}</p>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Montant de la dernière transaction</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/ambassadors/${ambassador.id}/commissions`}>
                <CreditCard className="h-4 w-4 mr-2" />
                Voir toutes les commissions
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AmbassadorDetail;
