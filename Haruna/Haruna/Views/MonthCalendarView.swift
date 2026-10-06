import SwiftUI

struct MonthCalendarView: View {
    @Binding var month: Date
    @Binding var selectedDay: Date
    let entriesByDay: [Date: DiaryEntry]

    private let weekdays = ["일", "월", "화", "수", "목", "금", "토"]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

    init(month: Binding<Date>, selectedDay: Binding<Date>, entriesByDay: [Date: DiaryEntry]) {
        _month = month
        _selectedDay = selectedDay
        self.entriesByDay = entriesByDay
    }

    private var canGoForward: Bool { month.startOfMonth < Date().startOfMonth }

    /// 첫 주 앞쪽 빈칸은 nil
    private var days: [Date?] {
        let calendar = Calendar.haruna
        let first = month.startOfMonth
        let leading = calendar.component(.weekday, from: first) - calendar.firstWeekday
        let count = calendar.range(of: .day, in: .month, for: first)?.count ?? 30
        let blanks: [Date?] = Array(repeating: nil, count: (leading + 7) % 7)
        return blanks + (0..<count).map { first.adding(days: $0) }
    }

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                Button { shift(-1) } label: {
                    Image(systemName: "chevron.left").frame(width: 36, height: 36)
                }
                .accessibilityLabel("이전 달")
                Spacer()
                Text(month.monthTitle)
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                    .contentTransition(.numericText())
                Spacer()
                Button { shift(1) } label: {
                    Image(systemName: "chevron.right").frame(width: 36, height: 36)
                }
                .disabled(!canGoForward)
                .accessibilityLabel("다음 달")
            }
            .foregroundStyle(Theme.ink)

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .foregroundStyle(day == "일" ? Color(hex: 0xD97A6C) : Theme.subInk)
                        .frame(maxWidth: .infinity)
                }

                ForEach(Array(days.enumerated()), id: \.offset) { _, day in
                    if let day {
                        dayCell(day)
                    } else {
                        Color.clear.frame(height: 54)
                    }
                }
            }
        }
        .cardStyle()
        .gesture(
            DragGesture(minimumDistance: 30)
                .onEnded { value in
                    if value.translation.width < -50 && canGoForward { shift(1) }
                    if value.translation.width > 50 { shift(-1) }
                }
        )
    }

    private func dayCell(_ day: Date) -> some View {
        let entry = entriesByDay[day.startOfDay]
        let isSelected = day.isSameDay(as: selectedDay)
        let isFuture = day.isFutureDay

        return Button {
            selectedDay = day.startOfDay
        } label: {
            VStack(spacing: 4) {
                Text("\(Calendar.haruna.component(.day, from: day))")
                    .font(.footnote.weight(day.isToday ? .heavy : .regular))
                    .foregroundStyle(day.isToday ? Theme.primary : Theme.ink)
                if let entry {
                    MoodFace(mood: entry.mood, size: 22)
                } else {
                    Circle()
                        .fill(Theme.subInk.opacity(isFuture ? 0 : 0.3))
                        .frame(width: 4, height: 4)
                        .frame(height: 22)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(Theme.primary, lineWidth: 2)
                        .background(Theme.primarySoft.opacity(0.6), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
            .opacity(isFuture ? 0.35 : 1)
        }
        .buttonStyle(.plain)
        .disabled(isFuture)
        .accessibilityLabel("\(day.dayTitle) \(entry?.mood.label ?? "기록 없음")")
    }

    private func shift(_ value: Int) {
        withAnimation(.snappy) { month = month.adding(months: value).startOfMonth }
    }
}
