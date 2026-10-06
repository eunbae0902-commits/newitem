import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct BackupFile: Codable {
    var version = 1
    var exportedAt: Date
    var entries: [BackupEntry]
}

struct BackupEntry: Codable {
    var day: Date
    var mood: Int
    var text: String
    var isFavorite: Bool
    var createdAt: Date
    var updatedAt: Date
    var photos: [Data]
}

struct BackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

enum BackupService {
    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    static func export(_ entries: [DiaryEntry]) throws -> Data {
        let file = BackupFile(
            exportedAt: .now,
            entries: entries.map {
                BackupEntry(
                    day: $0.day, mood: $0.moodRaw, text: $0.text, isFavorite: $0.isFavorite,
                    createdAt: $0.createdAt, updatedAt: $0.updatedAt,
                    photos: $0.sortedPhotos.map(\.data)
                )
            }
        )
        return try encoder.encode(file)
    }

    static var defaultFilename: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd"
        return "haruna-backup-\(formatter.string(from: .now))"
    }

    /// 같은 날짜의 기록은 더 최근에 수정된 쪽을 남깁니다. 반영된 기록 수를 돌려줍니다.
    static func restore(from data: Data, into context: ModelContext) throws -> Int {
        let file = try decoder.decode(BackupFile.self, from: data)
        let existing = try context.fetch(FetchDescriptor<DiaryEntry>())
        var byDay = Dictionary(existing.map { ($0.day.startOfDay, $0) }, uniquingKeysWith: { first, _ in first })
        var applied = 0

        for item in file.entries {
            let day = item.day.startOfDay
            let mood = Mood(rawValue: item.mood) ?? .normal
            let target: DiaryEntry

            if let current = byDay[day] {
                guard item.updatedAt > current.updatedAt else { continue }
                target = current
            } else {
                target = DiaryEntry(day: day, mood: mood, createdAt: item.createdAt)
                context.insert(target)
                byDay[day] = target
            }

            var draft = EntryDraft()
            draft.mood = mood
            draft.text = item.text
            draft.photos = item.photos.compactMap(ImageTools.makePayload(from:))
            target.apply(draft, photosChanged: true, in: context)
            target.isFavorite = item.isFavorite
            target.createdAt = item.createdAt
            target.updatedAt = item.updatedAt
            applied += 1
        }

        try context.save()
        return applied
    }
}
