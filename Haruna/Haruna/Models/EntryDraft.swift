import Foundation

struct PhotoPayload: Identifiable, Equatable {
    let id = UUID()
    var full: Data
    var thumb: Data

    static func == (lhs: PhotoPayload, rhs: PhotoPayload) -> Bool { lhs.id == rhs.id }
}

/// 저장 전 편집 중인 기록
struct EntryDraft: Equatable {
    var mood: Mood?
    var text: String = ""
    var photos: [PhotoPayload] = []

    init() {}

    init(entry: DiaryEntry) {
        mood = entry.mood
        text = entry.text
        photos = entry.sortedPhotos.map { PhotoPayload(full: $0.data, thumb: $0.thumbnail) }
    }

    func photosDiffer(from other: EntryDraft) -> Bool {
        photos.map(\.id) != other.photos.map(\.id)
    }
}
