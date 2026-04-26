import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { listBrandsWithCounts } from "../actions"
import SignOutButton from "../../../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function CsBrandsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin/cs/brands")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) redirect("/pending")
  if (profile.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-3 text-xl font-bold text-slate-800">접근 권한 없음</h1>
          <p className="mt-2 text-sm text-slate-600">관리자 전용 페이지입니다.</p>
          <Link href="/cafe-writer" className="mt-5 inline-block rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-4 py-2">
            카페 원고 생성기로
          </Link>
        </div>
      </main>
    )
  }

  const brands = await listBrandsWithCounts()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-700">← 관리자 홈</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">CS 브랜드 관리</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/admin/cs/guidelines" className="rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 font-medium">
              📋 글로벌 가이드라인
            </Link>
            <span className="text-slate-500 hidden sm:inline">{profile.email || user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">
          <div className="font-semibold text-slate-800 mb-1">ℹ️ 안내</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>브랜드별로 <b>식별 키워드 + 응대 자료(.md)</b> 를 등록해두면, 데스크탑 앱이 채팅 분석 시 자동으로 참조합니다.</li>
            <li>여기서 수정하면 데스크탑 앱이 다음 부팅 (또는 동기화) 때 자동 반영.</li>
            <li>모바일에서도 편집 가능 — 회의 중에 메모장 지침 → 여기에 붙여넣기 OK.</li>
          </ul>
        </div>

        {brands.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
            <div className="text-4xl">🏷️</div>
            <div className="mt-2 text-sm text-slate-600">아직 등록된 브랜드가 없습니다.</div>
            <div className="mt-1 text-xs text-slate-400">시드 스크립트(scripts/seed_cs_brands.mjs) 실행 또는 직접 추가</div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {brands.map((b) => (
              <li
                key={b.id}
                className={`rounded-2xl bg-white border p-5 ${b.active ? "border-slate-200" : "border-slate-300 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-800 truncate">{b.display_name}</div>
                      {!b.active && <span className="text-[10px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5">비활성</span>}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-slate-500">slug: {b.slug}</div>
                    {b.tagline && (
                      <div className="mt-2 text-xs text-slate-600 line-clamp-2">{b.tagline}</div>
                    )}
                  </div>
                  <Link
                    href={`/admin/cs/brands/${b.slug}`}
                    className="shrink-0 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-2"
                  >
                    편집 →
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] text-slate-500">파일</div>
                    <div className="text-sm font-bold text-slate-700">{b.file_count}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] text-slate-500">크기</div>
                    <div className="text-sm font-bold text-slate-700">{(b.total_bytes / 1024).toFixed(0)}KB</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] text-slate-500">키워드</div>
                    <div className="text-sm font-bold text-slate-700">{b.trigger_keywords?.length || 0}</div>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-400">
                  업데이트: {new Date(b.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
