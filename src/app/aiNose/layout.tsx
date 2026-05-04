import Link from "next/link";
import { ReactNode } from "react";
import LogoutButton from "./LogoutButton";

export default function AiNoseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/aiNose" className="flex items-center gap-2 font-bold text-slate-800">
            <span className="text-xl">🎙️</span>
            <span>아이노즈 회의록</span>
            <span className="text-xs font-normal text-slate-500">FCNet 전용</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/aiNose/upload"
              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
            >
              + 새 회의록
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
