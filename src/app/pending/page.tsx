import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SignOutButton from "./SignOutButton"

export const dynamic = "force-dynamic"

export default async function PendingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, email, created_at")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.approved) {
    redirect("/cafe-writer")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-900/40 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl ring-1 ring-white/10 p-8 text-white text-center">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-4 text-2xl font-bold">승인 대기 중</h1>
        <p className="mt-2 text-sm text-white/70">
          가입 요청이 접수됐어요. 관리자가 승인하면 툴을 사용할 수 있습니다.
        </p>

        <div className="mt-6 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-left text-xs font-mono text-white/70 space-y-1">
          <div>이메일: <span className="text-white">{profile?.email || user.email}</span></div>
          <div>가입일시: <span className="text-white">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
              : "-"}
          </span></div>
          <div>상태: <span className="text-amber-300">미승인</span></div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white/10 hover:bg-white/20 transition px-4 py-2 text-xs"
          >
            홈으로
          </Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
