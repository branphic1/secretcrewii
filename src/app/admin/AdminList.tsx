"use client"

import { useState, useTransition } from "react"
import { approveUser, unapproveUser, deleteUser, setAdminRole } from "./actions"

export type AdminRow = {
  id: string
  email: string
  created_at: string
  approved: boolean
  role: string
  email_confirmed: boolean
}

export default function AdminList({ rows, selfId }: { rows: AdminRow[]; selfId: string }) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const filtered = rows.filter((r) => {
    if (filter === "pending") return !r.approved
    if (filter === "approved") return r.approved
    return true
  })

  async function run(fn: () => Promise<void>, rowId: string) {
    setErrorMsg(null)
    setBusyId(rowId)
    startTransition(async () => {
      try {
        await fn()
      } catch (e: unknown) {
        const err = e as { message?: string }
        setErrorMsg(err?.message || "처리 실패")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100">
        <FilterBtn active={filter === "pending"} onClick={() => setFilter("pending")}>
          ⏳ 대기 ({rows.filter((r) => !r.approved).length})
        </FilterBtn>
        <FilterBtn active={filter === "approved"} onClick={() => setFilter("approved")}>
          ✅ 승인됨 ({rows.filter((r) => r.approved).length})
        </FilterBtn>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          전체 ({rows.length})
        </FilterBtn>
      </div>

      {errorMsg && (
        <div className="m-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          ⚠ {errorMsg}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400">
          {filter === "pending" ? "대기 중인 유저가 없어요." : "표시할 유저가 없어요."}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((row) => {
            const isSelf = row.id === selfId
            const busy = busyId === row.id && pending
            return (
              <li key={row.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-slate-800 truncate">{row.email}</div>
                    {isSelf && <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">본인</span>}
                    {row.role === "admin" && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">admin</span>
                    )}
                    {row.approved ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">승인됨</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">대기</span>
                    )}
                    {!row.email_confirmed && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">이메일 미인증</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    가입: {new Date(row.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!row.approved ? (
                    <button
                      disabled={busy}
                      onClick={() => run(() => approveUser(row.id), row.id)}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      {busy ? "..." : "✅ 승인"}
                    </button>
                  ) : (
                    !isSelf && (
                      <button
                        disabled={busy}
                        onClick={() => run(() => unapproveUser(row.id), row.id)}
                        className="rounded-lg bg-white border border-slate-300 text-slate-700 text-xs px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                      >
                        ↩ 취소
                      </button>
                    )
                  )}

                  {row.approved && !isSelf && (
                    row.role === "admin" ? (
                      <button
                        disabled={busy}
                        onClick={() => run(() => setAdminRole(row.id, false), row.id)}
                        className="rounded-lg bg-white border border-purple-300 text-purple-700 text-xs px-3 py-1.5 hover:bg-purple-50 disabled:opacity-50"
                      >
                        admin 해제
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => run(() => setAdminRole(row.id, true), row.id)}
                        className="rounded-lg bg-white border border-purple-300 text-purple-700 text-xs px-3 py-1.5 hover:bg-purple-50 disabled:opacity-50"
                      >
                        admin 지정
                      </button>
                    )
                  )}

                  {!isSelf && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`${row.email} 을 정말 삭제할까요?\n(계정/프로필 모두 제거. 되돌릴 수 없음)`)) return
                        run(() => deleteUser(row.id), row.id)
                      }}
                      className="rounded-lg bg-white border border-rose-300 text-rose-600 text-xs px-3 py-1.5 hover:bg-rose-50 disabled:opacity-50"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg text-xs px-3 py-1.5 transition ${
        active ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  )
}
