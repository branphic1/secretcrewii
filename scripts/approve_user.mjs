import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=")
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const targetEmail = process.argv[2]

if (!url || !serviceKey) {
  console.error("Supabase env missing in .env.local")
  process.exit(1)
}
if (!targetEmail) {
  console.error("Usage: node approve_user.mjs <email>")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 가입된 유저 찾기
const { data: list, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) {
  console.error("listUsers error:", listErr.message)
  process.exit(1)
}

const user = list.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase())
if (!user) {
  console.error(`사용자를 찾을 수 없음: ${targetEmail}`)
  console.log(
    "현재 등록된 이메일들:",
    list.users.map((u) => u.email)
  )
  process.exit(2)
}
console.log(`✓ 유저 발견: ${user.email} (id: ${user.id})`)
console.log(`  email_confirmed_at: ${user.email_confirmed_at || "(미인증)"}`)

// 이메일 확인이 안 됐으면 관리자 권한으로 확인 처리
if (!user.email_confirmed_at) {
  const { error: confirmErr } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })
  if (confirmErr) console.error("이메일 확인 처리 실패:", confirmErr.message)
  else console.log("✓ 이메일 자동 확인 처리 완료")
}

// profiles 행이 있는지 확인, 없으면 생성, 있으면 approved=true
const { data: profile, error: selErr } = await admin
  .from("profiles")
  .select("id, approved, email")
  .eq("id", user.id)
  .maybeSingle()
if (selErr) {
  console.error("profiles 조회 실패:", selErr.message)
  process.exit(1)
}

if (!profile) {
  const { error: insErr } = await admin
    .from("profiles")
    .insert({ id: user.id, email: user.email, approved: true })
  if (insErr) { console.error("profiles insert 실패:", insErr.message); process.exit(1) }
  console.log("✓ profiles 행 새로 생성 + approved=true")
} else {
  const { error: updErr } = await admin
    .from("profiles")
    .update({ approved: true })
    .eq("id", user.id)
  if (updErr) { console.error("approved 업데이트 실패:", updErr.message); process.exit(1) }
  console.log(`✓ approved 토글 완료 (이전: ${profile.approved})`)
}

console.log("\n🎉 모든 작업 완료. 이제 /cafe-writer 접근 가능합니다.")
