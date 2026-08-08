import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Tableau de bord

/// Vue d'ensemble : combien d'articles dans chaque état, et ce qu'ils valent.
struct StockDashboardSection: View {

    let items: [StockItem]
    let repairs: [StockRepair]
    let buybackable: [BuybackableEquipment]

    /// Statuts qui immobilisent réellement du capital. Un article vendu ou mis
    /// au rebut ne compte plus.
    private static let activeStatuses: Set<String> = ["ordered", "in_stock", "reserved", "assigned", "in_repair"]

    private var activeItems: [StockItem] {
        items.filter { Self.activeStatuses.contains($0.status) }
    }

    private var activeValue: Double {
        activeItems.reduce(0) { $0 + $1.purchasePrice * Double($1.quantity) }
    }

    private var averageValue: Double {
        activeItems.isEmpty ? 0 : activeValue / Double(activeItems.count)
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                HighlightCard(
                    label: "Valeur immobilisée",
                    value: Format.currency(activeValue),
                    tint: Theme.primary
                )

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                    StatTile(
                        icon: "cube.box.fill",
                        tint: Theme.sky,
                        label: "Articles actifs",
                        value: "\(activeItems.count)"
                    )
                    StatTile(
                        icon: "eurosign.circle.fill",
                        tint: Theme.teal,
                        label: "Valeur moyenne",
                        value: Format.currency(averageValue)
                    )
                    StatTile(
                        icon: "wrench.and.screwdriver.fill",
                        tint: Theme.amber,
                        label: "En réparation",
                        value: "\(repairs.filter(\.isOpen).count)"
                    )
                    StatTile(
                        icon: "arrow.triangle.2.circlepath",
                        tint: Theme.violet,
                        label: "À racheter",
                        value: "\(buybackable.count)"
                    )
                }

                SectionHeader(title: "Répartition par statut")

                ForEach(StockVocabulary.statuses, id: \.code) { entry in
                    let matching = items.filter { $0.status == entry.code }
                    if !matching.isEmpty {
                        let value = matching.reduce(0) { $0 + $1.purchasePrice * Double($1.quantity) }
                        DistributionRow(
                            label: entry.label,
                            count: matching.count,
                            value: value,
                            share: activeValue > 0 ? value / activeValue : 0,
                            tint: entry.tint
                        )
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

/// Ligne de répartition avec sa part visuelle.
struct DistributionRow: View {
    let label: String
    let count: Int
    let value: Double
    let share: Double
    let tint: Color

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Circle().fill(tint).frame(width: 8, height: 8)
                    Text(label)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Text("\(count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(tint)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(tint.opacity(0.16)))
                    Spacer()
                    Text(Format.currency(value))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }

                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.border.opacity(0.5)).frame(height: 5)
                        Capsule()
                            .fill(tint)
                            .frame(width: max(4, proxy.size.width * min(1, share)), height: 5)
                    }
                }
                .frame(height: 5)
            }
        }
    }
}

// MARK: - Valorisation

/// Valeur du stock par catégorie et par marque, comme `StockValuationReport`.
struct StockValuationSection: View {

    let items: [StockItem]

    private static let activeStatuses: Set<String> = ["ordered", "in_stock", "reserved", "assigned", "in_repair"]

    private var activeItems: [StockItem] {
        items.filter { Self.activeStatuses.contains($0.status) }
    }

    private var total: Double {
        activeItems.reduce(0) { $0 + $1.purchasePrice * Double($1.quantity) }
    }

