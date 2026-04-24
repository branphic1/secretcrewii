"use client"

import { useEffect, useState } from "react"
import { listTemplates, type ProductTemplate } from "./template-actions"

type Props = {
  isOpen: boolean
  onClose: () => void
  onApply: (template: ProductTemplate) => void
}

export default function TemplatePicker({ isOpen, onClose, onApply }: Props) {
  const [items, setItems] = useState<ProductTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setSearch("")
    setExpandedId(null)
    void refresh()
  }, [isOpen])

  async function refresh() {
    setLoading(true)
    try {
      const data = await listTemplates()
      setItems(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filtered = items.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-500">제품 템플릿</div>
            <h2 className="text-lg font-bold text-slate-800">불러오기</h2>
            <p className="text-xs text-slate-500 mt-0.5">제품을 선택하면 지침 + 예시원고가 자동 입력됩니다.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none w-8 h-8 rounded-full hover:bg-slate-100"
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              ⚠ {error}
            </div>
          )}

          <div className="px-5 py-3 sticky top-0 bg-white border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제품명 검색 (예: 콧물흡입기)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              {items.length === 0 ? (
                <div className="space-y-2">
                  <div className="text-4xl">📦</div>
                  <div>아직 등록된 제품 템플릿이 없어요.</div>
                  <div className="text-xs text-slate-400">관리자가 /admin/templates 에서 먼저 등록해야 합니다.</div>
                </div>
              ) : (
                "검색 결과 없음"
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((tpl) => {
                const expanded = expandedId === tpl.id
                return (
                  <li key={tpl.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-bold text-slate-800">{tpl.name}</div>
                          {tpl.example ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">예시 있음</span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">지침만</span>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedId(expanded ? null : tpl.id)}
                          className="mt-1 text-[11px] text-indigo-500 hover:text-indigo-700"
                        >
                          {expanded ? "접기 ▲" : "미리보기 ▼"}
                        </button>
                        {expanded && (
                          <div className="mt-2 space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div>
                              <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">지침</div>
                              <div className="text-xs text-slate-700 whitespace-pre-wrap">{tpl.guideline}</div>
                            </div>
                            {tpl.example && (
                              <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">예시 원고</div>
                                <div className="text-xs text-slate-700 whitespace-pre-wrap">{tpl.example}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onApply(tpl)}
                        className="rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-semibold px-4 py-2 whitespace-nowrap"
                      >
                        ✓ 적용
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
