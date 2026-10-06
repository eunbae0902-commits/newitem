import SwiftUI

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(uiColor: UIColor(hex: hex, alpha: opacity))
    }

    static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light)
        })
    }
}

enum Theme {
    static let background = Color.adaptive(light: 0xFAF6EE, dark: 0x151713)
    static let card = Color.adaptive(light: 0xFFFFFF, dark: 0x22251F)
    static let cardStroke = Color.adaptive(light: 0xEFE8DA, dark: 0x30342B)
    static let primary = Color.adaptive(light: 0x5A9450, dark: 0x7AB86B)
    static let primarySoft = Color.adaptive(light: 0xE6F0DC, dark: 0x2B3826)
    static let ink = Color.adaptive(light: 0x34342F, dark: 0xEDEDE4)
    static let subInk = Color.adaptive(light: 0x8C887E, dark: 0xA2A296)
    static let chip = Color.adaptive(light: 0xF4F0E7, dark: 0x2D3128)
    static let bubble = Color.adaptive(light: 0xFBEFDF, dark: 0x302B22)
    static let star = Color(hex: 0xF5B83D)
}

struct CardStyle: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(Theme.cardStroke, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 8, y: 3)
    }
}

extension View {
    func cardStyle(padding: CGFloat = 16) -> some View {
        modifier(CardStyle(padding: padding))
    }

    func sectionTitle() -> some View {
        font(.headline).foregroundStyle(Theme.ink)
    }
}