    private func group(by keyPath: KeyPath<StockItem, String?>, fallback: String)
        -> [(label: String, count: Int, value: Double)] {
        var buckets: [String: (count: Int, value: Double)] = [:]
        for item in activeItems {
            let key = item[keyPath: keyPath]?.trimmingCharacters(in: .whitespaces)
            let label = (key?.isEmpty == false ? key! : fallback)
            var entry = buckets[label] ?? (0, 0)
            entry.count += item.quantity
            entry.value += item.purchasePrice * Double(item.quantity)
            buckets[label] = entry
        }
        return buckets
            .map { (label: $0.key, count: $0.value.count, value: $0.value.value) }
            .sorted { $0.value > $1.value }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if activeItems.isEmpty {
                    EmptyHint(icon: "chart.pie", label: "Aucun article à valoriser")
                } else {
                    HighlightCard(
                        label: "Valeur du stock actif",
                        value: Format.currency(total),
                        tint: Theme.emerald
                    )

                    SectionHeader(title: "Par catégorie")
                    ForEach(group(by: \.category, fallback: "Sans catégorie"), id: \.label) { entry in
                        DistributionRow(
                            label: entry.label,
                            count: entry.count,
                            value: entry.value,
                            share: total > 0 ? entry.value / total : 0,
                            tint: Theme.teal
                        )
                    }

                    SectionHeader(title: "Par marque")
                    ForEach(group(by: \.brand, fallback: "Sans marque"), id: \.label) { entry in
                        DistributionRow(
                            label: entry.label,
                            count: entry.count,
                            value: entry.value,
                            share: total > 0 ? entry.value / total : 0,
                            tint: Theme.violet
                        )
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Rachetables

/// Matériel de contrats échus ou bientôt échus, pas encore repris.
struct BuybackableSection: View {

    let equipments: [BuybackableEquipment]
    let onChanged: () async -> Void

    @State private var selected: BuybackableEquipment?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if equipments.isEmpty {
                    EmptyHint(icon: "arrow.triangle.2.circlepath", label: "Aucun matériel à reprendre")
                }

                ForEach(equipments) { equipment in
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        selected = equipment
                    } label: {
                        Card {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(alignment: .top) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(equipment.title)
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                            .multilineTextAlignment(.leading)
                                            .lineLimit(2)
                                        if let serial = equipment.serialNumber, !serial.isEmpty {
                                            Text(serial)
                                                .font(.system(size: 12, design: .monospaced))
                                                .foregroundStyle(Theme.mutedForeground)
                                        }
                                    }

                                    Spacer(minLength: 8)

                                    Text(equipment.endStatus.label)
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(equipment.endStatus.tint)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(
                                            Capsule().fill(equipment.endStatus.tint.opacity(0.15))
                                        )
                                }

                                Divider().overlay(Theme.border)

                                HStack(spacing: 8) {
                                    if let client = equipment.clientName {
                                        Text(client)
                                            .font(.system(size: 12))
                                            .foregroundStyle(Theme.mutedForeground)
                                            .lineLimit(1)
                                    }

                                    Spacer(minLength: 0)

                                    if let days = equipment.daysUntilEnd {
                                        Text(days < 0
                                            ? "Échu depuis \(abs(days)) j"
                                            : "Fin dans \(days) j")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(equipment.endStatus.tint)
                                    }

                                    Text(Format.currency(equipment.purchasePrice))
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                }
                            }
                        }
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(item: $selected) { equipment in
            BuybackFromListSheet(equipment: equipment) { await onChanged() }
        }
    }
}

/// Rachat depuis la liste des rachetables : on ne dispose que de la ligne de
/// contrat, il faut donc en reconstruire l'équipement complet.
struct BuybackFromListSheet: View {

    @Environment(\.dismiss) private var dismiss

    let equipment: BuybackableEquipment
    let onDone: () async -> Void

