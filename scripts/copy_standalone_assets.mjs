// Next.js standalone 출력 옆에 static/public 폴더를 복사하고,
// 그다음 .next/ 바깥의 staging 디렉토리(electron-payload/) 에 통째로 복사한다.
// (electron-builder 가 .next 폴더를 기본 필터로 걸러내서 node_modules 까지 누락시키는 문제 회피)

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import path from "node:path"

const root = path.resolve(process.cwd())
const standalone = path.join(root, ".next", "standalone")

if (!existsSync(standalone)) {
  console.error("✗ .next/standalone 이 없어요. 먼저 next build 를 NEXT_OUTPUT=standalone 으로 돌려주세요.")
  process.exit(1)
}

// ── 1단계: standalone 안쪽에 static/public/.env.production 채워넣기
const innerTargets = [
  { from: path.join(root, ".next", "static"), to: path.join(standalone, ".next", "static") },
  { from: path.join(root, "public"), to: path.join(standalone, "public") },
  // standalone server 가 cwd 기준으로 .env.production 자동 로드
  { from: path.join(root, ".env.production"), to: path.join(standalone, ".env.production") },
]

for (const { from, to } of innerTargets) {
  if (!existsSync(from)) {
    console.log(`-  스킵 (원본 없음): ${path.relative(root, from)}`)
    continue
  }
  mkdirSync(path.dirname(to), { recursive: true })
  cpSync(from, to, { recursive: true, force: true })
  console.log(`✓  ${path.relative(root, from)}  →  ${path.relative(root, to)}`)
}

// ── 2단계: electron-builder 가 가져갈 staging 폴더로 통째 복사
const stagingRoot = path.join(root, "electron-payload")
const stagingStandalone = path.join(stagingRoot, "standalone")

if (existsSync(stagingRoot)) {
  rmSync(stagingRoot, { recursive: true, force: true })
}
mkdirSync(stagingRoot, { recursive: true })
cpSync(standalone, stagingStandalone, { recursive: true, force: true })
console.log(`✓  .next/standalone  →  electron-payload/standalone (staging, ${stagingStandalone})`)

console.log("\n✓  standalone 자산 복사 완료")
