import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed (optional - uses Helvetica by default)
// Font.register({ family: 'Roboto', src: 'https://fonts.gstatic.com/fes/cms/2023/08/02/lh93u4s5vj1r3o2f4ajyb58h1vvzbj208648.png' });

export const colors = {
  primary: '#33638e',      // Bleu foncé iTakecare
  primaryDark: '#1a2942',  // Bleu très foncé
  secondary: '#4ab6c4',    // Bleu clair/turquoise iTakecare
  dark: '#1a2942',
  gray: '#64748b',
  lightGray: '#e8f4f8',   // Bleu très clair iTakecare
  white: '#ffffff',
  border: '#c5e5ed',      // Bordure bleu clair
  success: '#22c55e',
  warning: '#f59e0b',
};

/**
 * Creates dynamic PDF styles with custom theme colors
 */
export const createOfferPdfStyles = (theme?: {
  primary?: string;
  secondary?: string;
  dark?: string;
  gray?: string;
  lightGray?: string;
  warning?: string;
  success?: string;
}) => {
  const mergedColors = {
    ...colors,
    ...theme,
  };

  return StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: mergedColors.white,
  },
  
  // Header styles
  header: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: mergedColors.secondary,
  },
  
  headerGradient: {
    backgroundColor: mergedColors.primary,
    padding: 20,
    marginBottom: 20,
  },
  
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 5,
  },
  
  companyInfo: {
    fontSize: 9,
    color: mergedColors.gray,
    lineHeight: 1.4,
  },
  
  // Title styles
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: mergedColors.border,
  },
  
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
    marginBottom: 8,
  },
  
  // Text styles
  text: {
    fontSize: 10,
    color: mergedColors.dark,
    lineHeight: 1.5,
  },
  
  textGray: {
    fontSize: 9,
    color: mergedColors.gray,
    lineHeight: 1.4,
  },
  
  textBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
  },
  
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.gray,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  
  // Layout styles
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  column: {
    flexDirection: 'column',
    flex: 1,
  },
  
  flexRow: {
    flexDirection: 'row',
  },
  
  // Box styles
  infoBox: {
    backgroundColor: mergedColors.lightGray,
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: mergedColors.secondary,
  },
  
  highlightBox: {
    backgroundColor: mergedColors.primary,
    padding: 12,
    borderRadius: 4,
    marginVertical: 10,
  },
  
  // Table styles
  table: {
    width: '100%',
    marginTop: 10,
    marginBottom: 15,
  },
  
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: mergedColors.primary,
    padding: 10,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: mergedColors.white,
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: mergedColors.border,
    padding: 8,
    fontSize: 9,
  },
  
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: mergedColors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: mergedColors.border,
    padding: 8,
    fontSize: 9,
  },
  
  tableCell: {
    flex: 1,
    paddingRight: 5,
  },
  
  tableCellHeader: {
    flex: 1,
    paddingRight: 5,
    color: mergedColors.white,
  },
  
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: mergedColors.border,
    fontSize: 8,
    color: mergedColors.gray,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Price styles
  priceText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: mergedColors.primary,
    padding: 10,
    marginTop: 10,
    borderRadius: 4,
  },
  
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.white,
  },
  
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.white,
  },
  
  // Badge styles
  badge: {
    backgroundColor: mergedColors.secondary,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    color: mergedColors.white,
    marginRight: 5,
    marginBottom: 3,
  },
  
  // List styles
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 9,
  },
  
  bullet: {
    width: 15,
    fontSize: 9,
  },
  
  listContent: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4,
  },
  
  logo: {
    width: 80,
    height: 'auto',
    marginBottom: 10,
  },
  
  // Values page styles
  mainTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  
  valuesContainer: {
    flexDirection: 'column',
    gap: 10,
    marginVertical: 10,
  },
  
  valueCard: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: mergedColors.white,
    borderRadius: 4,
    alignItems: 'flex-start',
    gap: 15,
    borderLeftWidth: 4,
    borderLeftColor: mergedColors.secondary,
    borderWidth: 1,
    borderColor: mergedColors.border,
  },
  
  valueIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    objectFit: 'cover',
    flexShrink: 0,
    borderWidth: 3,
    borderColor: mergedColors.secondary,
  },
  
  valueContent: {
    flex: 1,
    flexDirection: 'column',
  },
  
  valueTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 5,
    textAlign: 'left',
  },
  
  decorativeLine: {
    height: 3,
    backgroundColor: mergedColors.secondary,
    width: 60,
    marginTop: 5,
    marginBottom: 15,
  },
  
  valueDescription: {
    fontSize: 8,
    textAlign: 'left',
    color: mergedColors.gray,
    lineHeight: 1.3,
  },
  
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    padding: 12,
    backgroundColor: mergedColors.primary,
    borderRadius: 0,
  },
  
  metricCard: {
    alignItems: 'center',
    flex: 1,
  },
  
  metricValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  metricLabel: {
    fontSize: 8,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 1.2,
    maxWidth: 120,
  },
  
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  logosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 15,
  },
  
  partnerLogo: {
    width: 50,
    height: 30,
    objectFit: 'contain',
  },
  
  pageNumber: {
    fontSize: 9,
    color: mergedColors.gray,
    textAlign: 'right',
  },
  
  footerText: {
    fontSize: 8,
    color: mergedColors.gray,
    textAlign: 'center',
  },
  
  // ============= NEW TECH PREMIUM STYLES =============
  
  // Modern Equipment Cards
  equipmentCard: {
    backgroundColor: mergedColors.white,
    padding: 20,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: mergedColors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  
  productImage: {
    width: 120,
    height: 120,
    objectFit: 'contain',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  
  productTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
    marginBottom: 8,
  },
  
  // Price Highlight
  priceHighlight: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    letterSpacing: -0.5,
  },
  
  priceLabel: {
    fontSize: 9,
    color: mergedColors.gray,
    marginBottom: 4,
  },
  
  // Benefits Icons
  benefitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  benefitIcon: {
    fontSize: 14,
    color: mergedColors.secondary,
    marginRight: 4,
  },
  
  benefitText: {
    fontSize: 8,
    color: mergedColors.gray,
  },
  
  // Example/Highlight Boxes
  exampleBox: {
    backgroundColor: mergedColors.lightGray,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: mergedColors.secondary,
    marginVertical: 8,
  },
  
  // Condition Sections
  conditionSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: mergedColors.border,
  },
  
  sectionHeaderConditions: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  sectionIconText: {
    fontSize: 16,
    marginRight: 10,
    color: mergedColors.secondary,
  },
  
  // CTA Box
  ctaBox: {
    backgroundColor: mergedColors.primary,
    padding: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  
  ctaTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.white,
    marginBottom: 10,
  },
  
  ctaText: {
    fontSize: 11,
    color: mergedColors.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  
  // Contact Styled Box
  contactBox: {
    backgroundColor: mergedColors.lightGray,
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: mergedColors.secondary,
    marginTop: 20,
  },
  
  contactTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 15,
  },
  
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
    color: mergedColors.secondary,
  },
  
  contactLabel: {
    fontSize: 8,
    color: mergedColors.gray,
  },
  
  contactValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
  },
  
  // Financial Summary Box
  summaryBox: {
    backgroundColor: mergedColors.primary,
    padding: 20,
    borderRadius: 8,
    marginTop: 25,
  },
  
  summaryTotal: {
    fontSize: 11,
    color: mergedColors.white,
    opacity: 0.8,
  },
  
  summaryAmount: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.white,
  },
  
  summaryDetail: {
    fontSize: 9,
    color: mergedColors.white,
    opacity: 0.8,
  },
  
  // Offer Number Box (Cover Page)
  offerNumberBox: {
    backgroundColor: mergedColors.lightGray,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: mergedColors.secondary,
  },
  
  offerNumberLabel: {
    fontSize: 10,
    color: mergedColors.gray,
    marginBottom: 5,
  },
  
  offerNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
  },
  
  offerDate: {
    fontSize: 11,
    color: mergedColors.gray,
    marginTop: 8,
  },
  
  // Enhanced Values Styles
  valueCardEnhanced: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: mergedColors.white,
    borderRadius: 8,
    alignItems: 'flex-start',
    gap: 20,
    borderLeftWidth: 4,
    borderLeftColor: mergedColors.secondary,
    borderWidth: 1,
    borderColor: mergedColors.border,
    marginBottom: 20,
  },
  
  valueIconEnhanced: {
    width: 100,
    height: 100,
    borderRadius: 50,
    objectFit: 'cover',
    flexShrink: 0,
    borderWidth: 4,
    borderColor: mergedColors.secondary,
  },
  
  valueEmojiIcon: {
    fontSize: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: mergedColors.lightGray,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: mergedColors.secondary,
    textAlign: 'center',
    lineHeight: 100,
  },
  
  metricValueLarge: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
})};

// Default PDF styles for backwards compatibility
export const pdfStyles = createOfferPdfStyles();
