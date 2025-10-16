import { TemplateManifest } from './pdfTemplateLoaderService';

/**
 * Service to generate demo data for PDF template preview
 */

export const generateDemoData = (manifest: TemplateManifest, companyData?: any) => {
  const demoData: any = {};
  
  // Client data
  if (manifest.variables.client) {
    demoData.client = {
      name: 'Jean Dupont',
      company: 'Tech Solutions SPRL',
      vat: 'BE0123456789',
      address: 'Rue de la Innovation 42',
      city: 'Bruxelles',
      postalCode: '1000',
      country: 'Belgique',
      contactName: 'Jean Dupont',
      email: 'j.dupont@techsolutions.be',
      phone: '+32 2 123 45 67',
    };
  }
  
  // Offer data
  if (manifest.variables.offer) {
    demoData.offer = {
      id: 'ITC-2025-OFF-0001',
      date: new Date().toLocaleDateString('fr-FR'),
      termMonths: 36,
      totalMonthly: 1250.00,
      fees: 150.00,
      insurance: 75.00,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
    };
  }
  
  // Company data
  if (manifest.variables.company) {
    demoData.company = companyData || {
      name: 'iTakecare',
      address: 'Avenue du Leasing 100',
      city: 'Bruxelles',
      postalCode: '1050',
      country: 'Belgique',
      email: 'contact@itakecare.be',
      phone: '+32 2 987 65 43',
      vat: 'BE0987654321',
      website: 'www.itakecare.be',
    };
  }
  
  // Metrics data
  if (manifest.variables.metrics) {
    demoData.metrics = {
      clientsCount: '500+',
      devicesCount: '10,000+',
      co2SavedTons: '250',
      yearsExperience: '10',
    };
  }
  
  // Items/Equipment data
  if (manifest.variables.items) {
    demoData.items = [
      {
        title: 'MacBook Pro 14" M3',
        quantity: 5,
        monthlyPrice: 85.00,
        totalMonthly: 425.00,
        description: 'Apple MacBook Pro 14" avec puce M3, 16GB RAM, 512GB SSD',
      },
      {
        title: 'Dell Monitor 27"',
        quantity: 5,
        monthlyPrice: 25.00,
        totalMonthly: 125.00,
        description: 'Écran Dell UltraSharp 27" 4K',
      },
      {
        title: 'iPhone 15 Pro',
        quantity: 3,
        monthlyPrice: 45.00,
        totalMonthly: 135.00,
        description: 'Apple iPhone 15 Pro 256GB',
      },
      {
        title: 'Logitech MX Master 3',
        quantity: 5,
        monthlyPrice: 8.00,
        totalMonthly: 40.00,
        description: 'Souris sans fil ergonomique',
      },
    ];
  }
  
  // Author/user data
  demoData.author = {
    name: 'Sophie Martin',
    role: 'Account Manager',
    email: 's.martin@itakecare.be',
    phone: '+32 2 987 65 44',
  };
  
  return demoData;
};
