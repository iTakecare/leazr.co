import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed (optional - uses Helvetica by default)
// Font.register({ family: 'Roboto', src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' });

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
    color: mergedColors.dark,
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
})};

// Default PDF styles for backwards compatibility
export const pdfStyles = createOfferPdfStyles();
