import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building, Mail, Phone, MapPin, Users, UserPlus } from 'lucide-react';
import { OfferFormData } from '@/hooks/useCustomOfferGenerator';
import ClientSelector, { ClientSelectorClient } from '@/components/ui/ClientSelector';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientInfoStepProps {
  formData: OfferFormData;
  updateFormData: (section: keyof OfferFormData, data: any) => void;
  // Client selection props
  clientSelectionMode: 'new' | 'existing';
  selectedClientId: string | null;
  isClientSelectorOpen: boolean;
  setIsClientSelectorOpen: (open: boolean) => void;
  loadClientData: (client: ClientSelectorClient) => void;
  toggleClientMode: (mode: 'new' | 'existing') => void;
}

const COUNTRIES = [
  'France',
  'Belgique',
  'Suisse',
  'Luxembourg',
  'Canada',
  'Autre'
];

export const ClientInfoStep: React.FC<ClientInfoStepProps> = ({
  formData,
  updateFormData,
  clientSelectionMode,
  selectedClientId,
  isClientSelectorOpen,
  setIsClientSelectorOpen,
  loadClientData,
  toggleClientMode
}) => {
  const { clientInfo } = formData;

  const handleChange = (field: string, value: string) => {
    updateFormData('clientInfo', { [field]: value });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informations Client
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez un client existant ou créez-en un nouveau
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Nouveau/Existant */}
          <div className="flex items-center justify-center">
            <div className="inline-flex rounded-lg border bg-muted p-1">
              <Button
                variant={clientSelectionMode === 'new' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleClientMode('new')}
                className="relative"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nouveau Client
              </Button>
              <Button
                variant={clientSelectionMode === 'existing' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleClientMode('existing')}
                className="relative"
              >
                <Users className="h-4 w-4 mr-2" />
                Client Existant
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {clientSelectionMode === 'existing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="p-4 bg-blue-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">Sélection d'un client existant</h4>
                      <p className="text-sm text-blue-700">
                        {selectedClientId 
                          ? "Client sélectionné - vous pouvez modifier les informations ci-dessous" 
                          : "Cliquez pour choisir un client dans votre base"
                        }
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsClientSelectorOpen(true)}
                      variant="outline"
                      size="sm"
                    >
                      {selectedClientId ? 'Changer' : 'Sélectionner'}
                    </Button>
                  </div>
                  {selectedClientId && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Client ID: {selectedClientId}
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire client - affiché dans les deux modes */}
          <motion.div
            key={clientSelectionMode}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Contact Principal */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Principal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={clientInfo.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="jean@entreprise.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={clientInfo.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+33 1 23 45 67 89"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Personne de contact</Label>
                  <Input
                    id="contactName"
                    value={clientInfo.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder="Si différent du nom principal"
                  />
                </div>
              </div>
            </div>

            {/* Informations Entreprise */}
            <div className="space-y-4 mt-6">
              <h3 className="font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Informations Entreprise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Nom de l'entreprise *</Label>
                  <Input
                    id="company"
                    value={clientInfo.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    placeholder="ACME Solutions"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">Numéro de TVA</Label>
                  <Input
                    id="vatNumber"
                    value={clientInfo.vatNumber}
                    onChange={(e) => handleChange('vatNumber', e.target.value)}
                    placeholder="FR12345678901"
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4 mt-6">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Adresse de Facturation
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={clientInfo.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="123 Rue de la Paix"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={clientInfo.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Paris"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      value={clientInfo.postalCode}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="75001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Select
                      value={clientInfo.country}
                      onValueChange={(value) => handleChange('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Client Selector Dialog */}
      <ClientSelector
        isOpen={isClientSelectorOpen}
        onClose={() => setIsClientSelectorOpen(false)}
        onSelectClient={loadClientData}
        selectedClientId={selectedClientId}
      />
    </>
  );
};

export default ClientInfoStep;