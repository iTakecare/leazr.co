
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FetchingOptions } from './types';

interface ImportOptionsProps {
  options: FetchingOptions;
  setOptions: (options: FetchingOptions) => void;
  disabled: boolean;
  schemaHasCategory: boolean;
  schemaHasDescription: boolean;
}

const ImportOptions: React.FC<ImportOptionsProps> = ({
  options,
  setOptions,
  disabled,
  schemaHasCategory,
  schemaHasDescription
}) => {
  const handleOptionChange = (option: keyof FetchingOptions, checked: boolean) => {
    setOptions({ ...options, [option]: checked });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-md font-medium text-gray-900 mb-4">Options d&apos;importation</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2">
          <Switch
            checked={options.includeImages}
            onCheckedChange={(checked) => handleOptionChange('includeImages', checked)}
            disabled={disabled}
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Importer les images</span>
            <p className="text-xs text-muted-foreground">Les URLs des images seront utilisées</p>
          </div>
        </label>
        
        <label className="flex items-center gap-2">
          <Switch
            checked={options.includeVariations}
            onCheckedChange={(checked) => handleOptionChange('includeVariations', checked)}
            disabled={disabled}
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Importer les variations</span>
            <p className="text-xs text-muted-foreground">Chaque variation sera traitée comme un produit distinct</p>
          </div>
        </label>
        
        <label className="flex items-center gap-2">
          <Switch
            checked={options.includeDescriptions}
            onCheckedChange={(checked) => handleOptionChange('includeDescriptions', checked)}
            disabled={disabled || !schemaHasDescription}
          />
          <div>
            <span className={`text-sm font-medium ${!schemaHasDescription ? 'text-gray-400' : 'text-gray-700'}`}>
              Importer les descriptions
              {!schemaHasDescription && " (requiert une mise à jour du schéma)"}
            </span>
            <p className={`text-xs ${!schemaHasDescription ? 'text-gray-400' : 'text-muted-foreground'}`}>
              Les descriptions courtes et longues seront importées
            </p>
          </div>
        </label>
        
        <label className="flex items-center gap-2">
          <Switch
            checked={options.importCategories}
            onCheckedChange={(checked) => handleOptionChange('importCategories', checked)}
            disabled={disabled || !schemaHasCategory}
          />
          <div>
            <span className={`text-sm font-medium ${!schemaHasCategory ? 'text-gray-400' : 'text-gray-700'}`}>
              Mapper les catégories
              {!schemaHasCategory && " (requiert une mise à jour du schéma)"}
            </span>
            <p className={`text-xs ${!schemaHasCategory ? 'text-gray-400' : 'text-muted-foreground'}`}>
              Les catégories seront converties au format iTakecare
            </p>
          </div>
        </label>

        <label className="flex items-center gap-2">
          <Switch
            checked={options.overwriteExisting}
            onCheckedChange={(checked) => handleOptionChange('overwriteExisting', checked)}
            disabled={disabled}
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Écraser les produits existants</span>
            <p className="text-xs text-muted-foreground">
              Met à jour les produits avec le même nom/marque
            </p>
          </div>
        </label>

        <label className="flex items-center gap-2">
          <Switch
            checked={options.bypassRLS}
            onCheckedChange={(checked) => handleOptionChange('bypassRLS', checked)}
            disabled={disabled}
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Contourner la sécurité RLS</span>
            <p className="text-xs text-muted-foreground">
              Utilise un bypass de sécurité pour l&apos;importation
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ImportOptions;
