import { Page, Text, View, Image } from '@react-pdf/renderer';
import { StyleSheet } from '@react-pdf/renderer';

interface CompanyValue {
  id: string;
  title: string;
  description: string;
  icon_url?: string;
}

interface CompanyMetrics {
  client_satisfaction_percent?: number;
  devices_count?: number;
  co2_saved_kg?: number;
}

interface PartnerLogo {
  id: string;
  logo_name: string;
  logo_url: string;
}

interface OfferValuesPageProps {
  values: CompanyValue[];
  metrics?: CompanyMetrics;
  partnerLogos: PartnerLogo[];
  companyName: string;
  pageNumber: number;
  styles: any;
}

export const OfferValuesPage: React.FC<OfferValuesPageProps> = ({
  values,
  metrics,
  partnerLogos,
  companyName,
  pageNumber,
  styles,
}) => {
  const pageStyles = StyleSheet.create({
    page: {
      padding: 40,
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: styles.colors.primary,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      color: '#64748b',
      marginBottom: 20,
    },
    valuesContainer: {
      marginBottom: 40,
    },
    valueItem: {
      marginBottom: 25,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    valueIconContainer: {
      width: 60,
      height: 60,
      marginRight: 20,
      flexShrink: 0,
    },
    valueIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      objectFit: 'cover',
    },
    valueContent: {
      flex: 1,
    },
    valueTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: 8,
    },
    valueDescription: {
      fontSize: 11,
      color: '#475569',
      lineHeight: 1.6,
    },
    metricsSection: {
      marginTop: 30,
      marginBottom: 40,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    metricsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    metricItem: {
      alignItems: 'center',
      flex: 1,
    },
    metricValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: styles.colors.primary,
      marginBottom: 5,
    },
    metricLabel: {
      fontSize: 10,
      color: '#64748b',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    logosSection: {
      marginTop: 30,
    },
    logosTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#64748b',
      textAlign: 'center',
      marginBottom: 20,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    logosGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 15,
    },
    logoItem: {
      width: 80,
      height: 50,
      margin: 5,
    },
    logo: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    footerText: {
      fontSize: 9,
      color: '#94a3b8',
    },
    pageNumberText: {
      fontSize: 9,
      color: '#94a3b8',
    },
  });

  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR');
  };

  return (
    <Page size="A4" style={pageStyles.page}>
      {/* Header */}
      <View style={pageStyles.header}>
        <Text style={pageStyles.title}>Nos valeurs</Text>
        <Text style={pageStyles.subtitle}>
          Les principes qui guident notre action au quotidien
        </Text>
      </View>

      {/* Values Section */}
      <View style={pageStyles.valuesContainer}>
        {values.map((value, index) => (
          <View key={value.id} style={pageStyles.valueItem}>
            {value.icon_url && (
              <View style={pageStyles.valueIconContainer}>
                <Image
                  src={value.icon_url}
                  style={pageStyles.valueIcon}
                />
              </View>
            )}
            <View style={pageStyles.valueContent}>
              <Text style={pageStyles.valueTitle}>{value.title}</Text>
              <Text style={pageStyles.valueDescription}>
                {value.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Metrics Section */}
      {metrics && (
        <View style={pageStyles.metricsSection}>
          <View style={pageStyles.metricsContainer}>
            {metrics.client_satisfaction_percent !== undefined && (
              <View style={pageStyles.metricItem}>
                <Text style={pageStyles.metricValue}>
                  {metrics.client_satisfaction_percent}%
                </Text>
                <Text style={pageStyles.metricLabel}>
                  Clients satisfaits
                </Text>
              </View>
            )}
            
            {metrics.devices_count !== undefined && (
              <View style={pageStyles.metricItem}>
                <Text style={pageStyles.metricValue}>
                  {formatNumber(metrics.devices_count)}
                </Text>
                <Text style={pageStyles.metricLabel}>
                  Appareils gérés
                </Text>
              </View>
            )}
            
            {metrics.co2_saved_kg !== undefined && (
              <View style={pageStyles.metricItem}>
                <Text style={pageStyles.metricValue}>
                  {formatNumber(metrics.co2_saved_kg)}
                </Text>
                <Text style={pageStyles.metricLabel}>
                  kg de CO₂ économisés
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Partner Logos Section */}
      {partnerLogos.length > 0 && (
        <View style={pageStyles.logosSection}>
          <Text style={pageStyles.logosTitle}>
            ILS NOUS FONT CONFIANCE
          </Text>
          <View style={pageStyles.logosGrid}>
            {partnerLogos.slice(0, 18).map((partner) => (
              <View key={partner.id} style={pageStyles.logoItem}>
                <Image
                  src={partner.logo_url}
                  style={pageStyles.logo}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={pageStyles.footer}>
        <Text style={pageStyles.footerText}>{companyName}</Text>
        <Text style={pageStyles.pageNumberText}>Page {pageNumber}</Text>
      </View>
    </Page>
  );
};
