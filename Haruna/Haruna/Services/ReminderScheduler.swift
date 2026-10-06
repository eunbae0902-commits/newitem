import UserNotifications

enum ReminderScheduler {
    private static let identifier = "haruna.daily.reminder"

    static let messages = [
        "오늘 하루는 어떠셨나요? 짧은 한마디도 충분해요 🌱",
        "오늘도 수고했어요. 마음을 잠깐 기록해볼까요? 💚",
        "작은 기록이 더 좋은 내일을 만들어요 ✏️"
    ]

    /// 권한을 요청하고 매일 알림을 예약합니다. 권한이 없으면 false.
    static func enable(minutesOfDay: Int) async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        guard granted else { return false }
        schedule(minutesOfDay: minutesOfDay)
        return true
    }

    static func schedule(minutesOfDay: Int) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [identifier])

        let content = UNMutableNotificationContent()
        content.title = "하루나"
        content.body = messages.randomElement() ?? messages[0]
        content.sound = .default

        var components = DateComponents()
        components.hour = minutesOfDay / 60
        components.minute = minutesOfDay % 60
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger))
    }

    static func cancel() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    }
}
