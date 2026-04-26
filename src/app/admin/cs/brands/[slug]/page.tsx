import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getBrandBySlug } from "../../actions"
import BrandEditor from "./BrandEditor"
import SignOutButton from "../../../../pending/SignOutButton"

export const dynamic = "force-dynamic"

export default async function BrandDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/admin/cs/brands/${params.slug}`)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved) redirect("/pending")
  if (profile.role !== "admin") redirect("/admin")

  let brandData
  try {
    brandData = await getBrandBySlug(params.slug)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3">
          <div>
            <Link href="/admin/cs/brands" className="text-xs text-slate-500 hover:text-slate-700">← 브랜드 목록</Link>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">{brandData.brand.display_name}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 hidden sm:inline">{profile.email || user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6">
        <BrandEditor initialBrand={brandData.brand} initialFiles={brandData.files} />
      </div>
    </main>
  )
}
