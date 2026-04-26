// 로컬 ocr/prompts/brands/* 자료를 Supabase 의 cs_brands / cs_brand_files /
// cs_global_guidelines 로 시딩.
// 실행: node scripts/seed_cs_brands.mjs
//
// - 같은 slug 가 이미 있으면 upsert (덮어쓰기)
// - global_guidelines 는 active=true 행을 한 개로 유지

import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { resolve, join } from "node:path"

// ── env 로드 ────────────────────────────────────────────
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
if (!url || !serviceKey) {
  console.error("[ERROR] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.")
  process.exit(1)
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 브랜드 메타 (Python build_prompts.py 와 동기화) ─────
const BRANDS_META = {
  ainose: {
    display_name: "아이노즈 (Ainose)",
    tagline: "콧물흡입기 전문 브랜드 / Class 2 의료기기 / 감압식 안전 밸브 특허",
    greeting: "안녕하세요 고객님, 막힘 없는 육아의 조용한 쉼표 아이노즈입니다",
    trigger_keywords: [
      "콧물흡입기", "콧물", "코막힘", "흡입기", "콧물흡입",
      "감압식", "안전 밸브", "아이노즈",
    ],
    products: [
      "[특허받은] 아이노즈 무선 콧물흡입기",
      "신생아 감압식 휴대용 흡입기 (249,000원)",
    ],
    sort_order: 1,
  },
  mongcool: {
    display_name: "몽쿨 (Mongcool)",
    tagline: "유모차용 쿨링·악세사리 종합 브랜드 (선풍기·쿨시트·기갈대·등팩·모기기피제 등)",
    greeting: "안녕하세요 고객님, 몽쿨 공식 채널입니다",
    trigger_keywords: [
      "몽쿨", "쿨시트", "통풍쿨시트", "유모차 선풍기", "선풍기",
      "기갈대", "기저귀갈이대", "등팩", "모기기피제", "보호매트",
      "컵홀더", "유모차 고리", "유모차 트레이", "이어머프", "욕조", "문어발",
    ],
    products: [
      "유모차 선풍기 (헤드+문어발)", "통풍쿨시트 (폴리에스테르)",
      "쿨시트", "기갈대", "등팩", "모기기피제",
      "보호매트", "컵홀더", "유모차 고리", "유모차 트레이",
      "이어머프", "욕조",
    ],
    sort_order: 2,
  },
  shugajaem: {
    display_name: "슈가잼 (Shugajaem)",
    tagline: "위생·해충 솔루션 (모기장 / 바퀴트랩 / 초파리트랩)",
    greeting: "안녕하세요 고객님, 슈가잼입니다",
    trigger_keywords: ["슈가잼", "모기장", "바퀴트랩", "바퀴벌레", "초파리트랩", "초파리"],
    products: ["모기장", "바퀴트랩", "초파리트랩"],
    sort_order: 3,
  },
  kodakjy: {
    display_name: "신생아 코딱지 (Newborn Booger)",
    tagline: "신생아 코딱지 케어 별도 라인",
    greeting: "안녕하세요 고객님",
    trigger_keywords: ["코딱지", "신생아 코딱지", "코딱지 제거", "신생아 코"],
    products: ["신생아 코딱지 제품"],
    sort_order: 4,
  },
}

// 파일 라벨 매핑 (purpose 컬럼)
const FILE_PURPOSES = {
  "qna.md": "Q&A 마스터",
  "qna_archive_1226.md": "Q&A 백업본 (1226)",
  "qna_archive_1227.md": "Q&A 백업본 (1227)",
  "manual.md": "제품 설명서",
  "blog_guide.md": "블로그 컨텐츠 가이드",
  "interview_guide.md": "CS 면접 가이드",
  "mom_class_guide.md": "산모교실 응대 가이드북",
  "strategy.md": "CS 전략서",
  "defect_mail_guide.md": "불량·품질 메일 응대 지침",
  "internal_training.md": "사내 CS 교육자료",
  "inspection_form.md": "점검신청서 양식",
  "cs_script.md": "CS 응대 스크립트",
  "real_cases.md": "실제 사례 / 가이드",
  "fan_guide.md": "유모차선풍기 컨텐츠 가이드",
  "coolseat_spec.md": "쿨시트 상세페이지 기획",
  "notes_1226.md": "참고 자료 (12월)",
  "cs_guidelines.md": "CS 응대 지침 (메모장에서 저장)",
}

const PROMPTS_DIR = resolve("ocr/prompts")
const BRANDS_DIR = join(PROMPTS_DIR, "brands")

async function seedGlobalGuidelines() {
  const path = join(PROMPTS_DIR, "_global_guidelines.md")
  const content = readFileSync(path, "utf8")

  // 기존 active 모두 비활성화
  await sb.from("cs_global_guidelines").update({ active: false }).eq("active", true)
  // 새 active 행 삽입
  const { data, error } = await sb.from("cs_global_guidelines")
    .insert({ content, active: true, version: 1, note: "초기 시딩" })
    .select().single()
  if (error) throw error
  console.log(`✓ global_guidelines 시딩 (id=${data.id}, ${content.length}자)`)
}

async function seedBrand(slug) {
  const meta = BRANDS_META[slug]
  if (!meta) {
    console.log(`⏭  ${slug} 메타 정의 없음, 스킵`)
    return
  }
  const brandDir = join(BRANDS_DIR, slug)
  let dirStat
  try { dirStat = statSync(brandDir) } catch { dirStat = null }
  if (!dirStat || !dirStat.isDirectory()) {
    console.log(`⏭  ${slug} 폴더 없음`)
    return
  }

  // 1) 브랜드 upsert (slug 기준)
  const { data: brandRow, error: brandErr } = await sb
    .from("cs_brands")
    .upsert({ slug, ...meta, active: true }, { onConflict: "slug" })
    .select().single()
  if (brandErr) throw brandErr
  console.log(`✓ cs_brands: ${slug} → id=${brandRow.id.slice(0, 8)}…`)

  // 2) 폴더 내 .md 파일 (brand.md 제외) 적재
  const mdFiles = readdirSync(brandDir)
    .filter((f) => f.endsWith(".md") && f !== "brand.md")
    .sort()

  let order = 1
  for (const filename of mdFiles) {
    const content = readFileSync(join(brandDir, filename), "utf8")
    const purpose = FILE_PURPOSES[filename] || filename.replace(".md", "")
    const { error: fileErr } = await sb
      .from("cs_brand_files")
      .upsert(
        { brand_id: brandRow.id, filename, purpose, content, sort_order: order },
        { onConflict: "brand_id,filename" },
      )
    if (fileErr) throw fileErr
    console.log(`    ✓ ${filename.padEnd(28)} (${(content.length / 1024).toFixed(1)} KB) — ${purpose}`)
    order++
  }
}

async function main() {
  console.log("=== CS 자료 시딩 시작 ===\n")
  await seedGlobalGuidelines()
  console.log()
  for (const slug of Object.keys(BRANDS_META)) {
    await seedBrand(slug)
    console.log()
  }

  // 최종 카운트
  const [{ count: brandCount }, { count: fileCount }] = await Promise.all([
    sb.from("cs_brands").select("*", { count: "exact", head: true }),
    sb.from("cs_brand_files").select("*", { count: "exact", head: true }),
  ])
  console.log(`\n=== 완료 / brands ${brandCount}개 / files ${fileCount}개 ===`)
}

main().catch((e) => {
  console.error("[FATAL]", e?.message || e)
  process.exit(1)
})
