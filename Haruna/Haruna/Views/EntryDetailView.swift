import SwiftUI
import SwiftData

struct EntryDetailView: View {
    @Bindable var entry: DiaryEntry
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var showEditor = false
    @State private var confirmDelete = false
    @State private var viewer: PhotoViewerItem?
    @State private var isDeleting = false

    private let photoColumns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    init(entry: DiaryEntry) {
        _entry = Bindable(entry)
    }

    var body: some View {
        ScrollView {
            if !isDeleting {
                VStack(alignment: .leading, spacing: 18) {
                    Text(entry.day.fullTitle)
                        .font(.subheadline)
                        .foregroundStyle(Theme.subInk)

                    HStack(spacing: 10) {
                        MoodFace(mood: entry.mood, size: 40)
                        Text(entry.mood.label)
                            .font(.title3.bold())
                            .foregroundStyle(entry.mood.deepColor)
                    }

                    if entry.text.isEmpty {
                        Text("적은 글 없이 기분만 남겼어요")
                            .foregroundStyle(Theme.subInk)
                    } else {
                        Text(entry.text)
                            .font(.body)
                            .foregroundStyle(Theme.ink)
                            .lineSpacing(7)
                            .textSelection(.enabled)
                    }

                    let photos = entry.sortedPhotos
                    if !photos.isEmpty {
                        LazyVGrid(columns: photoColumns, spacing: 10) {
                            ForEach(Array(photos.enumerated()), id: \.offset) { index, photo in
                                Button {
                                    viewer = PhotoViewerItem(index: index)
                                } label: {
                                    Color.clear
                                        .aspectRatio(1, contentMode: .fit)
                                        .overlay(DataImage(data: photo.thumbnail))
                                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("사진 \(index + 1) 크게 보기")
                            }
                        }
                    }

                    HStack {
                        Spacer()
                        Text(footnote)
                            .font(.caption)
                            .foregroundStyle(Theme.subInk)
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Theme.background)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    withAnimation(.spring) { entry.isFavorite.toggle() }
                    try? context.save()
                } label: {
                    Image(systemName: entry.isFavorite ? "star.fill" : "star")
                        .foregroundStyle(entry.isFavorite ? Theme.star : Theme.subInk)
                        .symbolEffect(.bounce, value: entry.isFavorite)
                }
                .sensoryFeedback(.impact(weight: .light), trigger: entry.isFavorite)
                .accessibilityLabel(entry.isFavorite ? "즐겨찾기 해제" : "즐겨찾기")
            }
            ToolbarItemGroup(placement: .bottomBar) {
                Button {
                    showEditor = true
                } label: {
                    Label("수정", systemImage: "square.and.pencil")
                }
                Spacer()
                Button(role: .destructive) {
                    confirmDelete = true
                } label: {
                    Label("삭제", systemImage: "trash")
                        .foregroundStyle(.red)
                }
            }
        }
        .sheet(isPresented: $showEditor) {
            EntryEditSheet(entry: entry)
        }
        .fullScreenCover(item: $viewer) { item in
            PhotoViewer(photos: entry.sortedPhotos.map(\.data), index: item.index)
        }
        .confirmationDialog("이 기록을 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("삭제", role: .destructive, action: delete)
        } message: {
            Text("삭제한 기록은 되돌릴 수 없어요.")
        }
    }

    private var footnote: String {
        let written = "\(entry.createdAt.timeTitle)에 작성됨"
        guard entry.updatedAt.timeIntervalSince(entry.createdAt) > 60 else { return written }
        return "\(written) · \(entry.updatedAt.shortTitle) \(entry.updatedAt.timeTitle) 수정"
    }

    private func delete() {
        isDeleting = true
        let target = entry
        dismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            context.delete(target)
            try? context.save()
        }
    }
}
