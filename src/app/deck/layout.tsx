import Link from "next/link";
import { ReactNode } from "react";

export default function DeckLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/deck" className="flex items-center gap-2 font-bold text-slate-800">
            <span className="text-xl">🎨</span>
            <span>Deck Builder</span>
            <span className="text-xs font-normal text-slate-500">회의록 → PPT + Word</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/deck/profile"
              className="text-slate-600 hover:text-slate-900"
            >
              ⚙ 프로필
            </Link>
            <Link
              href="/deck/new"
              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              + 새 덱
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
