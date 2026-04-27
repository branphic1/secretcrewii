// electron-builder 가 node_modules 를 자동 필터링해서
// extraResources 로 못 가져옴. 빌드 후 직접 복사로 해결.

const fs = require("fs")
const path = require("path")

exports.default = async function (context) {
  const projectDir = context.packager.projectDir
  const appOutDir = context.appOutDir

  const src = path.join(projectDir, "electron-payload", "standalone", "node_modules")
  const dst = path.join(
    appOutDir,
    "resources",
    "nextjs",
    "standalone",
    "node_modules"
  )

  if (!fs.existsSync(src)) {
    console.warn(`[afterPack] 원본 없음: ${src}`)
    return
  }

  await fs.promises.cp(src, dst, { recursive: true, force: true })
  console.log(`[afterPack] ✓  copied node_modules → ${dst}`)
}
