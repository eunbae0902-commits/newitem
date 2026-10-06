import SwiftUI
import SwiftData

struct EntryEditSheet: View {
    let entry: DiaryEntry
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var draft = EntryDraft()
    @State private var baseline = EntryDraft()
    @State private var loaded = false
    @FocusState private var editorFocused: Bool

    init(entry: DiaryEntry) {
        self.entry = entry
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    MoodPicker(selection: $draft.mood)
                    EntryEditorCard(draft: $draft, focus: $editorFocused)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.background)
            .navigationTitle(entry.day.dayTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("취소") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") {
                        entry.apply(draft, photosChanged: draft.photosDiffer(from: baseline), in: context)
                        try? context.save()
                        dismiss()
                    }
                    .bold()
                    .disabled(draft == baseline || draft.mood == nil)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("완료") { editorFocused = false }
                }
            }
        }
        .interactiveDismissDisabled(draft != baseline)
        .onAppear {
            guard !loaded else { return }
            draft = EntryDraft(entry: entry)
            baseline = draft
            loaded = true
        }
    }
}
