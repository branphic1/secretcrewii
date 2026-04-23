import { Search, Timer } from 'lucide-react';
import { longKoreanDate, todayStr } from '@/lib/time-ledger/dates.js';

export default function Header({ onOpenSearch, onOpenTimer }) {
  return (
    <header
      className="w-full border-b"
      style={{ borderColor: '#EFE7D4', background: '#FFFBF3' }}
    >
      <div className="mx-auto flex items-center justify-between px-6 py-5" style={{ maxWidth: '64rem' }}>
        <div>
          <div className="display text-2xl italic" style={{ color: '#2B2620', letterSpacing: '-0.02em' }}>
            Time Ledger
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#8A7F73' }}>시간의 궤적</div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenTimer && (
            <button
              onClick={onOpenTimer}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition hover:bg-stone-100"
              style={{ color: '#57534E', border: '1px solid #EFE7D4', background: '#FFFDF6' }}
              aria-label="타이머 시작"
              title="타이머 시작"
            >
              <Timer size={12} />
              <span className="hidden sm:inline">타이머</span>
            </button>
          )}
          <button
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition hover:bg-stone-100"
            style={{ color: '#57534E', border: '1px solid #EFE7D4', background: '#FFFDF6' }}
            aria-label="검색"
            title="검색 (⌘/Ctrl + K)"
          >
            <Search size={12} />
            <span className="hidden sm:inline">검색</span>
            <kbd className="hidden md:inline text-[10px] px-1 rounded" style={{ background: '#F3EDE1', color: '#A8A29E' }}>⌘K</kbd>
          </button>
          <div className="text-xs text-right" style={{ color: '#8A7F73' }}>
            <div>Today</div>
            <div className="display italic text-base" style={{ color: '#2B2620' }}>{longKoreanDate(todayStr())}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
