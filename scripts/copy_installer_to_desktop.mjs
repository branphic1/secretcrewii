// 빌드 끝난 .exe 를 도현님 바탕화면의 "배포" 폴더로 자동 복사.
// 이전 버전은 같은 폴더의 "이전버전" 하위로 옮긴다.

import { existsSync, mkdirSync, readdirSync, copyFileSync, renameSync, statSync } from "node:fs"
import path from "node:path"
import os from "node:os"

const projectRoot = path.resolve(process.cwd())
const distDir = path.join(projectRoot, "dist")

// 바탕화면 위치 자동 탐지 (한글 사용자도 OneDrive 안 쓰는 경우 모두 대응)
function findDesktop() {
  const home = os.homedir()
  const candidates = [
    path.join(home, "Desktop"),
    path.join(home, "OneDrive", "Desktop"),
    path.join(home, "OneDrive", "바탕 화면"),
    path.join(home, "바탕 화면"),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return path.join(home, "Desktop") // 최후 fallback
}

const desktop = findDesktop()
const releaseDir = path.join(desktop, "📦 시크릿크루_배포")
const archiveDir = path.join(releaseDir, "이전버전")

if (!existsSync(distDir)) {
  console.error("✗ dist 폴더가 없어요. 먼저 빌드를 돌려주세요.")
  process.exit(1)
}

// 바탕화면에 폴더 준비
mkdirSync(releaseDir, { recursive: true })
mkdirSync(archiveDir, { recursive: true })

// dist 안의 Setup .exe 찾기
const installer = readdirSync(distDir).find((f) => f.toLowerCase().endsWith(".exe") && f.toLowerCase().includes("setup"))
if (!installer) {
  console.error("✗ dist 폴더에 Setup .exe 가 없어요.")
  process.exit(1)
}

const src = path.join(distDir, installer)
const ts = new Date()
const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}`

// 기존 같은 이름 파일은 이전버전 폴더로 이동
const dstCurrent = path.join(releaseDir, installer)
if (existsSync(dstCurrent)) {
  const archived = path.join(archiveDir, `${stamp}_${installer}`)
  try {
    renameSync(dstCurrent, archived)
    console.log(`📦 이전 버전을 보관 → ${path.relative(desktop, archived)}`)
  } catch (e) {
    // 파일이 사용 중이면 이동 실패할 수 있음. 무시하고 덮어씀
    console.warn(`⚠ 이전 버전 이동 실패 (덮어씁니다): ${e.message}`)
  }
}

// 새 빌드 복사
copyFileSync(src, dstCurrent)
const sizeMB = (statSync(dstCurrent).size / 1024 / 1024).toFixed(0)

console.log(`\n✅ 바탕화면에 새 .exe 복사 완료`)
console.log(`   📂 ${dstCurrent}`)
console.log(`   📏 ${sizeMB}MB\n`)
console.log(`이 파일을 직원에게 전달하세요. 이전 버전은 "이전버전" 하위 폴더에 자동 보관됨.`)
