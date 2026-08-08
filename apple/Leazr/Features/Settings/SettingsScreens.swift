import Foundation
import SwiftUI
import Supabase

// MARK: - Utilisateurs

/// Équipe de la société avec les rôles. La création d'un compte reste au web :
/// elle passe par un mot de passe, qui n'a rien à faire sur cet écran.
struct TeamScreen: View {

    @Bindable var store: SettingsStore

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.team.isEmpty {
                    EmptyHint(icon: "person.2", label: "Aucun utilisateur")
                }

                ForEach(store.team, id: \.id) { member in
                    Card {
                        HStack(spacing: 12) {
                            if let url = member.avatarURL.flatMap(URL.init) {
                                AsyncImage(url: url) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Color.clear
                                }
                                .frame(width: 42, height: 42)
                                .clipShape(Circle())
                            } else {
                                Text(member.initials)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(SettingsService.roleTint(member.role))
                                    .frame(width: 42, height: 42)
                                    .background(
                                        Circle().fill(SettingsService.roleTint(member.role).opacity(0.15))
                                    )
                            }

                            VStack(alignment: .leading, spacing: 3) {
                                Text(member.fullName)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                if let email = member.email {
                                    Text(email)
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                        .lineLimit(1)
                                }
                                if let phone = member.phone, !phone.isEmpty {
                                    Text(phone)
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            Spacer(minLength: 4)

                            Text(SettingsService.roleLabel(member.role))
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(SettingsService.roleTint(member.role))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule().fill(SettingsService.roleTint(member.role).opacity(0.15))
                                )
                        }
                    }
                }

                Text("Créer un compte ou changer un rôle se fait depuis le web : ces opérations manipulent des identifiants.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Utilisateurs")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Bailleurs

struct LeasersScreen: View {

    @Bindable var store: SettingsStore

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.leasers.isEmpty {
                    EmptyHint(icon: "building.columns", label: "Aucun bailleur")
                }

                ForEach(store.leasers) { leaser in
                    NavigationLink {
                        LeaserDetailScreen(leaser: leaser) { await store.load() }
                    } label: {
                        Card {
                            HStack(spacing: 12) {
                                AsyncImage(url: leaser.logoURL.flatMap(URL.init)) { image in
                                    image.resizable().scaledToFit()
                                } placeholder: {
                                    Image(systemName: "building.columns.fill")
                                        .font(.system(size: 17))
                                        .foregroundStyle(Theme.violet)
                                }
                                .frame(width: 42, height: 42)

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(leaser.name)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    HStack(spacing: 6) {
                                        if leaser.isOwnCompany {
                                            Tag(label: "Auto-leasing", tint: Theme.emerald)
                                        }
                                        if leaser.useDurationCoefficients {
                                            Tag(label: "Coef. par durée", tint: Theme.sky)
                                        }
                                    }
                                }

                                Spacer(minLength: 4)

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Bailleurs")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LeaserDetailScreen: View {

    let leaser: SettingsService.Leaser
    let onChanged: () async -> Void

    @State private var ranges: [SettingsService.LeaserRangeDetail] = []
    @State private var isEditing = false

    /// Les tranches sont groupées par durée : c'est ainsi qu'on les lit quand
    /// le bailleur applique un coefficient différent selon la durée.
    private var byDuration: [(duration: Int, ranges: [SettingsService.LeaserRangeDetail])] {
        Dictionary(grouping: ranges, by: \.durationMonths)
            .map { (duration: $0.key, ranges: $0.value.sorted { $0.min < $1.min }) }
            .sorted { $0.duration < $1.duration }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Nom", value: leaser.name)
                        if let company = leaser.companyName, !company.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Raison sociale", value: company)
                        }
                        if let email = leaser.email, !email.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "E-mail", value: email)
                        }
                        if let phone = leaser.phone, !phone.isEmpty {
                            Divider().overlay(Theme.border)
                            PhoneRow(phone: phone)
                        }
                        if let vat = leaser.vatNumber, !vat.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "N° de TVA", value: vat)
                        }
                    }
                }

                Card {
                    VStack(spacing: 0) {
                        DetailRow(
                            label: "Valeur résiduelle",
                            value: String(format: "%.1f %%", leaser.residualValue)
                        )
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Démarrage du contrat", value: leaser.startRuleLabel)
                        if let frequency = leaser.billingFrequency {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Facturation", value: frequencyLabel(frequency))
                        }
                        if !leaser.availableDurations.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(
                                label: "Durées proposées",
                                value: leaser.availableDurations.map { "\($0)" }.joined(separator: ", ") + " mois"
                            )
                        }
                    }
                }

                ActionRow(
                    icon: "square.and.pencil",
                    tint: Theme.primary,
                    title: "Modifier le bailleur",
                    subtitle: "Coordonnées, valeur résiduelle, démarrage"
                ) { isEditing = true }

                SectionHeader(title: "Coefficients", count: ranges.count)

                if ranges.isEmpty {
                    EmptyHint(icon: "function", label: "Aucune tranche définie")
                }

                ForEach(byDuration, id: \.duration) { group in
                    Card {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("\(group.duration) mois")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Theme.primary)

                            VStack(spacing: 0) {
                                ForEach(Array(group.ranges.enumerated()), id: \.element.id) { index, range in
                                    if index > 0 { Divider().overlay(Theme.border) }
                                    DetailRow(
                                        label: "\(Format.currency(range.min)) – \(Format.currency(range.max))",
                                        value: String(format: "%.3f", range.coefficient)
                                    )
                                }
                            }
                        }
                    }
                }

                Text("Les tranches de coefficients se modifient depuis le web : c'est une grille, elle demande une vue d'ensemble.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(leaser.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isEditing) {
            LeaserFormSheet(leaser: leaser) { await onChanged() }
        }
        .task { ranges = await SettingsService.ranges(leaserId: leaser.id) }
    }

    private func frequencyLabel(_ code: String) -> String {
        switch code {
        case "monthly":     return "Mensuelle"
        case "quarterly":   return "Trimestrielle"
        case "semi-annual": return "Semestrielle"
        case "annual":      return "Annuelle"
        default:            return code.capitalized
        }
    }
}

