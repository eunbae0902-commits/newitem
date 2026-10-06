import SwiftUI

struct DataImage: View {
    let data: Data

    var body: some View {
        if let image = UIImage(data: data) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            Rectangle()
                .fill(Theme.chip)
                .overlay(Image(systemName: "photo").foregroundStyle(Theme.subInk))
        }
    }
}

struct PhotoViewerItem: Identifiable {
    let id = UUID()
    let index: Int
}

/// 사진을 좌우로 넘겨보는 전체 화면 뷰어
struct PhotoViewer: View {
    let photos: [Data]
    @State private var index: Int
    @Environment(\.dismiss) private var dismiss

    init(photos: [Data], index: Int) {
        self.photos = photos
        _index = State(initialValue: index)
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()

            TabView(selection: $index) {
                ForEach(photos.indices, id: \.self) { i in
                    if let image = UIImage(data: photos[i]) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .tag(i)
                    }
                }
            }
            .tabViewStyle(.page(indexDisplayMode: photos.count > 1 ? .always : .never))

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.18), in: Circle())
            }
            .padding()
            .accessibilityLabel("닫기")
        }
    }
}
