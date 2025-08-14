// Utility script to help identify and update all navigation calls

export const oldNavigationPatterns = [
  // Admin routes
  'navigate(\'/admin/',
  'navigate("/admin/',
  'navigate(`/admin/',
  
  // Client routes  
  'navigate(\'/client/',
  'navigate("/client/',
  'navigate(`/client/',
  
  
  // Ambassador routes
  'navigate(\'/ambassador/',
  'navigate("/ambassador/',
  'navigate(`/ambassador/',
];

export const componentsToUpdate = [
  'src/components/contracts/ClientContractDetailHeader.tsx',
  'src/components/contracts/ContractDetailHeader.tsx',
  'src/components/offers/ClientOffersSidebar.tsx',
  'src/components/offers/OfferCard.tsx',
  'src/components/offers/OffersTable.tsx',
  'src/components/settings/WooCommerceConfigurationManager.tsx',
  'src/pages/AmbassadorCreateOffer.tsx',
  'src/pages/AmbassadorPages/AmbassadorOfferDetail.tsx',
  'src/pages/ClientContractsPage.tsx',
  'src/pages/ClientDashboard.tsx',
  'src/pages/ClientRequestsPage.tsx',
  'src/pages/CustomOfferGeneratorPage.tsx',
  'src/pages/InvoicingPage.tsx',
  'src/pages/LeazrSaaSDashboard.tsx',
  'src/pages/ProductFormPage.tsx',
];