import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 콘솔에 등록한 앱 이름(영문 kebab-case)과 같아야 합니다.
  appName: 'brainhack',
  brand: {
    primaryColor: '#2448C8',
  },
  // 기록은 앱 안에만 저장하며 기기 권한(카메라, 연락처 등)은 쓰지 않습니다.
  permissions: [],
  webBundleDir: 'dist',
});
