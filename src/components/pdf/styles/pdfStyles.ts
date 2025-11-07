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

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
  },
  
  // Header styles
  header: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 5,
  },
  
  companyInfo: {
    fontSize: 9,
    color: colors.gray,
    lineHeight: 1.4,
  },
  
  // Title styles
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginBottom: 8,
  },
  
  // Text styles
  text: {
    fontSize: 10,
    color: colors.dark,
    lineHeight: 1.5,
  },
  
  textGray: {
    fontSize: 9,
    color: colors.gray,
    lineHeight: 1.4,
  },
  
  textBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },
  
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray,
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
    backgroundColor: colors.lightGray,
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  
  highlightBox: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: colors.white,
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 8,
    fontSize: 9,
  },
  
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.white,
  },
  
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 8,
    color: colors.gray,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Price styles
  priceText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: 10,
    marginTop: 10,
    borderRadius: 4,
  },
  
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  
  totalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  
  // Badge styles
  badge: {
    backgroundColor: colors.lightGray,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    color: colors.dark,
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
});
