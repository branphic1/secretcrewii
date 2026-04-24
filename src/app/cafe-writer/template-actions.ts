"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type ProductTemplate = {
  id: string
  name: string
  guideline: string
  example: string | null
  updated_at: string
}

async function requireApproved() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("로그인 필요")
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.approved) throw new Error("승인되지 않은 사용자")
  return { supabase, user, role: profile.role as string }
}

async function requireAdmin() {
  const ctx = await requireApproved()
  if (ctx.role !== "admin") throw new Error("관리자 권한이 필요합니다")
  return ctx
}

export async function listTemplates(): Promise<ProductTemplate[]> {
  const { supabase } = await requireApproved()
  const { data, error } = await supabase
    .from("product_templates")
    .select("id, name, guideline, example, updated_at")
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as ProductTemplate[]
}

export async function createTemplate(
  name: string,
  guideline: string,
  example: string,
): Promise<ProductTemplate> {
  const { supabase, user } = await requireAdmin()
  const n = name.trim()
  const g = guideline.trim()
  const e = example.trim()
  if (!n) throw new Error("제품명을 입력해주세요.")
  if (!g) throw new Error("지침을 입력해주세요.")

  const { data, error } = await supabase
    .from("product_templates")
    .insert({
      name: n,
      guideline: g,
      example: e || null,
      created_by: user.id,
    })
    .select("id, name, guideline, example, updated_at")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/admin/templates")
  revalidatePath("/cafe-writer")
  return data as ProductTemplate
}

export async function updateTemplate(
  id: string,
  name: string,
  guideline: string,
  example: string,
): Promise<ProductTemplate> {
  const { supabase } = await requireAdmin()
  const n = name.trim()
  const g = guideline.trim()
  const e = example.trim()
  if (!n) throw new Error("제품명을 입력해주세요.")
  if (!g) throw new Error("지침을 입력해주세요.")

  const { data, error } = await supabase
    .from("product_templates")
    .update({ name: n, guideline: g, example: e || null })
    .eq("id", id)
    .select("id, name, guideline, example, updated_at")
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/admin/templates")
  revalidatePath("/cafe-writer")
  return data as ProductTemplate
}

export async function deleteTemplate(id: string): Promise<void> {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from("product_templates").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/templates")
  revalidatePath("/cafe-writer")
}
