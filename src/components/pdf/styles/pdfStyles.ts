import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed (optional - uses Helvetica by default)
// Font.register({ family: 'Roboto', src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf' });

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  dark: '#1e293b',
  gray: '#64748b',
  lightGray: '#f1f5f9',
  white: '#ffffff',
  border: '#e2e8f0',
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
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: mergedColors.primary,
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
    padding: 8,
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
    backgroundColor: mergedColors.lightGray,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    color: mergedColors.dark,
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
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  
  valuesContainer: {
    flexDirection: 'column',
    gap: 20,
    marginVertical: 20,
  },
  
  valueCard: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: mergedColors.lightGray,
    borderRadius: 4,
    alignItems: 'flex-start',
    gap: 15,
  },
  
  valueIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    objectFit: 'cover',
    flexShrink: 0,
  },
  
  valueContent: {
    flex: 1,
    flexDirection: 'column',
  },
  
  valueTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.primary,
    marginBottom: 8,
    textAlign: 'left',
  },
  
  valueDescription: {
    fontSize: 9,
    textAlign: 'left',
    color: mergedColors.gray,
    lineHeight: 1.5,
  },
  
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 30,
    padding: 25,
    backgroundColor: mergedColors.primary,
    borderRadius: 0,
  },
  
  metricCard: {
    alignItems: 'center',
    flex: 1,
  },
  
  metricValue: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  
  metricLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.4,
    maxWidth: 150,
  },
  
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: mergedColors.dark,
    marginTop: 25,
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  logosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: 15,
  },
  
  partnerLogo: {
    width: 60,
    height: 35,
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
