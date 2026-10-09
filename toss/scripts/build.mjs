// src/ 를 dist/ 로 복사합니다. 번들러 없이 index.html + 정적 파일 그대로 앱인토스에 올립니다.
import { cpSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');
if (!existsSync(resolve(src, 'index.html'))) throw new Error('src/index.html 이 없습니다.');
rmSync(dist, { recursive: true, force: true });
cpSync(src, dist, { recursive: true });
console.log('dist 생성 완료');
