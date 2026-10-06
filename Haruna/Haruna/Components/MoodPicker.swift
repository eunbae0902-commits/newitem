import SwiftUI

struct MoodPicker: View {
    @Binding var selection: Mood?

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Mood.allCases) { mood in
                let isSelected = selection == mood
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        selection = mood
                    }
                } label: {
                    VStack(spacing: 8) {
                        MoodFace(mood: mood, size: 48)
                            .padding(5)
                            .background {
                                if isSelected {
                                    Circle().fill(mood.color.opacity(0.25))
                                }
                            }
                            .overlay {
                                if isSelected {
                                    Circle().strokeBorder(Theme.primary, lineWidth: 2.5)
                                }
                            }
                            .scaleEffect(isSelected ? 1.08 : (selection == nil ? 1 : 0.94))
                            .opacity(selection == nil || isSelected ? 1 : 0.7)
                        Text(mood.label)
                            .font(.caption)
                            .fontWeight(isSelected ? .bold : .regular)
                            .foregroundStyle(isSelected ? Theme.ink : Theme.subInk)
                    }
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .sensoryFeedback(.selection, trigger: selection)
    }
}
