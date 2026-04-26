"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type CsBrand = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  greeting: string | null
  trigger_keywords: string[]
  products: string[]
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CsBrandFile = {
  id: string
  brand_id: string
  filename: string
  purpose: string | null
  content: string
  size_bytes: number
  sort_order: number
  updated_at: string
}

export type CsGlobalGuidelines = {
  id: string
  content: string
  version: number
  active: boolean
  note: string | null
  updated_at: string
}

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("로그인 필요")
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.approved || profile.role !== "admin") {
    throw new Error("관리자 권한 필요")
  }
  return { supabase, user }
}

// ── 목록 조회 (브랜드 + 파일 카운트) ───────────────────────
export async function listBrandsWithCounts() {
  const { supabase } = await requireAdmin()
  const { data: brands, error } = await supabase
    .from("cs_brands")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true })
  if (error) throw new Error(error.message)

  // 파일 카운트
  const { data: files } = await supabase
    .from("cs_brand_files")
    .select("brand_id, size_bytes")
  const counts = new Map<string, { count: number; bytes: number }>()
  for (const f of files || []) {
    const cur = counts.get(f.brand_id) || { count: 0, bytes: 0 }
    cur.count++
    cur.bytes += f.size_bytes || 0
    counts.set(f.brand_id, cur)
  }

  return (brands || []).map((b) => ({
    ...(b as CsBrand),
    file_count: counts.get(b.id)?.count || 0,
    total_bytes: counts.get(b.id)?.bytes || 0,
  }))
}

// ── 브랜드 1건 + 파일 목록 ────────────────────────────────
export async function getBrandBySlug(slug: string) {
  const { supabase } = await requireAdmin()
  const { data: brand, error } = await supabase
    .from("cs_brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!brand) throw new Error(`브랜드 '${slug}' 없음`)

  const { data: files } = await supabase
    .from("cs_brand_files")
    .select("*")
    .eq("brand_id", brand.id)
    .order("sort_order", { ascending: true })
    .order("filename", { ascending: true })

  return { brand: brand as CsBrand, files: (files || []) as CsBrandFile[] }
}

// ── 브랜드 메타 업데이트 ──────────────────────────────────
export async function updateBrand(
  id: string,
  patch: Partial<Pick<CsBrand,
    "display_name" | "tagline" | "greeting" |
    "trigger_keywords" | "products" | "active" | "sort_order"
  >>,
) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from("cs_brands")
    .update(patch)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/cs/brands")
  revalidatePath(`/admin/cs/brands/${data.slug}`)
  return data as CsBrand
}

// ── 새 브랜드 생성 ────────────────────────────────────────
export async function createBrand(input: {
  slug: string
  display_name: string
  tagline?: string
  greeting?: string
  trigger_keywords?: string[]
  products?: string[]
}) {
  const { supabase } = await requireAdmin()
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
  if (!slug) throw new Error("slug 형식 오류 (영문 소문자/숫자/_-만)")
  const { data, error } = await supabase
    .from("cs_brands")
    .insert({
      slug,
      display_name: input.display_name.trim(),
      tagline: input.tagline?.trim() || null,
      greeting: input.greeting?.trim() || null,
      trigger_keywords: input.trigger_keywords || [],
      products: input.products || [],
      active: true,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/cs/brands")
  return data as CsBrand
}

export async function deleteBrand(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("cs_brands").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/cs/brands")
}

// ── 파일 CRUD ─────────────────────────────────────────────
export async function upsertFile(input: {
  id?: string
  brand_id: string
  filename: string
  purpose?: string | null
  content: string
}) {
  const { supabase, user } = await requireAdmin()
  const filename = input.filename.trim()
  if (!filename.endsWith(".md")) throw new Error("파일명은 .md 로 끝나야 합니다")
  const row = {
    brand_id: input.brand_id,
    filename,
    purpose: input.purpose ?? null,
    content: input.content,
    updated_by: user.id,
  }
  const { data, error } = input.id
    ? await supabase.from("cs_brand_files").update(row).eq("id", input.id).select().single()
    : await supabase.from("cs_brand_files").insert(row).select().single()
  if (error) throw new Error(error.message)

  // 슬러그 알아내서 revalidate
  const { data: br } = await supabase.from("cs_brands").select("slug").eq("id", input.brand_id).maybeSingle()
  if (br) revalidatePath(`/admin/cs/brands/${br.slug}`)
  return data as CsBrandFile
}

export async function deleteFile(id: string) {
  const { supabase } = await requireAdmin()
  const { data: f } = await supabase
    .from("cs_brand_files")
    .select("brand_id")
    .eq("id", id)
    .maybeSingle()
  const { error } = await supabase.from("cs_brand_files").delete().eq("id", id)
  if (error) throw new Error(error.message)
  if (f?.brand_id) {
    const { data: br } = await supabase.from("cs_brands").select("slug").eq("id", f.brand_id).maybeSingle()
    if (br) revalidatePath(`/admin/cs/brands/${br.slug}`)
  }
}

// ── 글로벌 가이드라인 ─────────────────────────────────────
export async function getActiveGuidelines() {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from("cs_global_guidelines")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as CsGlobalGuidelines | null
}

export async function updateActiveGuidelines(content: string, note?: string) {
  const { supabase, user } = await requireAdmin()
  // active 행 찾아서 업데이트 (있으면 같은 행 수정, 없으면 새로 생성하면서 active=true)
  const { data: cur } = await supabase
    .from("cs_global_guidelines")
    .select("id, version")
    .eq("active", true)
    .limit(1)
    .maybeSingle()
  if (cur) {
    const { data, error } = await supabase
      .from("cs_global_guidelines")
      .update({ content, note: note || null, updated_by: user.id, version: cur.version + 1 })
      .eq("id", cur.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    revalidatePath("/admin/cs/guidelines")
    return data as CsGlobalGuidelines
  }
  const { data, error } = await supabase
    .from("cs_global_guidelines")
    .insert({ content, active: true, version: 1, note: note || null, updated_by: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/admin/cs/guidelines")
  return data as CsGlobalGuidelines
}
