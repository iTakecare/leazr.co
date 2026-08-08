import Foundation
import SwiftUI
import UniformTypeIdentifiers

/// Vue Kanban des demandes, colonne par étape du workflow.
///
/// Sur un téléphone, des colonnes côte à côte seraient illisibles : on garde
/// le principe — une colonne par étape, avec son total — mais on les fait
/// défiler horizontalement, chacune scrollant verticalement.
struct OffersKanbanView: View {

    let offers: [Offer]
    let steps: [WorkflowStep]
    let onOpen: (Offer) -> Void

    /// Regroupement par étape résolue : un sous-statut retombe dans l'étape à
    /// laquelle il appartient, comme dans la timeline.
    private var columns: [(step: WorkflowStep, items: [Offer])] {
        guard !steps.isEmpty else { return [] }

        var buckets: [String: [Offer]] = [:]
        for offer in offers {
            guard let index = OfferStatus.stepIndex(for: offer.currentStep, in: steps),
                  index < steps.count else { continue }
            buckets[steps[index].stepKey, default: []].append(offer)
        }

        return steps.compactMap { step in
            let items = buckets[step.stepKey] ?? []
            return items.isEmpty ? nil : (step, items)
        }
    }

    var body: some View {
        if columns.isEmpty {
            EmptyHint(icon: "rectangle.split.3x1", label: "Aucune demande à afficher")
        } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(columns, id: \.step.id) { column in
                        KanbanColumn(
                            step: column.step,
                            offers: column.items,
                            onOpen: onOpen
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
    }
}

struct KanbanColumn: View {

    let step: WorkflowStep
    let offers: [Offer]
    let onOpen: (Offer) -> Void

    private var total: Double { offers.reduce(0) { $0 + $1.monthlyPayment } }

    private var tint: Color {
        OfferStatus.tint(step.stepKey)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Circle().fill(tint).frame(width: 8, height: 8)
                Text(step.stepLabel)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Theme.foreground)
                    .lineLimit(1)
                Text("\(offers.count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(tint)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(tint.opacity(0.16)))
                Spacer(minLength: 0)
            }

            if total > 0 {
                Text("\(Format.currency(total))/mois")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.mutedForeground)
            }

            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 8) {
                    ForEach(offers) { offer in
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            onOpen(offer)
                        } label: {
                            KanbanCard(offer: offer)
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
            }
        }
        .padding(12)
        .frame(width: 262)
        .frame(maxHeight: 560)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface.opacity(0.6))
        )
        .overlay(alignment: .top) {
            Rectangle().fill(tint).frame(height: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
    }
}

struct KanbanCard: View {
    let offer: Offer

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(offer.clientName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.foreground)
                .multilineTextAlignment(.leading)
                .lineLimit(2)

            if let dossier = offer.dossierNumber {
                Text(dossier)
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.mutedForeground)
            }

            HStack {
                Text(Format.currency(offer.monthlyPayment))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Theme.primary)
                Spacer()
                if let score = offer.internalScore, !score.isEmpty {
                    ScoreChip(letter: score, family: "I")
                }
            }

            // Le statut précis, qui peut être un sous-état de la colonne :
            // « Docs interne » sous « Analyse interne ».
            Text(OfferStatus.label(offer.currentStep))
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(OfferStatus.tint(offer.currentStep))
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(
                    Capsule().fill(OfferStatus.tint(offer.currentStep).opacity(0.14))
                )
        }
        .padding(11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

// MARK: - Export

/// Export des demandes filtrées au format CSV, lisible par Excel et Numbers.
///
/// Le web produit un vrai `.xlsx` grâce à une bibliothèque JavaScript. Ici le
/// CSV suffit et s'ouvre partout — l'objectif est de sortir les chiffres du
/// téléphone, pas de reproduire une mise en forme.
enum OffersExport {

    static func csv(_ offers: [Offer]) -> String {
        let headers = [
            "N° de dossier", "Client", "Type", "Statut", "Étape",
            "Montant financé", "Mensualité", "Score interne", "Score leaser",
            "Motif de refus", "Source", "Créée le",
        ]

        var rows = [headers.joined(separator: ";")]

        for offer in offers {
            let fields = [
                offer.dossierNumber ?? "",
                offer.clientName,
                offer.typeLabel,
                OfferStatus.label(offer.currentStep),
                offer.currentStep,
                number(offer.amount),
                number(offer.monthlyPayment),
                offer.internalScore ?? "",
                offer.leaserScore ?? "",
                offer.rejectionCategory.map(OfferMotif.rejectionLabel) ?? "",
                offer.source ?? "",
                offer.createdAt.map(Format.date) ?? "",
            ]
            rows.append(fields.map(escape).joined(separator: ";"))
        }

        // BOM UTF-8 : sans lui, Excel sur Windows massacre les accents.
        return "\u{FEFF}" + rows.joined(separator: "\r\n")
    }

    static func write(_ offers: [Offer]) throws -> URL {
        let name = "Demandes_\(Self.stamp()).csv"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try csv(offers).write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func escape(_ value: String) -> String {
        // Le point-virgule sépare les colonnes en français : une valeur qui en
        // contient doit être protégée, sinon les colonnes se décalent.
        guard value.contains(";") || value.contains("\"") || value.contains("\n") else {
            return value
        }
        return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
    }

    private static func number(_ value: Double) -> String {
        // Virgule décimale : c'est ce qu'attend un tableur en français.
        String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    }

    private static func stamp() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: Date())
    }
}

/// Enveloppe identifiable pour présenter un fichier exporté en feuille.
struct ExportFile: Identifiable {
    let url: URL
    var id: String { url.absoluteString }

    init(_ url: URL) { self.url = url }
}

/// Feuille de partage système pour un fichier local.
struct ShareSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

/// Destination de navigation vers un dossier, identifiée par son id.
struct OfferRoute: Identifiable, Hashable {
    let offer: Offer
    var id: String { offer.id }

    static func == (lhs: OfferRoute, rhs: OfferRoute) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