struct LeaserFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let leaser: SettingsService.Leaser
    let onSaved: () async -> Void

    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var residual = ""
    @State private var rule: ContractStartRule = .nextMonthFirst
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Nom") {
                        LeazrField(
                            icon: "building.columns",
                            placeholder: "Nom du bailleur",
                            text: $name,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Contact") {
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
                                placeholder: "Téléphone",
                                text: $phone,
                                textContentType: .telephoneNumber,
                                keyboardType: .phonePad
                            )
                        }
                    }

                    FormSection(title: "Valeur résiduelle (%)") {
                        LeazrField(
                            icon: "percent",
                            placeholder: "0",
                            text: $residual,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Démarrage du contrat") {
                        VStack(spacing: 8) {
                            ForEach(ContractStartRule.allCases) { option in
                                MotifChoiceRow(label: option.label, isSelected: rule == option) {
                                    rule = option
                                }
                            }
                        }
                    }

                    Text("Cette règle déduit la date de début du contrat de sa date de livraison.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Modifier le bailleur")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                name = leaser.name
                email = leaser.email ?? ""
                phone = leaser.phone ?? ""
                residual = String(format: "%.1f", leaser.residualValue)
                rule = leaser.contractStartRule.flatMap(ContractStartRule.init) ?? .nextMonthFirst
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await SettingsService.updateLeaser(
            id: leaser.id,
            name: name,
            email: email,
            phone: phone,
            residualValue: Double(residual.replacingOccurrences(of: ",", with: ".")) ?? 0,
            startRule: rule
        )

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Commissions

struct CommissionsScreen: View {

    @Bindable var store: SettingsStore

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if store.levels.isEmpty {
                    EmptyHint(icon: "percent", label: "Aucun barème")
                }

                ForEach(store.levels) { level in
                    Card {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(level.name)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Text("\(level.typeLabel) · \(level.modeLabel)")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                                Spacer()
                                if level.isDefault {
                                    Tag(label: "Par défaut", tint: Theme.primary)
                                }
                            }

                            if level.calculationMode == "fixed", let rate = level.fixedRate {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "Taux fixe", value: String(format: "%.2f %%", rate))
                            } else {
                                let rates = store.rates(for: level)
                                if rates.isEmpty {
                                    Text("Aucune tranche définie.")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                } else {
                                    Divider().overlay(Theme.border)
                                    VStack(spacing: 0) {
                                        ForEach(Array(rates.enumerated()), id: \.element.id) { index, rate in
                                            if index > 0 { Divider().overlay(Theme.border) }
                                            DetailRow(
                                                label: "\(Format.currency(rate.minAmount)) – \(Format.currency(rate.maxAmount))",
                                                value: String(format: "%.2f %%", rate.rate)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Text("Les barèmes se modifient depuis le web : chaque tranche dépend des autres, la vue d'ensemble est nécessaire.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Commissions")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Image de marque

struct BrandingScreen: View {

    @Bindable var store: SettingsStore
    @State private var isEditing = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let logo = store.customization?.logoURL.flatMap(URL.init) {
                    AsyncImage(url: logo) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        ProgressView().controlSize(.small)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 90)
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                            .fill(Color.white)
                    )
                }

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Nom commercial", value: store.customization?.companyName ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Adresse", value: store.customization?.companyAddress ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Ville",
                            value: [store.customization?.companyPostalCode, store.customization?.companyCity]
                                .compactMap { $0 }.joined(separator: " ").ifBlank("—")
                        )
                        Divider().overlay(Theme.border)
                        DetailRow(label: "E-mail", value: store.customization?.companyEmail ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Téléphone", value: store.customization?.companyPhone ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de TVA", value: store.customization?.companyVatNumber ?? "—")
                    }
                }

                // Ces coordonnées sont celles qui figurent en tête de chaque
                // PDF d'offre : les voir juste, c'est voir le document juste.
                Text("Ces coordonnées apparaissent sur les offres et les contrats envoyés aux clients.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Couleurs")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)

                        HStack(spacing: 14) {
                            colorSwatch("Principale", store.customization?.primaryColor)
                            colorSwatch("Secondaire", store.customization?.secondaryColor)
                            colorSwatch("Accent", store.customization?.accentColor)
                        }
                    }
                }

                ActionRow(
                    icon: "square.and.pencil",
                    tint: Theme.primary,
                    title: "Modifier les coordonnées",
                    subtitle: "Nom, adresse, contact, TVA"
                ) { isEditing = true }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Image de marque")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isEditing) {
            BrandingFormSheet(store: store) { await store.load() }
        }
    }

    private func colorSwatch(_ label: String, _ hex: String?) -> some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(hex: hex) ?? Theme.border)
                .frame(width: 52, height: 40)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .strokeBorder(Theme.border, lineWidth: 1)
                )
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(Theme.mutedForeground)
            Text(hex ?? "—")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(Theme.mutedForeground)
        }
    }
}

