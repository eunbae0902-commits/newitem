import UIKit

enum ImageTools {
    static let maxPhotos = 4

    /// 원본 사진을 저장용(최대 1600px)과 썸네일(최대 480px) JPEG로 줄입니다.
    static func makePayload(from data: Data) -> PhotoPayload? {
        guard let image = UIImage(data: data),
              let full = resized(image, maxSide: 1600).jpegData(compressionQuality: 0.82),
              let thumb = resized(image, maxSide: 480).jpegData(compressionQuality: 0.75)
        else { return nil }
        return PhotoPayload(full: full, thumb: thumb)
    }

    private static func resized(_ image: UIImage, maxSide: CGFloat) -> UIImage {
        let size = image.size
        let scale = min(1, maxSide / max(size.width, size.height, 1))
        let target = CGSize(width: floor(size.width * scale), height: floor(size.height * scale))
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
