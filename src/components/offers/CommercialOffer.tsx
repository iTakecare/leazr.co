import React from 'react';
import './CommercialOffer.css';
import './CommercialOfferPDFMode.css';

interface CommercialOfferProps {
  // Données de base
  offerNumber?: string;
  offerDate?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  validityDays?: number;
  
  // Équipements
  equipment?: Array<{
    id: string;
    title: string;
    quantity: number;
    monthlyPayment: number;
    attributes?: Record<string, string>;
    specifications?: Record<string, string>;
  }>;
  
  // Totaux
  totalMonthly?: number;
  contractDuration?: number;
  fileFee?: number;
  insuranceCost?: number;
  
  // Valeurs entreprise
  companyValues?: Array<{
    title: string;
    description: string;
  }>;
  
  // Métriques
  metrics?: {
    clientsSatisfied?: string;
    devicesManaged?: string;
    co2Saved?: string;
  };
  
  // Logos partenaires
  partnerLogos?: string[];
  
  // Contrôle d'affichage
  showPrintButton?: boolean;
}

// Helper functions
const getAttributeIcon = (key: string): string => {
  const iconMap: Record<string, string> = {
    'Disque Dur': '💾',
    'Mémoire': '🧠',
    'Stockage': '💾',
    'RAM': '🧠',
    'Processeur': '⚡',
    'Écran': '🖥️',
  };
  return iconMap[key] || '📦';
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const CommercialOffer: React.FC<CommercialOfferProps> = ({
  offerNumber = "N/A",
  offerDate = new Date().toLocaleDateString('fr-FR'),
  clientName = "Client",
  clientEmail = "email@example.com",
  clientPhone = "N/A",
  clientCompany,
  validityDays = 10,
  equipment = [],
  totalMonthly = 0,
  contractDuration = 36,
  fileFee = 0,
  insuranceCost = 0,
  companyValues = [
    { title: "Evolution", description: "Tournés vers l'avenir, nous travaillons à devancer les besoins des professionnels et adaptons nos idées à la réalité du terrain." },
    { title: "Confiance", description: "Nous valorisons les relations humaines authentiques. Accessibles et disponibles, nous sommes convaincus que se soutenir nous donne des ailes." },
    { title: "Entraide", description: "En partageant nos connaissances, nous contribuons au développement de chacun. C'est un plaisir de semer des sourires sur notre chemin." }
  ],
  metrics = {
    clientsSatisfied: '99.30%',
    devicesManaged: '710',
    co2Saved: '91,03'
  },
  partnerLogos = [],
  showPrintButton = true
}) => {
  
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="offer-container">
      {/* Bouton de téléchargement - masqué à l'impression */}
      {showPrintButton && (
        <div className="no-print print-button-container">
          <button onClick={handlePrintPDF} className="print-button">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
            Télécharger en PDF
          </button>
        </div>
      )}

      {/* PAGE 1: Couverture */}
      <div className="page page-1">
        <div className="pattern-bg"></div>
        
        <div className="page-content">
          {/* Header */}
          <div className="header">
            <div className="logo-section">
              <div className="logo-box">
                <img 
                  src="/pdf-templates/itakecare-v1/assets/logo.png" 
                  alt="iTakecare Logo" 
                  className="logo-itakecare"
                  style={{ height: '40px', width: 'auto' }}
                />
              </div>
              <div className="company-info">
                <p>Avenue Général Michel 1E, 6000 Charleroi</p>
                <p>hello@itakecare.be | +32 71 49 16 85</p>
                <p>TVA : BE0795.642.894</p>
              </div>
            </div>
            
            <div className="offer-info-box">
              <p className="offer-label">Offre N°</p>
              <p className="offer-number">{offerNumber}</p>
              <p className="offer-date">Date: {offerDate}</p>
            </div>
          </div>
          
          {/* Main content */}
          <div className="hero-section">
            <div className="badge">✨ Proposition sur mesure</div>
            <h1 className="main-title">
              Offre<br/>
              <span className="gradient-text">Commerciale</span>
            </h1>
            <p className="subtitle">
              Votre solution de leasing tech premium pour équiper votre entreprise avec les derniers MacBook et iPhone.
            </p>
            
            {/* Destinataire card */}
            <div className="client-card">
              <p className="client-label">Destinataire</p>
              <h3 className="client-name">{clientName}</h3>
              {clientCompany && <p className="client-company">{clientCompany}</p>}
              <div className="client-contact">
                <span>📧 {clientEmail}</span>
                <span>📞 {clientPhone}</span>
              </div>
            </div>
          </div>
          
          {/* Footer warning */}
          <div className="warning-box">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>
              <strong>Attention :</strong> Cette offre est valable {validityDays} jours à compter de la date d'émission.
            </p>
          </div>
        </div>
      </div>

      {/* PAGE 2: Équipements */}
      <div className="page page-2">
        <div className="section-header">
          <div className="section-badge blue">💼 Votre pack tech</div>
          <h2 className="section-title">Détail des Équipements</h2>
          <p className="section-subtitle">Des appareils premium pour vos besoins professionnels</p>
        </div>

        {/* Product Cards */}
        <div className="products-grid">
          {equipment.map((item, index) => (
            <div key={item.id} className="product-card">
              <div className="product-header">
                <div className={`product-icon ${index % 2 === 0 ? 'gray' : 'blue'}`}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <span className="available-badge">Disponible</span>
              </div>
              
              <h3 className="product-name">{item.title}</h3>
              
              <div className="product-specs">
                {Object.keys(item.attributes || {}).length === 0 ? (
                  <p>📦 Équipement standard</p>
                ) : (
                  Object.entries(item.attributes || {}).map(([key, value]) => (
                    <p key={key}>
                      {getAttributeIcon(key)} {key}: <strong>{value}</strong>
                    </p>
                  ))
                )}
              </div>
              
              <div className="product-footer">
                <div className="price-section">
                  <p className="price-label">Prix mensuel HT</p>
                  <div className="price-value">
                    <span className="price-amount">{formatCurrency(item.monthlyPayment)}</span>
                    <span className="price-period">/mois</span>
                  </div>
                </div>
                <div className="quantity-section">
                  <p className="quantity-label">Quantité</p>
                  <p className="quantity-value">{item.quantity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Section */}
        <div className="total-box">
          <div className="total-header">
            <div>
              <p className="total-label">Total mensuel HT</p>
              <p className="total-amount">{formatCurrency(totalMonthly)}</p>
            </div>
            <div className="contract-duration">
              <p className="duration-label">Durée du contrat</p>
              <p className="duration-value">{contractDuration} mois</p>
            </div>
          </div>
          
          <div className="included-features">
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <span>Livraison incluse</span>
            </div>
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <span>Maintenance incluse</span>
            </div>
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <span>Garantie échange direct</span>
            </div>
          </div>
          
          <div className="additional-fees">
            💼 Frais de dossier unique : <strong>{formatCurrency(fileFee)}</strong> • 
            🛡️ Montant de l'assurance annuelle : <strong>{formatCurrency(insuranceCost)}</strong>
          </div>
        </div>
      </div>

      {/* PAGE 3: Valeurs */}
      <div className="page page-3">
        <div className="section-header">
          <div className="section-badge purple">💎 Notre ADN</div>
          <h2 className="section-title">Nos Valeurs</h2>
          <p className="section-subtitle">Ce qui nous anime au quotidien</p>
        </div>

        {/* Values Cards */}
        <div className="values-grid">
          {companyValues.map((value, index) => {
            const iconColors = ['blue-icon', 'purple-icon', 'green-icon'];
            const icons = [
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>,
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>,
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            ];
            
            return (
              <div key={index} className="value-card">
                <div className={`value-icon ${iconColors[index % iconColors.length]}`}>
                  {icons[index % icons.length]}
                </div>
                <h3 className="value-title">{value.title}</h3>
                <p className="value-description">{value.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="stats-box">
          <div className="stat-item">
            <div className="stat-number">{metrics.clientsSatisfied}</div>
            <p className="stat-label">De clients satisfaits</p>
          </div>
          <div className="stat-item">
            <div className="stat-number">{metrics.devicesManaged}</div>
            <p className="stat-label">Appareils pris en charge</p>
          </div>
          <div className="stat-item">
            <div className="stat-number">{metrics.co2Saved}</div>
            <p className="stat-label">Tonnes CO2e économisées</p>
          </div>
        </div>

        {/* Clients logos */}
        {partnerLogos.length > 0 && (
          <div className="clients-section">
            <p className="clients-label">Ils nous font confiance</p>
            <div className="clients-logos">
              {partnerLogos.map((logo, index) => (
                <div key={index} className="client-logo">
                  <img src={logo} alt={`Partenaire ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PAGE 4: Conditions */}
      <div className="page page-4">
        <div className="section-header">
          <div className="section-badge blue">📋 Les détails qui comptent</div>
          <h2 className="section-title">Conditions Générales</h2>
          <p className="section-subtitle">Simples, claires et transparentes</p>
        </div>

        <div className="conditions-list">
          {/* Prélèvement */}
          <div className="condition-card blue-card">
            <div className="condition-icon blue-bg">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
            </div>
            <div className="condition-content">
              <h3 className="condition-title">💳 Prélèvement des mensualités</h3>
              <ul className="condition-list">
                <li><strong>Mode de paiement :</strong> DOMICILIATION SEPA (obligatoire)</li>
                <li><strong>Fréquence :</strong> 1x par trimestre de manière anticipée</li>
              </ul>
              <div className="example-box">
                <p className="example-title">📊 Exemple concret :</p>
                <p className="example-text">
                  Contrat démarrant le 15 octobre → Prélèvement début janvier pour :<br/>
                  ✓ Utilisation du 15/10 au 31/12 + ✓ Paiement anticipé du 01/01 au 31/03
                </p>
              </div>
            </div>
          </div>

          {/* Frais de dossier */}
          <div className="condition-card purple-card">
            <div className="condition-icon purple-bg">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div className="condition-content">
              <h3 className="condition-title">📄 Frais de dossier</h3>
              <p className="condition-text"><strong>Montant :</strong> 75€ HTVA (frais uniques)</p>
              <p className="condition-text"><strong>Prélèvement :</strong> En même temps que la/les première(s) mensualité(s)</p>
            </div>
          </div>

          {/* Assurance */}
          <div className="condition-card green-card">
            <div className="condition-icon green-bg">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <div className="condition-content">
              <h3 className="condition-title">🛡️ Assurance du matériel</h3>
              <ul className="condition-list">
                <li><strong>Obligation légale :</strong> Le matériel doit être assuré</li>
                <li><strong>Options :</strong> Via votre assurance OU celle du leaser</li>
                <li><strong>Délai :</strong> 6 semaines pour fournir votre attestation</li>
                <li><strong>Tarif leaser :</strong> Environ 3,5% du montant total/an</li>
              </ul>
              <div className="example-box green-example">
                <p className="example-title">💰 Exemple de calcul :</p>
                <p className="example-text">
                  100€ HT/mois = 3 600€ → Assurance = 3,5% = <strong>126€ HT/an</strong> (10,50€/mois)<br/>
                  <span className="example-note">Prime minimum : 110€</span>
                </p>
              </div>
            </div>
          </div>

          {/* Factures */}
          <div className="condition-card amber-card">
            <div className="condition-icon amber-bg">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div className="condition-content">
              <h3 className="condition-title">📨 Accès aux factures</h3>
              <ul className="condition-list">
                <li><strong>Espace membre :</strong> Disponibles en ligne chez le leaser</li>
                <li><strong>Connexion :</strong> Code reçu par courrier postal</li>
                <li>❌ Pas d'envoi par courrier ni par email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE 5: Fin de contrat + Contact */}
      <div className="page page-5">
        {/* Fin de contrat */}
        <div className="contract-end-section">
          <div className="condition-card indigo-card">
            <div className="condition-header">
              <div className="condition-icon indigo-bg">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
              </div>
              <div>
                <h3 className="condition-title">⏱️ Fin de contrat ({contractDuration} mois)</h3>
                <p className="contract-subtitle">À l'issue des {contractDuration} mois, vous avez <strong>3 options</strong> :</p>
              </div>
            </div>
            <div className="options-grid">
              <div className="option-box">
                <div className="option-emoji">🔄</div>
                <h4 className="option-title">Option 1</h4>
                <p className="option-text">Restituer le matériel et déduire la valeur résiduelle (5%) du nouveau contrat</p>
              </div>
              <div className="option-box">
                <div className="option-emoji">💰</div>
                <h4 className="option-title">Option 2</h4>
                <p className="option-text">Payer la valeur résiduelle (5%) et garder le matériel</p>
              </div>
              <div className="option-box">
                <div className="option-emoji">💚</div>
                <h4 className="option-title">Option 3</h4>
                <p className="option-text">Don du matériel à des associations ou écoles</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="section-badge green">✅ Prêt à démarrer ?</div>
          <h2 className="cta-title">Passons à l'action !</h2>
          <p className="cta-subtitle">Notre équipe est à votre disposition pour répondre à toutes vos questions.</p>
        </div>

        {/* Contact Cards */}
        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon blue-contact">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 className="contact-title">Email</h3>
            <a href="mailto:hello@itakecare.be" className="contact-link">hello@itakecare.be</a>
          </div>

          <div className="contact-card">
            <div className="contact-icon purple-contact">
              <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
            </div>
            <h3 className="contact-title">Téléphone</h3>
            <a href="tel:+3271491685" className="contact-link">+32 71 49 16 85</a>
          </div>
        </div>

        {/* Signature */}
        <div className="signature-box">
          <p className="signature-intro">Avec toute notre confiance,</p>
          <div className="signature-content">
            <div className="signature-logo">
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <span className="signature-text">L'équipe iTakecare</span>
          </div>
          <p className="signature-date">{new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Footer */}
        <div className="page-footer">
          <p>Avenue Général Michel 1E, 6000 Charleroi • TVA : BE0795.642.894</p>
        </div>
      </div>
    </div>
  );
};

export default CommercialOffer;
