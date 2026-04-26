"use client"

import { useState } from "react"
import { updateActiveGuidelines, type CsGlobalGuidelines } from "../actions"

export default function GuidelinesEditor({
  initial,
}: {
  initial: CsGlobalGuidelines | null
}) {
  const [content, setContent] = useState(initial?.content || "")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState(initial?.updated_at || null)
  const [version, setVersion] = useState(initial?.version || 0)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const saved = await updateActiveGuidelines(content, note || undefined)
      setSavedAt(saved.updated_at)
      setVersion(saved.version)
      setNote("")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            현재 버전: <span className="font-bold text-slate-700">v{version}</span>
            {savedAt && (
              <span className="ml-3">
                마지막 수정: {new Date(savedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
              </span>
            )}
          </div>
          <div>{(content.length / 1024).toFixed(1)} KB / {content.length}자</div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={28}
          placeholder="# 전 브랜드 공통 응대 가이드라인&#10;&#10;## 톤·매너&#10;..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono resize-y outline-none focus:border-indigo-400"
        />

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="변경 사유 / 메모 (선택)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={busy || !content.trim()}
            className="rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            {busy ? "저장 중..." : "저장 (버전 증가)"}
          </button>
        </div>
      </div>
    </div>
  )
}
