"use client"

import { useState, useTransition } from "react"
import {
  updateBrand,
  upsertFile,
  deleteFile,
  type CsBrand,
  type CsBrandFile,
} from "../../actions"

export default function BrandEditor({
  initialBrand,
  initialFiles,
}: {
  initialBrand: CsBrand
  initialFiles: CsBrandFile[]
}) {
  const [brand, setBrand] = useState(initialBrand)
  const [files, setFiles] = useState(initialFiles)
  const [editingFile, setEditingFile] = useState<CsBrandFile | "new" | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⚠ {error}
          <button onClick={() => setError(null)} className="ml-2 underline">닫기</button>
        </div>
      )}

      {/* 1. 브랜드 메타 */}
      <BrandMetaForm
        brand={brand}
        onSaved={(b) => setBrand(b)}
        onError={setError}
      />

      {/* 2. 파일 리스트 + 편집 */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">📂 자료 파일 ({files.length}개)</h2>
          <button
            onClick={() => setEditingFile("new")}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5"
          >
            + 새 파일
          </button>
        </div>

        {files.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">아직 등록된 파일 없음</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-indigo-700">{f.filename}</code>
                    <span className="text-[10px] text-slate-500">
                      {(f.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {f.purpose && <div className="text-xs text-slate-600 mt-0.5">{f.purpose}</div>}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(f.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </div>
                </div>
                <button
                  onClick={() => setEditingFile(f)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  편집
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`"${f.filename}" 삭제할까요?`)) return
                    try {
                      await deleteFile(f.id)
                      setFiles((prev) => prev.filter((x) => x.id !== f.id))
                    } catch (e) {
                      setError((e as Error).message)
                    }
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 파일 편집 모달 */}
      {editingFile && (
        <FileEditor
          brandId={brand.id}
          file={editingFile === "new" ? null : editingFile}
          onCancel={() => setEditingFile(null)}
          onSaved={(saved) => {
            setFiles((prev) => {
              const idx = prev.findIndex((f) => f.id === saved.id)
              if (idx >= 0) {
                const copy = prev.slice()
                copy[idx] = saved
                return copy
              }
              return [...prev, saved].sort((a, b) => a.filename.localeCompare(b.filename))
            })
            setEditingFile(null)
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 브랜드 메타 폼
// ─────────────────────────────────────────────
function BrandMetaForm({
  brand,
  onSaved,
  onError,
}: {
  brand: CsBrand
  onSaved: (b: CsBrand) => void
  onError: (msg: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [displayName, setDisplayName] = useState(brand.display_name)
  const [tagline, setTagline] = useState(brand.tagline || "")
  const [greeting, setGreeting] = useState(brand.greeting || "")
  const [keywords, setKeywords] = useState((brand.trigger_keywords || []).join(", "))
  const [products, setProducts] = useState((brand.products || []).join("\n"))
  const [active, setActive] = useState(brand.active)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  function dirty() {
    return (
      displayName !== brand.display_name ||
      tagline !== (brand.tagline || "") ||
      greeting !== (brand.greeting || "") ||
      keywords !== (brand.trigger_keywords || []).join(", ") ||
      products !== (brand.products || []).join("\n") ||
      active !== brand.active
    )
  }

  function handleSave() {
    setBusy(true)
    startTransition(async () => {
      try {
        const updated = await updateBrand(brand.id, {
          display_name: displayName.trim(),
          tagline: tagline.trim(),
          greeting: greeting.trim(),
          trigger_keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          products: products
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean),
          active,
        })
        onSaved(updated)
      } catch (e) {
        onError((e as Error).message)
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-base font-bold text-slate-800 mb-3"
      >
        <span>🏷️ 브랜드 메타</span>
        <span className="text-xs font-normal text-slate-500">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="space-y-3">
          <Field label="slug (수정 불가)">
            <input
              value={brand.slug}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono text-slate-500"
            />
          </Field>
          <Field label="표시 이름 *">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="태그라인 (한 줄 소개)">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="표준 인사말">
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="안녕하세요 고객님, ... 입니다"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="식별 트리거 키워드 (쉼표 구분)">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="콧물흡입기, 코막힘, 흡입기"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label="취급 제품 (한 줄에 하나)">
            <textarea
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y outline-none focus:border-indigo-400"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            <span>활성 (분석 시 후보 브랜드로 포함)</span>
          </label>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={busy || !dirty() || !displayName.trim()}
              className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {busy ? "저장 중..." : dirty() ? "메타 저장" : "변경 없음"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// 파일 편집 (모달 — 인라인 카드)
// ─────────────────────────────────────────────
function FileEditor({
  brandId,
  file,
  onCancel,
  onSaved,
  onError,
}: {
  brandId: string
  file: CsBrandFile | null
  onCancel: () => void
  onSaved: (f: CsBrandFile) => void
  onError: (msg: string) => void
}) {
  const [filename, setFilename] = useState(file?.filename || "")
  const [purpose, setPurpose] = useState(file?.purpose || "")
  const [content, setContent] = useState(file?.content || "")
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    try {
      const saved = await upsertFile({
        id: file?.id,
        brand_id: brandId,
        filename: filename.trim(),
        purpose: purpose.trim() || null,
        content,
      })
      onSaved(saved)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">
            {file ? `편집: ${file.filename}` : "새 파일 추가"}
          </h3>
          <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <Field label="파일명 (.md 로 끝나야 함)">
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="예: cs_guidelines.md"
              disabled={!!file} // 기존 파일은 이름 변경 막음
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 disabled:bg-slate-100"
            />
          </Field>
          <Field label="용도 (라벨)">
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: CS 응대 지침"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </Field>
          <Field label={`내용 (${(content.length / 1024).toFixed(1)} KB / ${content.length}자)`}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="# 제목&#10;&#10;마크다운 본문..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono resize-y outline-none focus:border-indigo-400"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={busy || !filename.trim() || !filename.trim().endsWith(".md")}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            {busy ? "저장 중..." : file ? "수정 저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  )
}
