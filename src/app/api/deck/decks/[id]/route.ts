import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/deck/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  const { data, error } = await sb.from("decks").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, deck: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const allowed = ["title", "meeting_date", "extracted", "supplements", "people_mapping", "status"];
    for (const k of allowed) if (k in body) patch[k] = body[k];
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true });
    const { error } = await sb.from("decks").update(patch).eq("id", params.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  const { error } = await sb.from("decks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
