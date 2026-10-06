import SwiftUI

struct EntryCard: View {
    let entry: DiaryEntry
    var showsDate = true

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                if showsDate {
                    HStack {
                        Text(entry.day.fullTitle)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.ink)
                        Spacer(minLength: 0)
                        if entry.isFavorite {
                            Image(systemName: "star.fill")
                                .foregroundStyle(Theme.star)
                        }
                    }
                }

                HStack(spacing: 6) {
                    MoodFace(mood: entry.mood, size: 26)
                    Text(entry.mood.label)
                        .font(.subheadline.bold())
                        .foregroundStyle(entry.mood.deepColor)
                    if !showsDate && entry.isFavorite {
                        Spacer(minLength: 0)
                        Image(systemName: "star.fill").foregroundStyle(Theme.star)
                    }
                }

                Text(entry.text.isEmpty ? "적은 글 없이 기분만 남겼어요" : entry.text)
                    .font(.footnote)
                    .foregroundStyle(entry.text.isEmpty ? Theme.subInk : Theme.ink.opacity(0.85))
                    .lineLimit(3)
                    .lineSpacing(3)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let first = entry.sortedPhotos.first {
                DataImage(data: first.thumbnail)
                    .frame(width: 68, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(alignment: .bottomTrailing) {
                        if entry.photos.count > 1 {
                            Text("+\(entry.photos.count - 1)")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(.black.opacity(0.45), in: Capsule())
                                .padding(4)
                        }
                    }
            }
        }
        .cardStyle()
        .contentShape(Rectangle())
    }
}
