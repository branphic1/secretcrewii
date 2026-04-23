import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import CafeWriterApp from "./CafeWriterApp"
import SignOutButton from "../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function CafeWriterPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/cafe-writer")

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) redirect("/pending")

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-pink-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">← 홈</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">카페 바이럴 원고 생성기</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">{profile.email || user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <CafeWriterApp />
    </main>
  )
}
