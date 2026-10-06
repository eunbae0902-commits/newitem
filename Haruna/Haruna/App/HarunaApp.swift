import SwiftUI
import SwiftData

@main
struct HarunaApp: App {
    @State private var router = AppRouter()
    @AppStorage("theme") private var theme: AppTheme = .system

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(router)
                .preferredColorScheme(theme.colorScheme)
                .fontDesign(.rounded)
                .tint(Theme.primary)
        }
        .modelContainer(for: [DiaryEntry.self, DiaryPhoto.self])
    }
}
