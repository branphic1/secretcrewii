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
const email = process.argv[2]
const password = process.argv[3]

if (!url || !serviceKey) {
  console.error("Supabase env missing in .env.local")
  process.exit(1)
}
if (!email || !password) {
  console.error("Usage: node create_master_user.mjs <email> <password>")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error(listErr.message); process.exit(1) }

let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

if (user) {
  console.log(`✓ 이미 존재: ${user.email} (id: ${user.id}) — 비번/확인 갱신`)
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (error) { console.error("updateUser 실패:", error.message); process.exit(1) }
} else {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) { console.error("createUser 실패:", error.message); process.exit(2) }
  user = created.user
  console.log(`✓ 생성됨: ${user.email} (id: ${user.id})`)
}

const { data: profile, error: selErr } = await admin
  .from("profiles")
  .select("id")
  .eq("id", user.id)
  .maybeSingle()
if (selErr) { console.error("profiles 조회 실패:", selErr.message); process.exit(1) }

if (!profile) {
  const { error } = await admin.from("profiles").insert({
    id: user.id, email: user.email, approved: true, role: "admin",
  })
  if (error) { console.error("profiles insert 실패:", error.message); process.exit(1) }
  console.log("✓ profiles 새로 생성 (approved=true, role=admin)")
} else {
  const { error } = await admin.from("profiles").update({
    approved: true, role: "admin",
  }).eq("id", user.id)
  if (error) { console.error("profiles update 실패:", error.message); process.exit(1) }
  console.log("✓ profiles 갱신 (approved=true, role=admin)")
}

console.log(`\n🎉 만능 계정 준비 완료`)
console.log(`  이메일: ${email}`)
console.log(`  비번: ${password}`)
console.log(`  approved: true / role: admin`)
