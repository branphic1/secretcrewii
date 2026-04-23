"use client"

import { useEffect, useMemo, useState } from "react"

type KeywordItem = { text: string; count: number }
type RowStatus = "idle" | "running" | "success" | "error"

type Row = {
  id: string
  guideline: string
  example: string
  charCount: number
  keywords: KeywordItem[]
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
    guideline: "",
    example: "",
    charCount: 500,
    keywords: Array.from({ length: 5 }, () => ({ text: "", count: 1 })),
    result: "",
    status: "idle",
  }
}

function defaultSettings(): Settings {
  return { model: "claude-sonnet-4-6", maxTokens: 2000, temperature: 0.8 }
}

export default function CafeWriterApp() {
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [settings, setSettings] = useState<Settings>(defaultSettings())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const rawRows = localStorage.getItem(STORAGE_ROWS)
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as Row[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed.map((r) => ({ ...r, status: "idle", message: undefined })))
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

  async function generateSelected() {
    const ids = Array.from(selected)
    const targets = rows.filter((r) => ids.includes(r.id))
    for (const r of targets) {
      await generateOne(r)
    }
  }

  async function generateAll() {
    for (const r of rows) {
      if (r.guideline.trim()) {
        await generateOne(r)
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
            onGenerate={() => generateOne(row)}
            onDuplicate={() => duplicateRow(row.id)}
            onDelete={() => deleteRow(row.id)}
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
          <label className="block">
            <div className="text-xs font-semibold text-slate-600 mb-1">지침 <span className="text-rose-500">*</span></div>
            <textarea
              value={row.guideline}
              onChange={(e) => onChange({ guideline: e.target.value })}
              rows={4}
              placeholder="예: 홍대 브런치 카페 '○○' 을 소개하는 바이럴 후기. 20대 여성 타깃, 감성적이고 친근한 말투."
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
          <button
            onClick={onGenerate}
            disabled={disabled || row.status === "running"}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold text-sm px-4 py-3 transition disabled:opacity-50"
          >
            {row.status === "running" ? "생성 중..." : "▶ 이 행 생성"}
          </button>
        </div>
      </div>
    </div>
  )
}
