import { NextResponse } from "next/server"
import { spawn } from "node:child_process"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

type Keyword = { text: string; count: number }

type Body = {
  contentGuide?: string
  guideline?: string
  example?: string
  charCount?: number
  keywords?: Keyword[]
  model?: string
  maxTokens?: number
  temperature?: number
}

function buildPrompt(b: Required<Omit<Body, "model" | "maxTokens" | "temperature">>): string {
  const { contentGuide, guideline, example, charCount, keywords } = b
  const lines: string[] = []
  lines.push("너는 카페 바이럴 원고 작성 전문가야. 아래 조건에 맞춰 자연스러운 한국어 바이럴 원고 본문을 작성해.")
  lines.push("")

  if (contentGuide && contentGuide.trim().length > 0) {
    lines.push("[컨텐츠 가이드]")
    lines.push(contentGuide.trim())
    lines.push("")
  }

  lines.push("[작성 지침]")
  lines.push(guideline)
  lines.push("")
  lines.push(`[본문 글자수] 약 ${charCount}자 (±10%)`)
  lines.push("")

  const valid = keywords.filter((k) => k.text && k.text.trim().length > 0)
  if (valid.length > 0) {
    lines.push("[필수 키워드 및 반복 횟수]")
    lines.push("아래 키워드를 지정된 횟수만큼 정확히 포함해. 자연스럽게 녹여야 함.")
    for (const k of valid) {
      lines.push(`- ${k.text.trim()}: 정확히 ${Math.max(1, k.count)}회`)
    }
    lines.push("")
  }

  if (example && example.trim().length > 0) {
    lines.push("[참고 예시 — 스타일과 톤만 참고, 내용 복사 금지]")
    lines.push(example.trim())
    lines.push("")
  }

  lines.push("[출력 규칙]")
  lines.push("- 원고 본문만 출력 (제목, 메타설명, 해설, 마크다운 금지)")
  lines.push("- 키워드 반복 횟수를 정확히 맞출 것")
  lines.push("- 자연스럽고 매력적인 한국어")

  return lines.join("\n")
}

async function callViaApi(prompt: string, model: string, maxTokens: number, temperature: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    })

    const text = await resp.text()
    if (!resp.ok) {
      let msg = `API ${resp.status}`
      try {
        const j = JSON.parse(text) as { error?: { message?: string }; message?: string }
        msg = j?.error?.message || j?.message || msg
      } catch {
        msg = text.slice(0, 300) || msg
      }
      throw new Error(msg)
    }

    let content = ""
    try {
      const j = JSON.parse(text) as { content?: Array<{ type?: string; text?: string }> }
      if (Array.isArray(j?.content)) {
        content = j.content
          .filter((blk) => blk?.type === "text" && typeof blk.text === "string")
          .map((blk) => blk.text as string)
          .join("\n")
          .trim()
      }
    } catch {}

    if (!content) throw new Error("응답에서 원고 텍스트를 찾지 못했어요.")
    return content
  } finally {
    clearTimeout(timeout)
  }
}

async function callViaClaudeCodeCLI(prompt: string): Promise<string> {
  const bin = process.env.CLAUDE_CODE_BIN || "claude"
  const isWin = process.platform === "win32"
  return new Promise<string>((resolve, reject) => {
    // Windows 는 claude.cmd 등 확장자 처리 위해 shell:true 가 안전
    const child = spawn(bin, ["-p"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWin,
    })

    let stdout = ""
    let stderr = ""

    const killTimer = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error("Claude Code CLI 응답 시간 초과 (180초)"))
    }, 180_000)

    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString("utf8")
    })
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString("utf8")
    })

    child.on("error", (err) => {
      clearTimeout(killTimer)
      reject(new Error(`Claude Code CLI 실행 실패: ${err.message}. 'claude' 명령이 PATH 에 있는지 확인하세요.`))
    })

    child.on("close", (code) => {
      clearTimeout(killTimer)
      if (code !== 0) {
        reject(new Error(`Claude Code CLI 종료 코드 ${code}: ${stderr.slice(0, 500)}`))
        return
      }
      const text = stdout.trim()
      if (!text) {
        reject(new Error(`Claude Code CLI 응답이 비어있어요. stderr: ${stderr.slice(0, 300)}`))
        return
      }
      resolve(text)
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) {
    return NextResponse.json({ error: "승인된 계정만 사용할 수 있습니다." }, { status: 403 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 본문 파싱 실패" }, { status: 400 })
  }

  const guideline = (body.guideline || "").trim()
  if (!guideline) {
    return NextResponse.json({ error: "지침은 필수입니다." }, { status: 400 })
  }

  const model = body.model || "claude-sonnet-4-6"
  const maxTokens = Math.min(Math.max(body.maxTokens ?? 2000, 256), 8192)
  const temperature = Math.min(Math.max(body.temperature ?? 0.8, 0), 1)
  const charCount = Math.min(Math.max(body.charCount ?? 500, 50), 5000)
  const contentGuide = (body.contentGuide || "").toString()
  const example = (body.example || "").toString()
  const keywords: Keyword[] = Array.isArray(body.keywords)
    ? body.keywords.slice(0, 10).map((k) => ({
        text: String(k?.text ?? "").slice(0, 100),
        count: Math.max(1, Math.min(20, Number(k?.count ?? 1) || 1)),
      }))
    : []

  const prompt = buildPrompt({ contentGuide, guideline, example, charCount, keywords })
  const mode = (process.env.BACKEND_MODE || "api").toLowerCase()

  try {
    let content: string
    if (mode === "local-cli") {
      content = await callViaClaudeCodeCLI(prompt)
    } else {
      content = await callViaApi(prompt, model, maxTokens, temperature)
    }
    return NextResponse.json({ content, model, mode })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err?.message || "알 수 없는 오류", mode }, { status: 502 })
  }
}
