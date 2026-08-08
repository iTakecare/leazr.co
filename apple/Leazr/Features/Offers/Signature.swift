import Foundation
import Observation
import SwiftUI
import Supabase
import UIKit

// MARK: - Zone de signature

/// Zone de tracé au doigt ou à l'Apple Pencil.
///
/// C'est le seul endroit où l'app native fait mieux que le web : le client
/// signe directement sur l'iPad, en face à face, sans passer par un lien.
struct SignaturePad: View {

    @Binding var strokes: [[CGPoint]]
    @State private var current: [CGPoint] = []

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .fill(Color.white)

            // Ligne de signature, comme sur un bon de commande papier.
            VStack {
                Spacer()
                Rectangle()
                    .fill(Color.black.opacity(0.16))
                    .frame(height: 1)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 34)
            }

            if strokes.isEmpty && current.isEmpty {
                Text("Signez ici")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.black.opacity(0.25))
            }

            Canvas { context, _ in
                for stroke in strokes + [current] {
                    context.stroke(
                        path(for: stroke),
                        with: .color(.black),
                        style: StrokeStyle(lineWidth: 2.6, lineCap: .round, lineJoin: .round)
                    )
                }
            }
            .padding(2)
        }
        .frame(height: 210)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .strokeBorder(Theme.border, lineWidth: 1)
        )
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    current.append(value.location)
                }
                .onEnded { _ in
                    if current.count > 1 { strokes.append(current) }
                    current = []
                }
        )
    }

    /// Courbe lissée : relier les points au segment droit donnerait un tracé
    /// anguleux qui ne ressemble pas à une signature.
    private func path(for points: [CGPoint]) -> Path {
        var path = Path()
        guard let first = points.first else { return path }

        if points.count == 1 {
            path.addEllipse(in: CGRect(x: first.x - 1.3, y: first.y - 1.3, width: 2.6, height: 2.6))
            return path
        }

        path.move(to: first)
        for index in 1..<points.count {
            let previous = points[index - 1]
            let point = points[index]
            let middle = CGPoint(x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2)
            path.addQuadCurve(to: middle, control: previous)
        }
        path.addLine(to: points[points.count - 1])
        return path
    }
}

/// Rendu d'un tracé en PNG encodé en base64, au format attendu par la base :
/// une URL de données, comme celle produite par le pad web.
@MainActor
enum SignatureRenderer {

    static func dataURL(strokes: [[CGPoint]], size: CGSize) -> String? {
        guard !strokes.isEmpty, size.width > 0, size.height > 0 else { return nil }

        let format = UIGraphicsImageRendererFormat()
        format.scale = 2
        format.opaque = false

        let image = UIGraphicsImageRenderer(size: size, format: format).image { context in
            let cg = context.cgContext
            cg.setStrokeColor(UIColor.black.cgColor)
            cg.setLineWidth(2.6)
            cg.setLineCap(.round)
            cg.setLineJoin(.round)

            for stroke in strokes where stroke.count > 1 {
                cg.move(to: stroke[0])
                for point in stroke.dropFirst() { cg.addLine(to: point) }
                cg.strokePath()
            }
        }

        guard let png = image.pngData() else { return nil }
        return "data:image/png;base64,\(png.base64EncodedString())"
    }
}

// MARK: - Service

@MainActor
@Observable
final class SignatureStore {

    private(set) var isWorking = false
    var errorMessage: String?

    /// Lien de signature client, identique à `generateSignatureLink` du web :
    /// un lien différent ouvrirait une page inexistante.
    static func link(offerId: String) -> URL? {
        URL(string: "https://app.leazr.co/client/offer/\(offerId)/sign")
    }

