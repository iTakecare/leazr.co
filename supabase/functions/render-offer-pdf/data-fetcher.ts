import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function fetchOfferData(supabase: SupabaseClient, offerId: string) {
  // Récupérer l'offre avec toutes les relations
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(`
      *,
      client:clients(*),
      leaser:leasers(*),
      equipment:offer_equipment(
        *,
        attributes:offer_equipment_attributes(*),
        specifications:offer_equipment_specifications(*)
      )
    `)
    .eq('id', offerId)
    .single();

  if (offerError) {
    throw new Error(`Error fetching offer: ${offerError.message}`);
  }

  if (!offer) {
    throw new Error(`Offer ${offerId} not found`);
  }

  // Récupérer les données de l'entreprise
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', offer.company_id)
    .single();

  if (companyError) {
    throw new Error(`Error fetching company: ${companyError.message}`);
  }

  // Formater les données selon le dictionnaire standard
  return {
    companyId: offer.company_id,
    client: {
      name: offer.client?.name || offer.client_name,
      vat: offer.client?.vat_number || '',
      address: [
        offer.client?.address,
        offer.client?.postal_code,
        offer.client?.city,
        offer.client?.country
      ].filter(Boolean).join(', '),
      contactName: offer.client?.contact_name || offer.client_name,
      email: offer.client?.email || offer.client_email || '',
      phone: offer.client?.phone || '',
    },
    offer: {
      id: offer.id,
      date: new Date(offer.created_at),
      termMonths: offer.duration || 36,
      startDate: new Date(),
      totalMonthly: offer.monthly_payment || 0,
      fees: 0,
      insurance: {
        enabled: false,
        annualEstimated: 0,
        minAnnual: 0,
      },
    },
    items: (offer.equipment || []).map((eq: any) => {
      // Extraire brand et model des attributes
      const brandAttr = eq.attributes?.find((a: any) => a.key === 'brand' || a.key === 'marque');
      const modelAttr = eq.attributes?.find((a: any) => a.key === 'model' || a.key === 'modèle');
      
      return {
        label: eq.title,
        brand: brandAttr?.value || '',
        model: modelAttr?.value || '',
        qty: eq.quantity || 1,
        unitMonthly: eq.quantity > 0 ? (eq.monthly_payment || 0) / eq.quantity : 0,
        totalMonthly: eq.monthly_payment || 0,
      };
    }),
    company: {
      logoUrl: company.logo_url || '',
      name: company.name,
      address: '',
      email: 'hello@itakecare.be',
      phone: '+32 2 123 45 67',
      vat: 'BE0123456789',
    },
    metrics: {
      clientsCount: company.clients_count || 0,
      devicesCount: company.devices_count || 0,
      co2SavedTons: ((company.co2_saved || 0) / 1000).toFixed(1),
    },
  };
}
