import { NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/deck/supabase";
import type { DeckProfile } from "@/lib/deck/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT: Partial<DeckProfile> = {
  company_name: null,
  logo_url: null,
  accent1_hex: "D94A35",
  accent2_hex: "B8893E",
  default_categories: ["기획", "마케팅", "제품개발", "CS", "재무"],
  default_people: [],
  vocabulary: [],
};

export async function GET() {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  const { data, error } = await sb.from("deck_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data || { user_id: user.id, ...DEFAULT } });
}

export async function PUT(req: Request) {
  const { user, approved, sb } = await getApprovedUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인 필요" }, { status: 401 });
  if (!approved) return NextResponse.json({ ok: false, error: "승인 대기" }, { status: 403 });

  try {
    const body = (await req.json()) as Partial<DeckProfile>;
    const patch: Record<string, unknown> = { user_id: user.id };
    if (typeof body.company_name === "string" || body.company_name === null) patch.company_name = body.company_name;
    if (typeof body.logo_url === "string" || body.logo_url === null) patch.logo_url = body.logo_url;
    if (typeof body.accent1_hex === "string") patch.accent1_hex = body.accent1_hex.replace(/^#/, "");
    if (typeof body.accent2_hex === "string") patch.accent2_hex = body.accent2_hex.replace(/^#/, "");
    if (Array.isArray(body.default_categories)) patch.default_categories = body.default_categories;
    if (Array.isArray(body.default_people)) patch.default_people = body.default_people;
    if (Array.isArray(body.vocabulary)) patch.vocabulary = body.vocabulary;

    const { error } = await sb.from("deck_profiles").upsert(patch);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown" }, { status: 500 });
  }
}