    @State private var price = ""
    @State private var condition = "good"
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Article", value: equipment.title)
                            if let serial = equipment.serialNumber, !serial.isEmpty {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "N° de série", value: serial)
                            }
                            if let client = equipment.clientName {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "Client", value: client)
                            }
                            if let number = equipment.contractNumber {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "Contrat", value: number)
                            }
                            Divider().overlay(Theme.border)
                            DetailRow(
                                label: "Prix d'achat d'origine",
                                value: Format.currency(equipment.purchasePrice)
                            )
                            if let end = equipment.endDate {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "Fin de contrat", value: Format.date(end))
                            }
                        }
                    }

                    FormSection(title: "Prix de rachat (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $price,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "État constaté") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(StockVocabulary.conditions, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: condition == option.code,
                                    tint: Theme.teal
                                ) { condition = option.code }
                            }
                        }
                    }

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Accessoires manquants, rayures…", text: $notes)
                    }

                    PrimaryButton(
                        title: "Racheter et mettre en stock",
                        systemImage: "arrow.triangle.2.circlepath",
                        isLoading: isSaving,
                        isEnabled: Double(price.replacingOccurrences(of: ",", with: ".")) != nil
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Rachat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func save() async {
        guard let value = Double(price.replacingOccurrences(of: ",", with: ".")) else { return }
        isSaving = true
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        // On recharge la ligne complète : le rachat a besoin du titre et du
        // numéro de série exacts pour créer l'article de stock.
        let lines = await ContractService.equipment(contractId: equipment.contractId)
        guard let line = lines.first(where: { $0.id == equipment.id }) else {
            errorMessage = "Ligne de contrat introuvable."
            return
        }

        let ok = await ContractService.buyBack(
            companyId: companyId,
            contractId: equipment.contractId,
            equipment: line,
            price: value,
            condition: condition,
            notes: notes.isEmpty ? nil : notes
        )

        if ok {
            await onDone()
            dismiss()
        } else {
            errorMessage = "Le rachat n'a pas pu être enregistré."
        }
    }
}

// MARK: - Réparations

struct RepairsSection: View {

    let repairs: [StockRepair]
    let companyId: String?
    let onChanged: () async -> Void

    @State private var finishing: StockRepair?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if repairs.isEmpty {
                    EmptyHint(icon: "wrench.and.screwdriver", label: "Aucune réparation")
                }

                ForEach(repairs) { repair in
                    Card {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(repair.stockItem?.title ?? "Article")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                        .lineLimit(2)
                                    if let serial = repair.stockItem?.serialNumber, !serial.isEmpty {
                                        Text(serial)
                                            .font(.system(size: 12, design: .monospaced))
                                            .foregroundStyle(Theme.mutedForeground)
                                    }
                                }

                                Spacer(minLength: 8)

                                Text(StockVocabulary.repairStatusLabel(repair.status))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(StockVocabulary.repairStatusTint(repair.status))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(
                                        Capsule().fill(
                                            StockVocabulary.repairStatusTint(repair.status).opacity(0.15)
                                        )
                                    )
                            }

                            Text(repair.reason)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Theme.foreground)

                            if let description = repair.description, !description.isEmpty {
                                Text(description)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            Divider().overlay(Theme.border)

                            HStack {
                                Text(Format.date(repair.startedAt))
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                                Spacer()
                                if repair.repairCost > 0 {
                                    Text(Format.currency(repair.repairCost))
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.amber)
                                }
                            }

                            if repair.isOpen {
                                ActionButton(
                                    title: "Clôturer la réparation",
                                    icon: "checkmark.circle",
                                    tint: Theme.emerald
                                ) { finishing = repair }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(item: $finishing) { repair in
            FinishRepairSheet(repair: repair, companyId: companyId) { await onChanged() }
                .presentationDetents([.medium, .large])
        }
    }
}

struct FinishRepairSheet: View {

    @Environment(\.dismiss) private var dismiss

    let repair: StockRepair
    let companyId: String?
    let onDone: () async -> Void

