"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function AiNoseOutputPage() {
  const params = useParams();
  const id = params?.id as string;
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/aiNose/meetings/${id}`, { cache: "no-store" });
        const data = await res.json();
        setTitle(data?.meeting?.title || "");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p className="text-slate-500">불러오는 중…</p>;

  return (
    <div className="max-w-2xl mx-auto text-center py-10">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">회의록 확정 완료</h1>
      <p className="text-slate-600 mb-8">{title}</p>

      <div className="space-y-3">
        <a
          href={`/api/aiNose/meetings/${id}/docx`}
          className="block w-full px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        >
          📄 .docx 다운로드
        </a>

        <Link
          href={`/aiNose/${id}/review`}
          className="block w-full px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
        >
          ✏️ 다시 편집하기
        </Link>
        <Link
          href="/aiNose"
          className="block w-full px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
        >
          ← 회의록 목록
        </Link>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        Phase 2 예정: .pptx 생성 / 공유 링크 / Google Drive 자동 저장
      </p>
    </div>
  );
}
