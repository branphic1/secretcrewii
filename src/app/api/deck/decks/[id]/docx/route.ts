import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/deck/supabase";
import { buildDeckDocx } from "@/lib/deck/docxBuilder";
import type { Deck, DeckProfile } from "@/lib/deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  const { data: deck, error } = await sb.from("decks").select("*").eq("id", params.id).maybeSingle();
  if (error || !deck) return NextResponse.json({ ok: false, error: error?.message || "Not found" }, { status: 404 });
  if (!deck.extracted) return NextResponse.json({ ok: false, error: "추출 결과가 없어요." }, { status: 400 });

  const { data: profile } = await sb.from("deck_profiles").select("*").eq("user_id", user.id).maybeSingle();
  const buf = await buildDeckDocx(deck as Deck, profile as DeckProfile | null);

  const safeTitle = (deck.title || "deck").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  const dateStr = new Date(deck.meeting_date).toISOString().slice(0, 10);
  const fileName = encodeURIComponent(`${dateStr}_${safeTitle}_가이드.docx`);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename*=UTF-8''${fileName}`,
      "cache-control": "no-store",
    },
  });
}
