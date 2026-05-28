import React from 'react';
import DOMPurify from 'dompurify';
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
  clientAddress?: string;
  companyLogo?: string | null;
  companyName?: string;
  validityDays?: number;
  
  // Équipements
  equipment?: Array<{
    id: string;
    title: string;
    quantity: number;
    monthlyPayment: number;
    sellingPrice?: number; // Prix de vente pour mode achat
    imageUrl?: string;
    attributes?: Record<string, string>;
    specifications?: Record<string, string>;
  }>;

  // Services prestataires externes (facturés directement par le prestataire)
  // Ne sont JAMAIS inclus dans le total mensuel — affichés dans une carte séparée.
  externalServices?: Array<{
    providerName: string;
    providerLogoUrl?: string | null;
    productName: string;
    description?: string;
    priceHtva: number;
    billingPeriod: 'monthly' | 'yearly' | 'one_time' | string;
    quantity: number;
  }>;

  // Carte promo "Avez-vous pensé à...?" — suggestions promotionnelles de
  // prestataires externes. Jamais incluses dans le total. Affichées dans une carte dédiée.
  promoProducts?: Array<{
    providerName: string;
    providerLogoUrl?: string | null;
    productName: string;
    description?: string;
    priceHtva: number;
    billingPeriod: 'monthly' | 'yearly' | 'one_time' | string;
    quantity: number;
  }>;

  // Totaux
  totalMonthly?: number;
  totalSellingPrice?: number; // Total prix de vente pour mode achat
  contractDuration?: number;
  fileFee?: number;
  insuranceCost?: number;
  
  // Acompte et mensualité ajustée
  downPayment?: number;
  adjustedMonthlyPayment?: number;
  financedAmountAfterDownPayment?: number;
  
  // Remise commerciale
  discountAmount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  monthlyPaymentBeforeDiscount?: number;
  
  // Valeurs entreprise
  companyValues?: Array<{
    title: string;
    description: string;
    iconUrl?: string;
  }>;
  
  // Métriques
  metrics?: Array<{
    label: string;
    value: string;
    iconName?: string;
  }>;
  
  // Logos partenaires
  partnerLogos?: string[];
  
  // Blocs de contenu texte
  contentBlocks?: {
    cover?: {
      greeting?: string;
      introduction?: string;
      validity?: string;
    };
    equipment?: {
      title?: string;
      footer_note?: string;
    };
    conditions?: {
      general_conditions?: string;
      sale_general_conditions?: string; // CGV de vente pour mode achat
      additional_info?: string;
      contact_info?: string;
    };
  };
  
  // Contrôle d'affichage
  showPrintButton?: boolean;
  isPDFMode?: boolean; // Permet de basculer entre écran et PDF
  isPurchase?: boolean; // Mode achat (vs leasing)
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

// Système de styles conditionnels pour écran vs PDF
const getResponsiveStyle = (isPDFMode: boolean) => ({
  // Espacements
  spacing: {
    xs: isPDFMode ? '4px' : '0.25rem',
    sm: isPDFMode ? '8px' : '0.5rem',
    md: isPDFMode ? '12px' : '0.75rem',
    lg: isPDFMode ? '16px' : '1rem',
    xl: isPDFMode ? '20px' : '1.25rem',
    '2xl': isPDFMode ? '24px' : '1.5rem',
    '3xl': isPDFMode ? '32px' : '2rem',
    '4xl': isPDFMode ? '40px' : '2.5rem',
    '5xl': isPDFMode ? '48px' : '3rem',
  },
  
  // Tailles de police
  fontSize: {
    xxs: isPDFMode ? '10px' : '0.625rem',
    xs: isPDFMode ? '12px' : '0.75rem',
    sm: isPDFMode ? '14px' : '0.875rem',
    base: isPDFMode ? '16px' : '1rem',
    lg: isPDFMode ? '18px' : '1.125rem',
    xl: isPDFMode ? '20px' : '1.25rem',
    '2xl': isPDFMode ? '24px' : '1.5rem',
    '3xl': isPDFMode ? '32px' : '2rem',
    '4xl': isPDFMode ? '36px' : '2.25rem',
    '5xl': isPDFMode ? '48px' : '3rem',
  },
  
  // Border radius
  borderRadius: {
    sm: isPDFMode ? '4px' : '0.25rem',
    md: isPDFMode ? '8px' : '0.5rem',
    lg: isPDFMode ? '12px' : '0.75rem',
    xl: isPDFMode ? '16px' : '1rem',
    full: isPDFMode ? '9999px' : '9999px',
  },
  
  // Couleurs de fond (remplace les gradients en mode PDF)
  background: {
    totalBox: isPDFMode ? '#DBEAFE' : 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
    blueCard: isPDFMode ? '#EFF6FF' : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    purpleCard: isPDFMode ? '#FAF5FF' : 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    greenCard: isPDFMode ? '#F0FDF4' : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    amberCard: isPDFMode ? '#FFFBEB' : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    indigoCard: isPDFMode ? '#EEF2FF' : 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
  },
  
    // Box shadows - IDENTIQUES écran et PDF
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
    // Ombres visibles en PDF pour les cartes
    pdfShadow: {
      card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      stats: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
});

const StrikePrice = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ position: 'relative' as const, display: 'inline-block', ...style }}>
    <div>{children}</div>
    <div style={{
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top: 0,
      height: '50%',
      borderBottom: '1.5px solid #6B7280',
      pointerEvents: 'none' as const,
    }} />
  </div>
);

