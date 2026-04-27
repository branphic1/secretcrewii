"use client"

import { useEffect, useMemo, useState } from "react"
import TemplatePicker from "./TemplatePicker"
import { listTemplates, type ProductTemplate } from "./template-actions"

type KeywordItem = { text: string; count: number }
type RowStatus = "idle" | "running" | "success" | "error"

type Row = {
  id: string
  contentGuide: string
  guideline: string
  example: string
  charCount: number
  keywords: KeywordItem[]
  generateCount: number
  result: string
  status: RowStatus
  message?: string
  generatedAt?: string
}

type Settings = {
  model: string
  maxTokens: number
  temperature: number
}

const STORAGE_ROWS = "cafe_writer_rows_v1"
const STORAGE_SETTINGS = "cafe_writer_settings_v1"

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (빠름·저렴)" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (최고 품질)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (최저가)" },
]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyRow(): Row {
  return {
    id: uid(),
    contentGuide: "",
    guideline: "",
    example: "",
    charCount: 500,
    keywords: Array.from({ length: 5 }, () => ({ text: "", count: 1 })),
    generateCount: 1,
    result: "",
    status: "idle",
  }
}

function defaultSettings(): Settings {
  return { model: "claude-sonnet-4-6", maxTokens: 2000, temperature: 0.8 }
}

