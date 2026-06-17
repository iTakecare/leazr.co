import { Page, View, Text, Image } from '@react-pdf/renderer';
import { stripHtmlTags } from '@/utils/htmlToPdfText';
import type { ExternalProviderPDFLine } from './OfferPDFDocument';

/**
 * Page promo interfone — reproduit l'identité visuelle de la carte promo interfone
 * (fond bleu marine, cartes blanches arrondies, badges « + », pills magenta, logo
 * interfone®). Ne s'affiche que pour les options interfone réellement choisies sur
 * l'offre (lignes provenant de offer_promo_products / offer_external_services dont
 * le prestataire est interfone). Ces options sont facturées directement par interfone
 * et ne sont JAMAIS incluses dans la mensualité de location.
 *
 * Limitation : @react-pdf/renderer n'a pas de police arrondie type Poppins enregistrée ;
 * on utilise donc Helvetica/Helvetica-Bold (polices standard) pour rester fiable.
 */

// Palette interfone
const NAVY = '#16294C';
const NAVY_CARD = '#1E335C';
const MAGENTA = '#C4146B';
const WHITE = '#FFFFFF';
const CARD_BG = '#FFFFFF';
const LABEL_GREY = '#5B6B7F';
const BODY_GREY = '#2C3A4F';
const FOOTNOTE = '#AEB9CC';

const BILLING_SUFFIX: Record<string, string> = {
  monthly: '/ mois',
  yearly: '/ an',
  one_time: '(paiement unique)',
};

interface InterfonePromoPageProps {
  lines: ExternalProviderPDFLine[];
  companyName: string;
  pageNumber: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

/** Logo « interfone® » reconstitué en texte (fallback quand aucune image fournie). */
const InterfoneWordmark: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = WHITE,
}) => (
  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: size, color, letterSpacing: -0.5 }}>
    interfone
    <Text style={{ fontSize: size * 0.45 }}> ®</Text>
  </Text>
);

const PlusBadge: React.FC = () => (
  <View style={{ alignItems: 'center', marginBottom: 6, marginTop: -2 }}>
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: MAGENTA,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: WHITE, fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: -3 }}>
        +
      </Text>
    </View>
  </View>
);

export const InterfonePromoPage: React.FC<InterfonePromoPageProps> = ({
  lines,
  companyName,
  pageNumber,
}) => {
  // Logo interfone (snapshot ou catalogue) si disponible
  const logo = lines.find((l) => l.provider_logo_url)?.provider_logo_url;

  return (
    <Page size="A4" style={{ backgroundColor: NAVY, paddingTop: 36, paddingHorizontal: 36, paddingBottom: 48 }}>
      {/* En-tête : slogan + logo interfone */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 22,
        }}
      >
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 21, color: WHITE, lineHeight: 1.2 }}>
            Transformez une bonne offre{'\n'}en une offre parfaite
          </Text>
        </View>
        {logo ? (
          <Image src={logo} style={{ height: 26, maxWidth: 130, objectFit: 'contain' }} />
        ) : (
          <InterfoneWordmark size={20} />
        )}
      </View>

      {/* Cartes options choisies */}
      {lines.map((line, i) => {
        const name = stripHtmlTags(line.product_name || '');
        const description = line.description ? stripHtmlTags(line.description) : '';
        const suffix = BILLING_SUFFIX[line.billing_period] || '';
        const qty = line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : '';

        return (
          <View
            key={i}
            wrap={false}
            style={{
              backgroundColor: CARD_BG,
              borderRadius: 14,
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 16,
              marginBottom: 16,
            }}
          >
            <PlusBadge />

            {/* Ligne : pill nom produit + prix */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: description ? 8 : 0,
              }}
            >
              <View
                style={{
                  backgroundColor: MAGENTA,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  maxWidth: '62%',
                }}
              >
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 15, color: WHITE }}>
                  {name}
                  {qty}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: MAGENTA, textAlign: 'right' }}>
                {formatCurrency(line.price_htva)} HT {suffix}
              </Text>
            </View>

            {/* Description */}
            {description ? (
              <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: BODY_GREY, lineHeight: 1.45 }}>
                {description}
              </Text>
            ) : null}
          </View>
        );
      })}

      {/* Pied de page : logo + disclaimer */}
      <View style={{ position: 'absolute', bottom: 26, left: 36, right: 36 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          {logo ? (
            <Image src={logo} style={{ height: 22, maxWidth: 130, objectFit: 'contain' }} />
          ) : (
            <InterfoneWordmark size={18} />
          )}
        </View>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: FOOTNOTE, textAlign: 'center', lineHeight: 1.4 }}>
          Suggestions de nos prestataires pour compléter votre solution. Ces options sont facturées
          directement par chaque prestataire et ne sont pas incluses dans votre mensualité.
        </Text>
      </View>
    </Page>
  );
};

/** Détecte si une ligne prestataire correspond à interfone (par nom). */
export const isInterfoneProvider = (name?: string): boolean =>
  !!name && name.toLowerCase().includes('interfone');
