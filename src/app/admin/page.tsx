import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import AdminList, { type AdminRow } from "./AdminList"
import SignOutButton from "../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabase = createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin")

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

  // service_role 로 전체 유저 목록 조회
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdminClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 200 })
  const { data: profilesList } = await admin
    .from("profiles")
    .select("id, email, approved, role, created_at")

  const profileMap = new Map<string, Pick<AdminRow, "approved" | "role" | "created_at">>()
  for (const p of profilesList || []) {
    profileMap.set(p.id, { approved: p.approved, role: p.role, created_at: p.created_at })
  }

  const rows: AdminRow[] = (authList?.users || []).map((u) => {
    const meta = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email || "(no email)",
      created_at: meta?.created_at || u.created_at,
      approved: meta?.approved ?? false,
      role: meta?.role || "user",
      email_confirmed: Boolean(u.email_confirmed_at),
    }
  })

  // 정렬: 미승인 → 최신 가입순
  rows.sort((a, b) => {
    if (a.approved !== b.approved) return a.approved ? 1 : -1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const pendingCount = rows.filter((r) => !r.approved).length
  const approvedCount = rows.length - pendingCount

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-pink-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">← 홈</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">관리자 페이지</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/admin/cs/brands" className="rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 font-medium">
              🏷️ CS 브랜드
            </Link>
            <Link href="/admin/templates" className="rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 font-medium">
              📦 제품 템플릿
            </Link>
            <Link href="/cafe-writer" className="rounded-lg bg-white border border-slate-300 text-slate-700 px-3 py-1.5 hover:bg-slate-50">
              ☕ 원고 생성기
            </Link>
            <span className="text-slate-500 hidden sm:inline">{profile.email || user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white border border-amber-200 p-4">
            <div className="text-xs text-amber-700">승인 대기</div>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          </div>
          <div className="rounded-2xl bg-white border border-emerald-200 p-4">
            <div className="text-xs text-emerald-700">승인된 크루</div>
            <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-500">총 유저</div>
            <div className="text-2xl font-bold text-slate-700">{rows.length}</div>
          </div>
        </div>

        <AdminList rows={rows} selfId={user.id} />
      </div>
    </main>
  )
}
