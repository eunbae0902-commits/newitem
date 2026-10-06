import SwiftUI

struct RootView: View {
    @Environment(AppRouter.self) private var router
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("lockEnabled") private var lockEnabled = false
    @State private var isLocked = UserDefaults.standard.bool(forKey: "lockEnabled")

    var body: some View {
        @Bindable var router = router

        TabView(selection: $router.selectedTab) {
            Tab("오늘", systemImage: "house.fill", value: AppTab.today) {
                TodayView()
            }
            Tab("기록", systemImage: "calendar", value: AppTab.records) {
                RecordsView()
            }
            Tab("통계", systemImage: "chart.bar.fill", value: AppTab.stats) {
                StatsView()
            }
            Tab("소중한 기록", systemImage: "star.fill", value: AppTab.favorites) {
                FavoritesView()
            }
        }
        .overlay {
            if lockEnabled && isLocked {
                LockView { isLocked = false }
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: isLocked)
        .onChange(of: scenePhase) { _, phase in
            if phase == .background && lockEnabled {
                isLocked = true
            }
        }
    }
}

#Preview {
    RootView()
        .environment(AppRouter())
        .modelContainer(PreviewData.container)
}
