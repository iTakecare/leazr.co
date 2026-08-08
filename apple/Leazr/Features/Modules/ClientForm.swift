import Foundation
import SwiftUI
import Supabase

/// Création et modification d'une fiche client, reprise de
/// `ClientEditDialog.tsx` et `CreateClientDialog.tsx`.
///
/// Le web compose `name` à partir du prénom et du nom ; on garde la même règle
/// pour que les deux applications produisent des fiches identiques.
struct ClientFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    var existing: Client?
    let onSaved: (Client?) async -> Void

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var company = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var vatNumber = ""
    @State private var address = ""
    @State private var postalCode = ""
    @State private var city = ""
    @State private var country = "Belgique"
    @State private var status = "active"
    @State private var notes = ""

    @State private var isWorking = false
    @State private var errorMessage: String?

    private var isEdit: Bool { existing != nil }

    private var composedName: String {
        "\(firstName.trimmingCharacters(in: .whitespaces)) \(lastName.trimmingCharacters(in: .whitespaces))"
            .trimmingCharacters(in: .whitespaces)
    }

    private static let statuses: [(code: String, label: String, tint: Color)] = [
        ("active", "Actif", Theme.emerald),
        ("lead", "Prospect", Theme.amber),
        ("inactive", "Inactif", Theme.mutedForeground),
        ("duplicate", "Doublon", Theme.destructive),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Identité") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "person",
                                placeholder: "Prénom",
                                text: $firstName,
                                textContentType: .givenName,
                                autocapitalization: .words
                            )
                            LeazrField(
                                icon: "person.fill",
                                placeholder: "Nom",
                                text: $lastName,
                                textContentType: .familyName,
                                autocapitalization: .words
                            )
                            LeazrField(
                                icon: "building.2",
                                placeholder: "Société",
                                text: $company,
                                textContentType: .organizationName,
                                autocapitalization: .words
                            )
                        }
                    }

                    FormSection(title: "Coordonnées") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "envelope",
                                placeholder: "E-mail",
                                text: $email,
                                textContentType: .emailAddress,
                                keyboardType: .emailAddress
                            )
                            LeazrField(
                                icon: "phone",
                                placeholder: "Ex. +32 2 123 45 67",
                                text: $phone,
                                textContentType: .telephoneNumber,
                                keyboardType: .phonePad
                            )
                            LeazrField(
                                icon: "number",
                                placeholder: "N° d'entreprise — ex. BE0123456789",
                                text: $vatNumber,
                                autocapitalization: .characters
                            )
                        }
                    }

                    FormSection(title: "Adresse") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "mappin.and.ellipse",
                                placeholder: "Rue et numéro",
                                text: $address,
                                textContentType: .fullStreetAddress,
                                autocapitalization: .words
                            )
                            HStack(spacing: 10) {
                                LeazrField(
                                    icon: "number.square",
                                    placeholder: "Code postal",
                                    text: $postalCode,
                                    textContentType: .postalCode,
                                    keyboardType: .numbersAndPunctuation
                                )
                                .frame(maxWidth: 150)

                                LeazrField(
                                    icon: "building",
                                    placeholder: "Ville",
                                    text: $city,
                                    textContentType: .addressCity,
                                    autocapitalization: .words
                                )
                            }
                            LeazrField(
                                icon: "globe.europe.africa",
                                placeholder: "Pays",
                                text: $country,
                                textContentType: .countryName,
                                autocapitalization: .words
                            )
                        }
                    }

                    FormSection(title: "Statut") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(Self.statuses, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: status == option.code,
                                    tint: option.tint
                                ) { status = option.code }
                            }
                        }
                    }

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Notes additionnelles…", text: $notes)
                    }

                    PrimaryButton(
                        title: isEdit ? "Enregistrer" : "Créer le client",
                        systemImage: isEdit ? "checkmark.circle.fill" : "plus.circle.fill",
                        isLoading: isWorking,
                        isEnabled: !composedName.isEmpty || !company.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(isEdit ? "Modifier le client" : "Nouveau client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear(perform: prefill)
        }
    }

    /// La base ne stocke qu'un `name` complet : on le rescinde pour l'édition,
    /// en gardant tout ce qui suit le premier mot comme nom de famille.
    private func prefill() {
        guard let existing, firstName.isEmpty, lastName.isEmpty else { return }

        let parts = existing.name.split(separator: " ", maxSplits: 1).map(String.init)
        firstName = parts.first ?? ""
        lastName = parts.count > 1 ? parts[1] : ""

        company = existing.company ?? ""
        email = existing.email ?? ""
        phone = existing.phone ?? ""
        vatNumber = existing.vatNumber ?? ""
        address = existing.address ?? ""
        postalCode = existing.postalCode ?? ""
        city = existing.city ?? ""
        country = existing.country ?? "Belgique"
        status = existing.status ?? "active"
        notes = existing.notes ?? ""
    }

    private func save() async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil

        func value(_ text: String) -> AnyJSON {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? .null : .string(trimmed)
        }

        // Une fiche purement professionnelle n'a pas de nom de personne : dans
        // ce cas la raison sociale tient lieu de nom, comme sur le web.
        let resolvedName = composedName.isEmpty
            ? company.trimmingCharacters(in: .whitespaces)
            : composedName

        var payload: [String: AnyJSON] = [
            "name": .string(resolvedName),
            "company": value(company),
            "email": value(email),
            "phone": value(phone),
            "vat_number": value(vatNumber),
            "address": value(address),
            "postal_code": value(postalCode),
            "city": value(city),
            "country": value(country),
            "status": .string(status),
            "notes": value(notes),
            "contact_name": composedName.isEmpty ? .null : .string(composedName),
        ]

        do {
            let saved: [Client]

            if let existing {
                saved = try await Backend.client
                    .from("clients")
                    .update(payload)
                    .eq("id", value: existing.id)
                    .select(Self.columns)
                    .execute()
                    .value
            } else {
                // Les politiques RLS filtrent en lecture mais n'affectent pas
                // une insertion : la société doit être désignée explicitement.
                guard let companyId = await Session.shared.resolve() else {
                    errorMessage = "Société introuvable."
                    return
                }
                payload["company_id"] = .string(companyId)
                saved = try await Backend.client
                    .from("clients")
                    .insert(payload)
                    .select(Self.columns)
                    .execute()
                    .value
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onSaved(saved.first)
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = isEdit ? "Enregistrement impossible." : "Création impossible."
        }
    }

    static let columns = """
        id, name, email, company, status, phone, contact_name, vat_number, \
        address, city, postal_code, country, notes, created_at
        """
}
