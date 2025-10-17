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
  
  // Commerce spécialisé
  { value: 'pet_shop', label: 'Animalerie' },
  { value: 'florist', label: 'Fleuriste' },
  { value: 'optics', label: 'Optique et lunetterie' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'medical_equipment', label: 'Matériel médical' },
  { value: 'hardware_store', label: 'Quincaillerie et bricolage' },
  { value: 'appliances', label: 'Électroménager' },
  { value: 'computer_retail', label: 'Informatique et high-tech' },
  { value: 'furniture', label: 'Mobilier et décoration' },
  { value: 'bookstore', label: 'Librairie' },
  { value: 'stationery', label: 'Papeterie' },
  { value: 'jewelry', label: 'Bijouterie et horlogerie' },
  
  // Industrie et production
  { value: 'manufacturing', label: 'Fabrication industrielle' },
  { value: 'automotive', label: 'Automobile' },
  { value: 'electronics', label: 'Électronique' },
  { value: 'textiles', label: 'Textile et habillement' },
  { value: 'food_industry', label: 'Agroalimentaire' },
  { value: 'pharmaceuticals', label: 'Pharmaceutique' },
  { value: 'chemicals', label: 'Chimie' },
  { value: 'energy', label: 'Énergie' },
  
  // Industrie spécialisée
  { value: 'printing', label: 'Imprimerie et reprographie' },
  { value: 'plastics', label: 'Plasturgie' },
  { value: 'wood_industry', label: 'Bois et scierie' },
  { value: 'paper_industry', label: 'Industrie papetière' },
  { value: 'packaging', label: 'Emballage et conditionnement' },
  { value: 'precision_mechanics', label: 'Mécanique de précision' },
  { value: 'aerospace', label: 'Aéronautique et spatial' },
  { value: 'naval', label: 'Naval et maritime' },
  { value: 'metalworking', label: 'Métallurgie et transformation' },
  { value: 'glass', label: 'Verrerie et vitrerie' },
  
  // Construction et immobilier
  { value: 'construction', label: 'Construction et BTP' },
  { value: 'real_estate', label: 'Immobilier' },
  { value: 'property_management', label: 'Gestion immobilière' },
  
  // Artisanat du bâtiment
  { value: 'carpentry', label: 'Menuiserie et ébénisterie' },
  { value: 'plumbing', label: 'Plomberie et chauffage' },
  { value: 'electrical', label: 'Électricité' },
  { value: 'painting', label: 'Peinture et décoration' },
  { value: 'locksmith', label: 'Serrurerie et métallerie' },
  { value: 'masonry', label: 'Maçonnerie' },
  { value: 'roofing', label: 'Couverture et toiture' },
  { value: 'tiling', label: 'Carrelage et revêtements' },
  { value: 'glazing', label: 'Vitrerie et miroiterie' },
  { value: 'hvac', label: 'Climatisation et ventilation' },
  
  // Santé et social
  { value: 'healthcare', label: 'Santé et soins médicaux' },
  { value: 'hospitals', label: 'Hôpitaux et cliniques' },
  { value: 'dental', label: 'Dentaire' },
  { value: 'veterinary', label: 'Vétérinaire' },
  { value: 'social_services', label: 'Services sociaux' },
  { value: 'elderly_care', label: 'Soins aux personnes âgées' },
  
  // Beauté et bien-être
  { value: 'hairdressing', label: 'Coiffure et esthétique' },
  { value: 'spa', label: 'Spa et thalassothérapie' },
  { value: 'fitness', label: 'Fitness et sport' },
  { value: 'massage', label: 'Massage et thérapies manuelles' },
  { value: 'cosmetics', label: 'Cosmétiques et parfumerie' },
  
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
  
  // Alimentation spécialisée
  { value: 'bakery', label: 'Boulangerie et pâtisserie' },
  { value: 'butchery', label: 'Boucherie et charcuterie' },
  { value: 'fishmonger', label: 'Poissonnerie' },
  { value: 'greengrocer', label: 'Primeur et fruits & légumes' },
  { value: 'wine_shop', label: 'Caves et spiritueux' },
  { value: 'chocolate', label: 'Chocolaterie et confiserie' },
  { value: 'delicatessen', label: 'Épicerie fine et traiteur' },
  
  // Transport et logistique
  { value: 'logistics', label: 'Logistique et transport' },
  { value: 'shipping', label: 'Fret et expédition' },
  { value: 'warehousing', label: 'Entreposage' },
  
  // Automobile et mobilité
  { value: 'auto_repair', label: 'Garage et réparation automobile' },
  { value: 'body_shop', label: 'Carrosserie' },
  { value: 'car_rental', label: 'Location de véhicules' },
  { value: 'driving_school', label: 'Auto-école' },
  { value: 'vehicle_inspection', label: 'Contrôle technique' },
  
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
  
  // Arts et culture
  { value: 'graphic_design', label: 'Graphisme et design graphique' },
  { value: 'photography', label: 'Photographie' },
  { value: 'performing_arts', label: 'Spectacle vivant' },
  { value: 'music', label: 'Musique et production audio' },
  { value: 'cinema', label: 'Cinéma et production vidéo' },
  { value: 'publishing', label: 'Édition et publication' },
  { value: 'art_gallery', label: 'Galerie d\'art et antiquités' },
  
  // Agriculture
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'farming', label: 'Élevage' },
  { value: 'forestry', label: 'Sylviculture' },
  
  // Environnement
  { value: 'renewable_energy', label: 'Énergies renouvelables' },
  { value: 'waste_management', label: 'Gestion des déchets' },
  { value: 'water_treatment', label: 'Traitement de l\'eau' },
  { value: 'environmental', label: 'Environnement et écologie' },
  
  // Services aux entreprises
  { value: 'facilities', label: 'Gestion d\'installations' },
  { value: 'security', label: 'Sécurité' },
  { value: 'cleaning', label: 'Nettoyage' },
  { value: 'maintenance', label: 'Maintenance' },
  
  // Services à la personne
  { value: 'home_care', label: 'Aide à domicile' },
  { value: 'childcare', label: 'Garde d\'enfants et crèche' },
  { value: 'landscaping', label: 'Jardinage et paysagisme' },
  { value: 'moving', label: 'Déménagement' },
  { value: 'dry_cleaning', label: 'Pressing et blanchisserie' },
  
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
