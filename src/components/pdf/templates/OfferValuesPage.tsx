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
  return (
    <Page size="A4" style={styles.page}>
      {/* Header with page number */}
      <View style={styles.header}>
        <Text style={styles.pageNumber}>Page {pageNumber}</Text>
      </View>

      {/* Main title */}
      <Text style={styles.mainTitle}>Nos valeurs</Text>

      {/* Values section */}
      {values && values.length > 0 && (
        <View style={styles.valuesContainer}>
          {values.map((value, index) => (
            <View key={index} style={styles.valueCard}>
              {value.icon_url && (
                <Image src={value.icon_url} style={styles.valueIcon} />
              )}
              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{value.title}</Text>
                <Text style={styles.valueDescription}>{value.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Metrics section */}
      {metrics && metrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Partner logos section */}
      {partnerLogos && partnerLogos.length > 0 && (
        <>
          <Text style={styles.sectionSubtitle}>Ils nous font confiance</Text>
          <View style={styles.logosContainer}>
            {partnerLogos.map((partner, index) => (
              <Image 
                key={index} 
                src={partner.logo_url} 
                style={styles.partnerLogo}
              />
            ))}
          </View>
          <Text style={styles.partnerLogosFooter}>
            Et beaucoup d'autres encore...
          </Text>
        </>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{companyName}</Text>
      </View>
    </Page>
  );
};
