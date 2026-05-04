"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AiNoseGatePage() {
  return (
    <Suspense fallback={null}>
      <GateInner />
    </Suspense>
  );
}

function GateInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/aiNose";

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/aiNose/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "로그인 실패");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 ring-1 ring-slate-800 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-xl font-bold text-white">아이노즈 회의록</h1>
          <p className="text-sm text-slate-400 mt-1">FCNet 통화·회의 전용</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="ID"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-indigo-500 outline-none text-sm"
            autoFocus
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-indigo-500 outline-none text-sm"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition"
          >
            {loading ? "확인 중..." : "들어가기"}
          </button>
        </form>
      </div>
    </main>
  );
}
