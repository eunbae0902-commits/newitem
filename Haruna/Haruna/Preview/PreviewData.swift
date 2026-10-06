import SwiftUI
import SwiftData

/// Xcode 미리보기용 메모리 저장소와 샘플 기록
@MainActor
enum PreviewData {
    static let container: ModelContainer = {
        let container = try! ModelContainer(
            for: DiaryEntry.self, DiaryPhoto.self,
            configurations: ModelConfiguration(isStoredInMemoryOnly: true)
        )
        let samples: [(Int, Mood, String, Bool)] = [
            (0, .good, "오늘은 오랜만에 친구를 만나서 맛있는 걸 먹었다. 소소하지만 행복한 하루였어. 좋은 사람들과 보내는 시간이 정말 소중하다는 걸 다시 느꼈다.", true),
            (1, .normal, "커피 마시면서 책을 읽었다. 조용한 휴식.", false),
            (2, .veryGood, "가족과 함께 여행 계획을 세웠다. 부건이가 신나했다!", true),
            (3, .bad, "업무 보고 준비로 고민이 많았다. 그래도 끝까지 해냈다.", false),
            (5, .good, "운동하고 커피 한 잔. 친구와 통화.", false),
            (6, .veryBad, "몸이 안 좋아서 하루 종일 누워 있었다.", false),
            (8, .normal, "공부를 조금 했다. 커피가 맛있었다.", false),
            (10, .veryGood, "힘들었지만 끝까지 해냈다. 나 정말 잘하고 있어.", true)
        ]
        for (offset, mood, text, favorite) in samples {
            let day = Date().adding(days: -offset)
            let entry = DiaryEntry(day: day, mood: mood, text: text, isFavorite: favorite,
                                   createdAt: day.startOfDay.addingTimeInterval(21 * 3600 + 14 * 60))
            container.mainContext.insert(entry)
        }
        return container
    }()
}
