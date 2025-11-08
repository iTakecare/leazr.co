import { OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';

/**
 * Convert OfferPDFData to Handlebars template format
 */
export function mapOfferDataToHandlebars(offerData: OfferPDFData): any {
  // Helper to get emoji for value
  const getValueEmoji = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('evolution') || lowerTitle.includes('évolution')) return '🚀';
    if (lowerTitle.includes('confiance')) return '🤝';
    if (lowerTitle.includes('entraide')) return '💪';
    if (lowerTitle.includes('innovation')) return '💡';
    if (lowerTitle.includes('qualité')) return '⭐';
    return '✨';
  };

  // Helper to determine equipment category
  const getEquipmentCategory = (title: string): 'laptop' | 'phone' | 'other' => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('macbook') || lowerTitle.includes('laptop') || lowerTitle.includes('ordinateur')) {
      return 'laptop';
    }
    if (lowerTitle.includes('iphone') || lowerTitle.includes('phone') || lowerTitle.includes('téléphone')) {
      return 'phone';
    }
    return 'other';
  };

  // Format equipment data
  const equipment = offerData.equipment.map(item => {
    const specifications: string[] = [];
    
    // Build specifications from attributes
    if (item.attributes && item.attributes.length > 0) {
      item.attributes.forEach(attr => {
        const icon = attr.key.toLowerCase().includes('disque') || attr.key.toLowerCase().includes('stockage') ? '💾' 
                   : attr.key.toLowerCase().includes('mémoire') || attr.key.toLowerCase().includes('ram') ? '🧠'
                   : attr.key.toLowerCase().includes('écran') ? '📱'
                   : attr.key.toLowerCase().includes('processeur') || attr.key.toLowerCase().includes('cpu') ? '⚡'
                   : '•';
        specifications.push(`${icon} ${attr.key}: ${attr.value}`);
      });
    }
    
    return {
      title: item.title,
      quantity: item.quantity,
      monthly_payment: item.monthly_payment,
      category: getEquipmentCategory(item.title),
      specifications: specifications,
      attributes: item.attributes?.reduce((acc, attr) => {
        acc[attr.key.toLowerCase().replace(/\s/g, '_')] = attr.value;
        return acc;
      }, {} as any) || {}
    };
  });

  return {
    company: {
      name: offerData.company_name || 'iTakecare',
      address: offerData.company_address || 'Avenue Général Michel 1E, 6000 Charleroi',
      email: offerData.company_email || 'hello@itakecare.be',
      phone: offerData.company_phone || '+32 71 49 16 85',
      vat: offerData.company_vat_number || 'BE0795.642.894',
      logo_url: offerData.company_logo_url || null
    },
    
    client: {
      name: offerData.client_name,
      company_name: offerData.client_company || '',
      email: offerData.client_email || '',
      phone: offerData.client_phone || ''
    },
    
    offer: {
      number: offerData.offer_number,
      date: new Date(offerData.offer_date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      valid_until: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      contract_duration: offerData.contract_duration || 36
    },
    
    equipment: equipment,
    
    totals: {
      monthly_ht: offerData.total_monthly_payment,
      file_fee: offerData.file_fee || 0,
      insurance: offerData.annual_insurance || 0
    },
    
    values: offerData.values?.map(v => ({
      icon: v.icon_url || null,
      emoji: getValueEmoji(v.title),
      title: v.title,
      description: v.description
    })) || [
      {
        emoji: '🚀',
        title: 'Evolution',
        description: 'Tournés vers l\'avenir, nous travaillons à devancer les besoins des professionnels et adaptons nos idées à la réalité du terrain.'
      },
      {
        emoji: '🤝',
        title: 'Confiance',
        description: 'Nous valorisons les relations humaines authentiques. Accessibles et disponibles, nous sommes convaincus que se soutenir nous donne des ailes.'
      },
      {
        emoji: '💪',
        title: 'Entraide',
        description: 'En partageant nos connaissances, nous contribuons au développement de chacun. C\'est un plaisir de semer des sourires sur notre chemin.'
      }
    ],
    
    metrics: {
      clients_count: offerData.metrics?.find(m => 
        m.label.toLowerCase().includes('clients') || m.label.toLowerCase().includes('satisf')
      )?.value || '99.30%',
      devices_count: offerData.metrics?.find(m => 
        m.label.toLowerCase().includes('appareils') || m.label.toLowerCase().includes('device')
      )?.value || '710',
      co2_saved: offerData.metrics?.find(m => 
        m.label.toLowerCase().includes('co2') || m.label.toLowerCase().includes('économ')
      )?.value || '91,03'
    },
    
    conditions: {
      payment: 'Prélèvement automatique trimestriel',
      insurance_details: 'Assurance obligatoire du matériel',
      end_of_contract: [
        'Achat définitif à 5% de la valeur initiale',
        'Renouvellement avec nouvel équipement',
        'Restitution gratuite'
      ]
    }
  };
}
