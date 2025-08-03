
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PostalCodeInput } from '@/components/form/PostalCodeInput';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { linkClientToAmbassador } from '@/services/ambassador/ambassadorClients';
import { createClient, getClientById, updateClient } from '@/services/clientService';
import { formatPhoneWithCountry, getCountries, getDefaultCountryForCompany, CountryOption } from '@/services/postalCodeService';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Flag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch available countries
  const { data: countries = [] } = useQuery<CountryOption[]>({
    queryKey: ['countries'],
    queryFn: getCountries,
  });

  // Get default country for company
  const { data: defaultCountry } = useQuery({
    queryKey: ['default-country'],
    queryFn: getDefaultCountryForCompany,
  });

  // Set default country when available
  useEffect(() => {
    if (defaultCountry && !formData.country) {
      setFormData(prev => ({
        ...prev,
        country: defaultCountry
      }));
    }
  }, [defaultCountry, formData.country]);

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
          notes: client.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Impossible de charger les données du client');
    } finally {
      setLoading(false);
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

  // Prepare country options for combobox
  const countryOptions: ComboboxOption[] = countries.map(country => ({
    value: country.code,
    label: `${country.flag} ${country.name_fr}`,
    extra: country.name_en
  }));

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
                
                <div>
                  <Label className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Pays
                  </Label>
                  <Combobox
                    options={countryOptions}
                    value={formData.country}
                    onValueChange={handleCountryChange}
                    placeholder="Sélectionner un pays..."
                    searchPlaceholder="Rechercher un pays..."
                    emptyMessage="Aucun pays trouvé."
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
      </div>
    </div>
  );
};

export default ClientForm;
