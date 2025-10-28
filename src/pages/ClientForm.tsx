
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PostalCodeInput } from '@/components/form/PostalCodeInput';
import { linkClientToAmbassador, getClientAmbassador, updateClientAmbassador } from '@/services/ambassador/ambassadorClients';
import { createClient, getClientById, updateClient } from '@/services/clientService';
import { formatPhoneWithCountry } from '@/services/postalCodeService';
import { toast } from 'sonner';
import { ArrowLeft, Phone, UserPlus } from 'lucide-react';
import { ClientLogoUploader } from '@/components/clients/ClientLogoUploader';
import AmbassadorSelector from '@/components/ui/AmbassadorSelector';


const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    vat_number: '',
    notes: '',
    logo_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentAmbassadorId, setCurrentAmbassadorId] = useState<string | null>(null);
  const [currentAmbassadorName, setCurrentAmbassadorName] = useState<string>('');
  const [showAmbassadorSelector, setShowAmbassadorSelector] = useState(false);
  const [loadingAmbassador, setLoadingAmbassador] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadClient(id);
    }
  }, [id, isEdit]);

  const loadClient = async (clientId: string) => {
    setLoading(true);
    try {
      const client = await getClientById(clientId);
      if (client) {
        // Parse existing name if first_name/last_name don't exist
        const parseExistingName = () => {
          if (client.first_name || client.last_name) {
            return {
              first_name: client.first_name || "",
              last_name: client.last_name || ""
            };
          }
          
          const nameToparse = client.contact_name || client.name || "";
          const nameParts = nameToparse.trim().split(' ');
          
          if (nameParts.length >= 2) {
            return {
              first_name: nameParts[0],
              last_name: nameParts.slice(1).join(' ')
            };
          } else {
            return {
              first_name: nameToparse,
              last_name: ""
            };
          }
        };

        const parsedName = parseExistingName();

        setFormData({
          name: client.name || '',
          first_name: parsedName.first_name,
          last_name: parsedName.last_name,
          email: client.email || '',
          company: client.company || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          postal_code: client.postal_code || '',
          country: client.country || '',
          vat_number: client.vat_number || '',
          notes: client.notes || '',
          logo_url: client.logo_url || ''
        });
        
        // Charger l'ambassadeur lié si en mode édition
        setLoadingAmbassador(true);
        try {
          const ambassador = await getClientAmbassador(clientId);
          if (ambassador) {
            setCurrentAmbassadorId(ambassador.id);
            setCurrentAmbassadorName(ambassador.name);
          }
        } catch (error) {
          console.error('Erreur lors du chargement de l\'ambassadeur:', error);
        } finally {
          setLoadingAmbassador(false);
        }
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Impossible de charger les données du client');
    } finally {
      setLoading(false);
    }
  };

  const handleAmbassadorChange = async (ambassadorId: string | null, ambassadorName?: string) => {
    if (!isEdit || !id) return;
    
    setLoadingAmbassador(true);
    try {
      await updateClientAmbassador(id, ambassadorId);
      setCurrentAmbassadorId(ambassadorId);
      setCurrentAmbassadorName(ambassadorName || '');
      toast.success(
        ambassadorId 
          ? 'Ambassadeur attribué avec succès' 
          : 'Ambassadeur retiré avec succès'
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ambassadeur:', error);
      toast.error('Erreur lors de la mise à jour de l\'ambassadeur');
    } finally {
      setLoadingAmbassador(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() && !formData.last_name.trim()) {
      toast.error('Le prénom ou le nom de famille est requis');
      return;
    }
    
    setSaving(true);
    
    try {
      // Generate the full name from first_name and last_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      
      const clientData = { 
        ...formData,
        name: fullName,
        contact_name: fullName,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim()
      };

      if (isEdit && id) {
        await updateClient(id, clientData);
        toast.success('Client mis à jour avec succès');
      } else {
        const newClient = await createClient(clientData);
        
        // If we have an ambassador ID in the state, link the client to the ambassador
        const state = location.state as { ambassadorId?: string };
        if (state?.ambassadorId && newClient.id) {
          try {
            await linkClientToAmbassador(newClient.id, state.ambassadorId);
            toast.success('Client créé et lié à l\'ambassadeur avec succès');
          } catch (linkError) {
            console.error('Error linking client to ambassador:', linkError);
            toast.warning('Client créé, mais impossible de le lier à l\'ambassadeur');
          }
        } else {
          toast.success('Client créé avec succès');
        }
      }
      
      navigate(-1);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erreur lors de la sauvegarde du client');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle phone formatting when country changes
  const handleCountryChange = (countryCode: string) => {
    const formattedPhone = formatPhoneWithCountry(formData.phone, countryCode);
    setFormData(prev => ({
      ...prev,
      country: countryCode,
      phone: formattedPhone
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="Prénom"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Nom de famille *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Nom de famille"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Société</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Ex: +32 2 123 45 67"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <PostalCodeInput
                    postalCode={formData.postal_code}
                    city={formData.city}
                    country={formData.country}
                    onPostalCodeChange={(value) => handleInputChange('postal_code', value)}
                    onCityChange={(value) => handleInputChange('city', value)}
                    onCountryChange={handleCountryChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="vat_number">Numéro de TVA</Label>
                  <Input
                    id="vat_number"
                    value={formData.vat_number}
                    onChange={(e) => handleInputChange('vat_number', e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
                
                 <div className="md:col-span-2">
                   <Label>Logo du client</Label>
                   <ClientLogoUploader
                     clientId={id}
                     initialLogoUrl={formData.logo_url}
                     onLogoUploaded={(url) => handleInputChange('logo_url', url)}
                     onLogoRemoved={() => handleInputChange('logo_url', '')}
                   />
                 </div>
                 
                 {isEdit && (
                   <div className="md:col-span-2">
                     <Label>Ambassadeur attribué</Label>
                     <div className="flex items-center gap-2 mt-2">
                       {loadingAmbassador ? (
                         <div className="text-sm text-muted-foreground">Chargement...</div>
                       ) : currentAmbassadorId ? (
                         <>
                           <Badge variant="secondary" className="text-sm">
                             {currentAmbassadorName}
                           </Badge>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => setShowAmbassadorSelector(true)}
                           >
                             Changer
                           </Button>
                           <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             onClick={() => handleAmbassadorChange(null)}
                           >
                             Retirer
                           </Button>
                         </>
                       ) : (
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => setShowAmbassadorSelector(true)}
                         >
                           <UserPlus className="h-4 w-4 mr-2" />
                           Attribuer un ambassadeur
                         </Button>
                       )}
                     </div>
                   </div>
                 )}
                 
              </div>
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Sauvegarde...' : (isEdit ? 'Mettre à jour' : 'Créer')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <AmbassadorSelector
          isOpen={showAmbassadorSelector}
          onClose={() => setShowAmbassadorSelector(false)}
          onSelectAmbassador={(ambassador) => {
            handleAmbassadorChange(ambassador.id, ambassador.name);
            setShowAmbassadorSelector(false);
          }}
          selectedAmbassadorId={currentAmbassadorId || undefined}
        />
      </div>
    </div>
  );
};

export default ClientForm;
