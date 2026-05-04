import { NextResponse } from "next/server";
import { createAiNoseAdmin } from "@/lib/aiNose/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 회의 목록 조회
export async function GET() {
  const sb = createAiNoseAdmin();
  const { data, error } = await sb
    .from("ainose_meetings")
    .select("id, title, meeting_date, status, executive_summary, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, meetings: data || [] });
}

// 신규 회의 생성 + 원본 트랜스크립트 저장
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      meetingDate?: string;
      rawTranscript?: string;
    };
    const title = String(body.title || "").trim();
    const rawTranscript = String(body.rawTranscript || "").trim();
    if (!title) return NextResponse.json({ ok: false, error: "회의명을 입력해 주세요." }, { status: 400 });
    if (!rawTranscript) {
      return NextResponse.json({ ok: false, error: "원본 텍스트가 비어있어요." }, { status: 400 });
    }
    const meetingDate = body.meetingDate ? new Date(body.meetingDate).toISOString() : new Date().toISOString();

    const sb = createAiNoseAdmin();
    const { data, error } = await sb
      .from("ainose_meetings")
      .insert({
        title,
        meeting_date: meetingDate,
        raw_transcript: rawTranscript,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, meetingId: data.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}
