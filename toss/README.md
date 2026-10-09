# 앱인토스 출시용 패키지

`haruna/`와 `brainhack/`을 앱인토스(WebView, SDK 3.x) 미니앱으로 올리기 위한 별도 프로젝트입니다.
원본 폴더(`/haruna`, `/brainhack`)는 GitHub Pages와 홈 화면 설치용으로 그대로 두고, 이 폴더는 앱인토스 전용입니다.

```
toss/
├─ scripts/            공용 빌드·개발 서버 스크립트
├─ haruna/
│  ├─ src/             앱 소스 (index.html, app.js, app.css, mascot.png)
│  ├─ store/           콘솔 등록용 아이콘
│  ├─ apps-in-toss.config.ts
│  └─ package.json
└─ brainhack/          같은 구조
```

## 원본과 달라진 점

| 항목 | 변경 |
| --- | --- |
| PWA 요소 | `manifest`, 서비스 워커, 애플 메타 태그 삭제 (토스 앱 안에서는 불필요) |
| 홈 화면 설치 안내 | 배너, 설정 메뉴, 도움말 삭제 (iPhone, Safari 문구 포함) |
| 외부 요청 | 브레인핵의 Google Fonts 제거. 시스템 글꼴로 대체되며 외부 네트워크 요청 0건 |
| 백업 | 하루나의 `navigator.share` 경로 삭제. 파일 다운로드로 단일화 |
| 문구 | 개인·회사 특정 표현(직무, 근무지, 보유 자산, 직급)을 일반 예시로 교체 |
| 안내 | 하루나 FAQ에 "치료·상담 서비스가 아님" 추가, 브레인핵 설정에 "투자·인사 판단 권유 아님" 추가 |
| iframe | 두 앱 모두 사용 없음 (점검 완료) |

## 빌드와 배포

```bash
cd toss/haruna        # 또는 toss/brainhack
npm install
npm run dev           # http://localhost:5173 에서 화면 확인
npm run build         # dist/ 생성 후 ait build -> <appName>.ait
npm run deploy        # ait deploy (사전에 ait token add 로 API 키 등록)
```

- 설정 스키마는 `@apps-in-toss/web-framework@3.8.0` 패키지의 타입 정의 기준입니다. 3.x에서는 `brand`에 `primaryColor`만 남고,
  앱 이름·아이콘은 콘솔에서 관리하며, 개발 서버와 빌드 명령은 `package.json` 스크립트로 이동했습니다.
- `appName`은 콘솔에 등록할 이름과 같아야 합니다. 다르게 정하면 `apps-in-toss.config.ts`의 `appName`을 같이 바꾸세요.
- `store/icon-512.png`는 콘솔 아이콘 등록용 원본입니다. 콘솔이 요구하는 규격에 맞게 사용하세요.

## 출시 전 확인

- [ ] 콘솔 "앱 만들기"에서 앱 이름, 아이콘, 카테고리 등록
- [ ] 샌드박스 앱에서 QR 테스트: 기록 저장, 사진 추가(하루나), 백업 파일 저장·불러오기
- [ ] 하루나 사진 선택(`<input type="file">`)과 파일 다운로드가 토스 WebView에서 동작하는지 실기기 확인
- [ ] 3.x 번들은 2.x로 되돌릴 수 없으므로 출시 전 테스트 충분히
