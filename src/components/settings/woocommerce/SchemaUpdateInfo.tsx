
import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface SchemaUpdateInfoProps {
  schemaHasCategory: boolean;
  schemaHasDescription: boolean;
  onUpdateSchema: () => void;
  updatingSchema: boolean;
  updateSuccess: boolean;
}

const SchemaUpdateInfo: React.FC<SchemaUpdateInfoProps> = ({
  schemaHasCategory,
  schemaHasDescription,
  onUpdateSchema,
  updatingSchema,
  updateSuccess
}) => {
  // Si le schéma est complet, ne rien afficher
  if (schemaHasCategory && schemaHasDescription) return null;
  
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="font-medium text-amber-800">
            Mise à jour du schéma requise
          </p>
          <p className="text-sm text-amber-700 mt-1">
            {!schemaHasCategory && !schemaHasDescription ? (
              "Les colonnes 'catégorie' et 'description' sont manquantes dans la table des produits."
            ) : !schemaHasCategory ? (
              "La colonne 'catégorie' est manquante dans la table des produits."
            ) : (
              "La colonne 'description' est manquante dans la table des produits."
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          {updateSuccess && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mise à jour réussie
            </div>
          )}
          
          {updatingSchema && (
            <Progress value={50} className="w-24 h-2" />
          )}
          
          <Button 
            onClick={onUpdateSchema} 
            disabled={updatingSchema || updateSuccess}
            variant="outline"
            className="bg-white hover:bg-amber-50 border-amber-300 text-amber-800"
          >
            {updatingSchema ? "Mise à jour en cours..." : "Mettre à jour le schéma"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default SchemaUpdateInfo;
