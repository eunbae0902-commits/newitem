import SwiftUI

/// 동글동글한 기분 얼굴 아이콘
struct MoodFace: View {
    let mood: Mood
    var size: CGFloat = 44

    var body: some View {
        Canvas { context, canvasSize in
            let s = canvasSize.width
            let ink = Color(hex: 0x4A3F35)
            let line = max(1.2, s * 0.055)
            let stroke = StrokeStyle(lineWidth: line, lineCap: .round, lineJoin: .round)

            context.fill(Path(ellipseIn: CGRect(origin: .zero, size: canvasSize)), with: .color(mood.color))

            // 눈
            let eyeY = s * 0.43
            let eyeDX = s * 0.17
            let eyeR = s * 0.055
            for x in [s / 2 - eyeDX, s / 2 + eyeDX] {
                if mood == .veryGood {
                    var arc = Path()
                    arc.move(to: CGPoint(x: x - eyeR * 1.4, y: eyeY + eyeR * 0.6))
                    arc.addQuadCurve(to: CGPoint(x: x + eyeR * 1.4, y: eyeY + eyeR * 0.6),
                                     control: CGPoint(x: x, y: eyeY - eyeR * 1.6))
                    context.stroke(arc, with: .color(ink), style: stroke)
                } else {
                    context.fill(Path(ellipseIn: CGRect(x: x - eyeR, y: eyeY - eyeR, width: eyeR * 2, height: eyeR * 2.2)),
                                 with: .color(ink))
                }
            }

            // 볼터치
            if mood.score >= Mood.good.score {
                for x in [s * 0.24, s * 0.76] {
                    context.fill(Path(ellipseIn: CGRect(x: x - s * 0.08, y: s * 0.54, width: s * 0.16, height: s * 0.085)),
                                 with: .color(Color(hex: 0xEF7F7F, opacity: 0.4)))
                }
            }

            // 눈썹 (매우 힘듦)
            if mood == .veryBad {
                let brows: [(x: CGFloat, dir: CGFloat)] = [(s / 2 - eyeDX, 1), (s / 2 + eyeDX, -1)]
                for (x, dir) in brows {
                    var brow = Path()
                    brow.move(to: CGPoint(x: x - s * 0.07 * dir, y: eyeY - s * 0.15))
                    brow.addLine(to: CGPoint(x: x + s * 0.06 * dir, y: eyeY - s * 0.11))
                    context.stroke(brow, with: .color(ink), style: stroke)
                }
            }

            // 입
            let halfWidth: CGFloat = mood == .veryGood ? s * 0.13 : s * 0.1
            let baseY: CGFloat = mood.score >= Mood.normal.score ? s * 0.62 : s * 0.7
            let curve: CGFloat = switch mood {
            case .veryGood: s * 0.2
            case .good: s * 0.13
            case .normal: s * 0.025
            case .bad: -s * 0.09
            case .veryBad: -s * 0.13
            }
            var mouth = Path()
            mouth.move(to: CGPoint(x: s / 2 - halfWidth, y: baseY))
            mouth.addQuadCurve(to: CGPoint(x: s / 2 + halfWidth, y: baseY),
                               control: CGPoint(x: s / 2, y: baseY + curve))
            if mood == .veryGood {
                mouth.closeSubpath()
                context.fill(mouth, with: .color(ink))
                context.stroke(mouth, with: .color(ink), style: stroke)
            } else {
                context.stroke(mouth, with: .color(ink), style: stroke)
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel(mood.label)
    }
}

#Preview {
    HStack {
        ForEach(Mood.allCases) { MoodFace(mood: $0, size: 56) }
    }
    .padding()
}
