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
  const [contentGuide, setContentGuide] = useState(initial?.content_guide || "")
  const [guideline, setGuideline] = useState(initial?.guideline || "")
  const [example, setExample] = useState(initial?.example || "")
  const [busy, setBusy] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<null | "contentGuide" | "guideline" | "example">(null)
  const [dragOver, setDragOver] = useState<null | "contentGuide" | "guideline" | "example">(null)

  async function handleFiles(target: "contentGuide" | "guideline" | "example", filesIn: FileList | File[]) {
    const files = Array.from(filesIn)
    if (!files.length) return
    setUploadingFor(target)
    try {
      const parts: string[] = []
      for (const file of files) {
        const fd = new FormData()
        fd.append("file", file)
        const resp = await fetch("/api/parse-document", { method: "POST", body: fd })
        const data = await resp.json()
        if (!resp.ok) {
          throw new Error(`[${file.name}] ${data?.error || `HTTP ${resp.status}`}`)
        }
        const text = String(data.text || "").trim()
        if (text) parts.push(text)
      }

      if (parts.length === 0) {
        throw new Error("파일에서 추출한 텍스트가 모두 비어있어요.")
      }

      // 여러 파일이면 구분선으로 합침. 한 개면 그대로.
      const combined = parts.length === 1 ? parts[0] : parts.join("\n\n---\n\n")

      const current =
        target === "contentGuide" ? contentGuide : target === "guideline" ? guideline : example
      const targetLabel =
        target === "contentGuide" ? "컨텐츠 가이드" : target === "guideline" ? "지침" : "예시 원고"
      let final = combined

      if (current.trim()) {
        const append = confirm(
          `현재 ${targetLabel} 에 내용이 있어요.\n\n` +
            `[확인] = 끝에 추가 (기존 + 새 ${files.length}개 파일)\n` +
            `[취소] = 새 파일로 덮어쓰기`
        )
        if (append) {
          final = `${current}\n\n---\n\n${combined}`
        }
      }

      if (target === "contentGuide") setContentGuide(final)
      else if (target === "guideline") setGuideline(final)
      else setExample(final)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setUploadingFor(null)
    }
  }

  function handleDragOver(target: "contentGuide" | "guideline" | "example") {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // 파일을 끌고 있을 때만 활성화
      if (e.dataTransfer.types.includes("Files")) {
        setDragOver(target)
        e.dataTransfer.dropEffect = "copy"
      }
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
  }

  function handleDrop(target: "contentGuide" | "guideline" | "example") {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(null)
      const files = e.dataTransfer.files
      if (files && files.length > 0) void handleFiles(target, files)
    }
  }

  async function handleSave() {
    setBusy(true)
    try {
      const saved = initial
        ? await updateTemplate(initial.id, name, guideline, example, contentGuide)
        : await createTemplate(name, guideline, example, contentGuide)
      onSaved(saved, !initial)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4"
      onDragOver={(e) => {
        // 폼 바깥(빈 공간) 에 떨어뜨려도 브라우저가 파일 열지 못하게
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault()
          e.dataTransfer.dropEffect = "none"
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault()
      }}
    >
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

      <div
        className="block"
        onDragOver={handleDragOver("contentGuide")}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop("contentGuide")}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-slate-600">컨텐츠 가이드 (선택)</div>
          <FileUploadButton
            label="📎 파일 첨부"
            uploading={uploadingFor === "contentGuide"}
            onSelect={(files) => handleFiles("contentGuide", files)}
          />
        </div>
        <div className="relative">
          <textarea
            value={contentGuide}
            onChange={(e) => setContentGuide(e.target.value)}
            rows={5}
            placeholder="제품 컨텐츠 가이드 — 브랜드 톤, 포지셔닝, 핵심 메시지, 금기어 등. (선택, 비워둬도 됨)"
            className={`w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition ${
              dragOver === "contentGuide"
                ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-200"
                : "border-slate-300 focus:border-indigo-400"
            }`}
          />
          {dragOver === "contentGuide" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-100/70 border-2 border-dashed border-emerald-400 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-3xl">📂</div>
                <div className="text-sm font-bold text-emerald-700 mt-1">여기에 놓으세요</div>
                <div className="text-[11px] text-emerald-600">.txt / .docx · 여러 개 OK</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="block"
        onDragOver={handleDragOver("guideline")}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop("guideline")}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-slate-600">지침 *</div>
          <FileUploadButton
            label="📎 파일 첨부"
            uploading={uploadingFor === "guideline"}
            onSelect={(files) => handleFiles("guideline", files)}
          />
        </div>
        <div className="relative">
          <textarea
            value={guideline}
            onChange={(e) => setGuideline(e.target.value)}
            rows={8}
            placeholder="원고 작성 프롬프트. 타깃/톤/포함할 포인트 등. (파일 끌어다 놓기 가능 · .txt/.docx · 여러 개 동시)"
            className={`w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition ${
              dragOver === "guideline"
                ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-200"
                : "border-slate-300 focus:border-indigo-400"
            }`}
          />
          {dragOver === "guideline" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-100/70 border-2 border-dashed border-emerald-400 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-3xl">📂</div>
                <div className="text-sm font-bold text-emerald-700 mt-1">여기에 놓으세요</div>
                <div className="text-[11px] text-emerald-600">.txt / .docx · 여러 개 OK</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="block"
        onDragOver={handleDragOver("example")}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop("example")}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-slate-600">예시 원고 (선택)</div>
          <FileUploadButton
            label="📎 파일 첨부"
            uploading={uploadingFor === "example"}
            onSelect={(files) => handleFiles("example", files)}
          />
        </div>
        <div className="relative">
          <textarea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            rows={10}
            placeholder="참고할 톤앤매너 샘플. (파일 끌어다 놓기 가능 · .txt/.docx · 여러 개 동시. 비워둬도 됨)"
            className={`w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition ${
              dragOver === "example"
                ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-200"
                : "border-slate-300 focus:border-indigo-400"
            }`}
          />
          {dragOver === "example" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-100/70 border-2 border-dashed border-emerald-400 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-3xl">📂</div>
                <div className="text-sm font-bold text-emerald-700 mt-1">여기에 놓으세요</div>
                <div className="text-[11px] text-emerald-600">.txt / .docx · 여러 개 OK</div>
              </div>
            </div>
          )}
        </div>
      </div>

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

function FileUploadButton({
  label,
  uploading,
  onSelect,
}: {
  label: string
  uploading: boolean
  onSelect: (files: FileList) => void
}) {
  return (
    <label className={`inline-flex items-center gap-1 text-[11px] rounded-md border px-2 py-0.5 cursor-pointer transition ${uploading ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"}`}>
      <span>{uploading ? "처리 중..." : label}</span>
      <input
        type="file"
        accept=".txt,.md,.docx"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) onSelect(files)
          e.target.value = "" // 같은 파일 재선택 가능하게
        }}
      />
    </label>
  )
}
