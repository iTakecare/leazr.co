export const BUSINESS_SECTORS = [
  // Services et conseil
  { value: 'conseil', label: 'Conseil et stratégie' },
  { value: 'it_services', label: 'Services informatiques' },
  { value: 'marketing', label: 'Marketing et communication' },
  { value: 'accounting', label: 'Comptabilité et finance' },
  { value: 'legal', label: 'Juridique et notariat' },
  { value: 'architecture', label: 'Architecture et design' },
  { value: 'engineering', label: 'Ingénierie et études techniques' },
  { value: 'hr_consulting', label: 'Ressources humaines' },
  
  // Commerce et distribution
  { value: 'retail', label: 'Commerce de détail' },
  { value: 'wholesale', label: 'Commerce de gros' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'franchising', label: 'Franchise' },
  
  // Industrie et production
  { value: 'manufacturing', label: 'Fabrication industrielle' },
  { value: 'automotive', label: 'Automobile' },
  { value: 'electronics', label: 'Électronique' },
  { value: 'textiles', label: 'Textile et habillement' },
  { value: 'food_industry', label: 'Agroalimentaire' },
  { value: 'pharmaceuticals', label: 'Pharmaceutique' },
  { value: 'chemicals', label: 'Chimie' },
  { value: 'energy', label: 'Énergie' },
  
  // Construction et immobilier
  { value: 'construction', label: 'Construction et BTP' },
  { value: 'real_estate', label: 'Immobilier' },
  { value: 'property_management', label: 'Gestion immobilière' },
  
  // Santé et social
  { value: 'healthcare', label: 'Santé et soins médicaux' },
  { value: 'hospitals', label: 'Hôpitaux et cliniques' },
  { value: 'dental', label: 'Dentaire' },
  { value: 'veterinary', label: 'Vétérinaire' },
  { value: 'social_services', label: 'Services sociaux' },
  { value: 'elderly_care', label: 'Soins aux personnes âgées' },
  
  // Éducation et formation
  { value: 'education', label: 'Éducation et formation' },
  { value: 'schools', label: 'Écoles et lycées' },
  { value: 'universities', label: 'Enseignement supérieur' },
  { value: 'training', label: 'Formation professionnelle' },
  
  // Hôtellerie et restauration
  { value: 'hospitality', label: 'Hôtellerie' },
  { value: 'restaurants', label: 'Restauration' },
  { value: 'catering', label: 'Traiteur et événementiel' },
  { value: 'tourism', label: 'Tourisme et voyages' },
  
  // Transport et logistique
  { value: 'logistics', label: 'Logistique et transport' },
  { value: 'shipping', label: 'Fret et expédition' },
  { value: 'warehousing', label: 'Entreposage' },
  
  // Finance et assurance
  { value: 'banking', label: 'Banque' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'investment', label: 'Investissement' },
  { value: 'fintech', label: 'Fintech' },
  
  // Média et divertissement
  { value: 'media', label: 'Médias et presse' },
  { value: 'entertainment', label: 'Divertissement' },
  { value: 'advertising', label: 'Publicité' },
  { value: 'events', label: 'Événementiel' },
  
  // Agriculture
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'farming', label: 'Élevage' },
  { value: 'forestry', label: 'Sylviculture' },
  
  // Services aux entreprises
  { value: 'facilities', label: 'Gestion d\'installations' },
  { value: 'security', label: 'Sécurité' },
  { value: 'cleaning', label: 'Nettoyage' },
  { value: 'maintenance', label: 'Maintenance' },
  
  // Technologie
  { value: 'software', label: 'Développement logiciel' },
  { value: 'saas', label: 'SaaS' },
  { value: 'telecommunications', label: 'Télécommunications' },
  { value: 'cybersecurity', label: 'Cybersécurité' },
  
  // Administration publique
  { value: 'public_sector', label: 'Administration publique' },
  { value: 'ngo', label: 'Association / ONG' },
  
  // Autres
  { value: 'other', label: 'Autre secteur' }
];

export const getBusinessSectorLabel = (value: string | null | undefined): string => {
  if (!value) return '-';
  const sector = BUSINESS_SECTORS.find(s => s.value === value);
  return sector ? sector.label : value;
};