export default function CafeWriterApp({ isAdmin = false }: { isAdmin?: boolean }) {
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [settings, setSettings] = useState<Settings>(defaultSettings())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [pickerRowId, setPickerRowId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const rawRows = localStorage.getItem(STORAGE_ROWS)
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as Row[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(
            parsed.map((r) => ({
              ...r,
              status: "idle" as const,
              message: undefined,
              contentGuide: r.contentGuide || "",
              generateCount: r.generateCount || 1,
            }))
          )
        }
      }
      const rawSet = localStorage.getItem(STORAGE_SETTINGS)
      if (rawSet) {
        const parsed = JSON.parse(rawSet) as Partial<Settings>
        setSettings({ ...defaultSettings(), ...parsed })
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await listTemplates()
        if (!cancelled) setTemplates(list)
      } catch (e) {
        if (!cancelled) setTemplatesError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_ROWS, JSON.stringify(rows))
  }, [rows, loaded])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings))
  }, [settings, loaded])

  const busyCount = rows.filter((r) => r.status === "running").length
  const anyBusy = busyCount > 0

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function updateKeyword(id: string, idx: number, patch: Partial<KeywordItem>) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              keywords: r.keywords.map((k, i) => (i === idx ? { ...k, ...patch } : k)),
            }
          : r
      )
    )
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function duplicateRow(id: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx < 0) return prev
      const src = prev[idx]
      const copy: Row = {
        ...src,
        id: uid(),
        result: "",
        status: "idle",
        message: undefined,
        generatedAt: undefined,
        keywords: src.keywords.map((k) => ({ ...k })),
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function deleteRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.id !== id)))
    setSelected((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
  }

  function openPickerFor(rowId: string) {
    setPickerRowId(rowId)
  }

  function applyTemplate(tpl: ProductTemplate) {
    if (!pickerRowId) return
    updateRow(pickerRowId, {
      contentGuide: tpl.content_guide || "",
      guideline: tpl.guideline,
      example: tpl.example || "",
    })
  }

  function applyTemplateChip(tpl: ProductTemplate) {
    setRows((prev) => {
      const last = prev[prev.length - 1]
      const lastIsEmpty =
        prev.length === 1 &&
        !last.contentGuide.trim() &&
        !last.guideline.trim() &&
        !last.example.trim() &&
        last.result === ""
      if (lastIsEmpty) {
        return [
          {
            ...last,
            contentGuide: tpl.content_guide || "",
            guideline: tpl.guideline,
            example: tpl.example || "",
          },
        ]
      }
      const newRow: Row = {
        ...emptyRow(),
        contentGuide: tpl.content_guide || "",
        guideline: tpl.guideline,
        example: tpl.example || "",
      }
      return [...prev, newRow]
    })
  }

  function refreshTemplates() {
    void (async () => {
      try {
        const list = await listTemplates()
        setTemplates(list)
        setTemplatesError(null)
      } catch (e) {
        setTemplatesError((e as Error).message)
      }
    })()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  async function generateOne(row: Row): Promise<void> {
    if (!row.guideline.trim()) {
      updateRow(row.id, { status: "error", message: "지침이 비어 있어요." })
      return
    }
    updateRow(row.id, { status: "running", message: undefined })
    try {
      const resp = await fetch("/api/generate-cafe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentGuide: row.contentGuide,
          guideline: row.guideline,
          example: row.example,
          charCount: row.charCount,
          keywords: row.keywords
            .filter((k) => k.text.trim())
            .map((k) => ({ text: k.text.trim(), count: Math.max(1, k.count) })),
          model: settings.model,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        updateRow(row.id, { status: "error", message: data?.error || `HTTP ${resp.status}` })
        return
      }
      updateRow(row.id, {
        status: "success",
        message: undefined,
        result: data.content,
        generatedAt: new Date().toISOString(),
      })
    } catch (e: unknown) {
      const err = e as { message?: string }
      updateRow(row.id, { status: "error", message: err?.message || "요청 실패" })
    }
  }

  async function generateRowWithCount(srcRow: Row) {
    const count = Math.max(1, Math.min(500, srcRow.generateCount || 1))
    if (!srcRow.guideline.trim()) {
      updateRow(srcRow.id, { status: "error", message: "지침이 비어 있어요." })
      return
    }
    // 첫 번째 = 원본 행
    await generateOne(srcRow)
    // 2번째부터 새 행 추가하면서 생성
    for (let i = 1; i < count; i++) {
      const newRow: Row = {
        ...srcRow,
        id: uid(),
        result: "",
        status: "idle",
        message: undefined,
        generatedAt: undefined,
        generateCount: 1, // 복제본은 1로
        keywords: srcRow.keywords.map((k) => ({ ...k })),
      }
      setRows((prev) => [...prev, newRow])
      await generateOne(newRow)
    }
  }

  async function generateSelected() {
    const ids = Array.from(selected)
    const targets = rows.filter((r) => ids.includes(r.id))
    for (const r of targets) {
      await generateRowWithCount(r)
    }
  }

  async function generateAll() {
    const snapshot = [...rows]
    for (const r of snapshot) {
      if (r.guideline.trim()) {
        await generateRowWithCount(r)
      }
    }
  }

  function clearResults() {
    if (!confirm("모든 결과와 상태를 초기화할까요? (입력값은 유지됩니다)")) return
    setRows((prev) => prev.map((r) => ({ ...r, result: "", status: "idle", message: undefined, generatedAt: undefined })))
  }

  function clearAll() {
    if (!confirm("모든 행을 삭제할까요? (되돌릴 수 없어요)")) return
    setRows([emptyRow()])
    setSelected(new Set())
  }

  async function exportToExcel() {
    const successRows = rows.filter((r) => r.status === "success" && r.result.trim())
    if (successRows.length === 0) {
      alert("내보낼 결과가 없어요. 먼저 원고를 생성해주세요.")
      return
    }

    try {
      const XLSX = await import("xlsx")
      const data = successRows.map((r, i) => ({
        번호: i + 1,
        지침: r.guideline,
        키워드: r.keywords
          .filter((k) => k.text.trim())
          .map((k) => `${k.text.trim()}(${k.count})`)
          .join(", "),
        글자수: r.charCount,
        결과글자수: r.result.replace(/\s/g, "").length,
        결과원고: r.result,
        생성시각: r.generatedAt
          ? new Date(r.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
          : "",
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      // 컬럼 폭 설정 (대략)
      ws["!cols"] = [
        { wch: 6 },   // 번호
        { wch: 40 },  // 지침
        { wch: 30 },  // 키워드
        { wch: 8 },   // 글자수
        { wch: 10 },  // 결과글자수
        { wch: 80 },  // 결과원고
        { wch: 22 },  // 생성시각
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "원고")

      const ts = new Date()
      const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}_${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}`
      XLSX.writeFile(wb, `cafe-writer_${stamp}_${successRows.length}건.xlsx`)
    } catch (e) {
      alert("엑셀 다운로드 실패: " + (e as Error).message)
    }
  }

  const selectedCount = selected.size

  return (
    <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={addRow}
          className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 transition"
        >
          + 행 추가
        </button>
        <button
          onClick={generateAll}
          disabled={anyBusy}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-50"
        >
          ▶ 전체 일괄 생성
        </button>
        <button
          onClick={generateSelected}
          disabled={anyBusy || selectedCount === 0}
          className="rounded-lg bg-emerald-400 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 transition disabled:opacity-40"
        >
          ▶▶ 선택 {selectedCount}개 생성
        </button>
        <button
          onClick={toggleSelectAll}
          className="rounded-lg bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 hover:bg-slate-50 transition"
        >
          {selected.size === rows.length ? "전체 해제" : "전체 선택"}
        </button>
        <div className="flex-1" />
        <button
          onClick={exportToExcel}
          className="rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-semibold px-3 py-2 transition"
          title="성공한 결과 전체를 .xlsx 파일로 저장"
        >
          📊 엑셀 다운로드
        </button>
        <button
          onClick={clearResults}
          className="rounded-lg bg-white border border-slate-300 text-slate-600 text-xs px-3 py-2 hover:bg-slate-50 transition"
        >
          결과 초기화
        </button>
        <button
          onClick={clearAll}
          className="rounded-lg bg-white border border-rose-300 text-rose-600 text-xs px-3 py-2 hover:bg-rose-50 transition"
        >
          전체 삭제
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="rounded-lg bg-white border border-slate-300 text-slate-700 text-sm px-4 py-2 hover:bg-slate-50 transition"
        >
          ⚙ 설정
        </button>
      </div>

      {/* 제품 빠른 적용 (칩) */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border border-indigo-100 p-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3 flex-wrap">
          <div className="flex-shrink-0">
            <div className="text-sm font-bold text-indigo-700 flex items-center gap-1">
              🎯 제품 빠른 적용
            </div>
            <div className="text-[11px] text-indigo-500/80 mt-0.5">
              칩을 클릭하면 그 제품의 지침+예시가 적용된 행이 추가돼요.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {templatesError ? (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                템플릿 불러오기 실패 — {templatesError}
                <button onClick={refreshTemplates} className="ml-2 underline">재시도</button>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">등록된 템플릿이 없어요.</span>
                {isAdmin ? (
                  <a
                    href="/admin/templates"
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 shadow-sm"
                  >
                    + 새 템플릿 만들러 가기
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">관리자에게 요청해주세요.</span>
                )}
              </div>
            ) : (
              <>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplateChip(tpl)}
                    className="group inline-flex items-center gap-1 rounded-full bg-white hover:bg-indigo-500 hover:text-white text-indigo-700 text-xs font-semibold px-3 py-1.5 border border-indigo-200 hover:border-indigo-500 transition shadow-sm"
                    title={tpl.guideline.slice(0, 80) + "..."}
                  >
                    <span>{tpl.name}</span>
                    <span className="text-[10px] opacity-60 group-hover:opacity-100">+1행</span>
                  </button>
                ))}
                {isAdmin && (
                  <a
                    href="/admin/templates"
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1.5 shadow-sm"
                    title="새 제품 템플릿 추가/편집"
                  >
                    + 새 템플릿
                  </a>
                )}
                <button
                  onClick={refreshTemplates}
                  className="text-[11px] text-indigo-500/70 hover:text-indigo-700 ml-1"
                  title="템플릿 새로고침"
                >
                  ⟳
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">모델</div>
            <select
              value={settings.model}
              onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">max_tokens</div>
            <input
              type="number"
              min={256}
              max={8192}
              value={settings.maxTokens}
              onChange={(e) => setSettings((s) => ({ ...s, maxTokens: Number(e.target.value) || 2000 }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">temperature (0~1)</div>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => setSettings((s) => ({ ...s, temperature: Number(e.target.value) || 0.8 }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-3 text-xs text-slate-500">
            API 키는 서버에 등록되어 있어 따로 입력하지 않아요. 모델/토큰/온도 변경은 자동 저장됩니다.
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <RowCard
            key={row.id}
            row={row}
            index={idx}
            isSelected={selected.has(row.id)}
            onToggleSelect={() => toggleSelect(row.id)}
            onChange={(patch) => updateRow(row.id, patch)}
            onChangeKeyword={(i, patch) => updateKeyword(row.id, i, patch)}
            onGenerate={() => generateRowWithCount(row)}
            onDuplicate={() => duplicateRow(row.id)}
            onDelete={() => deleteRow(row.id)}
            onOpenPicker={() => openPickerFor(row.id)}
            disabled={anyBusy && row.status !== "running"}
          />
        ))}
      </div>

      <div className="text-center pt-4">
        <button
          onClick={addRow}
          className="rounded-full bg-white border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 text-sm px-6 py-3 transition"
        >
          + 행 추가하기
        </button>
      </div>

      <TemplatePicker
        isOpen={pickerRowId !== null}
        onClose={() => setPickerRowId(null)}
        onApply={(tpl) => {
          applyTemplate(tpl)
          setPickerRowId(null)
        }}
      />
    </div>
  )
}

function RowCard({
  row,
  index,
  isSelected,
  onToggleSelect,
  onChange,
  onChangeKeyword,
  onGenerate,
  onDuplicate,
  onDelete,
  onOpenPicker,
  disabled,
}: {
  row: Row
  index: number
  isSelected: boolean
  onToggleSelect: () => void
  onChange: (patch: Partial<Row>) => void
  onChangeKeyword: (idx: number, patch: Partial<KeywordItem>) => void
  onGenerate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onOpenPicker: () => void
  disabled: boolean
}) {
  const resultLen = useMemo(() => row.result.replace(/\s/g, "").length, [row.result])

  const statusBadge =
    row.status === "running" ? (
      <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> 생성 중
      </span>
    ) : row.status === "success" ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
        ✓ 성공
      </span>
    ) : row.status === "error" ? (
      <span className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 rounded-full px-2.5 py-1">
        ✗ 실패
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
        대기
      </span>
    )

  return (
    <div className={`rounded-2xl bg-white border shadow-sm p-5 transition ${isSelected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 accent-indigo-500"
        />
        <div className="text-sm font-semibold text-slate-700">#{index + 1}</div>
        {statusBadge}
        {row.generatedAt && (
          <span className="text-[11px] text-slate-400 font-mono">
            {new Date(row.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onDuplicate}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
          title="행 복제"
        >
          복제
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1"
          title="행 삭제"
        >
          삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <button
            type="button"
            onClick={onOpenPicker}
            className="w-full rounded-xl bg-gradient-to-r from-sky-100 to-indigo-100 hover:from-sky-200 hover:to-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2 border border-indigo-200 transition"
          >
            📚 제품 템플릿 불러오기 (컨텐츠 가이드 + 지침 + 예시 자동 채움)
          </button>

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">컨텐츠 가이드 <span className="text-slate-400 font-normal">(선택)</span></div>
            <textarea
              value={row.contentGuide}
              onChange={(e) => onChange({ contentGuide: e.target.value })}
              rows={3}
              placeholder="브랜드 톤, 포지셔닝, 핵심 메시지, 금기어 등. (선택)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-indigo-400 outline-none"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">지침 <span className="text-rose-500">*</span></div>
            <textarea
              value={row.guideline}
              onChange={(e) => onChange({ guideline: e.target.value })}
              rows={4}
              placeholder="위 템플릿 불러오기를 쓰거나 직접 입력. 예: 홍대 브런치 카페 '○○' 을 소개하는 바이럴 후기."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-indigo-400 outline-none"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">예시 원고 (선택)</div>
            <textarea
              value={row.example}
              onChange={(e) => onChange({ example: e.target.value })}
              rows={3}
              placeholder="참고할 톤앤매너. 내용은 복사되지 않아요."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-indigo-400 outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs font-semibold text-slate-600 mb-1">글자수 (±10%)</div>
              <input
                type="number"
                min={50}
                max={5000}
                value={row.charCount}
                onChange={(e) => onChange({ charCount: Number(e.target.value) || 500 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 outline-none"
              />
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">키워드 & 반복 횟수</div>
            <div className="space-y-2">
              {row.keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-4 text-right">{i + 1}</span>
                  <input
                    type="text"
                    value={k.text}
                    onChange={(e) => onChangeKeyword(i, { text: e.target.value })}
                    placeholder={`키워드 ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={k.count}
                    onChange={(e) => onChangeKeyword(i, { count: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-center focus:border-indigo-400 outline-none"
                  />
                  <span className="text-[11px] text-slate-400">회</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-600">생성된 원고</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>공백제외 {resultLen}자</span>
              {row.result && (
                <button
                  onClick={() => navigator.clipboard.writeText(row.result)}
                  className="rounded bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5"
                >
                  복사
                </button>
              )}
            </div>
          </div>
          <textarea
            value={row.result}
            onChange={(e) => onChange({ result: e.target.value })}
            rows={14}
            placeholder="[생성] 버튼을 누르면 여기에 원고가 나타나요."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-indigo-400 outline-none font-[inherit] leading-relaxed"
          />
          {row.message && (
            <div className={`text-xs rounded-lg px-3 py-2 ${row.status === "error" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
              {row.message}
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-2">
              <span className="font-semibold">×</span>
              <input
                type="number"
                min={1}
                max={500}
                value={row.generateCount || 1}
                onChange={(e) =>
                  onChange({
                    generateCount: Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                  })
                }
                className="w-14 text-sm text-center outline-none"
                title="이 행을 몇 번 반복 생성할지 (최대 500)"
              />
              <span>개</span>
            </label>
            <button
              onClick={onGenerate}
              disabled={disabled || row.status === "running"}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold text-sm px-4 py-3 transition disabled:opacity-50"
            >
              {row.status === "running"
                ? "생성 중..."
                : (row.generateCount || 1) > 1
                  ? `▶ 이 설정으로 ${row.generateCount}개 생성`
                  : "▶ 이 행 생성"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
