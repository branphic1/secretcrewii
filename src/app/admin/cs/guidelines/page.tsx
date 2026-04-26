import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getActiveGuidelines } from "../actions"
import GuidelinesEditor from "./GuidelinesEditor"
import SignOutButton from "../../../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function GlobalGuidelinesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin/cs/guidelines")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) redirect("/pending")
  if (profile.role !== "admin") redirect("/admin")

  const current = await getActiveGuidelines()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-rose-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/admin/cs/brands" className="text-xs text-slate-500 hover:text-slate-700">← CS 브랜드 관리</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">📋 전 브랜드 공통 가이드라인</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">{profile.email || user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">
          <div className="font-semibold text-slate-800 mb-1">ℹ️ 안내</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>모든 브랜드에 공통 적용되는 톤·금지어·needs_human 트리거.</li>
            <li>브랜드별 특수 규칙은 각 브랜드의 자료 파일에 작성하세요.</li>
            <li>저장 시 버전이 자동 증가합니다. <code className="bg-slate-100 px-1 rounded">active=true</code> 행은 항상 1개.</li>
          </ul>
        </div>

        <GuidelinesEditor initial={current} />
      </div>
    </main>
  )
}
