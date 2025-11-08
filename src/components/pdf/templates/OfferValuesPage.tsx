import { Page, View, Text, Image } from '@react-pdf/renderer';

interface CompanyValue {
  title: string;
  description: string;
  icon_url?: string;
}

interface CompanyMetric {
  label: string;
  value: string;
  icon_name?: string;
}

interface PartnerLogo {
  name: string;
  logo_url: string;
}

interface OfferValuesPageProps {
  values: CompanyValue[];
  metrics: CompanyMetric[];
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
  styles
}) => {
  // Emoji icons for values if no icon_url provided
  const getValueEmoji = (title: string): string => {
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('evolution') || normalizedTitle.includes('évolution')) return '🚀';
    if (normalizedTitle.includes('confiance')) return '🤝';
    if (normalizedTitle.includes('entraide')) return '💪';
    return '✨';
  };

  return (
    <Page size="A4" style={styles.page}>
      {/* Header with page number */}
      <View style={styles.header}>
        <Text style={styles.pageNumber}>Page {pageNumber}</Text>
      </View>

      {/* Main title */}
      <Text style={{ ...styles.mainTitle, marginBottom: 25 }}>Nos valeurs</Text>

      {/* Values section - Enhanced spacing */}
      {values && values.length > 0 && (
        <View style={{ flexDirection: 'column', gap: 20, marginVertical: 15 }}>
          {values.map((value, index) => (
            <View key={index} style={styles.valueCardEnhanced}>
              {value.icon_url ? (
                <Image src={value.icon_url} style={styles.valueIconEnhanced} />
              ) : (
                <View style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: '#e8f4f8',
                  borderWidth: 4,
                  borderColor: '#4ab6c4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 40 }}>{getValueEmoji(value.title)}</Text>
                </View>
              )}
              <View style={styles.valueContent}>
                <Text style={{ ...styles.valueTitle, fontSize: 14, marginBottom: 8 }}>
                  {value.title}
                </Text>
                <Text style={{ ...styles.valueDescription, fontSize: 9, lineHeight: 1.5 }}>
                  {value.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Metrics section - Larger values */}
      {metrics && metrics.length > 0 && (
        <View style={{ ...styles.metricsContainer, marginTop: 25 }}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <Text style={styles.metricValueLarge}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Partner logos section */}
      {partnerLogos && partnerLogos.length > 0 && (
        <>
          <Text style={{ ...styles.sectionSubtitle, marginTop: 25, marginBottom: 15 }}>
            Ils nous font confiance
          </Text>
          <View style={styles.logosContainer}>
            {partnerLogos.map((partner, index) => (
              <Image 
                key={index} 
                src={partner.logo_url} 
                style={styles.partnerLogo}
              />
            ))}
          </View>
        </>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{companyName}</Text>
      </View>
    </Page>
  );
};
