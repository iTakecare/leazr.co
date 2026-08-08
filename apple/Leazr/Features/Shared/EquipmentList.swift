import SwiftUI

/// Rend une description d'équipement, qu'elle soit du JSON structuré (cas
/// général) ou du texte libre (dossiers anciens).
struct EquipmentSection: View {
    let raw: String?

    var body: some View {
        if let items = EquipmentItem.parse(raw) {
            VStack(spacing: 12) {
                SectionHeader(title: "Équipements", count: items.count)

                ForEach(items) { item in
                    EquipmentCard(item: item)
                }

                let total = items.reduce(0) { $0 + $1.monthlyPayment * Double($1.quantity) }
                if total > 0 {
                    Card {
                        HStack {
                            Text("Total mensuel")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Text(Format.currency(total))
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(Theme.primary)
                        }
                    }
                }
            }
        } else if let raw, !raw.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Équipement")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Text(raw)
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }
}

struct EquipmentCard: View {
    let item: EquipmentItem

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "laptopcomputer")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.sky)
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)

                        // Les attributs (RAM, disque…) sont ce qui distingue
                        // deux lignes d'un même modèle : ils méritent d'être lus.
                        if !item.attributes.isEmpty {
                            Text(
                                item.attributes
                                    .sorted { $0.key < $1.key }
                                    .map { "\($0.key) : \($0.value)" }
                                    .joined(separator: " · ")
                            )
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 4)

                    if item.quantity > 1 {
                        Text("×\(item.quantity)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Theme.primary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(Theme.primary.opacity(0.14)))
                    }
                }

                Divider().overlay(Theme.border)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Prix d'achat")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        Text(Format.currency(item.purchasePrice))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Mensualité")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        Text(Format.currency(item.monthlyPayment))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Theme.primary)
                    }
                }
            }
        }
    }
}
