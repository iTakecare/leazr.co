
import React, { useState } from 'react';
import { 
  LinkIcon, 
  Key, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WooCommerceConfig, ConnectionStatus } from './types';
import { saveWooCommerceConfig, isValidUrl } from './WooCommerceService';

interface ConnectionFormProps {
  disabled: boolean;
  onTestConnection: (success: boolean) => void;
  connectionStatus: ConnectionStatus;
  setErrors: (errors: string[]) => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ 
  disabled, 
  onTestConnection, 
  connectionStatus, 
  setErrors 
}) => {
  // État local pour les champs du formulaire
  const [siteUrl, setSiteUrl] = useState('https://www.itakecare.be');
  const [consumerKey, setConsumerKey] = useState('ck_09a895603eb75cc364669e8e3317fe13e607ace0');
  const [consumerSecret, setConsumerSecret] = useState('cs_52c6e6aa2332f0d7e1b395ab32c32f75a8ce4ccc');
  const [showSecret, setShowSecret] = useState(false);

  const testConnection = async () => {
    // Validation des champs
    if (!siteUrl || !consumerKey || !consumerSecret) {
      setErrors(['Veuillez remplir tous les champs requis']);
      return false;
    }
    
    if (!isValidUrl(siteUrl)) {
      setErrors(['L\'URL du site n\'est pas valide']);
      return false;
    }

    try {
      // Sauvegarder la configuration
      saveWooCommerceConfig({
        url: siteUrl,
        consumerKey,
        consumerSecret
      });

      // Tester avec une requête simple
      const url = `${siteUrl}/wp-json/wc/v3/products?per_page=1`;
      const credentials = btoa(`${consumerKey}:${consumerSecret}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur de connexion: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data || !Array.isArray(data)) {
        throw new Error('Format de réponse invalide');
      }
      
      onTestConnection(true);
      return true;
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      setErrors([`Erreur de connexion à l'API WooCommerce: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]);
      onTestConnection(false);
      return false;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-md font-medium text-gray-900 mb-4">Informations de connexion WooCommerce</h3>
      
      <div className="space-y-4">
        <div>
          <Label className="block mb-1">
            URL du site WordPress
          </Label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              disabled={disabled}
              placeholder="https://www.itakecare.be"
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label className="block mb-1">
            Clé API Consommateur
          </Label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              disabled={disabled}
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxx"
              className="pl-10"
            />
          </div>
        </div>
        
        <div>
          <Label className="block mb-1">
            Secret API Consommateur
          </Label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type={showSecret ? "text" : "password"}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              disabled={disabled}
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxx"
              className="pl-10"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                {showSecret ? (
                  <span className="text-xs font-medium">Masquer</span>
                ) : (
                  <span className="text-xs font-medium">Afficher</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bouton de test de connexion */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            {connectionStatus === 'untested' ? (
              <>
                <ExternalLink className="h-4 w-4" />
                Tester la connexion
              </>
            ) : connectionStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                Connexion réussie
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                Erreur de connexion
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionForm;
