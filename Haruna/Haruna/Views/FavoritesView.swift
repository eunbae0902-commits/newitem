import SwiftUI
import SwiftData

struct FavoritesView: View {
    enum Filter: String, CaseIterable, Identifiable {
        case all = "전체"
        case favorites = "★ 즐겨찾기"
        var id: String { rawValue }
    }

    @Environment(\.modelContext) private var context
    @Query(sort: \DiaryEntry.day, order: .reverse) private var entries: [DiaryEntry]
    @State private var filter: Filter = .favorites

    private var shown: [DiaryEntry] {
        filter == .all ? entries : entries.filter(\.isFavorite)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Picker("보기", selection: $filter) {
                        ForEach(Filter.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if shown.isEmpty {
                        EmptyStateView(
                            title: filter == .favorites ? "아직 소중한 기록이 없어요" : "아직 기록이 없어요",
                            message: filter == .favorites
                                ? "기록 화면에서 ☆를 누르면\n여기에 모아둘 수 있어요."
                                : "오늘의 마음부터 남겨볼까요?"
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(shown) { entry in
                                NavigationLink(value: entry) {
                                    EntryCard(entry: entry)
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button {
                                        entry.isFavorite.toggle()
                                        try? context.save()
                                    } label: {
                                        Label(entry.isFavorite ? "즐겨찾기 해제" : "즐겨찾기",
                                              systemImage: entry.isFavorite ? "star.slash" : "star")
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
                .animation(.default, value: shown.map(\.persistentModelID))
            }
            .background(Theme.background)
            .navigationTitle("소중한 기록")
            .navigationDestination(for: DiaryEntry.self) { EntryDetailView(entry: $0) }
        }
    }
}

#Preview {
    FavoritesView()
        .modelContainer(PreviewData.container)
}