    /// Enregistre la signature comme le fait `saveOfferSignature` pour un
    /// utilisateur authentifié : statut, empreinte, horodatage, puis trace.
    ///
    /// L'adresse IP vient de l'edge function `get-client-ip` et non du client :
    /// une IP annoncée par l'appareil ne prouverait rien.
    func sign(
        offerId: String,
        signatureDataURL: String,
        signerName: String,
        previousStatus: String
    ) async -> Bool {
        guard signatureDataURL.hasPrefix("data:image/") else {
            errorMessage = "Signature invalide."
            return false
        }

        isWorking = true
        defer { isWorking = false }

        let ip = await clientIP()
        let now = ISO8601DateFormatter.leazrTimestamp.string(from: Date())

        var update: [String: AnyJSON] = [
            "workflow_status": .string("approved"),
            "signature_data": .string(signatureDataURL),
            "signer_name": .string(signerName),
            "signed_at": .string(now),
        ]
        update["signer_ip"] = ip.map(AnyJSON.string) ?? .null

        do {
            try await Backend.client
                .from("offers")
                .update(update)
                .eq("id", value: offerId)
                .execute()

            // Le log ne doit pas faire échouer une signature déjà enregistrée.
            _ = try? await Backend.client
                .from("offer_workflow_logs")
                .insert([
                    "offer_id": AnyJSON.string(offerId),
                    "user_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "previous_status": .string(previousStatus.isEmpty ? "sent" : previousStatus),
                    "new_status": .string("approved"),
                    "reason": .string(
                        "Offre signée électroniquement par \(signerName)"
                            + (ip.map { " depuis l'adresse IP \($0)" } ?? "")
                            + " — signature recueillie dans l'application iOS"
                    ),
                ])
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            errorMessage = nil
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Enregistrement de la signature impossible."
            return false
        }
    }

    private func clientIP() async -> String? {
        struct Response: Decodable { let ip: String }
        let response: Response? = try? await Backend.client.functions
            .invoke("get-client-ip", options: FunctionInvokeOptions(method: .get))
        guard let ip = response?.ip, ip != "unknown", !ip.isEmpty else { return nil }
        return ip
    }
}

extension ISO8601DateFormatter {
    /// Horodatage à la milliseconde : c'est ce que le web enregistre, et c'est
    /// ce qui donne sa valeur probante à la signature.
    static let leazrTimestamp: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()
}

// MARK: - Feuille de signature

/// Recueil d'une signature en présence du client : nom, mention manuscrite de
/// bon pour accord, puis tracé.
struct SignatureSheet: View {

    @Environment(\.dismiss) private var dismiss

    let offer: Offer
    let onSigned: () async -> Void

    @State private var store = SignatureStore()
    @State private var signerName = ""
    @State private var confirmation = ""
    @State private var strokes: [[CGPoint]] = []
    @State private var padSize: CGSize = .zero

    /// Mention exacte du web : « Bon pour accord pour X€ hors TVA par mois
    /// pendant 36 mois ». Elle engage le client, elle doit être recopiée.
    private var expectedConfirmation: String {
        "Bon pour accord pour \(Self.plainAmount(offer.monthlyPayment))€ hors TVA par mois pendant 36 mois"
    }

