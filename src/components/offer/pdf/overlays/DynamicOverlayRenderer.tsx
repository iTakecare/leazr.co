import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { DynamicOverlay } from '@/hooks/useTemplateDesigner';

interface DynamicOverlayRendererProps {
  overlay: DynamicOverlay;
  offerData?: any;
  companyName?: string;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
  },
  text: {
    width: '100%',
    height: '100%',
  },
});

export const DynamicOverlayRenderer: React.FC<DynamicOverlayRendererProps> = ({ 
  overlay, 
  offerData,
  companyName 
}) => {
  // Resolve variable content
  const resolveContent = (content: string): string => {
    if (overlay.type === 'text') return content;

    const variables: Record<string, string> = {
      '{client_name}': offerData?.client_name || 'Client',
      '{company_name}': companyName || 'Entreprise',
      '{offer_date}': offerData?.created_at 
        ? new Date(offerData.created_at).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR'),
      '{total_amount}': offerData?.total_amount 
        ? `${offerData.total_amount.toFixed(2)} €`
        : '0.00 €',
      '{monthly_payment}': offerData?.monthly_payment 
        ? `${offerData.monthly_payment.toFixed(2)} €/mois`
        : '0.00 €/mois',
    };

    return variables[content] || content;
  };

  const textStyle = {
    fontSize: overlay.style.fontSize,
    color: overlay.style.color,
    fontWeight: overlay.style.fontWeight,
    textAlign: overlay.style.align,
  };

  return (
    <View 
      style={[
        styles.overlay,
        {
          left: `${overlay.position.x}%`,
          top: `${overlay.position.y}%`,
          width: `${overlay.position.width}%`,
          height: `${overlay.position.height}%`,
        }
      ]}
    >
      <Text style={[styles.text, textStyle]}>
        {resolveContent(overlay.content)}
      </Text>
    </View>
  );
};
