import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { listTemplates } from "../../cafe-writer/template-actions"
import TemplatesManager from "./TemplatesManager"
import SignOutButton from "../../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function AdminTemplatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin/templates")

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

  const templates = await listTemplates()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-pink-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-700">← 관리자 홈</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">제품 템플릿 관리</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/cafe-writer" className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 hover:bg-slate-50">
              ☕ 원고 생성기
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
            <li>제품별로 <b>지침 + 예시원고</b> 세트를 저장해두면, 크루들이 `/cafe-writer` 에서 버튼 한 번으로 불러올 수 있어요.</li>
            <li>여기서 수정하면 다음번 불러오기부터 자동으로 반영됩니다.</li>
            <li>이미 써둔 원고는 덮어씌우지 않으니 걱정 없이 수정 가능.</li>
          </ul>
        </div>

        <TemplatesManager initialTemplates={templates} />
      </div>
    </main>
  )
}
