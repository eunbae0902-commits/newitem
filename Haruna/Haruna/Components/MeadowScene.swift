import SwiftUI

/// 오늘 탭 상단의 언덕 + 꽃 + 마스코트 일러스트
struct MeadowScene: View {
    @Environment(\.colorScheme) private var scheme
    var mascotBounce: Bool

    init(mascotBounce: Bool = false) {
        self.mascotBounce = mascotBounce
    }

    private struct FlowerSpot: Identifiable {
        let id: Int
        let x: CGFloat
        let y: CGFloat
        let size: CGFloat
        let petal: UInt32
    }

    private let flowers: [FlowerSpot] = [
        .init(id: 0, x: 0.10, y: 0.80, size: 16, petal: 0xFFFFFF),
        .init(id: 1, x: 0.20, y: 0.90, size: 12, petal: 0xFFE3E3),
        .init(id: 2, x: 0.30, y: 0.76, size: 10, petal: 0xFFFFFF),
        .init(id: 3, x: 0.72, y: 0.78, size: 11, petal: 0xFFFFFF),
        .init(id: 4, x: 0.84, y: 0.88, size: 16, petal: 0xFFE3E3),
        .init(id: 5, x: 0.93, y: 0.74, size: 12, petal: 0xFFFFFF)
    ]

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let dark = scheme == .dark

            ZStack {
                LinearGradient(
                    colors: dark
                        ? [Color(hex: 0x1F2B1C), Color(hex: 0x151713)]
                        : [Color(hex: 0xE4F0D6), Color(hex: 0xFAF6EE)],
                    startPoint: .top, endPoint: .bottom
                )

                Ellipse()
                    .fill(Color(hex: dark ? 0x2F4A2A : 0xC5DEB0))
                    .frame(width: w * 0.95, height: h * 0.5)
                    .position(x: w * 0.12, y: h * 0.92)
                Ellipse()
                    .fill(Color(hex: dark ? 0x2F4A2A : 0xC5DEB0))
                    .frame(width: w * 0.95, height: h * 0.46)
                    .position(x: w * 0.9, y: h * 0.94)
                Ellipse()
                    .fill(Color(hex: dark ? 0x3A5C33 : 0xA9CF8E))
                    .frame(width: w * 1.7, height: h * 0.42)
                    .position(x: w * 0.5, y: h * 1.08)

                ForEach(flowers) { flower in
                    Flower(petal: Color(hex: flower.petal), size: flower.size)
                        .position(x: w * flower.x, y: h * flower.y)
                }

                Image("Mascot")
                    .resizable()
                    .scaledToFit()
                    .frame(height: h * 0.58)
                    .offset(y: mascotBounce ? -6 : 0)
                    .position(x: w / 2, y: h * 0.64)
                    .accessibilityHidden(true)
            }
        }
    }
}

private struct Flower: View {
    let petal: Color
    let size: CGFloat

    var body: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(petal)
                    .frame(width: size * 0.5, height: size * 0.5)
                    .offset(y: -size * 0.28)
                    .rotationEffect(.degrees(Double(i) * 72))
            }
            Circle()
                .fill(Color(hex: 0xF6C94E))
                .frame(width: size * 0.32, height: size * 0.32)
        }
        .frame(width: size, height: size)
    }
}