    private static func plainAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 3
        return formatter.string(from: NSNumber(value: value)) ?? String(value)
    }

    private func normalized(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "\u{202F}", with: " ")
            .replacingOccurrences(of: "\u{00A0}", with: " ")
    }

    private var isConfirmationValid: Bool {
        normalized(confirmation) == normalized(expectedConfirmation)
    }

    private var canSign: Bool {
        !signerName.trimmingCharacters(in: .whitespaces).isEmpty
            && isConfirmationValid
            && !strokes.isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let error = store.errorMessage {
                        ErrorBanner(message: error)
                    }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Client", value: offer.clientName)
                            Divider().overlay(Theme.border)
                            DetailRow(
                                label: "Mensualité",
                                value: Format.currency(offer.monthlyPayment),
                                emphasis: true
                            )
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Montant financé", value: Format.currency(offer.amount))
                        }
                    }

                    FormSection(title: "Nom complet du signataire") {
                        LeazrField(
                            icon: "person.text.rectangle",
                            placeholder: "Prénom et nom",
                            text: $signerName,
                            textContentType: .name,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Mention de bon pour accord") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(expectedConfirmation)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(Theme.primary.opacity(0.09))
                                )
                                .textSelection(.enabled)

                            LeazrTextArea(
                                placeholder: "Recopiez la mention ci-dessus",
                                text: $confirmation
                            )

                            HStack(spacing: 6) {
                                Image(systemName: isConfirmationValid
                                    ? "checkmark.circle.fill"
                                    : "info.circle")
                                    .font(.system(size: 12))
                                Text(isConfirmationValid
                                    ? "Mention conforme"
                                    : "La mention doit être recopiée à l'identique.")
                                    .font(.system(size: 12))
                            }
                            .foregroundStyle(isConfirmationValid ? Theme.emerald : Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Signature") {
                        VStack(spacing: 10) {
                            SignaturePad(strokes: $strokes)
                                .background(
                                    GeometryReader { proxy in
                                        Color.clear.onAppear { padSize = proxy.size }
                                    }
                                )

                            if !strokes.isEmpty {
                                TertiaryButton(title: "Effacer", systemImage: "eraser") {
                                    strokes = []
                                }
                            }
                        }
                    }

                    Text("En signant, le client accepte l'offre. La date, l'heure et l'adresse IP sont enregistrées et figureront sur le certificat de signature.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Signer l'offre",
                        systemImage: "signature",
                        isLoading: store.isWorking,
                        isEnabled: canSign
                    ) {
                        Task { await submit() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Signer l'offre")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear { if signerName.isEmpty { signerName = offer.clientName } }
        }
    }

    private func submit() async {
        guard let dataURL = SignatureRenderer.dataURL(strokes: strokes, size: padSize) else {
            store.errorMessage = "Le tracé n'a pas pu être enregistré."
            return
        }

        let ok = await store.sign(
            offerId: offer.id,
            signatureDataURL: dataURL,
            signerName: signerName.trimmingCharacters(in: .whitespaces),
            previousStatus: offer.currentStep
        )

        if ok {
            await onSigned()
            dismiss()
        }
    }
}

// MARK: - Signature existante

/// Preuve de signature : image, signataire, horodatage et adresse IP.
struct SignatureCard: View {
    let signature: OfferSignature

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.emerald)
                    Text("Offre signée")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                }

                if let image = signature.image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 130)
                        .frame(maxWidth: .infinity)
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Color.white)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(Theme.border, lineWidth: 1)
                        )
                }

                VStack(spacing: 0) {
                    DetailRow(label: "Signataire", value: signature.signerName ?? "Non renseigné")
                    if let signedAt = signature.signedAt {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Date", value: Format.dateTime(signedAt))
                    }
                    if let ip = signature.signerIP, !ip.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Adresse IP", value: ip)
                    }
                }
            }
        }
    }
}

/// Traces de signature portées par l'offre.
struct OfferSignature: Decodable, Sendable {
    let signatureData: String?
    let signerName: String?
    let signerIP: String?
    let signedAt: Date?
    let clientEmail: String?
    let equipmentDescription: String?

    enum CodingKeys: String, CodingKey {
        case signatureData = "signature_data"
        case signerName = "signer_name"
        case signerIP = "signer_ip"
        case signedAt = "signed_at"
        case clientEmail = "client_email"
        case equipmentDescription = "equipment_description"
    }

    static let columns = "signature_data, signer_name, signer_ip, signed_at, client_email, equipment_description"

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        signatureData = try c.decodeIfPresent(String.self, forKey: .signatureData)
        signerName = try c.decodeIfPresent(String.self, forKey: .signerName)
        signerIP = try c.decodeIfPresent(String.self, forKey: .signerIP)
        clientEmail = try c.decodeIfPresent(String.self, forKey: .clientEmail)
        equipmentDescription = try c.decodeIfPresent(String.self, forKey: .equipmentDescription)
        if let raw = try c.decodeIfPresent(String.self, forKey: .signedAt) {
            signedAt = Format.parseDate(raw)
        } else {
            signedAt = nil
        }
    }

    var isSigned: Bool { signedAt != nil || (signatureData?.isEmpty == false) }

    /// Décode l'URL de données stockée en base.
    var image: UIImage? {
        guard let signatureData,
              let comma = signatureData.firstIndex(of: ","),
              let data = Data(base64Encoded: String(signatureData[signatureData.index(after: comma)...]))
        else { return nil }
        return UIImage(data: data)
    }
}
