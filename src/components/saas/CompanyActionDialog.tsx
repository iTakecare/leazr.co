import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Trash2, 
  Pause, 
  Play, 
  Shield,
  Clock,
  FileText,
  Mail
} from 'lucide-react';

interface CompanyActionDialogProps {
  company: any;
  action: 'suspend' | 'delete' | 'reactivate' | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actionData: any) => void;
}

const CompanyActionDialog: React.FC<CompanyActionDialogProps> = ({
  company,
  action,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [backupData, setBackupData] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setReason('');
    setDuration('');
    setNotifyClient(true);
    setBackupData(false);
    setConfirmationText('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!isValidForm()) return;

    setIsLoading(true);
    
    const actionData = {
      action,
      reason,
      duration: action === 'suspend' ? duration : undefined,
      notifyClient,
      backupData: action === 'delete' ? backupData : undefined,
      timestamp: new Date().toISOString()
    };

    try {
      await onConfirm(actionData);
      handleClose();
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidForm = () => {
    if (!reason.trim()) return false;
    if (action === 'delete' && confirmationText !== company?.name) return false;
    return true;
  };

  const getActionConfig = () => {
    switch (action) {
      case 'suspend':
        return {
          title: 'Suspendre le compte',
          icon: <Pause className="h-5 w-5 text-orange-500" />,
          color: 'orange',
          description: 'Le compte sera temporairement suspendu. Les utilisateurs ne pourront pas se connecter.',
          confirmButton: 'Suspendre',
          variant: 'destructive' as const
        };
      case 'delete':
        return {
          title: 'Supprimer le compte',
          icon: <Trash2 className="h-5 w-5 text-red-500" />,
          color: 'red',
          description: 'Cette action est irréversible. Toutes les données seront définitivement supprimées.',
          confirmButton: 'Supprimer définitivement',
          variant: 'destructive' as const
        };
      case 'reactivate':
        return {
          title: 'Réactiver le compte',
          icon: <Play className="h-5 w-5 text-green-500" />,
          color: 'green',
          description: 'Le compte sera réactivé et les utilisateurs pourront à nouveau se connecter.',
          confirmButton: 'Réactiver',
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config || !company) return null;

  const suspensionDurations = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: 'indefinite', label: 'Indéfinie' }
  ];

  const suspensionReasons = [
    'Violation des conditions d\'utilisation',
    'Problème de paiement',
    'Demande du client',
    'Maintenance planifiée',
    'Enquête de sécurité',
    'Autre (spécifier ci-dessous)'
  ];

  const deletionReasons = [
    'Demande de suppression du client',
    'Non-paiement prolongé',
    'Violation grave des CGU',
    'Fin de contrat',
    'Migration vers un autre système',
    'Autre (spécifier ci-dessous)'
  ];

  const reactivationReasons = [
    'Problème de paiement résolu',
    'Fin de la période de suspension',
    'Demande du client',
    'Maintenance terminée',
    'Enquête de sécurité terminée',
    'Autre (spécifier ci-dessous)'
  ];

  const getReasonsList = () => {
    switch (action) {
      case 'suspend':
        return suspensionReasons;
      case 'delete':
        return deletionReasons;
      case 'reactivate':
        return reactivationReasons;
      default:
        return [];
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {config.icon}
            {config.title} - {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className={`border-${config.color}-200 bg-${config.color}-50`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {config.description}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations sur l'entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nom:</span> {company.name}
                </div>
                <div>
                  <span className="font-medium">Plan:</span> 
                  <Badge variant="secondary" className="ml-2">
                    {company.plan?.charAt(0).toUpperCase() + company.plan?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Utilisateurs:</span> {company.user_count || 0}
                </div>
                <div>
                  <span className="font-medium">Clients:</span> {company.clients_count || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Raison de l'action *</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une raison" />
                </SelectTrigger>
                <SelectContent>
                  {getReasonsList().map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {action === 'suspend' && (
              <div>
                <label className="text-sm font-medium">Durée de suspension</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    {suspensionDurations.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notes additionnelles</label>
              <Textarea 
                placeholder="Détails supplémentaires..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="notify"
                  checked={notifyClient}
                  onCheckedChange={(checked) => setNotifyClient(checked === true)}
                />
                <label htmlFor="notify" className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Notifier le client par email
                </label>
              </div>

              {action === 'delete' && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="backup"
                    checked={backupData}
                    onCheckedChange={(checked) => setBackupData(checked === true)}
                  />
                  <label htmlFor="backup" className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Créer une sauvegarde avant suppression
                  </label>
                </div>
              )}
            </div>

            {action === 'delete' && (
              <div>
                <label className="text-sm font-medium text-red-600">
                  Confirmation de suppression *
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Tapez exactement "<span className="font-mono font-bold">{company.name}</span>" pour confirmer
                </p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={company.name}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant={config.variant}
              onClick={handleConfirm}
              disabled={!isValidForm() || isLoading}
              className="min-w-[160px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </div>
              ) : (
                config.confirmButton
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyActionDialog;