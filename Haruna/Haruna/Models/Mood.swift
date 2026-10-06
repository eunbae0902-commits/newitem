import SwiftUI

enum Mood: Int, CaseIterable, Identifiable, Codable {
    case veryGood = 5
    case good = 4
    case normal = 3
    case bad = 2
    case veryBad = 1

    var id: Int { rawValue }
    var score: Int { rawValue }

    var label: String {
        switch self {
        case .veryGood: "매우 좋음"
        case .good: "좋음"
        case .normal: "보통"
        case .bad: "힘듦"
        case .veryBad: "매우 힘듦"
        }
    }

    var color: Color {
        switch self {
        case .veryGood: Color(hex: 0x8CC773)
        case .good: Color(hex: 0x93D2CB)
        case .normal: Color(hex: 0xF7D26E)
        case .bad: Color(hex: 0xAFC3EE)
        case .veryBad: Color(hex: 0xF2A093)
        }
    }

    /// 글자색으로 쓰기 좋은 진한 톤
    var deepColor: Color {
        switch self {
        case .veryGood: Color(hex: 0x4F8A3C)
        case .good: Color(hex: 0x3E8C84)
        case .normal: Color(hex: 0xB08A1E)
        case .bad: Color(hex: 0x5A73B0)
        case .veryBad: Color(hex: 0xC2584A)
        }
    }

    /// 기분 칩 아래에 보여줄 한마디
    var cheer: String {
        switch self {
        case .veryGood: "이런 날이 더 많아지면 좋겠어요"
        case .good: "소소한 행복을 잘 챙겼네요"
        case .normal: "평범한 하루도 소중해요"
        case .bad: "오늘은 푹 쉬어도 괜찮아요"
        case .veryBad: "많이 힘들었죠, 잘 버텨냈어요"
        }
    }
}
