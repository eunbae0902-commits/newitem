import SwiftUI
import SwiftData
import Charts

enum StatsPeriod: String, CaseIterable, Identifiable {
    case week = "최근 7일"
    case month = "최근 30일"
    case quarter = "최근 90일"
    case all = "전체"

    var id: String { rawValue }

    var days: Int? {
        switch self {
        case .week: 7
        case .month: 30
        case .quarter: 90
        case .all: nil
        }
    }
}

struct StatsView: View {
    @Environment(AppRouter.self) private var router
    @Query(sort: \DiaryEntry.day) private var allEntries: [DiaryEntry]
    @AppStorage("statsPeriod") private var period: StatsPeriod = .month

    private var entries: [DiaryEntry] {
        guard let days = period.days else { return allEntries }
        let start = Date().startOfDay.adding(days: -(days - 1))
        return allEntries.filter { $0.day >= start }
    }

    private var moodCounts: [(mood: Mood, count: Int)] {
        Mood.allCases.map { mood in (mood, entries.filter { $0.mood == mood }.count) }
    }

    private var streak: Int {
        let days = Set(allEntries.map { $0.day.startOfDay })
        var cursor = Date().startOfDay
        if !days.contains(cursor) { cursor = cursor.adding(days: -1) }
        var count = 0
        while days.contains(cursor) {
            count += 1
            cursor = cursor.adding(days: -1)
        }
        return count
    }

    private var averageMood: Mood? {
        guard !entries.isEmpty else { return nil }
        let average = Double(entries.map(\.mood.score).reduce(0, +)) / Double(entries.count)
        return Mood(rawValue: Int(average.rounded()))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if entries.isEmpty {
                        EmptyStateView(
                            title: "\(period.rawValue) 동안 기록이 없어요",
                            message: "기록이 쌓이면 마음의 변화가 보여요.",
                            actionTitle: "오늘 기록하기"
                        ) {
                            router.write(on: Date())
                        }
                    } else {
                        summary
                        trendCard
                        ratioCard
                        keywordCard
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .background(Theme.background)
            .navigationTitle("통계")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("기간", selection: $period) {
                            ForEach(StatsPeriod.allCases) { Text($0.rawValue).tag($0) }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(period.rawValue)
                            Image(systemName: "chevron.down").font(.caption2.bold())
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.ink)
                    }
                }
            }
        }
    }

    // MARK: - Cards

    private var summary: some View {
        HStack(spacing: 10) {
            statTile(title: "기록한 날", value: "\(entries.count)일")
            statTile(title: "연속 기록", value: "\(streak)일")
            VStack(spacing: 6) {
                Text("평균 기분")
                    .font(.caption)
                    .foregroundStyle(Theme.subInk)
                if let averageMood {
                    HStack(spacing: 4) {
                        MoodFace(mood: averageMood, size: 22)
                        Text(averageMood.label)
                            .font(.subheadline.bold())
                            .foregroundStyle(Theme.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .cardStyle(padding: 12)
        }
    }

    private func statTile(title: String, value: String) -> some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(Theme.subInk)
            Text(value)
                .font(.title3.bold())
                .foregroundStyle(Theme.ink)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity)
        .cardStyle(padding: 12)
    }

    private var trendCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("기분 변화").sectionTitle()

            Chart(entries) { entry in
                LineMark(
                    x: .value("날짜", entry.day, unit: .day),
                    y: .value("기분", Double(entry.mood.score))
                )
                .foregroundStyle(Theme.primary.opacity(0.7))
                .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))

                PointMark(
                    x: .value("날짜", entry.day, unit: .day),
                    y: .value("기분", Double(entry.mood.score))
                )
                .foregroundStyle(entry.mood.color)
                .symbolSize(70)
            }
            .chartYScale(domain: 0.5...5.5)
            .chartYAxis {
                AxisMarks(position: .leading, values: [1.0, 2.0, 3.0, 4.0, 5.0]) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3]))
                    AxisValueLabel {
                        if let score = value.as(Double.self), let mood = Mood(rawValue: Int(score)) {
                            MoodFace(mood: mood, size: 16)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 5)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    AxisValueLabel {
                        if let date = value.as(Date.self) {
                            Text(date.shortTitle)
                        }
                    }
                }
            }
            .frame(height: 190)
        }
        .cardStyle()
    }

    private var ratioCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("기분 비율").sectionTitle()

            HStack(spacing: 20) {
                Chart(moodCounts.filter { $0.count > 0 }, id: \.mood) { item in
                    SectorMark(
                        angle: .value("일수", item.count),
                        innerRadius: .ratio(0.62),
                        angularInset: 1.5
                    )
                    .cornerRadius(3)
                    .foregroundStyle(item.mood.color)
                }
                .frame(width: 140, height: 140)
                .overlay {
                    VStack(spacing: 2) {
                        Text("총 \(entries.count)일")
                            .font(.headline)
                            .foregroundStyle(Theme.ink)
                        Text("기록했어요")
                            .font(.caption2)
                            .foregroundStyle(Theme.subInk)
                    }
                }

                VStack(alignment: .leading, spacing: 9) {
                    ForEach(moodCounts, id: \.mood) { item in
                        HStack(spacing: 6) {
                            MoodFace(mood: item.mood, size: 16)
                            Text(item.mood.label)
                                .font(.caption)
                                .foregroundStyle(Theme.ink)
                            Spacer(minLength: 4)
                            Text(percent(item.count))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(Theme.subInk)
                        }
                    }
                }
            }
        }
        .cardStyle()
    }

    private var keywordCard: some View {
        let keywords = KeywordExtractor.top(entries.map(\.text), limit: 12)

        return VStack(alignment: .leading, spacing: 12) {
            Text("자주 기록한 키워드").sectionTitle()

            if keywords.isEmpty {
                Text("글을 조금 더 남기면 자주 쓰는 단어가 보여요")
                    .font(.footnote)
                    .foregroundStyle(Theme.subInk)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(Array(keywords.enumerated()), id: \.offset) { index, keyword in
                        HStack(spacing: 4) {
                            Text(keyword.word)
                            if keyword.count > 1 {
                                Text("\(keyword.count)")
                                    .font(.caption2.bold())
                                    .foregroundStyle(Theme.primary)
                            }
                        }
                        .font(.footnote)
                        .foregroundStyle(Theme.ink)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(index < 3 ? Theme.primarySoft : Theme.chip, in: Capsule())
                    }
                }
            }
        }
        .cardStyle()
    }

    private func percent(_ count: Int) -> String {
        guard !entries.isEmpty else { return "0%" }
        return "\(Int((Double(count) / Double(entries.count) * 100).rounded()))%"
    }
}

#Preview {
    StatsView()
        .environment(AppRouter())
        .modelContainer(PreviewData.container)
}