const CommercialOffer: React.FC<CommercialOfferProps> = ({
  offerNumber = "N/A",
  offerDate = new Date().toLocaleDateString('fr-FR'),
  clientName = "Client",
  clientEmail = "email@example.com",
  clientPhone = "N/A",
  clientCompany,
  clientAddress,
  companyLogo,
  companyName = 'iTakecare',
  validityDays = 10,
  equipment = [],
  externalServices = [],
  promoProducts = [],
  totalMonthly = 0,
  totalSellingPrice = 0,
  contractDuration = 36,
  fileFee = 0,
  insuranceCost = 0,
  downPayment = 0,
  adjustedMonthlyPayment,
  financedAmountAfterDownPayment,
  discountAmount = 0,
  discountType,
  discountValue,
  monthlyPaymentBeforeDiscount,
  companyValues = [],
  metrics = [],
  partnerLogos = [],
  contentBlocks = {
    cover: {
      greeting: '<p>Madame, Monsieur,</p>',
      introduction: '<p>Nous avons le plaisir de vous présenter notre offre commerciale.</p>',
      validity: '<p>Cette offre est valable 30 jours.</p>',
    },
    equipment: {
      title: 'Détail de l\'équipement',
      footer_note: 'Tous nos équipements sont garantis.',
    },
    conditions: {
      general_conditions: '<h3>Conditions générales</h3>',
      sale_general_conditions: '<h3>Conditions de vente</h3>',
      additional_info: '',
      contact_info: 'Contactez-nous pour plus d\'informations.',
    },
  },
  showPrintButton = true,
  isPDFMode = false, // Par défaut, mode écran
  isPurchase = false // Par défaut, mode leasing
}) => {
  const styles = getResponsiveStyle(isPDFMode);
  
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
                {companyLogo ? (
                  <img 
                    src={companyLogo} 
                    alt={`${companyName} Logo`}
                    className="logo-itakecare"
                    style={{ height: 'auto', maxHeight: '40px', width: 'auto', maxWidth: '150px', objectFit: 'contain' }}
                  />
                ) : (
                  <>
                    <div className="logo-icon">
                      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <span className="logo-text">{companyName}</span>
                  </>
                )}
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
            <div className="subtitle">
              {contentBlocks?.cover?.greeting && (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentBlocks.cover.greeting) }} />
              )}
              {contentBlocks?.cover?.introduction && (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentBlocks.cover.introduction) }} />
              )}
            </div>
            
            {/* Destinataire card */}
            <div className="client-card">
              <p className="client-label">Destinataire</p>
              <h3 className="client-name">{clientName}</h3>
              {clientCompany && <p className="client-company">{clientCompany}</p>}
              {clientAddress && <p className="client-address">{clientAddress}</p>}
              <div className="client-contact">
                <span>📧 {clientEmail}</span>
                {clientPhone && clientPhone !== 'N/A' && clientPhone !== '' && (
                  <span>📞 {clientPhone}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer warning */}
          <div className="warning-box">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {contentBlocks?.cover?.validity ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentBlocks.cover.validity) }} />
            ) : (
              <p>
                <strong>Attention :</strong> Cette offre est valable {validityDays} jours à compter de la date d'émission.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PAGE 2+ : Équipements (avec pagination) */}
      {(() => {
        const productsPerPage = 15;
        const totalProductPages = Math.ceil(equipment.length / productsPerPage);
        
        return Array.from({ length: totalProductPages }, (_, pageIndex) => {
          const startIdx = pageIndex * productsPerPage;
          const endIdx = startIdx + productsPerPage;
          const pageProducts = equipment.slice(startIdx, endIdx);
          const isLastProductPage = pageIndex === totalProductPages - 1;
          
          return (
            <div 
              key={`equipment-page-${pageIndex}`}
              className="page page-2"
              style={{
                pageBreakBefore: pageIndex > 0 ? 'always' : 'auto',
                pageBreakAfter: 'auto',
                pageBreakInside: 'avoid',
              }}
            >
              <div className="section-header">
                {/* Titre principal */}
                <h2 className="section-title" style={{
                  fontSize: styles.fontSize['3xl'],
                  fontWeight: '700',
                  marginBottom: styles.spacing.xs,
                }}>
                  {pageIndex === 0 ? 'Votre pack tech' : 'Détail des Équipements'}
                  {pageIndex > 0 && totalProductPages > 1 && ` (${pageIndex + 1}/${totalProductPages})`}
                </h2>
                
                <p className="section-subtitle" style={{
                  fontSize: styles.fontSize.sm,
                  color: '#6B7280',
                  marginBottom: styles.spacing['2xl'],
                }}>
                  Des appareils premium pour vos besoins professionnels
                </p>
              </div>

              {/* Product Cards - Format compact */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: styles.spacing.sm,
                marginBottom: styles.spacing['2xl'],
              }}>
                {pageProducts.map((item) => (
                  <div 
                    key={item.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: styles.spacing.md,
                      padding: styles.spacing.md,
                      backgroundColor: '#F9FAFB',
                      borderRadius: styles.borderRadius.md,
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    {/* Image ou icône produit */}
                    <div style={{
                      width: isPDFMode ? '40px' : '2.5rem',
                      height: isPDFMode ? '40px' : '2.5rem',
                      minWidth: isPDFMode ? '40px' : '2.5rem',
                      backgroundColor: '#E5E7EB',
                      borderRadius: styles.borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: styles.fontSize.xl,
                      overflow: 'hidden',
                    }}>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          crossOrigin="anonymous"
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain' 
                          }}
                        />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>
                    
                    {/* Infos produit */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: styles.spacing.xs,
                      }}>
                        {item.title}
                      </div>
                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: styles.spacing.xs,
                          paddingBottom: styles.spacing.sm,
                        }}>
                          {Object.entries(item.attributes).slice(0, 3).map(([key, value]) => (
                            <span 
                              key={key} 
                              style={{
                                fontSize: isPDFMode ? '10px' : '0.625rem',
                                color: '#6B7280',
                                backgroundColor: '#F3F4F6',
                                padding: `2px ${styles.spacing.xs}`,
                                borderRadius: styles.borderRadius.sm,
                              }}
                            >
                              {getAttributeIcon(key)} {key}: <strong>{value}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Quantité */}
                    <div style={{
                      fontSize: styles.fontSize.sm,
                      color: '#6B7280',
                      textAlign: 'center',
                      minWidth: isPDFMode ? '50px' : '3.125rem',
                    }}>
                      Qté: <strong>{item.quantity}</strong>
                    </div>
                    
                    {/* Prix unitaire et total */}
                    <div style={{
                      textAlign: 'right',
                      minWidth: isPDFMode ? '160px' : '9.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}>
                      {isPurchase ? (
                        /* Mode Achat : afficher prix de vente */
                        <>
                          <div style={{
                            fontSize: styles.fontSize.xs,
                            color: '#6B7280',
                            fontWeight: '400',
                          }}>
                            {formatCurrency((item.sellingPrice || 0) / Math.max(1, item.quantity || 1))} HTVA
                            <span style={{ marginLeft: styles.spacing.xs, opacity: 0.9 }}>
                              • unitaire
                            </span>
                          </div>
                          <div style={{
                            fontSize: styles.fontSize.lg,
                            fontWeight: '600',
                            color: '#1E40AF',
                          }}>
                            {formatCurrency(item.sellingPrice || 0)}
                            <span style={{
                              fontSize: styles.fontSize.xs,
                              color: '#6B7280',
                              fontWeight: '400',
                              marginLeft: styles.spacing.xs,
                            }}>
                              HTVA
                            </span>
                          </div>
                        </>
                      ) : (
                        /* Mode Leasing : afficher mensualité avec remise */
                        (() => {
                          const hasActiveDiscount = (discountAmount || 0) > 0 && (monthlyPaymentBeforeDiscount || 0) > 0;
                          const discountRatio = hasActiveDiscount
                            ? totalMonthly / monthlyPaymentBeforeDiscount!
                            : 1;
                          const originalUnitPrice = item.monthlyPayment / Math.max(1, item.quantity || 1);
                          const discountedUnitPrice = originalUnitPrice * discountRatio;
                          const originalTotal = item.monthlyPayment;
                          const discountedTotal = item.monthlyPayment * discountRatio;
                          
                          return (
                            <>
                             {/* Prix unitaire */}
                             {hasActiveDiscount && (
                               <div style={{
                                  fontSize: styles.fontSize.xs,
                                  color: '#6B7280',
                                  fontWeight: '400',
                                  opacity: 0.6,
                                  lineHeight: '1.2',
                                }}>
                                  <StrikePrice>{formatCurrency(originalUnitPrice)}</StrikePrice>
                                </div>
                             )}
                             <div style={{
                               fontSize: styles.fontSize.xs,
                               color: '#6B7280',
                               fontWeight: '400',
                             }}>
                               {formatCurrency(hasActiveDiscount ? discountedUnitPrice : originalUnitPrice)} HTVA/mois
                               <span style={{ marginLeft: styles.spacing.xs, opacity: 0.9 }}>
                                 • unitaire
                               </span>
                             </div>
                             {/* Prix total par équipement */}
                             {hasActiveDiscount && (
                               <div style={{
                                  fontSize: styles.fontSize.sm,
                                  color: '#6B7280',
                                  fontWeight: '400',
                                  opacity: 0.5,
                                  lineHeight: '1.2',
                                }}>
                                  <StrikePrice>{formatCurrency(originalTotal)}</StrikePrice>
                                </div>
                             )}
                             <div style={{
                               fontSize: styles.fontSize.lg,
                               fontWeight: '600',
                               color: '#1E40AF',
                             }}>
                               {formatCurrency(hasActiveDiscount ? discountedTotal : originalTotal)}
                               <span style={{
                                 fontSize: styles.fontSize.xs,
                                 color: '#6B7280',
                                 fontWeight: '400',
                                 marginLeft: styles.spacing.xs,
                               }}>
                                 HTVA/mois
                               </span>
                             </div>
                          </>
                          );
                        })()
                      )}
                      
                      {/* Légende pour la clarté */}
                      <div style={{
                        fontSize: '9px',
                        color: '#9CA3AF',
                        fontStyle: 'italic',
                      }}>
                        Total pour l'équipement
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Section - Uniquement sur la dernière page de produits */}
              {isLastProductPage && (() => {
                const hasDownPayment = (downPayment || 0) > 0;
                const hasDiscount = (discountAmount || 0) > 0;
                // totalMonthly is ALREADY the discounted value from DB
                let displayMonthlyPayment = hasDownPayment && adjustedMonthlyPayment 
                  ? adjustedMonthlyPayment 
                  : totalMonthly;
                const monthlyBeforeDiscount = monthlyPaymentBeforeDiscount || displayMonthlyPayment;
                // Do NOT subtract discountAmount again - it's already applied
                
                return (
                <div style={{
                  background: styles.background.totalBox,
                  borderRadius: styles.borderRadius.lg,
                  padding: styles.spacing['2xl'],
                  boxShadow: styles.shadow.lg,
                }}>
                  {/* Bloc Acompte - si présent */}
                  {hasDownPayment && !isPurchase && (
                    <div style={{
                      marginBottom: styles.spacing.lg,
                      padding: styles.spacing.md,
                      backgroundColor: '#FEF3C7',
                      borderRadius: styles.borderRadius.md,
                      borderLeft: '4px solid #F59E0B',
                    }}>
                      <p style={{ 
                        fontWeight: '600', 
                        color: '#92400E', 
                        marginBottom: styles.spacing.sm,
                        fontSize: styles.fontSize.sm,
                      }}>
                        Acompte
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: styles.spacing.xs,
                        fontSize: styles.fontSize.sm,
                      }}>
                        <span style={{ color: '#78350F' }}>Montant de l'acompte :</span>
                        <span style={{ fontWeight: '600', color: '#78350F' }}>{formatCurrency(downPayment)}</span>
                      </div>
                      {/* Mensualité d'origine barrée */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: styles.fontSize.sm,
                      }}>
                        <span style={{ color: '#78350F' }}>Mensualité d'origine :</span>
                        <StrikePrice style={{ 
                          fontWeight: '400', 
                          color: '#78350F',
                          opacity: 0.7,
                        }}>{formatCurrency(totalMonthly)}</StrikePrice>
                      </div>
                    </div>
                  )}

                  {/* Bloc Remise commerciale - si présent */}
                  {hasDiscount && !isPurchase && (
                    <div style={{
                      marginBottom: styles.spacing.lg,
                      padding: styles.spacing.md,
                      backgroundColor: '#FEE2E2',
                      borderRadius: styles.borderRadius.md,
                      borderLeft: '4px solid #EF4444',
                    }}>
                      <p style={{ 
                        fontWeight: '600', 
                        color: '#991B1B', 
                        marginBottom: styles.spacing.sm,
                        fontSize: styles.fontSize.sm,
                      }}>
                        🏷️ Remise commerciale{discountType === 'percentage' && discountValue ? ` (${discountValue}%)` : ''}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: styles.spacing.xs,
                        fontSize: styles.fontSize.sm,
                      }}>
                        <span style={{ color: '#991B1B' }}>Mensualité avant remise :</span>
                        <StrikePrice style={{ 
                          fontWeight: '400', 
                          color: '#991B1B',
                          opacity: 0.7,
                        }}>{formatCurrency(monthlyBeforeDiscount)}</StrikePrice>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: styles.spacing.xs,
                        fontSize: styles.fontSize.sm,
                      }}>
                        <span style={{ color: '#991B1B' }}>Mensualité après remise :</span>
                        <span style={{ 
                          fontWeight: '600', 
                          color: '#991B1B',
                        }}>{formatCurrency(displayMonthlyPayment)}</span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: styles.fontSize.sm,
                      }}>
                        <span style={{ color: '#991B1B' }}>Remise :</span>
                        <span style={{ fontWeight: '600', color: '#991B1B' }}>-{formatCurrency(discountAmount)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: styles.spacing.lg,
                  }}>
                    <div>
                      <p style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        marginBottom: styles.spacing.xs,
                      }}>
                        {isPurchase 
                          ? 'Total HTVA' 
                          : (hasDiscount 
                              ? (hasDownPayment ? 'Mensualité HTVA (après acompte et remise)' : 'Mensualité HTVA (après remise)')
                              : (hasDownPayment ? 'Mensualité HTVA (après acompte)' : 'Mensualité HTVA'))
                        }
                      </p>
                      <p style={{
                        fontSize: isPDFMode ? '40px' : '2.5rem',
                        fontWeight: '700',
                        color: '#1E40AF',
                        lineHeight: '1',
                      }}>
                        {formatCurrency(isPurchase ? totalSellingPrice : displayMonthlyPayment)}
                      </p>
                    </div>
                    
                    {!isPurchase && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          fontSize: styles.fontSize.sm,
                          color: '#1E40AF',
                          marginBottom: styles.spacing.xs,
                        }}>
                          Durée du contrat
                        </p>
                        <p style={{
                          fontSize: isPDFMode ? '32px' : '2rem',
                          fontWeight: '600',
                          color: '#1E40AF',
                          lineHeight: '1',
                        }}>
                          {contractDuration} mois
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Badges conditionnels selon mode achat/leasing */}
                  {isPurchase ? (
                    /* MODE ACHAT : Seulement Livraison + Garantie constructeur */
                    <div style={{
                      marginTop: styles.spacing.lg,
                      paddingTop: styles.spacing.lg,
                      borderTop: '1px solid #93C5FD',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: styles.spacing['3xl'],
                    }}>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: styles.spacing.xs,
                      }}>
                        <span style={{
                          width: styles.spacing.lg,
                          height: styles.spacing.lg,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width={isPDFMode ? 12 : 12} height={isPDFMode ? 12 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Livraison incluse
                      </div>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: styles.spacing.xs,
                      }}>
                        <span style={{
                          width: styles.spacing.lg,
                          height: styles.spacing.lg,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width={isPDFMode ? 12 : 12} height={isPDFMode ? 12 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Garantie constructeur
                      </div>
                    </div>
                  ) : (
                    /* MODE LEASING : Livraison + Maintenance + Garantie échange */
                    <div style={{
                      marginTop: styles.spacing.lg,
                      paddingTop: styles.spacing.lg,
                      borderTop: '1px solid #93C5FD',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: styles.spacing.md,
                    }}>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: styles.spacing.xs,
                      }}>
                        <span style={{
                          width: styles.spacing.lg,
                          height: styles.spacing.lg,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width={isPDFMode ? 12 : 12} height={isPDFMode ? 12 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Livraison incluse
                      </div>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: styles.spacing.xs,
                      }}>
                        <span style={{
                          width: styles.spacing.lg,
                          height: styles.spacing.lg,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width={isPDFMode ? 12 : 12} height={isPDFMode ? 12 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Maintenance incluse
                      </div>
                      <div style={{
                        fontSize: styles.fontSize.sm,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: styles.spacing.xs,
                      }}>
                        <span style={{
                          width: styles.spacing.lg,
                          height: styles.spacing.lg,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width={isPDFMode ? 12 : 12} height={isPDFMode ? 12 : 12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Garantie échange direct
                      </div>
                    </div>
                  )}
                  
                  {/* Frais de dossier et assurance : UNIQUEMENT en mode leasing */}
                  {!isPurchase && (
                    <div style={{
                      marginTop: styles.spacing.lg,
                      fontSize: styles.fontSize.xs,
                      color: '#1E40AF',
                      textAlign: 'center',
                    }}>
                      💼 Frais de dossier unique : <strong>{formatCurrency(fileFee)}</strong> • 
                      🛡️ Montant de l'assurance annuelle : <strong>{formatCurrency(insuranceCost)}</strong>
                    </div>
                  )}
                </div>
              );
              })()}

              {/* Carte Services prestataires externes — uniquement sur la dernière page produits */}
              {isLastProductPage && externalServices && externalServices.length > 0 && (() => {
                const periodLabel = (p: string) =>
                  p === 'monthly' ? '/mois' : p === 'yearly' ? '/an' : p === 'one_time' ? 'paiement unique' : p;

                const grouped = externalServices.reduce<Record<string, typeof externalServices>>((acc, s) => {
                  if (!acc[s.providerName]) acc[s.providerName] = [];
                  acc[s.providerName].push(s);
                  return acc;
                }, {});

                return (
                  <div style={{
                    marginTop: styles.spacing.xl,
                    padding: styles.spacing.xl,
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderLeft: '4px solid #3B82F6',
                    borderRadius: styles.borderRadius.lg,
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: '#1E3A8A',
                      fontSize: styles.fontSize.md,
                      marginBottom: styles.spacing.sm,
                    }}>
                      🤝 Services partenaires complémentaires
                    </div>

                    {Object.entries(grouped).map(([providerName, items]) => {
                      const providerLogo = items[0]?.providerLogoUrl;
                      return (
                      <div key={providerName} style={{ marginBottom: styles.spacing.md }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: providerLogo ? 'flex-end' : 'space-between',
                          gap: styles.spacing.md,
                          marginBottom: styles.spacing.xs,
                          paddingBottom: styles.spacing.xs,
                          borderBottom: '1px solid #DBEAFE',
                        }}>
                          {/* Nom du prestataire affiché uniquement si pas de logo configuré */}
                          {!providerLogo && (
                            <div style={{
                              fontWeight: 600,
                              color: '#1E3A8A',
                              fontSize: styles.fontSize.md,
                            }}>
                              {providerName}
                            </div>
                          )}
                          {providerLogo && (
                            <img
                              src={providerLogo}
                              alt={providerName}
                              crossOrigin="anonymous"
                              style={{
                                height: '40px',
                                maxWidth: '160px',
                                objectFit: 'contain',
                                background: 'white',
                                borderRadius: styles.borderRadius.sm,
                                padding: '4px 8px',
                              }}
                            />
                          )}
                        </div>
                        {items.map((s, i) => (
                          <div key={`${providerName}-${i}`} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: styles.spacing.md,
                            paddingLeft: styles.spacing.md,
                            fontSize: styles.fontSize.sm,
                            color: '#1F2937',
                            marginBottom: 2,
                          }}>
                            <div style={{ flex: 3 }}>
                              {s.productName}
                              {s.quantity > 1 ? ` × ${s.quantity}` : ''}
                              {s.description ? (
                                <div style={{ color: '#6B7280', fontSize: styles.fontSize.xs }}>{s.description}</div>
                              ) : null}
                            </div>
                            <div style={{ flex: 1.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <strong>{formatCurrency(s.priceHtva)}</strong> HTVA{' '}
                              <span style={{ color: '#64748B' }}>{periodLabel(s.billingPeriod)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      );
                    })}

                    <div style={{
                      marginTop: styles.spacing.sm,
                      fontSize: styles.fontSize.xs,
                      fontStyle: 'italic',
                      color: '#475569',
                      lineHeight: 1.4,
                    }}>
                      Ces services sont fournis et facturés directement par chaque prestataire partenaire.
                      Leurs tarifs sont gérés indépendamment et ne sont <strong>PAS inclus</strong> dans votre mensualité
                      de location ci-dessus.
                    </div>
                  </div>
                );
              })()}

              {/* Carte promo "Avez-vous pensé à...?" — uniquement sur la dernière page produits */}
              {isLastProductPage && promoProducts && promoProducts.length > 0 && (() => {
                const periodLabel = (p: string) =>
                  p === 'monthly' ? '/mois' : p === 'yearly' ? '/an' : p === 'one_time' ? 'paiement unique' : p;

                const grouped = promoProducts.reduce<Record<string, typeof promoProducts>>((acc, s) => {
                  if (!acc[s.providerName]) acc[s.providerName] = [];
                  acc[s.providerName].push(s);
                  return acc;
                }, {});

                return (
                  <div style={{
                    marginTop: styles.spacing.xl,
                    padding: styles.spacing.xl,
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderLeft: '4px solid #F59E0B',
                    borderRadius: styles.borderRadius.lg,
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: '#92400E',
                      fontSize: styles.fontSize.md,
                      marginBottom: styles.spacing.sm,
                    }}>
                      ✨ Avez-vous pensé à... ?
                    </div>

                    {Object.entries(grouped).map(([providerName, items]) => {
                      const providerLogo = items[0]?.providerLogoUrl;
                      return (
                      <div key={providerName} style={{ marginBottom: styles.spacing.md }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: providerLogo ? 'flex-end' : 'space-between',
                          gap: styles.spacing.md,
                          marginBottom: styles.spacing.xs,
                          paddingBottom: styles.spacing.xs,
                          borderBottom: '1px solid #FDE68A',
                        }}>
                          {!providerLogo && (
                            <div style={{
                              fontWeight: 600,
                              color: '#92400E',
                              fontSize: styles.fontSize.md,
                            }}>
                              {providerName}
                            </div>
                          )}
                          {providerLogo && (
                            <img
                              src={providerLogo}
                              alt={providerName}
                              crossOrigin="anonymous"
                              style={{
                                height: '40px',
                                maxWidth: '160px',
                                objectFit: 'contain',
                                background: 'white',
                                borderRadius: styles.borderRadius.sm,
                                padding: '4px 8px',
                              }}
                            />
                          )}
                        </div>
                        {items.map((s, i) => (
                          <div key={`${providerName}-${i}`} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: styles.spacing.md,
                            paddingLeft: styles.spacing.md,
                            fontSize: styles.fontSize.sm,
                            color: '#1F2937',
                            marginBottom: 2,
                          }}>
                            <div style={{ flex: 3 }}>
                              {s.productName}
                              {s.quantity > 1 ? ` × ${s.quantity}` : ''}
                              {s.description ? (
                                <div style={{ color: '#6B7280', fontSize: styles.fontSize.xs }}>{s.description}</div>
                              ) : null}
                            </div>
                            <div style={{ flex: 1.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <strong>{formatCurrency(s.priceHtva)}</strong> HTVA{' '}
                              <span style={{ color: '#64748B' }}>{periodLabel(s.billingPeriod)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      );
                    })}

                    <div style={{
                      marginTop: styles.spacing.sm,
                      fontSize: styles.fontSize.xs,
                      fontStyle: 'italic',
                      color: '#78350F',
                      lineHeight: 1.4,
                    }}>
                      Suggestions de nos prestataires partenaires pour compléter votre solution.
                      Ces options sont facturées directement par chaque prestataire et ne sont
                      <strong> pas incluses</strong> dans votre mensualité.
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        });
      })()}

      {/* PAGE 3: Valeurs */}
      <div className="page page-3" style={{
        backgroundColor: '#FFFFFF',
        padding: isPDFMode ? '40px' : '2.5rem',
      }}>
        <div className="section-header">
          <div className="section-badge purple">💎 Notre ADN</div>
          <h2 className="section-title">Nos Valeurs</h2>
          <p className="section-subtitle">Ce qui nous anime au quotidien</p>
        </div>

        {/* Values Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: styles.spacing.lg,
          marginBottom: styles.spacing['3xl'],
        }}>
          {companyValues.map((value, index) => {
            const iconColors = [
              { bg: '#DBEAFE', text: '#1E40AF' },
              { bg: '#F3E8FF', text: '#7C3AED' },
              { bg: '#DCFCE7', text: '#059669' }
            ];
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
              <div 
                key={index} 
                style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: styles.borderRadius.lg,
          padding: styles.spacing['2xl'],
          boxShadow: isPDFMode ? styles.pdfShadow.card : styles.shadow.md,
                }}
              >
                <div style={{
                  width: isPDFMode ? '48px' : '3rem',
                  height: isPDFMode ? '48px' : '3rem',
                  backgroundColor: iconColors[index % iconColors.length].bg,
                  color: iconColors[index % iconColors.length].text,
                  borderRadius: styles.borderRadius.lg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: styles.spacing.lg,
                }}>
                  {icons[index % icons.length]}
                </div>
                <h3 style={{
                  fontSize: styles.fontSize.lg,
                  fontWeight: '600',
                  marginBottom: styles.spacing.sm,
                  color: '#111827',
                }}>
                  {value.title}
                </h3>
                <p style={{
                  fontSize: isPDFMode ? '9px' : styles.fontSize.xxs,
                  color: '#6B7280',
                  lineHeight: '1.3',
                }}>
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats - Avec styles inline */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: styles.borderRadius.lg,
          padding: isPDFMode ? '32px' : '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: styles.spacing.lg,
          marginBottom: styles.spacing['3xl'],
          boxShadow: isPDFMode ? styles.pdfShadow.stats : '0 10px 30px rgba(0, 0, 0, 0.12)',
        }}>
          {/* Statistiques dynamiques depuis company_metrics */}
          {metrics.map((metric, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: isPDFMode ? '40px' : '2.5rem',
                fontWeight: '700',
                color: '#1E40AF',
                lineHeight: '1',
                marginBottom: isPDFMode ? '12px' : '0.75rem',
              }}>
                {metric.value}
              </div>
              <div style={{
                fontSize: styles.fontSize.xxs,
                color: '#6B7280',
                fontWeight: '500',
                lineHeight: '1.3',
              }}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        {/* Clients logos - Section "Ils nous font confiance" */}
        {partnerLogos.length > 0 && (
          <div style={{
            marginTop: styles.spacing['3xl'],
          }}>
            <h3 style={{
              fontSize: isPDFMode ? '20px' : '1.25rem',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: styles.spacing['2xl'],
              color: '#111827',
            }}>
              Ils nous font confiance
            </h3>
            
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: styles.borderRadius.lg,
              padding: isPDFMode ? '32px' : '2rem',
              boxShadow: isPDFMode ? styles.pdfShadow.card : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '12px',
                alignItems: 'center',
                justifyItems: 'center',
              }}>
                {partnerLogos.map((logo, index) => (
                  <div 
                    key={index}
                    style={{
                      width: isPDFMode ? '45px' : '2.8rem',
                      height: isPDFMode ? '30px' : '1.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: 'grayscale(100%)',
                      opacity: '0.7',
                      transition: 'all 0.3s',
                    }}
                  >
                    <img 
                      src={logo} 
                      alt={`Partenaire ${index + 1}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                ))}
              </div>
              
              <div style={{
                marginTop: '16px',
                textAlign: 'right',
                fontSize: isPDFMode ? '11px' : '0.875rem',
                color: '#6B7280',
                fontStyle: 'italic',
                fontWeight: '500',
              }}>
                Et beaucoup d'autres encore...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAGE 4: Conditions */}
      <div className="page page-4">
        <div className="section-header">
          <div className="section-badge blue">📋 Les détails qui comptent</div>
          <h2 className="section-title">{isPurchase ? 'Conditions de Vente' : 'Conditions Générales'}</h2>
          <p className="section-subtitle">Simples, claires et transparentes</p>
        </div>

        {isPurchase ? (
          /* MODE ACHAT : CGV de vente en 2 colonnes, police réduite pour tenir sur 1 page */
          <div style={{ padding: '0.5rem', backgroundColor: '#FFFFFF' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              .cgv-sale-content h1 { font-size: 10px; font-weight: bold; margin: 0 0 4px 0; }
              .cgv-sale-content h2 { font-size: 9px; font-weight: bold; margin: 6px 0 2px 0; }
              .cgv-sale-content h3 { font-size: 8px; font-weight: bold; margin: 4px 0 2px 0; }
              .cgv-sale-content p { font-size: 7.5px; line-height: 1.2; margin: 0 0 2px 0; }
              .cgv-sale-content ul { padding-left: 10px; margin: 0 0 2px 0; }
              .cgv-sale-content li { font-size: 7.5px; line-height: 1.2; margin: 0 0 1px 0; }
              .cgv-sale-content br { display: none; }
            `}} />
            {contentBlocks?.conditions?.sale_general_conditions ? (
              <div 
                className="cgv-sale-content"
                style={{ 
                  fontSize: '7.5px', 
                  lineHeight: '1.2',
                  color: '#374151',
                  columnCount: 2,
                  columnGap: '1rem',
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contentBlocks.conditions.sale_general_conditions) }} 
              />
            ) : (
              <div style={{ fontSize: '7.5px', lineHeight: '1.2', color: '#374151', columnCount: 2, columnGap: '1rem' }}>
                <h3 style={{ marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>Conditions Générales de Vente</h3>
                <p><strong>Paiement :</strong> À réception de facture sous 30 jours</p>
                <p><strong>Garantie :</strong> Garantie constructeur incluse</p>
                <p><strong>Livraison :</strong> Sous 10-15 jours ouvrés, frais inclus</p>
                <p><strong>SAV :</strong> Service après-vente disponible</p>
              </div>
            )}
          </div>
        ) : (
          /* MODE LEASING : Conditions de leasing complètes (existantes) */
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

            {/* Fin de contrat */}
            <div className="condition-card indigo-card contract-end-card">
              {/* Section gauche : Header avec icône + titre */}
              <div className="contract-end-header">
                <div className="condition-icon indigo-bg">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                  </svg>
                </div>
                <div className="contract-end-text">
                  <h3 className="condition-title">⏱️ Fin de contrat ({contractDuration} mois)</h3>
                  <p className="contract-subtitle">À l'issue des {contractDuration} mois, vous avez <strong>3 options</strong> :</p>
                </div>
              </div>
              
              {/* Section droite : Les 3 options */}
              <div className="options-grid-horizontal">
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
        )}
      </div>

      {/* PAGE 5: Contact */}
      <div className="page page-5">
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
