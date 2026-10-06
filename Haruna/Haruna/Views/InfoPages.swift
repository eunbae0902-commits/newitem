import SwiftUI

struct FAQView: View {
    private let items: [(q: String, a: String)] = [
        ("하루에 여러 번 기록할 수 있나요?",
         "하루나는 하루에 한 장의 기록을 남겨요. 같은 날 다시 기록하면 그날의 기록이 수정돼요."),
        ("지난 날짜도 기록할 수 있나요?",
         "오늘 탭에서 날짜를 눌러 지난 날을 고르거나, 기록 탭 캘린더에서 빈 날을 고른 뒤 '기록하러 가기'를 누르세요."),
        ("사진은 몇 장까지 넣을 수 있나요?",
         "기록 하나에 최대 4장까지 넣을 수 있어요. 용량을 아끼기 위해 적당한 크기로 줄여서 저장해요."),
        ("자주 기록한 키워드는 어떻게 만들어지나요?",
         "선택한 기간의 글에서 자주 쓴 단어를 세어 보여드려요. 하루에 같은 단어를 여러 번 써도 한 번으로 세요."),
        ("휴대폰을 바꾸면 기록이 옮겨지나요?",
         "기록은 이 기기에만 저장돼요. 설정 > 백업 내보내기로 파일을 만든 뒤 새 기기에서 백업 불러오기를 해주세요."),
        ("잠금을 켰는데 Face ID가 안 돼요.",
         "iPhone 설정 > 하루나 > Face ID 사용을 허용해 주세요. Face ID가 실패하면 기기 암호로도 열 수 있어요.")
    ]

    var body: some View {
        List(items, id: \.q) { item in
            VStack(alignment: .leading, spacing: 8) {
                Text(item.q)
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                Text(item.a)
                    .font(.subheadline)
                    .foregroundStyle(Theme.subInk)
            }
            .padding(.vertical, 6)
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .navigationTitle("자주 묻는 질문")
    }
}

struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("하루나는 대표님의 기록을 어디에도 보내지 않아요.")
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                Group {
                    Text("• 일기, 기분, 사진은 모두 이 iPhone의 앱 저장 공간에만 보관돼요.")
                    Text("• 서버, 광고, 분석 도구를 사용하지 않으며 회원가입도 없어요.")
                    Text("• 사진은 직접 고른 것만 앱 안으로 복사되며, 사진 보관함 전체를 읽지 않아요.")
                    Text("• Face ID 정보는 Apple의 보안 영역에서 처리되며 앱은 인증 결과만 받아요.")
                    Text("• 백업 파일은 직접 저장한 위치에만 만들어지고, 앱을 삭제하면 앱 안의 기록도 함께 지워져요.")
                }
                .font(.subheadline)
                .foregroundStyle(Theme.subInk)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.background)
        .navigationTitle("개인정보 처리방침")
    }
}
