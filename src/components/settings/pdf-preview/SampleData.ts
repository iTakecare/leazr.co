
export const SAMPLE_DATA = {
  id: "OF-2023-456",
  client_name: "Société Démo",
  client_first_name: "Jean",
  client_email: "contact@demo-company.com",
  clients: {
    company: "Société Démo SA",
    name: "Jean Exemple",
    email: "jean@demo-company.com",
    address: "123 Avenue de l'Exemple, 1050 Bruxelles",
    phone: "+32 470 123 456"
  },
  client_company: "Société Démo",
  equipment_description: JSON.stringify([
    {
      title: "MacBook Pro 14\" M3 Pro",
      purchasePrice: 2199,
      quantity: 2,
      margin: 18
    },
    {
      title: "Écran Dell UltraSharp 32\" 4K",
      purchasePrice: 899,
      quantity: 2,
      margin: 22
    },
    {
      title: "Station d'accueil Thunderbolt 4",
      purchasePrice: 249,
      quantity: 2,
      margin: 25
    },
    {
      title: "Souris et clavier sans fil",
      purchasePrice: 129,
      quantity: 2,
      margin: 30
    }
  ]),
  amount: 7854,
  monthly_payment: 218.17,
  coefficient: 1.07,
  created_at: new Date().toISOString(),
  workflow_status: "approved",
  commission: 392.70,
  equipment_total: 7854,
  type: "Leasing Matériel Informatique",
  remarks: "Offre pour renouvellement complet du parc informatique avec extension de garantie 3 ans",
  user: {
    name: "Gianni Sergi",
    email: "gianni@itakecare.be",
    phone: "+32 471 511 121",
    company: "iTakeCare"
  },
  contract: {
    number: "CT-2023-456",
    start_date: new Date().toISOString(),
    duration: 36,
    payment_frequency: "Mensuel"
  },
  leaser: {
    name: "FinanceIT Solutions",
    contact: "Sophie Lejeune",
    email: "contact@financeit.be",
    phone: "+32 2 123 45 67"
  }
};
