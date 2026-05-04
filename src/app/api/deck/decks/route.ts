import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/deck/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  const { data, error } = await sb
    .from("decks")
    .select("id, title, meeting_date, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, decks: data || [] });
}

export async function POST(req: Request) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  try {
    const body = (await req.json()) as { title?: string; meetingDate?: string; rawTranscript?: string };
    const title = String(body.title || "").trim();
    const raw = String(body.rawTranscript || "").trim();
    if (!title) return NextResponse.json({ ok: false, error: "회의명을 입력해 주세요." }, { status: 400 });
    if (!raw) return NextResponse.json({ ok: false, error: "회의록 텍스트가 비어있어요." }, { status: 400 });
    const meetingDate = body.meetingDate ? new Date(body.meetingDate).toISOString() : new Date().toISOString();

    const { data, error } = await sb
      .from("decks")
      .insert({
        user_id: user.id,
        title,
        meeting_date: meetingDate,
        raw_transcript: raw,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deckId: data.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
