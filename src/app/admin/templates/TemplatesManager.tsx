"use client"

import { useState, useTransition } from "react"
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ProductTemplate,
} from "../../cafe-writer/template-actions"

type Mode = { type: "list" } | { type: "new" } | { type: "edit"; tpl: ProductTemplate }

export default function TemplatesManager({
  initialTemplates,
}: {
  initialTemplates: ProductTemplate[]
}) {
  const [items, setItems] = useState<ProductTemplate[]>(initialTemplates)
  const [mode, setMode] = useState<Mode>({ type: "list" })
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState("")

  const filtered = items.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))

  function handleSaved(saved: ProductTemplate, isNew: boolean) {
    setItems((prev) => {
      if (isNew) return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      return prev.map((t) => (t.id === saved.id ? saved : t)).sort((a, b) => a.name.localeCompare(b.name))
    })
    setMode({ type: "list" })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 템플릿을 삭제할까요?\n(되돌릴 수 없음. 이미 써둔 원고에는 영향 없음)`)) return
    startTransition(async () => {
      try {
        await deleteTemplate(id)
        setItems((prev) => prev.filter((t) => t.id !== id))
      } catch (e) {
        setError((e as Error).message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⚠ {error}
          <button onClick={() => setError(null)} className="ml-2 underline">닫기</button>
        </div>
      )}

      {mode.type === "list" && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제품명 검색"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => setMode({ type: "new" })}
              className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 whitespace-nowrap"
            >
              + 새 템플릿
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
              {items.length === 0 ? (
                <div className="space-y-2">
                  <div className="text-4xl">📦</div>
                  <div className="text-sm text-slate-600">아직 등록된 제품 템플릿이 없어요.</div>
                  <div className="text-xs text-slate-400">{`"+ 새 템플릿" 으로 첫 번째를 만드세요.`}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">검색 결과 없음</div>
              )}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((tpl) => (
                <li key={tpl.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-800 flex-1 truncate">{tpl.name}</div>
                      {tpl.example ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 whitespace-nowrap">예시 있음</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 whitespace-nowrap">지침만</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 line-clamp-3 whitespace-pre-wrap">{tpl.guideline}</div>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      {new Date(tpl.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setMode({ type: "edit", tpl })}
                      className="flex-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-2"
                    >
                      ✏ 편집
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.name)}
                      className="rounded-lg bg-white border border-rose-300 text-rose-600 text-xs font-semibold px-3 py-2 hover:bg-rose-50"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {(mode.type === "new" || mode.type === "edit") && (
        <EditForm
          initial={mode.type === "edit" ? mode.tpl : null}
          onCancel={() => setMode({ type: "list" })}
          onSaved={handleSaved}
          onError={setError}
        />
      )}
    </div>
  )
}

function EditForm({
  initial,
  onCancel,
  onSaved,
  onError,
}: {
  initial: ProductTemplate | null
  onCancel: () => void
  onSaved: (t: ProductTemplate, isNew: boolean) => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(initial?.name || "")
  const [guideline, setGuideline] = useState(initial?.guideline || "")
  const [example, setExample] = useState(initial?.example || "")
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    try {
      const saved = initial
        ? await updateTemplate(initial.id, name, guideline, example)
        : await createTemplate(name, guideline, example)
      onSaved(saved, !initial)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">
          {initial ? `편집: ${initial.name}` : "새 제품 템플릿"}
        </h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700">← 목록으로</button>
      </div>

      <label className="block">
        <div className="text-xs font-semibold text-slate-600 mb-1">제품명 *</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 콧물흡입기"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          autoFocus
        />
      </label>

      <label className="block">
        <div className="text-xs font-semibold text-slate-600 mb-1">지침 *</div>
        <textarea
          value={guideline}
          onChange={(e) => setGuideline(e.target.value)}
          rows={8}
          placeholder="원고 작성 프롬프트. 타깃/톤/포함할 포인트 등."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y outline-none focus:border-indigo-400"
        />
      </label>

      <label className="block">
        <div className="text-xs font-semibold text-slate-600 mb-1">예시 원고 (선택)</div>
        <textarea
          value={example}
          onChange={(e) => setExample(e.target.value)}
          rows={10}
          placeholder="참고할 톤앤매너 샘플. 비워두면 예시 없이 지침만으로 생성됩니다."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y outline-none focus:border-indigo-400"
        />
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={busy || !name.trim() || !guideline.trim()}
          className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          {busy ? "저장 중..." : initial ? "수정 저장" : "새 템플릿 추가"}
        </button>
      </div>
    </div>
  )
}
