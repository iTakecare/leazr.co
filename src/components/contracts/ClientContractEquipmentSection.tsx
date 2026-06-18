import React from "react";
import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ContractEquipment } from "@/services/contractService";
import { ClientCard, StatusBadge, clientColors, equipChipStyle } from "@/components/client/clientUi";

interface ClientContractEquipmentSectionProps {
  equipment: ContractEquipment[];
}

const ClientContractEquipmentSection: React.FC<ClientContractEquipmentSectionProps> = ({
  equipment
}) => {
  const getSerialNumbers = (item: ContractEquipment): string[] => {
    if (!item.serial_number) return Array(item.quantity).fill('');
    try {
      const parsed = JSON.parse(item.serial_number);
      if (Array.isArray(parsed)) {
        const result = [...parsed];
        while (result.length < item.quantity) {
          result.push('');
        }
        return result.slice(0, item.quantity);
      }
    } catch {
      const result = Array(item.quantity).fill('');
      result[0] = item.serial_number;
      return result;
    }
    return Array(item.quantity).fill('');
  };

  const SectionTitle = (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EAF0FF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Package size={17} color={clientColors.indigo} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: clientColors.ink }}>
        Équipements{equipment.length > 0 ? ` (${equipment.length})` : ""}
      </span>
    </div>
  );

  if (equipment.length === 0) {
    return (
      <ClientCard pad={20}>
        {SectionTitle}
        <p style={{ fontSize: 13, color: clientColors.muted, margin: 0 }}>
          Aucun équipement trouvé pour ce contrat.
        </p>
      </ClientCard>
    );
  }

  return (
    <ClientCard pad={20}>
      {SectionTitle}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {equipment.map((item) => {
          const monthly = Number(item.monthly_payment) || 0;
          return (
            <div key={item.id} style={{ border: `1px solid ${clientColors.borderSoft}`, borderRadius: 14, padding: 16, background: clientColors.surface }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: clientColors.ink, margin: 0 }}>{item.title}</h4>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontSize: 12.5, color: clientColors.muted }}>
                    <span>Quantité : <strong style={{ color: clientColors.ink }}>{item.quantity}</strong></span>
                    {monthly > 0 && (
                      <span>Mensualité : <strong style={{ color: clientColors.ink }}>{formatCurrency(monthly)}</strong></span>
                    )}
                  </div>
                </div>
                <StatusBadge status="active" label="Actif" />
              </div>

              {/* Numéros de série — masqués pour les équipements non sérialisés (câbles, écrans, accessoires...) */}
              {item.not_serializable ? (
                <div style={{ marginTop: 14 }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 9,
                    background: "#F1F5F9",
                    color: clientColors.muted,
                  }}>
                    Équipement non sérialisé
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted }}>Numéros de série</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {getSerialNumbers(item).map((serial, serialIndex) => (
                      <div key={serialIndex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: clientColors.faint, minWidth: 58 }}>
                          Unité {serialIndex + 1}
                        </span>
                        <div style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 9,
                          flex: 1,
                          ...(serial
                            ? { background: "#E7F6F0", color: "#047857" }
                            : { background: "#FFF0E6", color: "#C2540B" }),
                        }}>
                          {serial || "En attente de livraison"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributs */}
              {item.attributes && item.attributes.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted }}>Caractéristiques</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {item.attributes.map((attr, attrIndex) => (
                      <span key={attrIndex} style={equipChipStyle()}>
                        {attr.key} : {attr.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Spécifications */}
              {item.specifications && item.specifications.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: clientColors.muted }}>Spécifications techniques</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "4px 18px", marginTop: 6 }}>
                    {item.specifications.map((spec, specIndex) => (
                      <div key={specIndex} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                        <span style={{ color: clientColors.muted }}>{spec.key}</span>
                        <span style={{ fontWeight: 600, color: clientColors.ink, textAlign: "right" }}>{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ClientCard>
  );
};

export default ClientContractEquipmentSection;
