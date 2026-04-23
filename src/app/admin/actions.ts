"use server"

import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

async function assertAdmin() {
  const supabase = createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("로그인 필요")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.approved || profile.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.")
  }
  return user
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error("Supabase service credentials missing")
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function approveUser(userId: string) {
  await assertAdmin()
  const service = getServiceClient()

  // 이메일 미인증이면 자동 확인 처리
  const { data: target } = await service.auth.admin.getUserById(userId)
  if (target?.user && !target.user.email_confirmed_at) {
    await service.auth.admin.updateUserById(userId, { email_confirm: true })
  }

  const { error } = await service
    .from("profiles")
    .update({ approved: true })
    .eq("id", userId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin")
}

export async function unapproveUser(userId: string) {
  const self = await assertAdmin()
  if (self.id === userId) throw new Error("본인 계정은 취소할 수 없어요.")

  const service = getServiceClient()
  const { error } = await service
    .from("profiles")
    .update({ approved: false })
    .eq("id", userId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin")
}

export async function deleteUser(userId: string) {
  const self = await assertAdmin()
  if (self.id === userId) throw new Error("본인 계정은 삭제할 수 없어요.")

  const service = getServiceClient()
  // auth.users 삭제 → profiles 는 ON DELETE CASCADE 로 자동 제거됨
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  revalidatePath("/admin")
}

export async function setAdminRole(userId: string, makeAdmin: boolean) {
  const self = await assertAdmin()
  if (self.id === userId && !makeAdmin) {
    throw new Error("본인의 admin 권한은 해제할 수 없어요.")
  }

  const service = getServiceClient()
  const { error } = await service
    .from("profiles")
    .update({ role: makeAdmin ? "admin" : "user" })
    .eq("id", userId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin")
}
