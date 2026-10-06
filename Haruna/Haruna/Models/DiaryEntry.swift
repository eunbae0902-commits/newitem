import Foundation
import SwiftData

/// 하루 한 개의 기록. `day`는 그날 0시로 정규화해서 저장합니다.
@Model
final class DiaryEntry {
    var day: Date
    var moodRaw: Int
    var text: String
    var isFavorite: Bool
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \DiaryPhoto.entry)
    var photos: [DiaryPhoto] = []

    init(day: Date, mood: Mood, text: String = "", isFavorite: Bool = false, createdAt: Date = .now) {
        self.day = day.startOfDay
        self.moodRaw = mood.rawValue
        self.text = text
        self.isFavorite = isFavorite
        self.createdAt = createdAt
        self.updatedAt = createdAt
    }

    var mood: Mood {
        get { Mood(rawValue: moodRaw) ?? .normal }
        set { moodRaw = newValue.rawValue }
    }

    var sortedPhotos: [DiaryPhoto] {
        photos.sorted { $0.order < $1.order }
    }

    /// 편집 내용을 반영합니다. 사진은 바뀐 경우에만 교체합니다.
    func apply(_ draft: EntryDraft, photosChanged: Bool, in context: ModelContext) {
        if let mood = draft.mood { self.mood = mood }
        text = draft.text.trimmingCharacters(in: .whitespacesAndNewlines)
        updatedAt = .now

        guard photosChanged else { return }
        for photo in photos { context.delete(photo) }
        photos.removeAll()
        for (index, payload) in draft.photos.enumerated() {
            let photo = DiaryPhoto(data: payload.full, thumbnail: payload.thumb, order: index)
            context.insert(photo)
            photos.append(photo)
        }
    }
}

@Model
final class DiaryPhoto {
    @Attribute(.externalStorage) var data: Data
    var thumbnail: Data
    var order: Int
    var entry: DiaryEntry?

    init(data: Data, thumbnail: Data, order: Int) {
        self.data = data
        self.thumbnail = thumbnail
        self.order = order
    }
}
