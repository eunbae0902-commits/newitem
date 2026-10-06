import SwiftUI
import SwiftData

struct RecordsView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case calendar = "캘린더"
        case list = "목록"
        var id: String { rawValue }
    }

    @Environment(AppRouter.self) private var router
    @Query(sort: \DiaryEntry.day, order: .reverse) private var entries: [DiaryEntry]

    @State private var mode: Mode = .calendar
    @State private var month = Date().startOfMonth
    @State private var selectedDay = Date().startOfDay

    private var entriesByDay: [Date: DiaryEntry] {
        Dictionary(entries.map { ($0.day.startOfDay, $0) }, uniquingKeysWith: { first, _ in first })
    }

    private var monthGroups: [(month: Date, items: [DiaryEntry])] {
        let grouped = Dictionary(grouping: entries) { $0.day.startOfMonth }
        return grouped.keys.sorted(by: >).map { ($0, grouped[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Picker("보기", selection: $mode) {
                        ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    switch mode {
                    case .calendar: calendarContent
                    case .list: listContent
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .background(Theme.background)
            .navigationTitle("기록")
            .navigationDestination(for: DiaryEntry.self) { EntryDetailView(entry: $0) }
        }
    }

    @ViewBuilder
    private var calendarContent: some View {
        MonthCalendarView(month: $month, selectedDay: $selectedDay, entriesByDay: entriesByDay)

        VStack(alignment: .leading, spacing: 10) {
            Text(selectedDay.dayTitle)
                .sectionTitle()

            if let entry = entriesByDay[selectedDay] {
                NavigationLink(value: entry) {
                    EntryCard(entry: entry, showsDate: false)
                }
                .buttonStyle(.plain)
            } else {
                EmptyStateView(
                    title: "이날의 기록이 없어요",
                    message: "짧은 한마디도 충분해요.",
                    actionTitle: "기록하러 가기"
                ) {
                    router.write(on: selectedDay)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        let monthEntries = entries.filter { $0.day.startOfMonth == month }
        if !monthEntries.isEmpty {
            HStack(spacing: 6) {
                Image(systemName: "leaf.fill").foregroundStyle(Theme.primary)
                Text("\(month.monthTitle)에 \(monthEntries.count)일 기록했어요")
                    .font(.footnote)
                    .foregroundStyle(Theme.subInk)
            }
        }
    }

    @ViewBuilder
    private var listContent: some View {
        if entries.isEmpty {
            EmptyStateView(
                title: "아직 기록이 없어요",
                message: "오늘의 마음부터 남겨볼까요?",
                actionTitle: "오늘 기록하기"
            ) {
                router.write(on: Date())
            }
        } else {
            LazyVStack(alignment: .leading, spacing: 12, pinnedViews: []) {
                ForEach(monthGroups, id: \.month) { group in
                    Text(group.month.monthTitle)
                        .sectionTitle()
                        .padding(.top, 8)
                    ForEach(group.items) { entry in
                        NavigationLink(value: entry) {
                            EntryCard(entry: entry)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

#Preview {
    RecordsView()
        .environment(AppRouter())
        .modelContainer(PreviewData.container)
}
