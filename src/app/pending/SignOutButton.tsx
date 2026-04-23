"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setLoading(false)
    router.replace("/login")
    router.refresh()
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg bg-rose-500/20 hover:bg-rose-500/30 transition px-4 py-2 text-xs text-rose-200 disabled:opacity-50"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  )
}
