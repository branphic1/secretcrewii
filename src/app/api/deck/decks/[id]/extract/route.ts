import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/deck/supabase";
import { extractMeetingContent } from "@/lib/deck/claude";
import {
  parseClovaText,
  utterancesToCleanedTranscript,
  summarizeParticipants,
} from "@/lib/aiNose/clovaParser";
import type { DeckProfile } from "@/lib/deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  // 덱 로드
  const { data: deck, error: loadErr } = await sb.from("decks").select("*").eq("id", params.id).maybeSingle();
  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 500 });
  if (!deck) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!deck.raw_transcript) return NextResponse.json({ ok: false, error: "원본 텍스트 없음" }, { status: 400 });

  // 프로필 로드
  const { data: profile } = await sb.from("deck_profiles").select("*").eq("user_id", user.id).maybeSingle();

  await sb.from("decks").update({ status: "extracting", error_message: null }).eq("id", params.id);

  try {
    const utts = parseClovaText(deck.raw_transcript);
    if (utts.length === 0) throw new Error("발화를 찾지 못했어요. 클로바노트 형식인지 확인해 주세요.");
    const cleaned = utterancesToCleanedTranscript(utts);
    const partsCount = summarizeParticipants(utts);

    const extracted = await extractMeetingContent({
      cleanedTranscript: cleaned,
      meetingTitle: deck.title,
      meetingDate: deck.meeting_date,
      profile: profile as DeckProfile | null,
    });

    // utteranceCount 보정 (클로바 파싱 결과로)
    extracted.participants = extracted.participants.map((p) => ({
      ...p,
      utteranceCount: partsCount.find((x) => x.label === p.rawLabel)?.count ?? p.utteranceCount ?? 0,
    }));

    await sb
      .from("decks")
      .update({ extracted, status: "reviewing", error_message: null })
      .eq("id", params.id);

    return NextResponse.json({ ok: true, extracted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    await sb.from("decks").update({ status: "failed", error_message: msg }).eq("id", params.id);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
