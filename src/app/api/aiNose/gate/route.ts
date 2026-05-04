import { NextResponse } from "next/server";
import { verifyGateCredentials, setGateCookie, clearGateCookie } from "@/lib/aiNose/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { user?: string; pass?: string };
    const user = String(body.user ?? "");
    const pass = String(body.pass ?? "");
    if (!user || !pass) {
      return NextResponse.json({ ok: false, error: "ID/PW 를 입력해 주세요." }, { status: 400 });
    }
    if (!verifyGateCredentials(user, pass)) {
      return NextResponse.json({ ok: false, error: "ID 또는 비밀번호가 틀렸어요." }, { status: 401 });
    }
    await setGateCookie(user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  clearGateCookie();
  return NextResponse.json({ ok: true });
}
