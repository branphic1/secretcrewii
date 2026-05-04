"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DeckRow = {
  id: string;
  title: string;
  meeting_date: string;
  status: string;
  created_at: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "초안", cls: "bg-slate-100 text-slate-700" },
  extracting: { label: "추출중", cls: "bg-amber-100 text-amber-800" },
  reviewing: { label: "검토 가능", cls: "bg-blue-100 text-blue-800" },
  building: { label: "빌드중", cls: "bg-indigo-100 text-indigo-800" },
  done: { label: "완료", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "실패", cls: "bg-red-100 text-red-800" },
};

export default function DeckListPage() {
  const [items, setItems] = useState<DeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deck/decks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "불러오기 실패");
      setItems(data.decks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("정말 삭제할까요?")) return;
    const res = await fetch(`/api/deck/decks/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">최근 덱</h1>
      <p className="text-sm text-slate-500 mb-6">
        클로바노트 회의록을 올리면 Claude Opus 4.7 가 핵심 명제·인용·데이터·액션을 추출하고, 사용자가 검토 후 PPT/Word 로 받습니다.
      </p>

      {loading && <p className="text-slate-500">불러오는 중…</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl bg-white border border-dashed border-slate-300 p-10 text-center">
          <div className="text-4xl mb-2">🎨</div>
          <p className="text-slate-600 mb-4">아직 덱이 없어요. 먼저 프로필을 설정하면 더 좋은 결과가 나옵니다.</p>
          <div className="flex justify-center gap-2">
            <Link
              href="/deck/profile"
              className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
            >
              ⚙ 프로필 설정
            </Link>
            <Link
              href="/deck/new"
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              + 첫 덱 만들기 →
            </Link>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((m) => {
            const s = STATUS[m.status] || STATUS.draft;
            return (
              <div key={m.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/deck/${m.id}`} className="font-semibold text-slate-900 truncate hover:text-indigo-600">
                      {m.title}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(m.meeting_date).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Link href={`/deck/${m.id}`} className="px-2 py-1 rounded text-slate-700 hover:bg-slate-100">검토</Link>
                  {(m.status === "reviewing" || m.status === "done") && (
                    <>
                      <a href={`/api/deck/decks/${m.id}/pptx`} className="px-2 py-1 rounded text-indigo-700 hover:bg-indigo-50">.pptx</a>
                      <a href={`/api/deck/decks/${m.id}/docx`} className="px-2 py-1 rounded text-emerald-700 hover:bg-emerald-50">.docx</a>
                    </>
                  )}
                  <button onClick={() => remove(m.id)} className="px-2 py-1 rounded text-red-600 hover:bg-red-50">삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
