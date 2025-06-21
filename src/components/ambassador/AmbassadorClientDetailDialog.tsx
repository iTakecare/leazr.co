
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client } from "@/types/client";
import { User, Building, Mail, Phone, MapPin, Calendar, Edit } from "lucide-react";

interface AmbassadorClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const AmbassadorClientDetailDialog = ({
  client,
  open,
  onOpenChange,
  onEdit,
}: AmbassadorClientDetailDialogProps) => {
  if (!client) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'lead':
        return <Badge variant="outline">Prospect</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{client.name}</DialogTitle>
            <Button onClick={onEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom</label>
                  <p className="text-sm">{client.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <div className="mt-1">{getStatusBadge(client.status || 'active')}</div>
                </div>
                {client.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </label>
                    <p className="text-sm">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      Téléphone
                    </label>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informations entreprise */}
          {client.company && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Société</label>
                    <p className="text-sm">{client.company}</p>
                  </div>
                  {client.vat_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Numéro TVA</label>
                      <p className="text-sm">{client.vat_number}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adresse */}
          {(client.address || client.city || client.postal_code || client.country) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                      <p className="text-sm">{client.address}</p>
                    </div>
                  )}
                  {client.city && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ville</label>
                      <p className="text-sm">{client.city}</p>
                    </div>
                  )}
                  {client.postal_code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Code postal</label>
                      <p className="text-sm">{client.postal_code}</p>
                    </div>
                  )}
                  {client.country && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Pays</label>
                      <p className="text-sm">{client.country}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Informations système */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Informations système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de création</label>
                  <p className="text-sm">
                    {client.created_at 
                      ? new Date(client.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Non renseigné'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dernière modification</label>
                  <p className="text-sm">
                    {client.updated_at 
                      ? new Date(client.updated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Non renseigné'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorClientDetailDialog;