    @State private var outcome = "completed"
    @State private var condition = "good"
    @State private var cost = ""
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Issue") {
                        HStack(spacing: 8) {
                            SelectChip(label: "Réparé", isSelected: outcome == "completed", tint: Theme.emerald) {
                                outcome = "completed"
                            }
                            SelectChip(label: "Abandonné", isSelected: outcome == "abandoned", tint: Theme.destructive) {
                                outcome = "abandoned"
                            }
                        }
                    }

                    if outcome == "completed" {
                        FormSection(title: "État après réparation") {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                                ForEach(StockVocabulary.conditions, id: \.code) { option in
                                    SelectChip(
                                        label: option.label,
                                        isSelected: condition == option.code,
                                        tint: Theme.emerald
                                    ) { condition = option.code }
                                }
                            }
                        }
                    }

                    FormSection(title: "Coût réel (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $cost,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Ce qui a été fait", text: $notes)
                    }

                    Text(outcome == "completed"
                        ? "L'article repassera en stock, et le coût rejoindra ses coûts additionnels."
                        : "L'article sera mis au rebut.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Clôturer",
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
            .navigationTitle("Clôturer la réparation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                if repair.repairCost > 0 { cost = String(format: "%.2f", repair.repairCost) }
            }
        }
    }

    private func save() async {
        guard let companyId else {
            errorMessage = "Société introuvable."
            return
        }
        isSaving = true
        defer { isSaving = false }

        let ok = await StockService.finishRepair(
            companyId: companyId,
            repair: repair,
            status: outcome,
            resultCondition: outcome == "completed" ? condition : "defective",
            cost: Double(cost.replacingOccurrences(of: ",", with: ".")),
            notes: notes.isEmpty ? nil : notes
        )

        if ok {
            await onDone()
            dismiss()
        } else {
            errorMessage = "Clôture impossible."
        }
    }
}

// MARK: - Mouvements globaux

struct MovementsSection: View {

    let movements: [GlobalMovement]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if movements.isEmpty {
                    EmptyHint(icon: "clock.arrow.circlepath", label: "Aucun mouvement")
                }

                ForEach(movements) { movement in
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 10) {
                                Image(systemName: movement.icon)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 26, height: 26)
                                    .background(Circle().fill(movement.tint))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(movement.label)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Text(movement.stockItem?.title ?? "Article")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                        .lineLimit(1)
                                }

                                Spacer(minLength: 4)

                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(Format.date(movement.createdAt))
                                        .font(.system(size: 11))
                                        .foregroundStyle(Theme.mutedForeground)
                                    if let cost = movement.cost, cost > 0 {
                                        Text(Format.currency(cost))
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                    }
                                }
                            }

                            if let notes = movement.notes, !notes.isEmpty {
                                Text(notes)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            if let serial = movement.stockItem?.serialNumber, !serial.isEmpty {
                                Text(serial)
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Ligne d'article

struct StockRow: View {
    let item: StockItem

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: StockVocabulary.statusIcon(item.status))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(StockVocabulary.statusTint(item.status))
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)

                        if let specs = item.specifications {
                            Text(specs)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        // Le numéro de série identifie l'appareil physique :
                        // il vaut mieux que le nom du modèle.
                        if let serial = item.serialNumber, !serial.isEmpty {
                            Text(serial)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 4)

                    VStack(alignment: .trailing, spacing: 5) {
                        Text(StockVocabulary.statusLabel(item.status))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(StockVocabulary.statusTint(item.status))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule().fill(StockVocabulary.statusTint(item.status).opacity(0.15))
                            )

                        if item.quantity > 1 {
                            Text("×\(item.quantity)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }

                if item.purchasePrice > 0 || item.location != nil || item.contract != nil {
                    Divider().overlay(Theme.border)

                    HStack(spacing: 10) {
                        if item.purchasePrice > 0 {
                            Text(Format.currency(item.purchasePrice))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                        }

                        if let contract = item.contract, let client = contract.clientName {
                            Label(client, systemImage: "person.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.violet)
                                .lineLimit(1)
                        } else if let location = item.location, !location.isEmpty {
                            Label(location, systemImage: "mappin")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                                .lineLimit(1)
                        }

                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }
}
