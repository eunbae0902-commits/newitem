import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Environment(AppRouter.self) private var router
    @Query(sort: \DiaryEntry.day, order: .reverse) private var entries: [DiaryEntry]

    @State private var draft = EntryDraft()
    @State private var baseline = EntryDraft()
    @State private var showSettings = false
    @State private var showDatePicker = false
    @State private var pickedDate = Date()
    @State private var pendingDate: Date?
    @State private var toast: String?
    @State private var saveCount = 0
    @State private var bounce = false
    @FocusState private var editorFocused: Bool

    private var existing: DiaryEntry? {
        entries.first { $0.day.isSameDay(as: router.todayDate) }
    }

    private var isDirty: Bool { draft != baseline }

    private var buttonTitle: String {
        if existing != nil { return "기록 수정하기" }
        return router.todayDate.isToday ? "오늘 기록하기" : "이날 기록하기"
    }

    var body: some View {
        NavigationStack {
            content
                .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var content: some View {
        GeometryReader { proxy in
            ScrollView {
                VStack(spacing: 18) {
                    header(topInset: proxy.safeAreaInsets.top)

                    VStack(spacing: 18) {
                        dateButton

                        Text(draft.mood?.cheer ?? (router.todayDate.isToday ? "오늘 하루는 어떠셨나요?" : "이날 하루는 어떠셨나요?"))
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(Theme.bubble, in: Capsule())
                            .contentTransition(.opacity)
                            .animation(.easeInOut, value: draft.mood)

                        MoodPicker(selection: $draft.mood)

                        EntryEditorCard(draft: $draft, focus: $editorFocused)

                        Button(action: save) {
                            Text(buttonTitle)
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .foregroundStyle(.white)
                                .background(
                                    Capsule().fill(
                                        LinearGradient(colors: [Color(hex: 0x76AE63), Color(hex: 0x4E8A45)],
                                                       startPoint: .top, endPoint: .bottom)
                                    )
                                )
                                .opacity(draft.mood == nil ? 0.45 : 1)
                        }
                        .disabled(draft.mood == nil || (existing != nil && !isDirty))
                        .sensoryFeedback(.success, trigger: saveCount)

                        if draft.mood == nil {
                            Text("기분을 먼저 골라주세요")
                                .font(.caption)
                                .foregroundStyle(Theme.subInk)
                        }

                        Text("오늘도 수고했어요 ♥")
                            .font(.footnote)
                            .foregroundStyle(Theme.subInk)
                            .padding(.top, 4)
                            .padding(.bottom, 24)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .ignoresSafeArea(.container, edges: .top)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.background)
        }
        .overlay(alignment: .bottom) { toastView }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("완료") { editorFocused = false }
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showDatePicker) { datePickerSheet }
        .alert("작성 중인 내용이 있어요", isPresented: Binding(
            get: { pendingDate != nil },
            set: { if !$0 { pendingDate = nil } }
        )) {
            Button("저장하지 않고 이동", role: .destructive) {
                if let pendingDate { router.todayDate = pendingDate }
                pendingDate = nil
            }
            Button("계속 작성", role: .cancel) { pendingDate = nil }
        } message: {
            Text("다른 날짜로 이동하면 저장하지 않은 내용은 사라져요.")
        }
        .onChange(of: router.todayDate, initial: true) { loadDraft() }
        .onAppear {
            if !isDirty { loadDraft() }
        }
    }

    // MARK: - Sections

    private func header(topInset: CGFloat) -> some View {
        ZStack(alignment: .top) {
            MeadowScene(mascotBounce: bounce)
                .frame(height: 250 + topInset)
                .onTapGesture {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.4)) { bounce = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        withAnimation(.spring) { bounce = false }
                    }
                }

            HStack {
                Text("하루나")
                    .font(.title.bold())
                    .foregroundStyle(Theme.ink)
                Spacer()
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .font(.title3)
                        .foregroundStyle(Theme.ink)
                        .frame(width: 40, height: 40)
                        .background(.ultraThinMaterial, in: Circle())
                }
                .accessibilityLabel("설정")
            }
            .padding(.horizontal, 20)
            .padding(.top, topInset + 4)
        }
    }

    private var dateButton: some View {
        Button {
            pickedDate = router.todayDate
            showDatePicker = true
        } label: {
            HStack(spacing: 6) {
                Text(router.todayDate.dayTitle)
                    .font(.title3.bold())
                Image(systemName: "chevron.down")
                    .font(.caption.bold())
            }
            .foregroundStyle(Theme.ink)
        }
        .accessibilityHint("날짜 바꾸기")
    }

    private var datePickerSheet: some View {
        NavigationStack {
            DatePicker("날짜", selection: $pickedDate, in: ...Date(), displayedComponents: .date)
                .datePickerStyle(.graphical)
                .environment(\.locale, Locale(identifier: "ko_KR"))
                .padding(.horizontal)
                .navigationTitle("날짜 선택")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("오늘") { pickedDate = Date() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("완료") {
                            showDatePicker = false
                            changeDate(to: pickedDate)
                        }
                    }
                }
        }
        .presentationDetents([.medium, .large])
    }

    @ViewBuilder
    private var toastView: some View {
        if let toast {
            Text(toast)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Theme.primary, in: Capsule())
                .shadow(radius: 8, y: 4)
                .padding(.bottom, 16)
                .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    // MARK: - Actions

    private func changeDate(to date: Date) {
        let day = date.startOfDay
        guard !day.isSameDay(as: router.todayDate) else { return }
        if isDirty {
            pendingDate = day
        } else {
            router.todayDate = day
        }
    }

    private func loadDraft() {
        let loaded = existing.map(EntryDraft.init(entry:)) ?? EntryDraft()
        draft = loaded
        baseline = loaded
    }

    private func save() {
        guard let mood = draft.mood else { return }
        editorFocused = false

        let isNew = existing == nil
        let entry: DiaryEntry
        if let existing {
            entry = existing
        } else {
            entry = DiaryEntry(day: router.todayDate, mood: mood)
            context.insert(entry)
        }
        entry.apply(draft, photosChanged: draft.photosDiffer(from: baseline), in: context)
        try? context.save()

        baseline = draft
        saveCount += 1
        showToast(isNew ? "🌱 기록했어요" : "✏️ 수정했어요")
    }

    private func showToast(_ message: String) {
        withAnimation(.spring) { toast = message }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
            withAnimation(.easeOut) { toast = nil }
        }
    }
}

#Preview {
    TodayView()
        .environment(AppRouter())
        .modelContainer(PreviewData.container)
}
