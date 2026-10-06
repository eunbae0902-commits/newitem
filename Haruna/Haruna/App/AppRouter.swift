import SwiftUI
import Observation

enum AppTab: Hashable {
    case today, records, stats, favorites
}

/// 탭 간 이동과 "오늘" 탭에서 편집 중인 날짜를 공유합니다.
@Observable
final class AppRouter {
    var selectedTab: AppTab = .today
    var todayDate: Date = Date().startOfDay

    func write(on day: Date) {
        todayDate = day.startOfDay
        selectedTab = .today
    }
}

enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "시스템 설정"
        case .light: "라이트 모드"
        case .dark: "다크 모드"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
