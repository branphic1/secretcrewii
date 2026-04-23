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
  console.error("Usage: node set_admin.mjs <email>")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: listErr } = await admin.auth.admin.listUsers()
if (listErr) { console.error(listErr.message); process.exit(1) }

const user = list.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase())
if (!user) { console.error(`유저 없음: ${targetEmail}`); process.exit(2) }

const { error: updErr } = await admin
  .from("profiles")
  .update({ role: "admin", approved: true })
  .eq("id", user.id)

if (updErr) { console.error(updErr.message); process.exit(1) }

console.log(`✓ ${targetEmail} → role=admin, approved=true`)