extension String {
    /// Remplace une chaîne vide ou blanche par un repli.
    func ifBlank(_ fallback: String) -> String {
        trimmingCharacters(in: .whitespaces).isEmpty ? fallback : self
    }
}

struct BrandingFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    @Bindable var store: SettingsStore
    let onSaved: () async -> Void

    @State private var name = ""
    @State private var address = ""
    @State private var postalCode = ""
    @State private var city = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var vatNumber = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Nom commercial") {
                        LeazrField(
                            icon: "building.2",
                            placeholder: "Nom affiché aux clients",
                            text: $name,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Adresse") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "mappin.and.ellipse",
                                placeholder: "Rue et numéro",
                                text: $address,
                                autocapitalization: .words
                            )
                            HStack(spacing: 10) {
                                LeazrField(
                                    icon: "number.square",
                                    placeholder: "Code postal",
                                    text: $postalCode,
                                    keyboardType: .numbersAndPunctuation
                                )
                                .frame(maxWidth: 150)
                                LeazrField(
                                    icon: "building",
                                    placeholder: "Ville",
                                    text: $city,
                                    autocapitalization: .words
                                )
                            }
                        }
                    }

                    FormSection(title: "Contact") {
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
                                placeholder: "Téléphone",
                                text: $phone,
                                textContentType: .telephoneNumber,
                                keyboardType: .phonePad
                            )
                            LeazrField(
                                icon: "number",
                                placeholder: "N° de TVA",
                                text: $vatNumber,
                                autocapitalization: .characters
                            )
                        }
                    }

                    Text("Le logo et les couleurs se règlent depuis le web : ils demandent un aperçu à l'échelle.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Coordonnées")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                let c = store.customization
                name = c?.companyName ?? ""
                address = c?.companyAddress ?? ""
                postalCode = c?.companyPostalCode ?? ""
                city = c?.companyCity ?? ""
                email = c?.companyEmail ?? ""
                phone = c?.companyPhone ?? ""
                vatNumber = c?.companyVatNumber ?? ""
            }
        }
    }

    private func save() async {
        guard let companyId = store.companyId else {
            errorMessage = "Société introuvable."
            return
        }
        isSaving = true
        defer { isSaving = false }

        func text(_ value: String) -> AnyJSON {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? .null : .string(trimmed)
        }

        let ok = await SettingsService.updateCustomization(companyId: companyId, [
            "company_name": text(name),
            "company_address": text(address),
            "company_postal_code": text(postalCode),
            "company_city": text(city),
            "company_email": text(email),
            "company_phone": text(phone),
            "company_vat_number": text(vatNumber),
        ])

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}
