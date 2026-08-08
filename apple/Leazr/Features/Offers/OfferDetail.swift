import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class OfferDetailStore {
    private(set) var equipment: [OfferEquipment] = []
    private(set) var documents: [OfferDocument] = []
    private(set) var calls: [CallLog] = []
    private(set) var isWorking = false
    var errorMessage: String?

    func load(offerId: String) async {
        async let e: Void = loadEquipment(offerId)
        async let d: Void = loadDocuments(offerId)
        async let c: Void = loadCalls(offerId)
        _ = await (e, d, c)
    }

    private func loadEquipment(_ offerId: String) async {
        equipment = (try? await Backend.client
            .from("offer_equipment")
            .select("id, title, quantity, purchase_price, monthly_payment")
            .eq("offer_id", value: offerId)
            .execute().value) ?? []
    }

    private func loadDocuments(_ offerId: String) async {
        documents = (try? await Backend.client
            .from("offer_documents")
            .select("id, file_name, document_type, status, file_size, admin_notes, uploaded_at")
            .eq("offer_id", value: offerId)
            .order("uploaded_at", ascending: false)
            .execute().value) ?? []
    }

    private func loadCalls(_ offerId: String) async {
        calls = (try? await Backend.client
            .from("offer_call_logs")
            .select("id, status, notes, called_at, callback_date")
            .eq("offer_id", value: offerId)
            .order("called_at", ascending: false)
            .limit(30)
            .execute().value) ?? []
    }

    /// Valide ou refuse un document. L'app native devient ainsi un outil de
    /// traitement, pas seulement de consultation.
    func setDocumentStatus(_ document: OfferDocument, to status: String, offerId: String) async {
        isWorking = true
        defer { isWorking = false }

        do {
            try await Backend.client
                .from("offer_documents")
                .update(["status": status])
                .eq("id", value: document.id)
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await loadDocuments(offerId)
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Mise à jour impossible."
        }
    }

    var pendingDocuments: Int { documents.filter(\.isPending).count }
}

/// Détail d'une offre, organisé en sections navigables.
struct OfferDetailView: View {
    let offer: Offer

    @State private var store = OfferDetailStore()
    @State private var section: Section = .summary

    enum Section: String, CaseIterable {
        case summary = "Résumé"
        case documents = "Documents"
        case calls = "Appels"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(offer.monthlyPayment),
                    tint: Theme.primary
                )

                Picker("Section", selection: $section) {
                    ForEach(Section.allCases, id: \.self) { s in
                        if s == .documents, store.pendingDocuments > 0 {
                            Text("\(s.rawValue) (\(store.pendingDocuments))").tag(s)
                        } else {
                            Text(s.rawValue).tag(s)
                        }
                    }
                }
                .pickerStyle(.segmented)

                switch section {
                case .summary:   summarySection
                case .documents: documentsSection
                case .calls:     callsSection
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(offer.clientName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await store.load(offerId: offer.id) }
        .refreshable { await store.load(offerId: offer.id) }
    }

    // MARK: - Résumé

    private var summarySection: some View {
        VStack(spacing: 14) {
            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: offer.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Statut", value: offer.statusLabel)
                    if let dossier = offer.dossierNumber {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de dossier", value: dossier)
                    }
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Montant financé", value: Format.currency(offer.amount), emphasis: true)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Créée le", value: Format.date(offer.createdAt))
                }
            }

            if !store.equipment.isEmpty {
                SectionHeader(title: "Équipements", count: store.equipment.count)

                ForEach(store.equipment) { item in
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .top) {
                                Text(item.title)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Spacer(minLength: 8)
                                if item.quantity > 1 {
                                    Text("×\(item.quantity)")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            HStack {
                                Text("Mensualité")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                Spacer()
                                Text(Format.currency(item.monthlyPayment))
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.primary)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Documents

    private var documentsSection: some View {
        VStack(spacing: 12) {
            if store.documents.isEmpty {
                EmptyHint(icon: "doc.on.doc", label: "Aucun document")
            }

            ForEach(store.documents) { doc in
                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .top) {
                            Image(systemName: "doc.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(Theme.sky)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(doc.typeLabel)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(doc.fileName)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                    .lineLimit(1)
                                if !doc.readableSize.isEmpty {
                                    Text(doc.readableSize)
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            Spacer(minLength: 8)

                            StatusBadge(label: doc.statusLabel, status: doc.status)
                        }

                        // Les actions n'apparaissent que sur les documents en
                        // attente : rien à décider sur un dossier déjà tranché.
                        if doc.isPending {
                            Divider().overlay(Theme.border)

                            HStack(spacing: 10) {
                                ActionButton(
                                    title: "Valider",
                                    icon: "checkmark",
                                    tint: Theme.emerald
                                ) {
                                    Task { await store.setDocumentStatus(doc, to: "approved", offerId: offer.id) }
                                }

                                ActionButton(
                                    title: "Refuser",
                                    icon: "xmark",
                                    tint: Theme.destructive
                                ) {
                                    Task { await store.setDocumentStatus(doc, to: "rejected", offerId: offer.id) }
                                }
                            }
                            .disabled(store.isWorking)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Appels

    private var callsSection: some View {
        VStack(spacing: 12) {
            if store.calls.isEmpty {
                EmptyHint(icon: "phone", label: "Aucun appel enregistré")
            }

            ForEach(store.calls) { call in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.violet)
                            Text(call.statusLabel)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Spacer()
                            Text(Format.date(call.calledAt))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let notes = call.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let callback = call.callbackDate {
                            HStack(spacing: 6) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 11))
                                Text("Rappel le \(Format.date(callback))")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(Theme.amber)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Composants

/// Bouton d'action secondaire, teinté par sa fonction.
struct ActionButton: View {
    let title: String
    let icon: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 13, weight: .bold))
                Text(title).font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(tint.opacity(0.13))
            )
        }
        .buttonStyle(PressableStyle())
    }
}

struct EmptyHint: View {
    let icon: String
    let label: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Theme.mutedForeground)
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}
