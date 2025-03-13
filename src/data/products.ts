
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
}

export const products: Product[] = [
  {
    id: "prod-001",
    name: "Laptop Pro X1",
    category: "Ordinateurs",
    price: 1299.99,
    description: "Ordinateur portable haute performance pour professionnels",
    imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-002",
    name: "Station de travail MaxPower",
    category: "Ordinateurs",
    price: 2499.99,
    description: "Station de travail puissante pour les tâches exigeantes",
    imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-003",
    name: "Écran Ultra HD 27\"",
    category: "Écrans",
    price: 499.99,
    description: "Écran 4K avec une précision des couleurs exceptionnelle",
    imageUrl: "https://images.unsplash.com/photo-1616763355548-1b606f439f86?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-004",
    name: "Écran Incurvé 34\"",
    category: "Écrans",
    price: 799.99,
    description: "Écran ultra-large incurvé pour une expérience immersive",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-005",
    name: "Serveur Cloud X3",
    category: "Serveurs",
    price: 3999.99,
    description: "Serveur haute performance pour les applications d'entreprise",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-006",
    name: "NAS Pro Storage",
    category: "Stockage",
    price: 1299.99,
    description: "Solution de stockage en réseau avec 12 To d'espace",
    imageUrl: "https://images.unsplash.com/photo-1600267204091-5c1ab8b10c02?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-007",
    name: "Imprimante Laser Pro",
    category: "Périphériques",
    price: 599.99,
    description: "Imprimante laser couleur haute vitesse pour entreprises",
    imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
  {
    id: "prod-008",
    name: "Solution de Visioconférence",
    category: "Communication",
    price: 1899.99,
    description: "Système complet de visioconférence pour salles de réunion",
    imageUrl: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3",
  },
];

export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((product) => product.category === category);
};

export const getProductCategories = (): string[] => {
  return [...new Set(products.map((product) => product.category))];
};
