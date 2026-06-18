import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useClientData } from '@/hooks/useClientData';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { createClientRequest } from '@/services/offers/clientRequests';
import { formatCurrency } from '@/utils/formatters';
import { getProductPrice } from '@/utils/productPricing';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, User, Mail, Building, Package, Euro, Loader2, Send, Monitor } from 'lucide-react';
import SelectedExternalProvidersList from '@/components/cart/SelectedExternalProvidersList';
import { clientColors, ClientCard, primaryBtnStyle } from '@/components/client/clientUi';

/* Style d'input thématisé (espace client Leazr) */
const themedInput =
  'w-full rounded-[11px] border bg-white text-[#0F172A] placeholder:text-[#94A0B4] ' +
  'focus-visible:ring-2 focus-visible:ring-[#2D55E5]/30 focus-visible:border-[#2D55E5] ' +
  'border-[#E2E5EC] transition-colors';

const cardTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: clientColors.ink,
  margin: 0,
};

const ClientRequestSummary: React.FC = () => {
  const { navigateToClient } = useRoleNavigation();
  const { items, cartTotal, clearCart, externalProviderProducts } = useCart();
  const { clientData, loading: clientLoading } = useClientData();
  const { companyId } = useMultiTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedSoftwareIds, setSelectedSoftwareIds] = useState<string[]>([]);
  const [otherSoftware, setOtherSoftware] = useState('');
  
  // Load software catalog for the company
  const { data: softwareCatalog = [] } = useQuery({
    queryKey: ['software-catalog-checkout', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('software_catalog')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('category', { ascending: true });
      if (error) { console.error('Error loading software catalog:', error); return []; }
      return data || [];
    },
    enabled: !!companyId,
  });
  
  const toggleSoftware = (id: string) => {
    setSelectedSoftwareIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };
  
  // Group software by category
  const softwareByCategory = softwareCatalog.reduce((acc: Record<string, any[]>, sw: any) => {
    const cat = sw.category || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sw);
    return acc;
  }, {});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientData) {
      toast.error("Impossible de récupérer vos informations client");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    if (!companyId) {
      toast.error("Erreur de configuration : ID de l'entreprise manquant");
      console.error("Company ID is missing:", { companyId, clientData });
      return;
    }
    
    setIsSubmitting(true);
    
    // Build equipment description from cart items
    const equipmentLines = items.map(item => {
      const price = getProductPrice(item.product, item.selectedOptions);
      const options = item.selectedOptions && Object.keys(item.selectedOptions).length > 0 
        ? ` (${Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(', ')})`
        : '';
      return `- ${item.product.name}${options} - Quantité: ${item.quantity} - Durée: ${item.duration} mois - Prix mensuel: ${formatCurrency(price.monthlyPrice)}`;
    });
    
    const equipmentDescription = `Demande client pour les équipements suivants:\n\n${equipmentLines.join('\n')}\n\nTotal mensuel: ${formatCurrency(cartTotal)}`;
    
    // Calculate total purchase price from cart items using actual product prices
    const totalPurchasePrice = items.reduce((total, item) => {
      const price = getProductPrice(item.product, item.selectedOptions);
      // Use actual purchase price from product, with fallback to monthly price * realistic coefficient
      const purchasePrice = price.purchasePrice > 0 ? price.purchasePrice : (price.monthlyPrice * 2.0);
      return total + (purchasePrice * item.quantity);
    }, 0);
    
    // Calculate coefficient and financed amount
    const defaultDuration = 36;
    const coefficient = totalPurchasePrice > 0 ? (cartTotal * 100) / totalPurchasePrice : 2.8;
    const financedAmount = totalPurchasePrice + (totalPurchasePrice * 0.15); // Purchase price + 15% margin
    
      // Build remarks with software info
      let remarks = message || '';
      const selectedSoftwareNames = softwareCatalog
        .filter((sw: any) => selectedSoftwareIds.includes(sw.id))
        .map((sw: any) => sw.name);
      if (selectedSoftwareNames.length > 0) {
        remarks += (remarks ? '\n\n' : '') + 'Logiciels souhaités : ' + selectedSoftwareNames.join(', ');
      }
      if (otherSoftware.trim()) {
        remarks += (remarks ? '\n' : '') + 'Autres logiciels demandés : ' + otherSoftware.trim();
      }
      if (!remarks) {
        remarks = "Demande envoyée depuis l'espace client";
      }

      const requestData = {
      type: 'client_request',
      workflow_template_id: 'f6e29d41-ef40-4253-ab08-e23060da47da',
      client_name: clientData.name || 'Client',
      client_email: clientData.email || '',
      client_contact_email: clientData.email || '',
      equipment_description: equipmentDescription,
      amount: Number(totalPurchasePrice) || 0,
      monthly_payment: Number(cartTotal) || 0,
      financed_amount: Number(financedAmount) || 0,
      coefficient: Number(coefficient.toFixed(2)) || 2.8,
      margin: Number(financedAmount - totalPurchasePrice) || 0,
      status: 'pending',
      workflow_status: 'draft',
      company_id: companyId,
      client_id: clientData.id || null,
      remarks
    };

    // Prepare cart items with pricing for equipment creation
    // Clean selectedOptions to remove internal keys before passing to service
    const internalKeys = ['variant_id', 'selected_variant_id'];
    const cartItemsWithPricing = items.map(item => ({
      ...item,
      selectedOptions: item.selectedOptions 
        ? Object.fromEntries(Object.entries(item.selectedOptions).filter(([key]) => !internalKeys.includes(key)))
        : undefined,
      price: getProductPrice(item.product, item.selectedOptions)
    }));

    console.log("Submitting client request with data:", requestData);
    
    try {
      const response = await createClientRequest(requestData, cartItemsWithPricing, externalProviderProducts);
      
      if (response.error) {
        console.error("Error from createClientRequest:", response.error);
        const errorMessage = response.error.message || 'Erreur lors de la création de la demande';
        throw new Error(errorMessage);
      }

      if (!response.data) {
        console.error("No data returned from createClientRequest:", response);
        throw new Error('Aucune donnée retournée lors de la création de la demande');
      }
      
      console.log("Client request created successfully:", response.data);
      
      // Clear cart and navigate to success page
      clearCart();
      toast.success("Votre demande a été envoyée avec succès !");
      
      // Navigate to client dashboard with success message
      navigateToClient('dashboard');
      
    } catch (error: any) {
      console.error("Error submitting request:", error);
      console.error("Request data that failed:", requestData);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi de votre demande.";
      
      if (error.message) {
        if (error.message.includes('company_id')) {
          errorMessage = "Erreur de configuration de l'entreprise. Contactez le support.";
        } else if (error.message.includes('client_name')) {
          errorMessage = "Nom client requis. Vérifiez vos informations de profil.";
        } else if (error.message.includes('amount')) {
          errorMessage = "Montant invalide. Vérifiez votre panier.";
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (clientLoading) {
    return (
      <ClientCard pad={28}>
        <div className="flex items-center justify-center py-8" style={{ color: clientColors.muted }}>
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span style={{ fontSize: 13.5 }}>Chargement de vos informations...</span>
        </div>
      </ClientCard>
    );
  }

  if (!clientData) {
    return (
      <ClientCard pad={28}>
        <div className="text-center py-8">
          <p style={{ color: '#DC2626', fontSize: 13.5 }}>
            Impossible de charger vos informations client.
          </p>
          <button
            type="button"
            onClick={() => navigateToClient('dashboard')}
            style={{ ...primaryBtnStyle, marginTop: 16 }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </ClientCard>
    );
  }
  
  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Client Information Summary */}
        <ClientCard pad={22}>
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5" style={{ color: clientColors.indigo }} />
            <h2 style={cardTitle}>Vos informations</h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 20,
                background: '#E7F6F0',
                color: '#047857',
              }}
            >
              <Check className="h-3 w-3" />
              Confirmées
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4" style={{ color: clientColors.faint }} />
              <div>
                <p style={{ fontSize: 12, color: clientColors.muted, margin: 0 }}>Nom</p>
                <p style={{ fontWeight: 600, color: clientColors.ink, margin: 0 }}>{clientData.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4" style={{ color: clientColors.faint }} />
              <div>
                <p style={{ fontSize: 12, color: clientColors.muted, margin: 0 }}>Email</p>
                <p style={{ fontWeight: 600, color: clientColors.ink, margin: 0 }}>
                  {clientData.email || 'Non renseigné'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building className="h-4 w-4" style={{ color: clientColors.faint }} />
              <div>
                <p style={{ fontSize: 12, color: clientColors.muted, margin: 0 }}>Entreprise</p>
                <p style={{ fontWeight: 600, color: clientColors.ink, margin: 0 }}>
                  {clientData.company || 'Non renseigné'}
                </p>
              </div>
            </div>
          </div>
        </ClientCard>

        {/* Products Summary */}
        <ClientCard pad={22}>
          <div className="flex items-center gap-2 mb-5">
            <Package className="h-5 w-5" style={{ color: clientColors.indigo }} />
            <h2 style={cardTitle}>Produits demandés</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 20,
                background: '#EEF0F4',
                color: clientColors.muted,
              }}
            >
              {items.length} produit{items.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const price = getProductPrice(item.product, item.selectedOptions);
              return (
                <div
                  key={item.product.id}
                  className="flex items-center gap-4 p-3"
                  style={{
                    border: `1px solid ${clientColors.border}`,
                    borderRadius: 12,
                    background: clientColors.surface,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      borderRadius: 10,
                      background: '#fff',
                      border: `1px solid ${clientColors.border}`,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.product.image_url || '/placeholder.svg'}
                      alt={item.product.name}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontWeight: 700, fontSize: 14, color: clientColors.ink, margin: 0 }}>
                      {item.product.name}
                    </h3>
                    <p style={{ fontSize: 12.5, color: clientColors.muted, margin: '2px 0 0' }}>
                      {item.product.brand && `${item.product.brand} • `}
                      Quantité: {item.quantity} • Durée: {item.duration} mois
                    </p>

                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div style={{ marginTop: 3, fontSize: 11.5, color: clientColors.faint }}>
                        Options:{' '}
                        {Object.entries(item.selectedOptions).map(([key, value], index, arr) => (
                          <span key={key}>
                            {key}: {value}
                            {index < arr.length - 1 ? ' | ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p style={{ fontWeight: 800, color: clientColors.indigo, margin: 0, fontSize: 14 }}>
                      {formatCurrency(price.monthlyPrice * item.quantity)}
                      <span style={{ fontSize: 11, fontWeight: 600, color: clientColors.muted }}> / mois</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: clientColors.border, margin: '20px 0' }} />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5" style={{ color: clientColors.indigo }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: clientColors.ink }}>Total mensuel</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, color: clientColors.indigo }}>
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <p style={{ fontSize: 12, color: clientColors.faint, margin: '6px 0 0' }}>
            Prix HT • Engagement sur 36 mois par défaut
          </p>
        </ClientCard>

        {/* External Provider Products */}
        <SelectedExternalProvidersList variant="card" />

        {/* Software Selection Section */}
        {softwareCatalog.length > 0 && (
          <ClientCard pad={22}>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5" style={{ color: clientColors.indigo }} />
              <h2 style={cardTitle}>Logiciels souhaités</h2>
              {selectedSoftwareIds.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 20,
                    background: '#EEF0F4',
                    color: clientColors.muted,
                  }}
                >
                  {selectedSoftwareIds.length} sélectionné{selectedSoftwareIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <p style={{ fontSize: 13, color: clientColors.muted, margin: '0 0 14px' }}>
              Sélectionnez les logiciels que vous souhaitez installer sur vos équipements.
            </p>

            <div className="space-y-4">
              {Object.entries(softwareByCategory).map(([category, softwares]: [string, any[]]) => (
                <div key={category}>
                  <h3
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: clientColors.muted,
                      margin: '0 0 8px',
                    }}
                  >
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {softwares.map((sw: any) => {
                      const active = selectedSoftwareIds.includes(sw.id);
                      return (
                        <label
                          key={sw.id}
                          className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                          style={{
                            borderRadius: 11,
                            border: `1px solid ${active ? clientColors.indigo : clientColors.border}`,
                            background: active ? 'rgba(45,85,229,.05)' : '#fff',
                          }}
                        >
                          <Checkbox
                            checked={active}
                            onCheckedChange={() => toggleSoftware(sw.id)}
                          />
                          <div className="flex items-center gap-2 min-w-0">
                            {sw.icon_url && (
                              <img src={sw.icon_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                            )}
                            <span
                              className="truncate"
                              style={{ fontSize: 13, fontWeight: 600, color: clientColors.ink }}
                            >
                              {sw.name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: clientColors.border, margin: '16px 0' }} />

            <div className="space-y-2">
              <Label htmlFor="other-software">Autres logiciels souhaités</Label>
              <Input
                id="other-software"
                className={themedInput}
                placeholder="Ex: Antivirus Kaspersky, AutoCAD, Adobe Photoshop..."
                value={otherSoftware}
                onChange={(e) => setOtherSoftware(e.target.value)}
              />
              <p style={{ fontSize: 11.5, color: clientColors.faint, margin: 0 }}>
                Indiquez ici les logiciels non listés que vous souhaitez installer.
              </p>
            </div>
          </ClientCard>
        )}

        {/* Free-text software input when no catalog */}
        {softwareCatalog.length === 0 && (
          <ClientCard pad={22}>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5" style={{ color: clientColors.indigo }} />
              <h2 style={cardTitle}>Logiciels souhaités</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="other-software-free">Logiciels à installer sur vos équipements</Label>
              <Input
                id="other-software-free"
                className={themedInput}
                placeholder="Ex: Microsoft Office, Chrome, Slack, Antivirus..."
                value={otherSoftware}
                onChange={(e) => setOtherSoftware(e.target.value)}
              />
              <p style={{ fontSize: 11.5, color: clientColors.faint, margin: 0 }}>
                Indiquez les logiciels que vous souhaitez installer sur vos équipements.
              </p>
            </div>
          </ClientCard>
        )}

        {/* Message Section */}
        <ClientCard pad={22}>
          <div className="space-y-2">
            <Label htmlFor="message">Message complémentaire (optionnel)</Label>
            <Textarea
              id="message"
              className={themedInput}
              placeholder="Ajoutez ici des informations complémentaires concernant votre demande..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </ClientCard>

        {/* Submit Section */}
        <ClientCard pad={22}>
          <div className="space-y-4">
            <div
              style={{
                fontSize: 13,
                color: clientColors.muted,
                background: clientColors.surface,
                border: `1px solid ${clientColors.border}`,
                padding: 16,
                borderRadius: 12,
              }}
            >
              <p style={{ fontWeight: 700, color: clientColors.ink, margin: '0 0 8px' }}>
                Que se passe-t-il après l'envoi ?
              </p>
              <ul className="space-y-1" style={{ fontSize: 12, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                <li>• Votre demande sera transmise à notre équipe commerciale</li>
                <li>• Vous recevrez un accusé de réception par email</li>
                <li>• Un conseiller vous contactera sous 24-48h pour finaliser votre offre</li>
                <li>• Vous pourrez suivre l'avancement dans votre espace client</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                style={{
                  ...primaryBtnStyle,
                  height: 44,
                  minWidth: 200,
                  opacity: isSubmitting || items.length === 0 ? 0.6 : 1,
                  cursor: isSubmitting || items.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer ma demande
                  </>
                )}
              </button>
            </div>
          </div>
        </ClientCard>
      </form>
    </div>
  );
};

export default ClientRequestSummary;