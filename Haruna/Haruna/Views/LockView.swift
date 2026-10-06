import SwiftUI

struct LockView: View {
    var onUnlock: () -> Void
    @Environment(\.scenePhase) private var scenePhase
    @State private var failed = false
    @State private var isAuthenticating = false
    @State private var autoTried = false

    init(onUnlock: @escaping () -> Void) {
        self.onUnlock = onUnlock
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()
                Image("Mascot")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 140)
                    .accessibilityHidden(true)
                Text("하루나")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Theme.ink)
                Text("나만의 공간, 안전하게 지키고 있어요")
                    .font(.subheadline)
                    .foregroundStyle(Theme.subInk)
                Spacer()
                Button {
                    Task { await unlock() }
                } label: {
                    Label("\(BiometricAuth.biometryName)로 잠금 해제", systemImage: "lock.open")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .foregroundStyle(.white)
                        .background(Theme.primary, in: Capsule())
                }
                .padding(.horizontal, 32)
                if failed {
                    Text("인증하지 못했어요. 다시 시도해 주세요.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
                Spacer().frame(height: 40)
            }
        }
        .task {
            if scenePhase == .active { await autoUnlock() }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active: Task { await autoUnlock() }
            case .background: autoTried = false
            default: break
            }
        }
    }

    /// Face ID 창이 닫히며 다시 active가 될 때 무한 반복하지 않도록 활성화마다 한 번만 자동 시도합니다.
    @MainActor
    private func autoUnlock() async {
        guard !autoTried else { return }
        autoTried = true
        await unlock()
    }

    @MainActor
    private func unlock() async {
        guard !isAuthenticating else { return }
        isAuthenticating = true
        defer { isAuthenticating = false }
        if await BiometricAuth.authenticate(reason: "하루나의 기록을 열어요.") {
            failed = false
            onUnlock()
        } else {
            failed = true
        }
    }
}
