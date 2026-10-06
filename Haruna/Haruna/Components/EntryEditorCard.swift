import SwiftUI
import PhotosUI

/// 본문 입력 + 사진 첨부 카드. 오늘 탭과 수정 화면에서 함께 씁니다.
struct EntryEditorCard: View {
    @Binding var draft: EntryDraft
    var focus: FocusState<Bool>.Binding

    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var isLoadingPhotos = false

    init(draft: Binding<EntryDraft>, focus: FocusState<Bool>.Binding) {
        _draft = draft
        self.focus = focus
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextEditor(text: $draft.text)
                .focused(focus)
                .font(.body)
                .lineSpacing(4)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 140)
                .overlay(alignment: .topLeading) {
                    if draft.text.isEmpty {
                        Text("오늘 있었던 일을\n자유롭게 적어보세요...")
                            .foregroundStyle(Theme.subInk.opacity(0.8))
                            .padding(.top, 8)
                            .padding(.leading, 5)
                            .allowsHitTesting(false)
                    }
                }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    PhotosPicker(
                        selection: $pickerItems,
                        maxSelectionCount: max(1, ImageTools.maxPhotos - draft.photos.count),
                        matching: .images
                    ) {
                        VStack(spacing: 4) {
                            if isLoadingPhotos {
                                ProgressView()
                            } else {
                                Image(systemName: "photo.badge.plus")
                                    .font(.title3)
                            }
                            Text("\(draft.photos.count)/\(ImageTools.maxPhotos)")
                                .font(.caption2)
                        }
                        .foregroundStyle(Theme.subInk)
                        .frame(width: 64, height: 64)
                        .background(Theme.chip, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .disabled(draft.photos.count >= ImageTools.maxPhotos || isLoadingPhotos)
                    .accessibilityLabel("사진 추가")

                    ForEach(draft.photos) { photo in
                        DataImage(data: photo.thumb)
                            .frame(width: 64, height: 64)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(alignment: .topTrailing) {
                                Button {
                                    withAnimation { draft.photos.removeAll { $0.id == photo.id } }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .symbolRenderingMode(.palette)
                                        .foregroundStyle(.white, .black.opacity(0.55))
                                        .font(.body)
                                }
                                .offset(x: 5, y: -5)
                                .accessibilityLabel("사진 삭제")
                            }
                    }
                }
                .padding(.top, 6)
                .padding(.trailing, 6)
            }
        }
        .cardStyle()
        .onChange(of: pickerItems) { _, items in
            guard !items.isEmpty else { return }
            Task { await loadPhotos(items) }
        }
    }

    @MainActor
    private func loadPhotos(_ items: [PhotosPickerItem]) async {
        isLoadingPhotos = true
        defer {
            isLoadingPhotos = false
            pickerItems = []
        }
        for item in items {
            guard draft.photos.count < ImageTools.maxPhotos,
                  let data = try? await item.loadTransferable(type: Data.self),
                  let payload = ImageTools.makePayload(from: data)
            else { continue }
            withAnimation { draft.photos.append(payload) }
        }
    }
}
