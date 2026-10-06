import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var entries: [DiaryEntry]

    @AppStorage("lockEnabled") private var lockEnabled = false
    @AppStorage("reminderEnabled") private var reminderEnabled = false
    @AppStorage("reminderMinutes") private var reminderMinutes = 21 * 60
    @AppStorage("theme") private var theme: AppTheme = .system

    @State private var exportDocument: BackupDocument?
    @State private var showExporter = false
    @State private var showImporter = false
    @State private var confirmWipe = false
    @State private var alertMessage: String?

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle(isOn: lockBinding) {
                        SettingRow(icon: "lock", title: "잠금 설정",
                                   subtitle: "\(BiometricAuth.biometryName)로 앱을 안전하게 보호해요")
                    }
                    Toggle(isOn: reminderBinding) {
                        SettingRow(icon: "bell", title: "알림 설정",
                                   subtitle: "매일 기록할 수 있도록 알려드려요")
                    }
                    if reminderEnabled {
                        DatePicker("알림 시간", selection: reminderTimeBinding, displayedComponents: .hourAndMinute)
                            .environment(\.locale, Locale(identifier: "ko_KR"))
                    }
                }

                Section {
                    Button {
                        exportBackup()
                    } label: {
                        SettingRow(icon: "square.and.arrow.up", title: "백업 내보내기",
                                   subtitle: "기록 \(entries.count)개를 파일로 저장해요")
                    }
                    Button {
                        showImporter = true
                    } label: {
                        SettingRow(icon: "square.and.arrow.down", title: "백업 불러오기",
                                   subtitle: "내보낸 백업 파일에서 기록을 복원해요")
                    }
                    Button(role: .destructive) {
                        confirmWipe = true
                    } label: {
                        Label("모든 기록 삭제", systemImage: "trash")
                            .foregroundStyle(.red)
                    }
                    .disabled(entries.isEmpty)
                } header: {
                    Text("데이터 관리")
                } footer: {
                    Text("모든 기록은 이 iPhone 안에만 저장돼요. 기기를 바꾸기 전에 백업 파일을 iCloud Drive에 내보내 두세요.")
                }

                Section("테마 설정") {
                    Picker(selection: $theme) {
                        ForEach(AppTheme.allCases) { Text($0.title).tag($0) }
                    } label: {
                        SettingRow(icon: "circle.lefthalf.filled", title: "테마", subtitle: "나에게 맞는 분위기로")
                    }
                }

                Section("도움말") {
                    NavigationLink("자주 묻는 질문") { FAQView() }
                    NavigationLink("개인정보 처리방침") { PrivacyView() }
                    LabeledContent("버전", value: appVersion)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("설정")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("닫기")
                }
            }
            .fileExporter(
                isPresented: $showExporter,
                document: exportDocument,
                contentType: .json,
                defaultFilename: BackupService.defaultFilename
            ) { result in
                if case .success = result { alertMessage = "백업 파일을 저장했어요." }
            }
            .fileImporter(isPresented: $showImporter, allowedContentTypes: [.json]) { result in
                importBackup(result)
            }
            .confirmationDialog("모든 기록을 삭제할까요?", isPresented: $confirmWipe, titleVisibility: .visible) {
                Button("모두 삭제", role: .destructive, action: wipeAll)
            } message: {
                Text("백업하지 않은 기록은 되돌릴 수 없어요.")
            }
            .alert("하루나", isPresented: Binding(
                get: { alertMessage != nil },
                set: { if !$0 { alertMessage = nil } }
            )) {
                Button("확인", role: .cancel) {}
            } message: {
                Text(alertMessage ?? "")
            }
        }
    }

    // MARK: - Bindings

    private var lockBinding: Binding<Bool> {
        Binding(
            get: { lockEnabled },
            set: { newValue in
                guard newValue else {
                    lockEnabled = false
                    return
                }
                guard BiometricAuth.isAvailable else {
                    alertMessage = "잠금을 쓰려면 iPhone 설정에서 Face ID 또는 암호를 먼저 켜주세요."
                    return
                }
                Task { @MainActor in
                    if await BiometricAuth.authenticate(reason: "앱 잠금을 켜기 위해 인증해 주세요.") {
                        lockEnabled = true
                    }
                }
            }
        )
    }

    private var reminderBinding: Binding<Bool> {
        Binding(
            get: { reminderEnabled },
            set: { newValue in
                guard newValue else {
                    reminderEnabled = false
                    ReminderScheduler.cancel()
                    return
                }
                Task { @MainActor in
                    let granted = await ReminderScheduler.enable(minutesOfDay: reminderMinutes)
                    reminderEnabled = granted
                    if !granted {
                        alertMessage = "알림 권한이 꺼져 있어요. iPhone 설정 > 하루나 > 알림에서 허용해 주세요."
                    }
                }
            }
        )
    }

    private var reminderTimeBinding: Binding<Date> {
        Binding(
            get: {
                Date().startOfDay.addingTimeInterval(TimeInterval(reminderMinutes * 60))
            },
            set: { date in
                let parts = Calendar.haruna.dateComponents([.hour, .minute], from: date)
                reminderMinutes = (parts.hour ?? 21) * 60 + (parts.minute ?? 0)
                ReminderScheduler.schedule(minutesOfDay: reminderMinutes)
            }
        )
    }

    // MARK: - Data

    private func exportBackup() {
        do {
            exportDocument = BackupDocument(data: try BackupService.export(entries))
            showExporter = true
        } catch {
            alertMessage = "백업 파일을 만들지 못했어요.\n\(error.localizedDescription)"
        }
    }

    private func importBackup(_ result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            do {
                let data = try Data(contentsOf: url)
                let count = try BackupService.restore(from: data, into: context)
                alertMessage = count == 0 ? "새로 불러올 기록이 없어요." : "\(count)개의 기록을 불러왔어요."
            } catch {
                alertMessage = "하루나 백업 파일이 아니거나 손상된 파일이에요."
            }
        case .failure(let error):
            alertMessage = error.localizedDescription
        }
    }

    private func wipeAll() {
        for entry in entries { context.delete(entry) }
        try? context.save()
        alertMessage = "모든 기록을 삭제했어요."
    }
}

private struct SettingRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Theme.primary)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .foregroundStyle(Theme.ink)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Theme.subInk)
            }
        }
    }
}

#Preview {
    SettingsView()
        .modelContainer(PreviewData.container)
}
