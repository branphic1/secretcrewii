// Secretcrewii Cafe Writer — Electron entry point
// Spawns a local Next.js standalone server, opens a Chromium window pointing to it,
// and routes /api/generate-cafe through `claude -p` (Claude Code CLI Max OAuth).

const path = require("path")
const fs = require("fs")
const os = require("os")

// 진단 로그: main.js 가 로드된 순간을 기록 (앱 일찍 죽으면 이걸로 추적)
const earlyLog = (msg) => {
  try {
    const tmpLog = path.join(os.tmpdir(), "cafe-writer-boot.log")
    fs.appendFileSync(tmpLog, `[${new Date().toISOString()}] ${msg}\n`, "utf8")
  } catch {}
}
earlyLog("=== main.js loaded ===")
earlyLog(`process.argv: ${JSON.stringify(process.argv)}`)
earlyLog(`process.execPath: ${process.execPath}`)
earlyLog(`process.versions.electron: ${process.versions.electron}`)
earlyLog(`process.type: ${process.type}`)
earlyLog(`process.resourcesPath: ${process.resourcesPath}`)

const { app, BrowserWindow, dialog, shell, Menu } = require("electron")
earlyLog(`require('electron') OK, app defined: ${!!app}`)

const { spawn, spawnSync } = require("child_process")
const http = require("http")

earlyLog(`app.isPackaged: ${app && app.isPackaged}`)

const isDev = !app.isPackaged
const PORT = process.env.SCW_PORT ? Number(process.env.SCW_PORT) : 3210

let nextProcess = null
let mainWindow = null

function standaloneDir() {
  // 패키징됐으면 resources/nextjs/standalone, 아니면 프로젝트의 .next/standalone
  return isDev
    ? path.resolve(__dirname, "..", ".next", "standalone")
    : path.join(process.resourcesPath, "nextjs", "standalone")
}

function standaloneServerPath() {
  return path.join(standaloneDir(), "server.js")
}

function loadEnv() {
  // 패키지에 박힌 .env (배포용) → 없으면 dev 의 .env.local 으로 폴백
  const candidates = isDev
    ? [
        path.resolve(__dirname, "..", ".env.production"),
        path.resolve(__dirname, "..", ".env.local"),
      ]
    : [path.join(process.resourcesPath, "nextjs", ".env.production")]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const content = fs.readFileSync(file, "utf8")
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
      const idx = trimmed.indexOf("=")
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function checkClaudeCli() {
  try {
    const result = spawnSync(process.platform === "win32" ? "claude.cmd" : "claude", ["--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    })
    if (result.status === 0) return true
  } catch {}
  return false
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) resolve()
        else if (Date.now() - start > timeoutMs) reject(new Error("server start timeout"))
        else setTimeout(tick, 250)
      })
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("server start timeout"))
        else setTimeout(tick, 250)
      })
      req.setTimeout(2000, () => req.destroy())
    }
    tick()
  })
}

function startNextServer() {
  const serverFile = standaloneServerPath()
  if (!fs.existsSync(serverFile)) {
    dialog.showErrorBox(
      "빌드 누락",
      `Next.js standalone 빌드가 없습니다.\n경로: ${serverFile}\n\n개발자에게 'NEXT_OUTPUT=standalone npm run build' 실행 후 재패키징을 요청하세요.`
    )
    app.quit()
    return null
  }

  const env = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: "127.0.0.1",
    BACKEND_MODE: "local-cli",
    NEXT_TELEMETRY_DISABLED: "1",
    // 핵심: Electron 바이너리를 Node 로 실행시키는 플래그
    ELECTRON_RUN_AS_NODE: "1",
  }

  // 진단을 위해 stdout/stderr 를 user data dir 에 남김
  const logPath = path.join(app.getPath("userData"), "cafe-writer-server.log")
  const logStream = fs.createWriteStream(logPath, { flags: "a" })
  logStream.write(`\n=== ${new Date().toISOString()} starting server.js ${serverFile} ===\n`)

  const proc = spawn(process.execPath, [serverFile], {
    cwd: path.dirname(serverFile),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  proc.stdout.on("data", (d) => {
    process.stdout.write(`[next] ${d}`)
    logStream.write(d)
  })
  proc.stderr.on("data", (d) => {
    process.stderr.write(`[next] ${d}`)
    logStream.write(d)
  })
  proc.on("exit", (code) => {
    process.stdout.write(`[next] exited with code ${code}\n`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`document.title='⚠ 서버 종료됨'`)
    }
  })

  return proc
}

async function createWindow() {
  loadEnv()

  if (!checkClaudeCli()) {
    const { response } = await dialog.showMessageBox({
      type: "warning",
      title: "Claude Code 가 설치돼있지 않아요",
      message: "이 앱은 Claude Max 를 통해 글을 생성합니다.",
      detail:
        "터미널을 열고 다음 두 줄을 실행해주세요:\n\n" +
        "  npm i -g @anthropic-ai/claude-code\n" +
        "  claude login\n\n" +
        "설치/로그인 후 이 앱을 다시 실행하세요. 무시하고 계속하면 원고 생성이 실패합니다.",
      buttons: ["설치 안내 페이지 열기", "무시하고 계속"],
      defaultId: 0,
    })
    if (response === 0) {
      shell.openExternal("https://docs.claude.com/en/docs/claude-code/quickstart")
      app.quit()
      return
    }
  }

  nextProcess = startNextServer()
  if (!nextProcess) return

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/`)
  } catch (e) {
    dialog.showErrorBox("서버 시작 실패", String(e))
    app.quit()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "시크릿크루 카페 원고 생성기",
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 외부 링크 (mailto, http 등) 는 기본 브라우저로
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.startsWith(`http://127.0.0.1:${PORT}`)) {
      shell.openExternal(url)
      return { action: "deny" }
    }
    return { action: "allow" }
  })

  await mainWindow.loadURL(`http://127.0.0.1:${PORT}/cafe-writer`)
}

// 단순 메뉴
function buildMenu() {
  const template = [
    {
      label: "파일",
      submenu: [
        { role: "reload", label: "새로고침" },
        { role: "forceReload", label: "강력 새로고침" },
        { type: "separator" },
        { role: "quit", label: "종료" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { role: "togglefullscreen", label: "전체화면" },
        { role: "zoomIn", label: "확대" },
        { role: "zoomOut", label: "축소" },
        { role: "resetZoom", label: "기본 크기" },
        { type: "separator" },
        { role: "toggleDevTools", label: "개발자 도구" },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  buildMenu()
  await createWindow()
})

app.on("window-all-closed", () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill()
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  if (nextProcess && !nextProcess.killed) nextProcess.kill()
})

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow()
  }
})
