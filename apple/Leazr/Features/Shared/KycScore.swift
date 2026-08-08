import SwiftUI

/// Score KYC interne du client, repris de `clientKycScore.ts`.
///
/// La lettre est calculée côté web à la validation du KYC et stockée sur
/// `clients.kyc_score` : l'app la lit, elle ne la recalcule pas — deux
/// algorithmes divergeraient tôt ou tard.
enum KycScore {

    static func label(_ letter: String?) -> String {
        switch letter?.uppercased() {
        case "A": return "Risque très faible"
        case "B": return "Risque modéré"
        case "C": return "Vigilance requise"
        case "D": return "Risque élevé"
        default:  return "Non évalué"
        }
    }

    static func tint(_ letter: String?) -> Color {
        switch letter?.uppercased() {
        case "A": return Theme.emerald
        case "B": return Theme.sky
        case "C": return Theme.amber
        case "D": return Theme.destructive
        default:  return Theme.mutedForeground
        }
    }
}

/// Pastille compacte : la lettre et son libellé, à poser en tête d'une fiche.
struct KycScoreBadge: View {
    let letter: String?
    var showLabel = true

    var body: some View {
        if let letter, !letter.isEmpty {
            HStack(spacing: 6) {
                Text(letter.uppercased())
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Circle().fill(KycScore.tint(letter)))

                if showLabel {
                    Text("KYC \(KycScore.label(letter))")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(KycScore.tint(letter))
                }
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(Capsule().fill(KycScore.tint(letter).opacity(0.14)))
        }
    }
}

/// Carte détaillée : la lettre en grand, son libellé, ses motifs et la date de
/// calcul. Les motifs sont ce qui rend le score défendable devant un bailleur.
struct KycScoreCard: View {
    let letter: String?
    let reasons: [String]
    let computedAt: Date?

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 14) {
                    Text((letter ?? "—").uppercased())
                        .font(.system(size: 34, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 60, height: 60)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(KycScore.tint(letter))
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text("Score KYC")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.mutedForeground)
                        Text(KycScore.label(letter))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(KycScore.tint(letter))
                        if let computedAt {
                            Text("Calculé le \(Format.date(computedAt))")
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 0)
                }

                if !reasons.isEmpty {
                    Divider().overlay(Theme.border)

                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(reasons, id: \.self) { reason in
                            HStack(alignment: .top, spacing: 7) {
                                Circle()
                                    .fill(KycScore.tint(letter))
                                    .frame(width: 5, height: 5)
                                    .padding(.top, 6)
                                Text(reason)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                } else if letter?.isEmpty == false {
                    Text("Aucun motif enregistré pour ce score.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                }

                if letter?.isEmpty != false {
                    Text("Aucun KYC validé pour ce client. Lancez-le depuis le web pour fiabiliser l'analyse des dossiers.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }
}

/// Pastille de filtre avec compteur, partagée par les listes filtrables
/// (stock, contrats, factures).
struct StockChip: View {
    let label: String
    let count: Int
    let tint: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.easeOut(duration: 0.18)) { action() }
        } label: {
            HStack(spacing: 6) {
                Text(label).font(.system(size: 13, weight: .semibold))
                Text("\(count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(isSelected ? .white : tint)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule().fill(isSelected ? Color.white.opacity(0.28) : tint.opacity(0.16))
                    )
            }
            .foregroundStyle(isSelected ? .white : Theme.mutedForeground)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Capsule().fill(isSelected ? tint : Theme.surface))
        }
        .buttonStyle(PressableStyle())
    }
}
