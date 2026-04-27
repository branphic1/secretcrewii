import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

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
    .select("approved, role")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) {
    return NextResponse.json({ error: "승인된 계정만 사용할 수 있습니다." }, { status: 403 })
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "관리자 전용 기능입니다." }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "파일 파싱 실패" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 첨부되지 않았어요." }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "10MB 이하 파일만 업로드 가능해요." }, { status: 400 })
  }

  const name = file.name.toLowerCase()
  const buf = Buffer.from(await file.arrayBuffer())

  try {
    let text = ""

    if (name.endsWith(".txt") || name.endsWith(".md")) {
      // 텍스트 파일은 utf-8 가정
      text = buf.toString("utf-8")
    } else if (name.endsWith(".docx")) {
      const mammoth = (await import("mammoth")).default
      const result = await mammoth.extractRawText({ buffer: buf })
      text = result.value
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "구버전 .doc 형식은 지원 안 해요. .docx 로 저장하거나 .txt 로 붙여넣어주세요." },
        { status: 400 }
      )
    } else if (name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "PDF 는 아직 지원 안 해요. 텍스트 복사해서 직접 붙여넣어주세요." },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: ".txt 또는 .docx 파일만 업로드 가능해요." },
        { status: 400 }
      )
    }

    text = text.replace(/\r\n/g, "\n").replace(/ /g, " ").trim()
    if (!text) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출하지 못했어요." }, { status: 400 })
    }

    return NextResponse.json({
      text,
      filename: file.name,
      length: text.length,
    })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json(
      { error: err?.message || "파일 처리 중 오류" },
      { status: 500 }
    )
  }
}
