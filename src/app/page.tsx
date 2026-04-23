import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function checkSupabase() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false as const, message: error.message };
    }
    return {
      ok: true as const,
      hasSession: Boolean(data.session),
    };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export default async function Home() {
  const deployedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const supabaseStatus = await checkSupabase();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white/10 backdrop-blur-md shadow-2xl ring-1 ring-white/20 p-10 text-center text-white">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          🚀 secretcrewii
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-white/90">
          시크릿크루 바이브코딩 1일차
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm font-mono">
          <span className="opacity-70">Deployed at</span>
          <span className="font-semibold">{deployedAt}</span>
          <span className="opacity-70">KST</span>
        </div>

        <div className="mt-8 pt-6 border-t border-white/20">
          {supabaseStatus.ok ? (
            <div className="space-y-1">
              <p className="text-base font-semibold">✅ Supabase Connected</p>
              <p className="text-xs text-white/70 font-mono">
                session: {supabaseStatus.hasSession ? "active" : "anonymous"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-base font-semibold">❌ Supabase Error</p>
              <p className="text-xs text-white/80 font-mono break-all">
                {supabaseStatus.message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/time-ledger"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 transition px-5 py-2.5 text-sm font-medium ring-1 ring-white/20"
          >
            ⏳ Time Ledger 열기 <span className="opacity-70">→</span>
          </Link>
          <p className="text-xs text-white/60">시간의 궤적 · 일간 · 월간 · 연간 · 블라인드 스팟</p>

          <div className="pt-3 border-t border-white/10" />

          <Link
            href="/cafe-writer"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 transition px-5 py-2.5 text-sm font-medium ring-1 ring-white/20"
          >
            ☕ 카페 원고 생성기 열기 <span className="opacity-70">→</span>
          </Link>
          <p className="text-xs text-white/60">로그인 & 승인 필요 · 내부 크루 전용</p>

          {!supabaseStatus.ok || !supabaseStatus.hasSession ? (
            <div className="pt-2 flex items-center justify-center gap-2 text-xs">
              <Link href="/login" className="text-white/80 hover:text-white underline underline-offset-2">로그인</Link>
              <span className="text-white/30">·</span>
              <Link href="/signup" className="text-white/80 hover:text-white underline underline-offset-2">회원가입</Link>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
