import Foundation

extension Calendar {
    /// 일요일 시작, 한국어 달력
    static let haruna: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "ko_KR")
        calendar.timeZone = .current
        calendar.firstWeekday = 1
        return calendar
    }()
}

private enum Formatters {
    static func make(_ format: String) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.calendar = .haruna
        formatter.dateFormat = format
        return formatter
    }

    static let day = make("M월 d일 (E)")
    static let full = make("yyyy년 M월 d일 (E)")
    static let month = make("yyyy년 M월")
    static let time = make("a h:mm")
    static let short = make("M/d")
}

extension Date {
    var startOfDay: Date { Calendar.haruna.startOfDay(for: self) }

    var startOfMonth: Date {
        Calendar.haruna.date(from: Calendar.haruna.dateComponents([.year, .month], from: self)) ?? self
    }

    func adding(days: Int) -> Date {
        Calendar.haruna.date(byAdding: .day, value: days, to: self) ?? self
    }

    func adding(months: Int) -> Date {
        Calendar.haruna.date(byAdding: .month, value: months, to: self) ?? self
    }

    func isSameDay(as other: Date) -> Bool {
        Calendar.haruna.isDate(self, inSameDayAs: other)
    }

    var isToday: Bool { Calendar.haruna.isDateInToday(self) }
    var isFutureDay: Bool { startOfDay > Date().startOfDay }

    var dayTitle: String { Formatters.day.string(from: self) }
    var fullTitle: String { Formatters.full.string(from: self) }
    var monthTitle: String { Formatters.month.string(from: self) }
    var timeTitle: String { Formatters.time.string(from: self) }
    var shortTitle: String { Formatters.short.string(from: self) }
}
